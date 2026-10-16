/**
 * Local activation harness for the bundle.
 *
 * It imports the *built* artifact the way Node resolves the package entry, then
 * reproduces exactly what Cordis does with it: `unwrapExports` collapses to
 * `default ?? namespace`, `registry.resolve()` turns the result into the callback,
 * and the registry reads `name`, `inject` and `Config` back off it. Finally it runs
 * the Host `apply`, because any `ctx.<name>` access for a name outside `inject`
 * throws in cordis and fails activation again.
 */
import { readFile } from 'node:fs/promises';

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');
const manifest = JSON.parse(await read('../package.json'));
const entry = typeof manifest.exports['.'] === 'string' ? manifest.exports['.'] : manifest.exports['.'].default;

// ---- the loader/registry contract, copied from cordis + cordis-plugin-loader ----
const isNullable = (value) => value === null || value === undefined;
function unwrapExports(exports) {
  if (isNullable(exports)) return exports;
  exports = exports.default ?? exports;
  if (!exports.__esModule) return exports;
  return exports.default ?? exports;
}
function isApplicable(object) {
  return object && typeof object === 'object' && typeof object.apply === 'function';
}
function resolve(plugin) {
  try {
    if (typeof plugin === 'function') return plugin;
    if (isApplicable(plugin)) return plugin.apply;
  } catch {}
  return undefined;
}

const failures = [];
const note = (failure) => failures.push(failure);

console.log(`entry      ${entry}`);
if (entry !== './lib/index.js') note(`exports["."] is ${JSON.stringify(manifest.exports['.'])}, expected ./lib/index.js`);

const namespace = await import(new URL(entry, new URL('../', import.meta.url)).href);
const plugin = unwrapExports(namespace);
const callback = resolve(plugin);

if (!callback) {
  note('resolve() returned nothing → cordis would throw "invalid plugin"');
} else {
  const name = plugin.name === 'apply' ? undefined : plugin.name;
  console.log(`resolved   callback=${typeof callback} name=${String(name)} inject=${JSON.stringify(plugin.inject)} Config=${plugin.Config === undefined ? 'undefined' : typeof plugin.Config}`);
  if (name !== manifest.name) note(`the registry would read name=${String(name)}, expected ${manifest.name}`);
  if (!Array.isArray(plugin.inject)) note(`the registry would read inject=${JSON.stringify(plugin.inject)}, expected an array`);
  if (plugin.Config !== undefined) note('a Config that is not a Standard Schema makes cordis read Config["~standard"].validate and throw');
}

// The Host half must stay dependency-free: cordis throws on `ctx.<name>` for a name
// that is not in `inject`, so reaching for a service here is an activation failure.
const hostSource = await read('../src/host.js');
const hostBody = hostSource.slice(hostSource.indexOf('export function apply'));
if (/\bctx\s*\./.test(hostBody)) note('the Host apply body touches ctx; an undeclared service would throw "cannot get property ... without inject"');
if (/\bhost\s*\.\s*call\b/.test(hostSource)) note('the Host half references the browser-only `host.call` bridge');

// `apply` must also survive the degenerate contexts a dependency-free plugin gets.
try {
  callback();
  console.log('apply      no-argument call ok');
} catch (error) {
  note(`apply() threw with no arguments: ${error && error.message}`);
}
try {
  callback({}, undefined);
  console.log('apply      inert ctx ok');
} catch (error) {
  note(`apply(ctx) threw: ${error && error.message}`);
}

// The Client half must not depend on the host bridge either.
const clientSource = await read('../src/client.js');
if (/\bhost\s*\.\s*call\b/.test(clientSource)) note('the Client half still calls the package host bridge');
if (!/localStorage/.test(clientSource)) note('the Client half has no durable store');
const built = await read('../lib/client.js');
if (!built.includes('localStorage')) note('the built client artifact has no durable store');

if (failures.length) {
  console.error('\nFAILURES');
  for (const failure of failures) console.error(' - ' + failure);
  process.exit(1);
}
console.log('\nbundle activation harness: all checks passed');
