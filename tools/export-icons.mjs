/**
 * Exports the project's design assets from the source that defines them.
 *
 * The opening whale lives as a path constant inside `src/boot.js`: the Host half
 * injects it as plain JSON rows into the served index and must not read a file at
 * runtime. This script mirrors that constant into `assets/` so the same mark also
 * exists as a real SVG file — to open, reuse in artwork, or hand to someone who
 * does not read JavaScript. `--check` verifies the two still agree instead of
 * writing, so a drift shows up as a failure rather than as two different whales.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');
const check = process.argv.includes('--check');

const boot = await read('src/boot.js');
const whale = /const SPLASH_WHALE_PATH = "([^"]+)";/.exec(boot)?.[1];
const viewBox = /<svg viewBox="([^"]+)"/.exec(boot)?.[1];
if (!whale || !viewBox) {
  console.error('src/boot.js no longer defines the whale path and its viewBox; nothing exported');
  process.exit(1);
}

/** `currentColor` keeps the mark usable inline, where the skin decides light or
 * dark ink; the embedded rule does the same for a viewer that opens the file. */
const svg = `<!-- Smooth 开场鲸鱼：宿主 FishLogo 剪影（${viewBox.split(' ').slice(2).join(' × ')}）。
     由 tools/export-icons.mjs 从 src/boot.js 生成，请勿手改；重新生成：node tools/export-icons.mjs -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="Smooth">
  <style>svg{color:#000}@media(prefers-color-scheme:dark){svg{color:#fff}}</style>
  <path fill="currentColor" d="${whale}"/>
</svg>
`;

const target = new URL('assets/whale.svg', root);
let current;
try {
  current = await readFile(target, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

if (current === svg) {
  console.log('assets/whale.svg: up to date');
} else if (check) {
  console.error('assets/whale.svg: out of date with src/boot.js (run node tools/export-icons.mjs)');
  process.exit(1);
} else {
  await mkdir(new URL('assets/', root), { recursive: true });
  await writeFile(target, svg);
  console.log('assets/whale.svg: written');
}
