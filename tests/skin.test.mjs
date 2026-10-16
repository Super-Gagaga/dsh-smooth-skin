import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (url) => readFile(new URL(url, import.meta.url), 'utf8');

const shared = await read('../src/shared.js');
const skin = await read('../src/skin.js');
const boot = await read('../src/boot.js');
const watch = await read('../src/watch.js');
const client = await read('../src/client.js');
const host = await read('../src/host.js');
const layout = await read('../src/layout.js');
const composer = await read('../src/composer.js');
const account = await read('../src/account.js');
const scrollbar = await read('../src/scrollbar.js');

/** Evaluate the shared + boot + host half as an ESM module through a data: URL. */
async function loadHostHalf() {
  const module = await import(`data:text/javascript,${encodeURIComponent(`${shared}\n${boot}\n${host}\nexport { normalize, configFromState, normalizeConfig, buildTokens, DEFAULTS, SKIN_ATTRIBUTE, BOOT_ATTRIBUTE, bootInjections, SPLASH_ID, SPLASH_CSS, splashHtml, splashScript };`)}`);
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

test('the host half injects the launch animation and reaches for no service', async () => {
  // cordis throws on `ctx.<name>` for a name outside `inject`, and this half declares
  // none: the one call it makes is the web server's own index-injection event.
  const module = await loadHostHalf();
  const rows = [];
  const listeners = new Map();
  module.plugin.apply({
    on(name, handler) { listeners.set(name, handler); return () => listeners.delete(name); },
  });
  assert.deepEqual([...listeners.keys()], ['webserver/index-inject']);
  listeners.get('webserver/index-inject')(rows);
  assert.deepEqual(rows.map((row) => row.kind), ['style', 'html', 'script']);
  assert.deepEqual(rows, module.bootInjections(), 'the listener pushes the splash rows');
  const body = host.slice(host.indexOf('export function apply'));
  assert.ok(!/\bctx\s*\.(?!on\b)/.test(body), 'the Host apply body may only subscribe, never read a service');
  assert.ok(!/\bhost\s*\.\s*call\b/.test(host), 'the Host half must not reference the browser bridge');
});

test('normalize clamps unknown persisted values to the defaults', async () => {
  const { normalize, DEFAULTS } = await loadHostHalf();
  assert.deepEqual(normalize(null), DEFAULTS);
  assert.deepEqual(normalize({ enabled: 'yes', theme: 'neon' }), DEFAULTS);
  assert.deepEqual(normalize({ enabled: false, theme: 'dark' }), { enabled: false, theme: 'dark', boot: true });
  assert.deepEqual(normalize({ enabled: true, theme: 'auto', boot: false }), { enabled: true, theme: 'auto', boot: false });
});

test('normalizeConfig drops declared-default omissions', async () => {
  const { normalizeConfig, configFromState } = await loadHostHalf();
  assert.deepEqual(normalizeConfig({}), {});
  assert.deepEqual(normalizeConfig({ enabled: true, theme: 'light', extra: 1 }), { enabled: true, theme: 'light' });
  assert.deepEqual(normalizeConfig({ boot: false, extra: 1 }), { boot: false });
  assert.deepEqual(configFromState({ enabled: true, theme: 'auto', boot: true }), { enabled: true, theme: 'auto', boot: true });
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

const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(value => Number.parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
};
const contrastRatio = (first, second) => {
  const values = [first, second].map(luminance).sort((a, b) => a - b);
  return (values[1] + .05) / (values[0] + .05);
};
const readingSurfaces = ['--smooth-rail', '--smooth-sidebar', '--smooth-app', '--smooth-surface', '--smooth-selected', '--dsw-specific-input-major', '--dsw-specific-bubble'];

for (const tone of ['light', 'dark']) {
  test(`${tone} theme text remains readable across navigation, selected rows and message surfaces`, async () => {
    const { buildTokens } = await loadHostHalf();
    const tokens = buildTokens({ enabled: true, theme: tone });
    for (const foreground of ['--dsw-alias-label-primary', '--dsw-alias-label-secondary', '--dsw-alias-label-tertiary']) {
      for (const background of readingSurfaces) {
        const contrast = contrastRatio(tokens[foreground][tone], tokens[background][tone]);
        assert.ok(contrast >= 4.5, `${foreground} on ${background}: ${contrast.toFixed(2)}:1`);
      }
    }
  });
}

test('dark error text is readable on content, input and selected backgrounds', async () => {
  const { buildTokens } = await loadHostHalf();
  const tokens = buildTokens({ enabled: true, theme: 'dark' });
  for (const background of readingSurfaces) {
    const contrast = contrastRatio(tokens['--dsw-alias-state-error-primary'].dark, tokens[background].dark);
    assert.ok(contrast >= 4.5, `error on ${background}: ${contrast.toFixed(2)}:1`);
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
  // The opening belongs to the served index: the Host half injects it, and the client
  // half keeps the setting plus a settings-page replay of the same layer.
  assert.match(client, /boot: true/);
  assert.match(client, /splashInnerHtml\(\)/);
  assert.match(client, /SPLASH_HOLD_MS/);
  assert.match(boot, /kind: 'html', placement: 'body'/);
  assert.match(boot, /kind: 'script', placement: 'body'/);
  // The splash script is the only owner of the shell-entrance attribute.
  assert.match(boot, /data-smooth-splash-live/);
  assert.match(skin, /body\[data-smooth-skin\]\[data-smooth-boot="reveal"\]/);
  // The shell entrance is opacity-only with staggered delays: five fades and one
  // keyframe rule, and no transform on the big columns while the app is mounting.
  assert.equal((skin.match(/smooth-boot-fade/g) || []).length, 6, 'five staggers plus the keyframes');
  assert.ok(!/smooth-boot-(drop|slide|lift)/.test(skin), 'the entrance keeps no move animation');
  // Services are read through guarded consts, so a missing one cannot throw during
  // activation and blank the plugin's own slot entry.
  for (const service of ['theme', 'slots', 'locale']) {
    assert.match(client, new RegExp(`const ${service} = ctx\\.${service} && typeof ctx\\.${service}\\.`));
  }
});

test('the built artifacts exist and agree with the sources', async () => {
  const index = await read('../lib/index.js');
  const bundle = await read('../lib/client.js');
  assert.equal(index, `${shared}\n${boot}\n${host}`, 'rebuild the Host artifact after changing its sources');
  assert.equal(bundle, `window.__ModuleLoader__.load({id:'dsh-smooth-skin',factory:(require)=>{const exports={};\n${shared}\n${skin}\n${boot}\n${watch}\n${composer}\n${account}\n${layout}\n${scrollbar}\n${client}\nreturn exports;}});\n`, 'rebuild the Client artifact after changing its sources');
  assert.ok(index.includes(shared.trim().slice(0, 60)));
  assert.ok(index.includes('webserver/index-inject'));
  assert.ok(index.includes('export default plugin'));
  // Both halves carry the opening's definition: the Host injects it, the settings
  // page replays it, and neither may keep its own copy.
  assert.ok(bundle.includes('const SPLASH_ID'), 'the preview needs the shipped markup and timings');
  assert.ok(bundle.startsWith("window.__ModuleLoader__.load({id:'dsh-smooth-skin'"));
  assert.ok(bundle.trimEnd().endsWith('return exports;}});'));
  assert.ok(bundle.includes(skin.trim().slice(0, 40)));
});
