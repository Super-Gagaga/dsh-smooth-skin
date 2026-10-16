import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (url) => readFile(new URL(url, import.meta.url), 'utf8');

const shared = await read('../src/shared.js');
const skin = await read('../src/skin.js');
const client = await read('../src/client.js');
const host = await read('../src/host.js');
const layout = await read('../src/layout.js');
const composer = await read('../src/composer.js');
const account = await read('../src/account.js');
const scrollbar = await read('../src/scrollbar.js');

/** Evaluate the shared + host half as an ESM module through a data: URL. */
async function loadHostHalf() {
  const module = await import(`data:text/javascript,${encodeURIComponent(shared + '\n' + host + '\nexport { normalize, configFromState, normalizeConfig, buildTokens, DEFAULTS, SKIN_ATTRIBUTE };')}`);
  return module;
}

test('host half parses and exposes the plugin contract', async () => {
  const module = await loadHostHalf();
  assert.equal(module.plugin.name, 'dsh-smooth-skin');
  assert.deepEqual(module.plugin.inject, []);
  assert.equal(typeof module.plugin.apply, 'function');
  assert.equal(module.plugin.Config, undefined, 'a non-Standard-Schema Config breaks activation');
  // cordis reads name/inject/Config off whatever the module's default export is.
  assert.equal(module.default, module.plugin);
});

test('the host half never reaches for a service', async () => {
  // cordis throws on `ctx.<name>` for a name outside `inject`, and this half declares
  // none, so any ctx access here is an activation failure.
  const body = host.slice(host.indexOf('export function apply'));
  assert.ok(!/\bctx\s*\./.test(body), 'the Host apply body must not touch ctx');
  assert.ok(!/\bhost\s*\.\s*call\b/.test(host), 'the Host half must not reference the browser bridge');
});

test('normalize clamps unknown persisted values to the defaults', async () => {
  const { normalize, DEFAULTS } = await loadHostHalf();
  assert.deepEqual(normalize(null), DEFAULTS);
  assert.deepEqual(normalize({ enabled: 'yes', theme: 'neon' }), DEFAULTS);
  assert.deepEqual(normalize({ enabled: false, theme: 'dark' }), { enabled: false, theme: 'dark' });
});

test('normalizeConfig drops declared-default omissions', async () => {
  const { normalizeConfig, configFromState } = await loadHostHalf();
  assert.deepEqual(normalizeConfig({}), {});
  assert.deepEqual(normalizeConfig({ enabled: true, theme: 'light', extra: 1 }), { enabled: true, theme: 'light' });
  assert.deepEqual(configFromState({ enabled: true, theme: 'auto' }), { enabled: true, theme: 'auto' });
});

test('buildTokens always carries both tones for every token', async () => {
  const { buildTokens } = await loadHostHalf();
  const tokens = buildTokens({ enabled: true, theme: 'auto' });
  const names = Object.keys(tokens);
  assert.ok(names.includes('--dsw-alias-bg-base'));
  assert.ok(names.includes('--dsw-alias-label-secondary'));
  for (const name of names) {
    assert.equal(typeof tokens[name].light, 'string', `${name} lacks a light value`);
    assert.equal(typeof tokens[name].dark, 'string', `${name} lacks a dark value`);
    assert.match(tokens[name].light, /^(#|rgba?\()/, `${name} light value is not a literal colour`);
  }
});

test('every CSS custom property the skin reads exists as a plugin token or a literal', async () => {
  const { buildTokens } = await loadHostHalf();
  const tokens = new Set(Object.keys(buildTokens({ enabled: true, theme: 'auto' })));
  const used = new Set([...skin.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]));
  // The native composer exposes the user's font preference; keep its literal fallback.
  const hostProperties = new Set(['--dsh-content-font-size']);
  const localProperties = new Set([...skin.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]));
  for (const [, name] of skin.matchAll(/@property\s+(--smooth-[a-z0-9-]+)/g)) localProperties.add(name);
  // The active workspace title is supplied as a CSS string by the native tabs.
  localProperties.add('--smooth-workspace-label');
  assert.match(skin, /var\(--dsh-content-font-size,14px\)/);
  const missing = [...used].filter((name) => !tokens.has(name) && !hostProperties.has(name) && !localProperties.has(name) && !name.startsWith('--dsw-alias-') && name !== '--dsh-windows-titlebar-height');
  assert.deepEqual(missing, [], `unresolved custom properties: ${missing.join(', ')}`);
});

test('the skin stylesheet is scoped to the gating body attribute and never hides host content', async () => {
  const selectors = skin.matchAll(/(^|\})([^{}@]+)\{/g);
  let rules = 0;
  for (const [, , selector] of selectors) {
    const trimmed = selector.trim();
    if (!trimmed.startsWith('body[data-smooth-skin]')) continue;
    rules += 1;
    const contentRules = skin.replace(/body\[data-smooth-skin\] \$\{hostPart\('composerHero'\)\} \$\{hostPart\('previewBadge'\)\}\{display:none\}/, '')
      .replace(/body\[data-smooth-skin\] \.smooth-account-balance\{[^}]*\}/, '');
    assert.ok(!/\b(display\s*:\s*none|visibility\s*:\s*hidden)\b/.test(contentRules), 'only the decorative preview badge and the plugin-owned collapsible balance panel may be hidden');
  }
  assert.ok(rules > 10, 'the skin stylesheet has almost no scoped rules');
});

test('the client half keeps its own durable store and claims its stylesheet', async () => {
  assert.match(client, /style\.dataset\.plugin = PLUGIN_ID/);
  assert.match(client, /theme\.overrideTokens\(PLUGIN_ID/);
  assert.match(client, /slots\.inject\('settings\.section'/);
  assert.match(client, /document\.body\.toggleAttribute\(SKIN_ATTRIBUTE/);
  assert.match(client, /window\.localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(client, /window\.localStorage\.setItem\(STORAGE_KEY/);
  assert.ok(!/\bhost\s*\.\s*call\b/.test(client), 'the client half must not depend on the host bridge');
  const nativeImports = [...new Set([...(client + layout + composer + account).matchAll(/require\('(@deepseek-ai\/[^']+)'\)/g)].map(match => match[1]))];
  assert.deepEqual(nativeImports, ['@deepseek-ai/dsh-client-ui-primitives'], 'reuse only the published native icon components');
  assert.ok(!/document\.body\.append|document\.body\.appendChild/.test(client), 'a plugin must not append a second application');
  // Services are read through guarded consts, so a missing one cannot throw during
  // activation and blank the plugin's own slot entry.
  for (const service of ['theme', 'slots', 'locale']) {
    assert.match(client, new RegExp(`const ${service} = ctx\\.${service} && typeof ctx\\.${service}\\.`));
  }
});

test('the built artifacts exist and agree with the sources', async () => {
  const index = await read('../lib/index.js');
  const bundle = await read('../lib/client.js');
  assert.equal(index, `${shared}\n${host}`, 'rebuild the Host artifact after changing its sources');
  assert.equal(bundle, `window.__ModuleLoader__.load({id:'dsh-smooth-skin',factory:(require)=>{const exports={};\n${shared}\n${skin}\n${composer}\n${account}\n${layout}\n${scrollbar}\n${client}\nreturn exports;}});\n`, 'rebuild the Client artifact after changing its sources');
  assert.ok(index.includes(shared.trim().slice(0, 60)));
  assert.ok(index.includes('export function apply() {}'));
  assert.ok(index.includes('export default plugin'));
  assert.ok(bundle.startsWith("window.__ModuleLoader__.load({id:'dsh-smooth-skin'"));
  assert.ok(bundle.trimEnd().endsWith('return exports;}});'));
  assert.ok(bundle.includes(skin.trim().slice(0, 40)));
});
