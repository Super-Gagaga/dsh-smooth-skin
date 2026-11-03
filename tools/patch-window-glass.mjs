/**
 * Window glass for the desktop shell.
 *
 * The skin can only paint inside the page. A window that really shows the desktop needs
 * the Electron window itself to be created with a system backdrop, which is a
 * main-process option — no renderer API can reach it. This tool patches the installed
 * `resources/app.asar` in place:
 *
 *   - the win32 primary window is created with `backgroundColor: "#00000000"` and
 *     `backgroundMaterial: "acrylic"` (the same recipe the app's welcome window uses);
 *   - after each page load the window marks `document.body` with
 *     `data-smooth-window-glass`, so the skin knows it can hand the page ground to the
 *     material instead of painting its own backdrop.
 *
 * The patch keeps `lib/main.js` byte-for-byte the same length: the added code is paid for
 * by trimming comment text, and the bytes are written back at the file's existing offset.
 * The asar header, offsets and every other file stay untouched, and the app does not even
 * have to be closed — the running process keeps its already-loaded copy, and the next
 * launch reads the patched one.
 *
 * Usage:
 *   node tools/patch-window-glass.mjs            patch the installed archive
 *   node tools/patch-window-glass.mjs --check    report whether it is patched
 *   node tools/patch-window-glass.mjs --restore  write the saved original back
 *   node tools/patch-window-glass.mjs --self-test  verify the patch keeps the size
 *
 * `--resources <dir>` points at another install. The original bytes of `lib/main.js` are
 * kept beside the archive as `app.asar.main.js.smooth-window-glass.bak`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const APP_NAME = 'DeepSeek Harness';
const MAIN_RELATIVE = 'lib/main.js';
/** Appears in the injected attribute name and in the injected window options. */
const PATCH_MARKER = 'smooth-window-glass';
const BACKUP_SUFFIX = 'main.js.smooth-window-glass.bak';
const WINDOW_GLASS_ATTRIBUTE = 'data-smooth-window-glass';

/** Electron's asar archive: [u32 4][u32 headerSize][u32 payloadSize][u32 jsonLength][json][data].
 * Entry offsets are relative to the data region, which starts at 16 + jsonLength. */
export function readArchive(file) {
  const fd = fs.openSync(file, 'r+');
  try {
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    const outer = head.readUInt32LE(0);
    const headerSize = head.readUInt32LE(4);
    const payloadSize = head.readUInt32LE(8);
    const jsonLength = head.readUInt32LE(12);
    if (outer !== 4) throw new Error(`not an asar archive: first field is ${outer}`);
    if (headerSize !== jsonLength + 8) throw new Error(`unexpected asar header sizes (${headerSize} vs ${jsonLength})`);
    if (payloadSize !== jsonLength + 4) throw new Error(`unexpected asar payload size (${payloadSize} vs ${jsonLength})`);
    const json = Buffer.alloc(jsonLength);
    fs.readSync(fd, json, 0, jsonLength, 16);
    const header = JSON.parse(json.toString('utf8'));
    return { fd, file, header, dataStart: 16 + jsonLength, size: fs.fstatSync(fd).size };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

/** Every file entry in header order. */
export function listEntries(header) {
  const entries = [];
  const walk = (node, prefix) => {
    for (const [name, entry] of Object.entries(node.files || {})) {
      const entryPath = prefix + name;
      if (entry.files) walk(entry, `${entryPath}/`);
      else entries.push({ path: entryPath, entry });
    }
  };
  walk(header, '');
  return entries;
}

/** One file's bytes out of an archive. */
export function readEntry(archive, entryPath) {
  const entry = listEntries(archive.header).find((item) => item.path === entryPath)?.entry;
  if (!entry) throw new Error(`archive has no ${entryPath}`);
  if (entry.unpacked) throw new Error(`${entryPath} is stored unpacked beside the archive`);
  const buffer = Buffer.alloc(entry.size);
  const read = fs.readSync(archive.fd, buffer, 0, entry.size, archive.dataStart + Number(entry.offset));
  if (read !== entry.size) throw new Error(`short read for ${entryPath}`);
  return buffer;
}

/** Write bytes over one packed entry without touching the header or any other file. */
export function writeEntryInPlace(archive, entryPath, bytes) {
  const entry = listEntries(archive.header).find((item) => item.path === entryPath)?.entry;
  if (!entry) throw new Error(`archive has no ${entryPath}`);
  if (entry.unpacked) throw new Error(`${entryPath} is stored unpacked beside the archive`);
  if (bytes.length !== entry.size) throw new Error(`${entryPath} must stay ${entry.size} bytes (got ${bytes.length})`);
  fs.writeSync(archive.fd, bytes, 0, bytes.length, archive.dataStart + Number(entry.offset));
  fs.fsyncSync(archive.fd);
}

/** The win32 primary window options spread inside `createWindow`. */
const OPTIONS_ANCHOR = '...process.platform === "win32" && primary ? {';
const CREATE_ANCHOR = 'function createWindow(';
const AFTER_LOAD_ANCHOR = '\twindow.webContents.setWindowOpenHandler(';

/** Collect block-comment interiors that can be shortened without touching code. */
function commentBlocks(source) {
  const preferred = [];
  const fallback = [];
  let at = 0;
  while (true) {
    const open = source.indexOf('/*', at);
    if (open < 0) break;
    const close = source.indexOf('*/', open + 2);
    if (close < 0) break;
    at = close + 2;
    const lineStart = source.lastIndexOf('\n', open) + 1;
    if (source.slice(lineStart, open).trim() !== '') continue;
    const body = source.slice(open, close + 2);
    if (!/^[\x09\x0a\x0d\x20-\x7e]*$/.test(body)) continue;
    const interior = close - open - 2;
    if (interior < 8) continue;
    const block = { from: close - interior, to: close, interior };
    // JSDoc that precedes a declaration is the safest text to trim: it is unambiguously a
    // comment and cannot be part of a string literal or an expression.
    const after = source.slice(close + 2);
    if (body.startsWith('/**') && /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|declare|namespace|enum)\b/.test(after)) preferred.push(block);
    else fallback.push(block);
  }
  return { preferred, fallback };
}

/** Remove exactly `count` ASCII characters from block-comment interiors, end first. */
export function trimComments(source, count) {
  let left = count;
  const edits = [];
  const { preferred, fallback } = commentBlocks(source);
  // Trim the latest comments first: the patch adds its code near the top of `createWindow`
  // (near the end of the file), so shortening the last JSDoc blocks leaves the early
  // module documentation — the part people actually read — untouched.
  for (const list of [preferred, fallback]) {
    for (const block of [...list].sort((a, b) => b.from - a.from)) {
      if (left <= 0) break;
      const take = Math.min(left, block.interior - 4);
      if (take <= 0) continue;
      edits.push({ from: block.from + block.interior - take, to: block.from + block.interior });
      left -= take;
    }
    if (left <= 0) break;
  }
  if (left > 0) throw new Error('main.js: not enough comment text to keep the file size');
  let out = source;
  for (const edit of edits.sort((a, b) => b.from - a.from)) {
    out = out.slice(0, edit.from) + out.slice(edit.to);
  }
  return out;
}

/**
 * Add the system backdrop and the page mark, keeping the file's byte length identical.
 * The added code is paid for by trimming comment text, the only edit that can be made in
 * place without moving any other file.
 */
export function patchMain(source) {
  if (source.includes(PATCH_MARKER)) return { source, changed: false };
  const optionsAt = source.indexOf(OPTIONS_ANCHOR);
  if (optionsAt < 0) throw new Error('main.js: could not find the primary window options');
  if (source.indexOf(OPTIONS_ANCHOR, optionsAt + 1) >= 0) throw new Error('main.js: the primary window options anchor is not unique');
  const braceAt = source.indexOf('{', optionsAt) + 1;
  const options = '\n\t\t\t// smooth-window-glass: the page paints the glass over this system material.\n'
    + '\t\t\tbackgroundColor: "#00000000",\n'
    + '\t\t\tbackgroundMaterial: "acrylic",';
  let next = source.slice(0, braceAt) + options + source.slice(braceAt);

  const createAt = next.indexOf(CREATE_ANCHOR);
  if (createAt < 0) throw new Error('main.js: could not find createWindow');
  const afterAt = next.indexOf(AFTER_LOAD_ANCHOR, createAt);
  if (afterAt < 0) throw new Error('main.js: could not find the window creation tail');
  const mark = `\n\tif (process.platform === "win32" && primary) window.webContents.on("did-finish-load", () => { window.webContents.executeJavaScript("document.body.setAttribute('${WINDOW_GLASS_ATTRIBUTE}','')").catch(() => {}); });\n`;
  next = next.slice(0, afterAt) + mark + next.slice(afterAt);

  const grown = Buffer.byteLength(next, 'utf8') - Buffer.byteLength(source, 'utf8');
  if (grown <= 0) throw new Error('main.js: the patch did not grow the file');
  const trimmed = trimComments(next, grown);
  if (Buffer.byteLength(trimmed, 'utf8') !== Buffer.byteLength(source, 'utf8')) {
    throw new Error('main.js: could not pay for the patch with comment text');
  }
  return { source: trimmed, changed: true };
}

function backupPath(resources) {
  return path.join(resources, `app.asar.${BACKUP_SUFFIX}`);
}

function defaultResources() {
  if (process.env.DSH_RESOURCES) return process.env.DSH_RESOURCES;
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'Programs', APP_NAME, 'resources');
  }
  return undefined;
}

function checkSyntax(source) {
  const file = path.join(os.tmpdir(), `smooth-window-glass-${process.pid}.mjs`);
  fs.writeFileSync(file, source);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } finally {
    fs.rmSync(file, { force: true });
  }
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => argv.includes(name);
  const value = (name) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const resources = value('--resources') || defaultResources();
  if (!resources) {
    console.error('[glass] 找不到安装目录，请用 --resources 指定 DeepSeek Harness 的 resources 目录。');
    process.exit(1);
  }
  const target = path.join(resources, 'app.asar');
  if (!fs.existsSync(target)) {
    console.error(`[glass] 没有找到 ${target}`);
    process.exit(1);
  }
  const backup = backupPath(resources);
  const archive = readArchive(target);
  try {
    const current = readEntry(archive, MAIN_RELATIVE);
    const patched = current.toString('utf8').includes(PATCH_MARKER);

    if (flag('--check')) {
      console.log(patched ? '[glass] 已打窗口补丁。' : '[glass] 未打窗口补丁。');
      return;
    }

    if (flag('--restore')) {
      if (!fs.existsSync(backup)) {
        console.error('[glass] 没有找到备份，无法还原。');
        process.exit(1);
      }
      const original = fs.readFileSync(backup);
      if (original.length !== current.length) {
        console.error('[glass] 安装包已经更新过，备份不再匹配；请重新打补丁而不是还原。');
        process.exit(1);
      }
      writeEntryInPlace(archive, MAIN_RELATIVE, original);
      console.log('[glass] 已还原 lib/main.js，下次启动 DSH 生效。');
      return;
    }

    if (patched) {
      console.log('[glass] 已打过窗口补丁，无需重复。');
      return;
    }

    const next = patchMain(current.toString('utf8'));
    if (!next.changed) {
      console.log('[glass] 补丁没有实际改动（锚点可能已变化）。');
      process.exit(1);
    }
    checkSyntax(next.source);
    if (flag('--self-test')) {
      const same = Buffer.byteLength(next.source, 'utf8') === current.length;
      console.log(same ? '[glass] 补丁自检通过（main.js 字节数不变，语法可解析）。' : '[glass] 补丁自检失败：字节数变了。');
      process.exit(same ? 0 : 1);
    }
    const nextBytes = Buffer.from(next.source, 'utf8');
    if (nextBytes.length !== current.length) throw new Error('patched main.js is not the same length');
    // The original bytes are kept before the archive is touched; the write then lands on
    // the file's existing offset, so the header and every other entry stay as they are.
    fs.writeFileSync(backup, current);
    writeEntryInPlace(archive, MAIN_RELATIVE, nextBytes);
    const after = readEntry(archive, MAIN_RELATIVE);
    if (!after.equals(nextBytes)) throw new Error('verification failed: the archive does not contain the patch');
    console.log(`[glass] 已打窗口补丁（原文件备份 ${path.basename(backup)}）。`);
    console.log('[glass] 完全退出并重新打开 DeepSeek Harness 后生效；不需要在退出后再运行任何脚本。');
  } finally {
    fs.closeSync(archive.fd);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    console.error(`[glass] ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
