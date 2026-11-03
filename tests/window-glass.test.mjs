import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  patchMain,
  trimComments,
  readArchive,
  readEntry,
  listEntries,
  writeEntryInPlace,
} from '../tools/patch-window-glass.mjs';

const JSDOC = [
  '/**',
  ' * Creates the primary application window with the desktop options.',
  ' * @param preload - preload script path.',
  ' * @param show - whether to show the window immediately.',
  ' * @param primary - whether this is the main product window.',
  ' * @returns the created window.',
  ' */',
].join('\n');

const MAIN_SAMPLE = [
  `/**\n * A long module-level comment that gives the trimmer something to shorten without\n * touching any code: the patch has to grow the file and pay for it from comment text.\n * This block is deliberately longer than the added code so the byte count balances.\n * More words here, because the accounting needs slack on both sides of the edit.\n * @module sample\n */`,
  JSDOC,
  'function createWindow(preload, show = false, primary = false) {',
  '\tconst window = new BrowserWindow({',
  '\t\twidth: 1280,',
  '\t\tshow,',
  '\t\t...process.platform === "win32" && primary ? {',
  '\t\t\ttitleBarStyle: "hidden",',
  '\t\t\ttitleBarOverlay: {',
  '\t\t\t\theight: 40,',
  '\t\t\t\tcolor: chromeFallbackFill(),',
  '\t\t\t\tsymbolColor: nativeTheme.shouldUseDarkColors ? "#f9fafb" : "#0f1115"',
  '\t\t\t}',
  '\t\t} : {},',
  '\t\t...process.platform === "darwin" ? {',
  '\t\t\ttitleBarStyle: "hiddenInset",',
  '\t\t\tbackgroundColor: "#00000000"',
  '\t\t} : {},',
  '\t});',
  '\twindow.webContents.setWindowOpenHandler(({ url }) => ({ action: "deny" }));',
  '}',
  '',
].join('\n');

/** A minimal archive in Electron's format, so the in-place writer can be tested without
 * the installed app: [u32 4][u32 headerSize][u32 payloadSize][u32 jsonLength][json][data]. */
function buildAsar(files) {
  const root = { files: {} };
  const chunks = [];
  let offset = 0;
  for (const { file, data } of files) {
    const parts = file.split('/');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      node.files[part] ??= { files: {} };
      node = node.files[part];
    }
    node.files[parts.at(-1)] = { size: data.length, offset: String(offset) };
    chunks.push(data);
    offset += data.length;
  }
  let json = Buffer.from(JSON.stringify(root), 'utf8');
  const pad = (4 - (json.length % 4)) % 4;
  if (pad) json = Buffer.concat([json, Buffer.alloc(pad, 0x20)]);
  const head = Buffer.alloc(16);
  head.writeUInt32LE(4, 0);
  head.writeUInt32LE(json.length + 8, 4);
  head.writeUInt32LE(json.length + 4, 8);
  head.writeUInt32LE(json.length, 12);
  return Buffer.concat([head, json, ...chunks]);
}

function tempFile(name, bytes) {
  const file = path.join(os.tmpdir(), `smooth-glass-test-${process.pid}-${name}`);
  fs.writeFileSync(file, bytes);
  return file;
}

test('the window options and the page mark are added without changing the file size', () => {
  const { source, changed } = patchMain(MAIN_SAMPLE);
  assert.equal(changed, true);
  assert.equal(Buffer.byteLength(source, 'utf8'), Buffer.byteLength(MAIN_SAMPLE, 'utf8'), 'the archive cannot move any file');
  assert.match(source, /process\.platform === "win32" && primary \? \{\n\t+\/\/ smooth-window-glass[^]*?backgroundColor: "#00000000",\n\t+backgroundMaterial: "acrylic",/u);
  assert.match(source, /if \(process\.platform === "win32" && primary\) window\.webContents\.on\("did-finish-load", \(\) => \{ window\.webContents\.executeJavaScript\("document\.body\.setAttribute\('data-smooth-window-glass',''\)"\)/u);
  // The mark sits inside createWindow, after the window is constructed.
  const createAt = source.indexOf('function createWindow(');
  const markAt = source.indexOf('data-smooth-window-glass');
  assert.ok(markAt > createAt, 'the mark is injected inside the window factory');
  // Only one material exists: the darwin block still has its own transparent background.
  assert.equal(source.match(/backgroundMaterial/gu).length, 1);
  // The patched file must stay valid JS.
  const file = tempFile('main.mjs', source);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } finally {
    fs.rmSync(file, { force: true });
  }
  // Idempotent, and refuses a source whose anchors moved instead of corrupting it.
  assert.equal(patchMain(source).changed, false);
  assert.throws(() => patchMain('function createWindow() {}\n'), /could not find/u);
  const duplicate = MAIN_SAMPLE.replace('...process.platform === "win32" && primary ? {', '...process.platform === "win32" && primary ? {\n\t\t\ttitleBarStyle: "hidden",\n\t\t\t...process.platform === "win32" && primary ? {');
  assert.throws(() => patchMain(duplicate), /not unique/u);
});

test('the patch pays for its bytes out of comment text only', () => {
  // The comment blocks shrink, code is untouched, and the delimiters stay.
  const { source } = patchMain(MAIN_SAMPLE);
  assert.ok(source.length < MAIN_SAMPLE.length + 400);
  assert.ok(source.includes('/**'), 'comments still open');
  assert.ok(source.includes('*/'), 'comments still close');
  // A file without enough comment text is refused rather than silently changing the
  // archive layout.
  const thin = MAIN_SAMPLE.replace(/\/\*\*[^]*?\*\//gu, '');
  assert.throws(() => patchMain(thin), /not enough comment text/u);
});

test('trimComments removes exactly the requested number of characters', () => {
  const source = '/** alpha beta gamma delta epsilon zeta */\nconst value = 1;\n';
  const trimmed = trimComments(source, 12);
  assert.equal(Buffer.byteLength(trimmed), Buffer.byteLength(source) - 12);
  assert.ok(trimmed.startsWith('/**'));
  assert.ok(trimmed.endsWith('*/\nconst value = 1;\n'));
  assert.throws(() => trimComments('const value = 1;\n', 4), /not enough comment text/u);
});

test('the in-place writer swaps one entry and leaves the archive layout alone', () => {
  const original = tempFile('original.asar', buildAsar([
    { file: 'lib/main.js', data: Buffer.from(MAIN_SAMPLE) },
    { file: 'package.json', data: Buffer.from('{"name":"sample"}') },
  ]));
  const archive = readArchive(original);
  try {
    const before = fs.readFileSync(original);
    const patched = Buffer.from(patchMain(MAIN_SAMPLE).source, 'utf8');
    const entries = listEntries(archive.header).map((item) => ({ ...item.entry }));
    writeEntryInPlace(archive, 'lib/main.js', patched);
    const after = fs.readFileSync(original);
    assert.equal(after.length, before.length, 'the archive itself must not grow');
    // The header and the second file are byte-identical; only main.js changed.
    const headerLength = archive.dataStart;
    assert.deepEqual(after.subarray(0, headerLength), before.subarray(0, headerLength));
    const mainEntry = listEntries(archive.header).find((item) => item.path === 'lib/main.js').entry;
    const secondEntry = listEntries(archive.header).find((item) => item.path === 'package.json').entry;
    assert.deepEqual(after.subarray(archive.dataStart + Number(mainEntry.offset), archive.dataStart + Number(mainEntry.offset) + mainEntry.size), patched);
    const secondFrom = archive.dataStart + Number(secondEntry.offset);
    assert.deepEqual(after.subarray(secondFrom, secondFrom + secondEntry.size), Buffer.from('{"name":"sample"}'));
    assert.deepEqual(entries.map((entry) => entry.offset), listEntries(archive.header).map((item) => item.entry.offset), 'offsets are untouched');
  } finally {
    fs.closeSync(archive.fd);
    fs.rmSync(original, { force: true });
  }
});

test('the writer rejects a different-sized entry', () => {
  const file = tempFile('short.asar', buildAsar([{ file: 'lib/main.js', data: Buffer.from(MAIN_SAMPLE) }]));
  const archive = readArchive(file);
  try {
    assert.throws(() => writeEntryInPlace(archive, 'lib/main.js', Buffer.from('short')), /must stay/u);
  } finally {
    fs.closeSync(archive.fd);
    fs.rmSync(file, { force: true });
  }
});

test('a malformed archive is rejected instead of written', () => {
  const file = tempFile('garbage.asar', Buffer.from('not an asar'));
  try {
    assert.throws(() => readArchive(file), /asar archive/u);
  } finally {
    fs.rmSync(file, { force: true });
  }
});
