/**
 * Builds the two runtime artifacts from src/.
 *
 * lib/index.js  – the Host half (ESM, imported by the Cordis loader)
 * lib/client.js – the browser artifact: one lazy factory registered into the
 *                 client module table, whose id equals the package name.
 *
 * The shared half is folded into both so the palette is defined once.
 */
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';

const OUT = new URL('./lib/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'));
/** The client module table keys on the package name, so the two never drift. */
const CLIENT_ARTIFACT = `window.__ModuleLoader__.load({id:'${manifest.name}',factory:(require)=>{const exports={};\n`;

async function read(relative) {
  return readFile(new URL(relative, import.meta.url), 'utf8');
}

async function writeArtifact(url, content) {
  try {
    if (await readFile(url, 'utf8') === content) return false;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = new URL(`${url.href}.tmp`);
  try {
    await writeFile(temporary, content);
    await rename(temporary, url);
  } finally {
    await rm(temporary, { force: true });
  }
  return true;
}

async function build() {
  const shared = await read('./src/shared.js');
  const [pricing, skin, boot, watch, bridge, cost, think, composer, usage, account, layout, scrollbar, client, host] = await Promise.all([
    read('./src/pricing.js'),
    read('./src/skin.js'),
    read('./src/boot.js'),
    read('./src/watch.js'),
    read('./src/bridge.js'),
    read('./src/cost.js'),
    read('./src/think.js'),
    read('./src/composer.js'),
    read('./src/usage.js'),
    read('./src/account.js'),
    read('./src/layout.js'),
    read('./src/scrollbar.js'),
    read('./src/client.js'),
    read('./src/host.js'),
  ]);
  await mkdir(OUT, { recursive: true });
  // boot.js is the opening's single definition: the Host half injects its rows, and
  // the settings page replays the same markup and timings. watch.js precedes the modules
  // that watch host surfaces (composer, account, usage), bridge.js precedes the cost
  // feed and the two modules that call the Host half's listener, and pricing.js is
  // shared by both halves so a settlement and the live tail use the same rates.
  const hostChanged = await writeArtifact(new URL('index.js', OUT), `${shared}\n${pricing}\n${boot}\n${host}`);
  const clientChanged = await writeArtifact(new URL('client.js', OUT), `${CLIENT_ARTIFACT}${shared}\n${pricing}\n${skin}\n${boot}\n${watch}\n${bridge}\n${cost}\n${think}\n${composer}\n${usage}\n${account}\n${layout}\n${scrollbar}\n${client}\nreturn exports;}});\n`);
  console.log(hostChanged || clientChanged ? `Built ${manifest.name}` : `${manifest.name}: artifacts unchanged`);
}

await build();

if (process.argv.includes('--watch')) {
  let timer;
  let queue = Promise.resolve();
  const watcher = watch(new URL('./src/', import.meta.url), (_event, filename) => {
    if (!filename || !filename.endsWith('.js')) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      queue = queue.then(build).catch((error) => console.error('Build failed:', error.message));
    }, 100);
  });
  console.log('Watching src/; the client half is rebuilt into lib/client.js.');
  const stop = () => {
    clearTimeout(timer);
    watcher.close();
    queue.finally(() => process.exit());
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
