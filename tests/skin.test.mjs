import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = (url) => readFile(new URL(url, import.meta.url), 'utf8');

const shared = await read('../src/shared.js');
const pricing = await read('../src/pricing.js');
const skin = await read('../src/skin.js');
const boot = await read('../src/boot.js');
const watch = await read('../src/watch.js');
const client = await read('../src/client.js');
const host = await read('../src/host.js');
const layout = await read('../src/layout.js');
const composer = await read('../src/composer.js');
const account = await read('../src/account.js');
const scrollbar = await read('../src/scrollbar.js');
const think = await read('../src/think.js');
const bridge = await read('../src/bridge.js');
const cost = await read('../src/cost.js');
const usage = await read('../src/usage.js');

/** Evaluate the shared + boot + host half as an ESM module through a data: URL. */
async function loadHostHalf() {
  const module = await import(`data:text/javascript,${encodeURIComponent(`${shared}\n${boot}\n${host}\nexport { normalize, configFromState, normalizeConfig, buildTokens, DEFAULTS, WINDOW_SIZE, DEFAULT_WINDOW_SIZE, SKIN_ATTRIBUTE, BOOT_ATTRIBUTE, bootInjections, SPLASH_ID, SPLASH_CSS, splashHtml, splashScript, PALETTE, THEME_PRESETS, themeTone };`)}`);
  return module;
}

test('the mark colour choice paints the link family only', async () => {
  const { buildTokens, DEFAULTS } = await loadHostHalf();
  const blue = buildTokens({ ...DEFAULTS, mark: 'blue' });
  assert.equal(blue['--dsw-alias-link'].light, '#2f62c9', 'blue is the default mark');
  assert.equal(blue['--dsw-alias-link'].dark, '#85b2ff');
  const violet = buildTokens({ ...DEFAULTS, mark: 'violet' });
  assert.equal(violet['--dsw-alias-link'].dark, '#b39dff', 'the link family follows the choice');
  assert.notEqual(violet['--dsw-alias-link'].dark, blue['--dsw-alias-link'].dark);
  assert.equal(violet['--smooth-mark'], undefined, 'the mark no longer paints the sidebar workspace names');
});

test('host half parses and exposes the plugin contract', async () => {
  const module = await loadHostHalf();
  assert.equal(module.plugin.name, 'dsh-smooth-skin');
  assert.deepEqual(module.plugin.inject, []);
  assert.equal(typeof module.plugin.apply, 'function');
  assert.equal(module.plugin.Config, undefined, 'a non-Standard-Schema Config breaks activation');
  // cordis reads name/inject/Config off whatever the module's default export is.
  assert.equal(module.default, module.plugin);
});

test('the host half injects the launch animation and the Git bridge', async () => {
  const module = await loadHostHalf();
  const rows = [];
  const listeners = new Map();
  let disposed;
  module.plugin.apply({
    on(name, handler) { listeners.set(name, handler); return () => listeners.delete(name); },
    effect(callback) { disposed = callback(); return disposed; },
  });
  assert.deepEqual([...listeners.keys()], ['webserver/index-inject']);
  listeners.get('webserver/index-inject')(rows);
  assert.deepEqual(rows.slice(0, 3), module.bootInjections(), 'the listener still pushes the splash rows');
  assert.deepEqual(rows.map((row) => row.kind), ['style', 'html', 'script', 'script']);
  assert.match(rows[3].text, /__SMOOTH_GIT__/, 'the bridge token and origin ride the index');
  await new Promise((resolve) => setTimeout(resolve, 80));
  disposed?.();
  const body = host.slice(host.indexOf('export function apply'));
  assert.ok(!/\bctx\s*\.(?!on\b|get\b|effect\b|waterfall\b|parallel\b)/.test(body), 'the Host only dispatches events and reads runtime services through get');
  assert.ok(!/\bhost\s*\.\s*call\b/.test(host), 'the Host half must not reference the browser bridge');
});

test('normalize clamps unknown persisted values to the defaults', async () => {
  const { normalize, DEFAULTS } = await loadHostHalf();
  assert.deepEqual(normalize(null), DEFAULTS);
  assert.deepEqual(normalize({ enabled: 'yes', theme: 'neon' }), DEFAULTS);
  assert.deepEqual(normalize({ enabled: false, theme: 'iron' }), { enabled: false, theme: 'iron', boot: true, mark: DEFAULTS.mark, translucency: DEFAULTS.translucency, windowSize: DEFAULTS.windowSize, usageFields: DEFAULTS.usageFields, usagePlacement: DEFAULTS.usagePlacement, usageAlign: DEFAULTS.usageAlign, usageOrder: DEFAULTS.usageOrder });
  assert.deepEqual(normalize({ enabled: true, theme: 'auto', boot: false }), { enabled: true, theme: 'auto', boot: false, mark: DEFAULTS.mark, translucency: DEFAULTS.translucency, windowSize: DEFAULTS.windowSize, usageFields: DEFAULTS.usageFields, usagePlacement: DEFAULTS.usagePlacement, usageAlign: DEFAULTS.usageAlign, usageOrder: DEFAULTS.usageOrder });
  // The background translucency is a whole percentage; bad input keeps the default.
  assert.equal(normalize({}).translucency, DEFAULTS.translucency);
  assert.equal(normalize({ translucency: 0 }).translucency, 0);
  assert.equal(normalize({ translucency: 100 }).translucency, 100);
  assert.equal(normalize({ translucency: 41.6 }).translucency, 42, 'fractions are rounded');
  assert.equal(normalize({ translucency: 240 }).translucency, 100, 'above the range clamps to 100');
  assert.equal(normalize({ translucency: -8 }).translucency, 0, 'below the range clamps to 0');
  for (const bad of ['loud', null, {}, NaN]) {
    assert.equal(normalize({ translucency: bad }).translucency, DEFAULTS.translucency, `bad input ${String(bad)} keeps the default`);
  }
  // Usage fields are all on by default; stored booleans survive and unknown ones stay on.
  assert.deepEqual(normalize({ usageFields: { input: false, speed: false } }).usageFields,
    { ...DEFAULTS.usageFields, input: false, speed: false });
  assert.deepEqual(normalize({ usageFields: { input: 'no', context: false } }).usageFields,
    { ...DEFAULTS.usageFields, context: false });
  // The stored order keeps known unique keys and appends any field it omitted.
  assert.deepEqual(normalize({ usageOrder: ['context', 'cost'] }).usageOrder,
    ['context', 'cost', 'input', 'output', 'cache', 'counts', 'speed']);
  assert.deepEqual(normalize({ usageOrder: ['nope', 'input', 'input'] }).usageOrder,
    ['input', 'cost', 'output', 'cache', 'counts', 'speed', 'context']);
  assert.deepEqual(normalize({ usageOrder: 'cost' }).usageOrder, DEFAULTS.usageOrder);
  // Placement is one of the three seats; anything else falls back to the own row.
  assert.equal(normalize({ usagePlacement: 'bottom' }).usagePlacement, 'bottom');
  assert.equal(normalize({ usagePlacement: 'context' }).usagePlacement, 'context');
  assert.equal(normalize({ usagePlacement: 'floating' }).usagePlacement, DEFAULTS.usagePlacement);
  // Alignment is left/centre/right; anything else falls back to the plugin default.
  assert.equal(normalize({ usageAlign: 'center' }).usageAlign, 'center');
  assert.equal(normalize({ usageAlign: 'right' }).usageAlign, 'right');
  assert.equal(normalize({ usageAlign: 'middle' }).usageAlign, DEFAULTS.usageAlign);
  // The mark colour is one of the offered choices; anything else falls back to blue.
  assert.equal(normalize({ mark: 'violet' }).mark, 'violet');
  assert.equal(normalize({ mark: 'chartreuse' }).mark, DEFAULTS.mark);
  // The old day/night values and the previous preset ids map onto the new presets.
  assert.equal(normalize({ theme: 'dark' }).theme, 'iron');
  assert.equal(normalize({ theme: 'light' }).theme, 'snow');
  assert.equal(normalize({ theme: 'paper' }).theme, 'snow');
  assert.equal(normalize({ theme: 'obsidian' }).theme, 'iron');
  assert.equal(normalize({ theme: 'celadon' }).theme, 'moss');
  assert.equal(normalize({ theme: 'amber' }).theme, 'sunset');
  assert.equal(normalize({ theme: 'azure' }).theme, 'deepsea');
  for (const preset of ['snow', 'iron', 'moss', 'sunset', 'deepsea']) {
    assert.equal(normalize({ theme: preset }).theme, preset);
  }
});

test('the named theme presets are complete palettes with their own tone', async () => {
  const { buildTokens, PALETTE, THEME_PRESETS, themeTone } = await loadHostHalf();
  assert.deepEqual(THEME_PRESETS, ['auto', 'snow', 'iron', 'moss', 'sunset', 'deepsea']);
  const base = Object.keys(PALETTE.dark).sort();
  for (const id of ['snow', 'iron', 'moss', 'sunset', 'deepsea']) {
    assert.deepEqual(Object.keys(PALETTE[id]).sort(), base, `${id} is missing palette keys`);
    assert.ok(['light', 'dark'].includes(themeTone(id)), `${id} has no host tone`);
    const tokens = buildTokens({ theme: id });
    assert.equal(tokens['--smooth-app'].light, PALETTE[id].app);
    assert.equal(tokens['--smooth-app'].dark, PALETTE[id].app, `${id} paints both tones with its palette`);
  }
  assert.equal(themeTone('auto'), undefined);
  assert.equal(themeTone('snow'), 'light');
  assert.equal(themeTone('iron'), 'dark');
  assert.equal(themeTone('deepsea'), 'dark');
});

test('the launch window size defaults to 1440 x 900 and repairs bad input', async () => {
  const half = await loadHostHalf();
  const { normalize, normalizeConfig, configFromState, DEFAULT_WINDOW_SIZE, WINDOW_SIZE } = half;
  assert.deepEqual(DEFAULT_WINDOW_SIZE, { width: 1440, height: 900 });
  assert.deepEqual(normalize({}).windowSize, { enabled: true, width: 1440, height: 900 });
  // A stored record is repaired per field, not thrown away: one bad number must not
  // reset the other, and the switch keeps whatever was stored.
  assert.deepEqual(normalize({ windowSize: { enabled: false, width: 1600, height: 'tall' } }).windowSize, { enabled: false, width: 1600, height: 900 });
  assert.deepEqual(normalize({ windowSize: { width: 0, height: -10 } }).windowSize, { enabled: true, width: 1440, height: 900 });
  assert.deepEqual(normalize({ windowSize: { width: 100, height: 200 } }).windowSize, { enabled: true, width: 1440, height: 900 }, 'below the app minimum falls back to the default');
  assert.deepEqual(normalize({ windowSize: { width: 99999, height: 99999 } }).windowSize, { enabled: true, width: 1440, height: 900 }, 'beyond the sane maximum falls back too');
  assert.deepEqual(normalize({ windowSize: { width: 520.4, height: 600.6 } }).windowSize, { enabled: true, width: 520, height: 601 }, 'fractions are rounded into the allowed range');
  assert.equal(WINDOW_SIZE.minWidth, 520, 'the app itself refuses anything narrower');
  assert.equal(WINDOW_SIZE.minHeight, 600);
  assert.deepEqual(configFromState(normalize({ windowSize: { width: 1600, height: 1000 } })).windowSize, { enabled: true, width: 1600, height: 1000 });
  assert.deepEqual(normalizeConfig({ windowSize: { enabled: false } }).windowSize, { enabled: false, width: 1440, height: 900 });
});

test('normalizeConfig drops declared-default omissions', async () => {
  const { normalizeConfig, configFromState, DEFAULTS } = await loadHostHalf();
  assert.deepEqual(normalizeConfig({}), { windowSize: DEFAULTS.windowSize });
  assert.deepEqual(normalizeConfig({ enabled: true, theme: 'snow', extra: 1 }), { enabled: true, theme: 'snow', windowSize: DEFAULTS.windowSize });
  assert.deepEqual(normalizeConfig({ boot: false, extra: 1 }), { boot: false, windowSize: DEFAULTS.windowSize });
  assert.equal('windowSize' in configFromState({ enabled: true, theme: 'auto', boot: true }), true);
});

test('buildTokens always carries both tones for every token', async () => {
  const { buildTokens, PALETTE } = await loadHostHalf();
  const tokens = buildTokens({ enabled: true, theme: 'auto' });
  // Following the theme is exactly the snow/iron pair.
  assert.equal(tokens['--smooth-app'].light, PALETTE.snow.app);
  assert.equal(tokens['--smooth-app'].dark, PALETTE.iron.app);
  const names = Object.keys(tokens);
  assert.ok(names.includes('--dsw-alias-bg-base'));
  assert.ok(names.includes('--dsw-alias-label-secondary'));
  for (const name of names) {
    assert.equal(typeof tokens[name].light, 'string', `${name} lacks a light value`);
    assert.equal(typeof tokens[name].dark, 'string', `${name} lacks a dark value`);
    assert.match(tokens[name].light, /^(#|rgba?\()/, `${name} light value is not a literal colour`);
  }
});

test('the model effort slider has separate light and dark surfaces', async () => {
  const { buildTokens } = await loadHostHalf();
  const tokens = buildTokens({ enabled: true, theme: 'auto' });
  for (const name of ['--smooth-model-track', '--smooth-model-blue', '--smooth-model-thumb', '--smooth-model-dot']) {
    assert.equal(typeof tokens[name]?.light, 'string', `${name} lacks a light value`);
    assert.equal(typeof tokens[name]?.dark, 'string', `${name} lacks a dark value`);
    assert.notEqual(tokens[name].light, tokens[name].dark, `${name} must adapt between tones`);
  }
  assert.match(skin, /var\(--smooth-model-track\)/);
  assert.match(skin, /var\(--smooth-model-blue\)/);
  assert.match(skin, /var\(--smooth-model-thumb\)/);
  assert.match(skin, /var\(--smooth-model-dot\)/);
  assert.match(skin, /\.smooth-model-dot\{/);
});

test('the context pie keeps the occupancy look and the dock hosts the usage line', () => {
  // The host dock is no longer removed: the live usage line lives in it. Only the
  // host's own ring is hidden, because the pie already reads the same value.
  assert.match(skin, /\[data-smooth-usage-placement="(?:context|bottom)"\] \[data-composer-dock\]/, 'the dock collapses only when the capsule lives elsewhere');
  assert.match(skin, /\.smooth-usage-context\{/);
  const contextButton = skin.match(/\.smooth-usage-context\{[^}]*\}/)?.[0] || '';
  assert.match(contextButton, /border-radius:var\(--smooth-radius-sm\)/);
  assert.match(contextButton, /min-height:28px/);
  assert.match(contextButton, /padding:0 4px 0 8px/);
  assert.match(skin, /\.smooth-usage-line--bottom\{/);
  assert.match(skin, /\[data-composer-dock\]>\$\{hostPart\('root'\)\}\{display:none\}/);
  assert.match(skin, /\[data-composer-dock\] \[data-composer-stat\]\{display:none\}/, 'the shipped stat pills are replaced by the usage line');
  assert.match(skin, /\.smooth-usage-line\{[^}]*justify-content:center/);
  assert.match(skin, /\.smooth-usage-line\{[^}]*font-size:13px/);
  assert.match(skin, /\.smooth-usage-line\{[^}]*font-variant-numeric:tabular-nums/);
  assert.match(skin, /\.smooth-usage-figures\{[^}]*justify-content:flex-start/, 'the figures stay compact on the left with the pie at the right');
  assert.match(skin, /\.smooth-usage-item\{/);
  assert.match(skin, /\.smooth-usage-icon\{[^}]*width:14px;height:14px/);
  assert.match(skin, /\.smooth-usage-value\{/);
  assert.match(skin, /\.smooth-usage-value\{color:var\(--smooth-muted\);font-weight:500/, 'the figures rest at the model trigger brightness');
  assert.match(skin, /\.smooth-context-value\{color:var\(--smooth-muted\);font-size:13px/, 'the percentage rests at the same brightness');
  assert.match(skin, /:is\(\.smooth-usage-line,\.smooth-usage-context\):is\(:hover,:focus-visible,\[aria-expanded="true"\]\) :is\(\.smooth-usage-value,\.smooth-context-value\)\{color:var\(--smooth-text\)\}/, 'hover, focus and the open panel brighten the figures');
  assert.doesNotMatch(skin, /\.smooth-usage-sep/, 'the figures are separated by a uniform gap, not dots');
  assert.match(skin, /\.smooth-usage-line\{[^}]*gap:4px 16px/);
  assert.match(skin, /\.smooth-usage-figures\{[^}]*gap:4px 16px/);
  const button = skin.match(/\.smooth-usage-line\{[^}]*\}/)?.[0] || '';
  assert.match(button, /max-width:min\(100%,860px\)/, 'the button keeps its compact pill width');
  assert.match(button, /border-radius:var\(--smooth-radius-sm\)/, 'the button matches the permission trigger radius');
  assert.match(button, /min-height:28px/);
  assert.match(button, /padding:0 4px 0 8px/, 'the outer padding matches the permission trigger');
  assert.match(button, /cursor:pointer/);
  const rest = skin.match(/\.smooth-context-pie-rest\{[^}]*\}/)?.[0] || '';
  const used = skin.match(/\.smooth-context-pie-used\{[^}]*\}/)?.[0] || '';
  assert.match(rest, /fill:color-mix\(in srgb,var\(--smooth-muted\) 42%,transparent\)/, 'the remaining share is a pale disc');
  assert.match(used, /fill:var\(--smooth-accent\)/, 'the used share is the accent wedge');
  assert.match(used, /transform-origin:center/, 'the used wedge scales around the pie centre');
  assert.match(skin, /\.smooth-context-reading\{[^}]*display:inline-flex/, 'the pie sits at the right end of the button');
  assert.match(skin, /\.smooth-usage-line:hover \.smooth-context-pie-used/);
  assert.match(skin, /\.smooth-usage-line:focus-visible \.smooth-context-pie-used/);
  assert.match(skin, /\.smooth-usage-line\[aria-expanded="true"\] \.smooth-context-pie-used/);
  assert.match(skin, /transform:scale\(1\.16\)/, 'hover, focus and an open panel enlarge the used wedge');
  assert.doesNotMatch(skin, /\.smooth-context-pie\{[^}]*transform-origin/, 'the whole pie no longer scales');
  assert.doesNotMatch(skin, /smooth-context-pie-used[^}]*translate/, 'the hover no longer offsets the wedge');
  assert.match(skin, /\.smooth-context-value\{[^}]*font-size:13px/, 'the percentage matches the footer text');
  // The panel carries the readings the removed pills used to open.
  assert.match(skin, /\.smooth-context-menu\{[^}]*position:fixed/);
  assert.match(skin, /\.smooth-context-bar\{/);
  assert.match(skin, /\.smooth-context-legend-row\{/);
  assert.match(skin, /\.smooth-context-grid\{[^}]*grid-template-columns:repeat\(2/);
  assert.match(skin, /\.smooth-context-metric-value\{/);
  assert.match(skin, /@media\(prefers-reduced-motion:reduce\)\{body\[data-smooth-skin\] \.smooth-context-menu\{animation:none\}body\[data-smooth-skin\] \.smooth-context-pie-used\{transition:none\}\}/);
});

test('the effort thumb is a glider that slides between stops and follows a drag', () => {
  // The native thumb paints nothing; the visible ball is the glider. Both the ball and
  // the blue fill read one registered, animatable number, so a slide can never split
  // them — the fill edge stays under the ball on every frame of the transition.
  assert.match(skin, /\.smooth-model-slider input\[type="range"\]::-webkit-slider-thumb\{[^}]*opacity:0/);
  assert.match(skin, /@property --smooth-model-ratio\{syntax:"<number>";inherits:true;initial-value:0\}/, 'the ratio must be registered to be animatable');
  assert.match(skin, /\.smooth-model-slider\{[^}]*transition:--smooth-model-ratio \.3s/, 'one transition drives the slide');
  const glider = skin.match(/\.smooth-model-glider\{[^}]*\}/)?.[0] || '';
  assert.match(glider, /left:calc\(14px \+ \(100% - 28px\) \* var\(--smooth-model-ratio\)\)/, 'the ball rides the ratio');
  assert.doesNotMatch(glider, /transition:left/, 'the ball must not animate separately from the fill');
  const fill = skin.match(/\.smooth-model-fill\{[^}]*\}/)?.[0] || '';
  assert.match(fill, /width:calc\(13px \+ \(100% - 26px\) \* var\(--smooth-model-ratio\)\)/, 'the fill edge lands on the ball centre, track border included');
  assert.doesNotMatch(fill, /transition:/, 'the fill must not animate separately from the ball');
  assert.match(skin, /\.smooth-model-slider\.is-dragging\{transition:none\}/, 'a held drag snaps both to the pointer');
  // Stop dots sit on the bar: above the fill, below the ball.
  const dot = skin.match(/\.smooth-model-dot\{[^}]*\}/)?.[0] || '';
  const zOf = (rule) => Number(rule.match(/z-index:(\d+)/)?.[1]);
  assert.ok(zOf(fill) < zOf(dot), 'the dots must paint over the blue fill');
  assert.ok(zOf(dot) < zOf(glider), 'the ball must paint over the dots');
  // Provider-default models get an auto chip in the level row; it is not a slider stop.
  assert.match(skin, /\.smooth-model-auto\{[^}]*order:-1/, 'the chip sits left of the level dot');
  assert.match(skin, /\.smooth-model-auto\[data-active="true"\]\{[^}]*var\(--smooth-model-blue\)/, 'the active chip uses the level blue');
  // Default is not a stop on the scale, so the scale stops looking like the live level.
  // It is neutralised by repainting the fill and the track, never by fading the control:
  // an opacity dim read as "disabled" (and took the thumb to ~1.07:1 against its track in
  // the light presets), which is the one thing a still-interactive control must not say.
  assert.doesNotMatch(skin, /\.smooth-model-slider\[data-default="true"\]\{opacity:/, 'Default must not be painted with the disabled channel');
  assert.match(skin, /\.smooth-model-slider\[data-default="true"\] \.smooth-model-fill\{background:var\(--smooth-muted\)\}/, 'the fill goes neutral while Default owns the level');
  assert.match(skin, /\.smooth-model-slider\[data-default="true"\] \.smooth-model-track\{background:color-mix/, 'the track lifts off the ground so it still reads as a control');
  // The glide is the panel's only animation the decorative guards did not cover.
  assert.match(skin, /@media\(prefers-reduced-motion:reduce\)\{body\[data-smooth-skin\] \.smooth-model-slider,body\[data-smooth-skin\] \.smooth-model-glider\{transition:none\}\}/, 'the slide honours reduced motion');
  // The level dot wears the state blue, so it must stop wearing it once the provider owns
  // the level; otherwise the one always-present state glyph contradicts the panel.
  assert.match(skin, /\.smooth-model-effort:has\(\.smooth-model-slider\[data-default="true"\]\) \.smooth-model-level::before\{background:var\(--smooth-muted\)\}/, 'the dot stops asserting a level Default owns');
  assert.doesNotMatch(skin, /\.smooth-model-level::before\{[^}]*box-shadow/, 'the sub-threshold halo on the dot is gone');
  // The model list marks the current row with the skin's own selection fill, like every
  // other selected state, rather than a raw host token with a grey fallback.
  assert.match(skin, /\.smooth-git-row\[data-current="true"\]\{background:var\(--smooth-selected-mild\)\}/, 'the current model row uses the skin selection token');
  assert.doesNotMatch(skin, /\.smooth-git-row\[data-current="true"\]\{background:var\(--dsw-alias-interactive-bg-active/, 'no raw host token for a selected row');
  // A failed effort commit is the same class of event as a failed Git action, so it takes
  // the same alert chip instead of a bare 10.5px red line. The chip tints over the surface
  // rather than staying transparent: a red wash behind red text closes the contrast gap it
  // needs, so the ink is pulled toward the label colour to hold AA on the dark base.
  const chip = skin.match(/\.smooth-model-error\{[^}]*\}/)?.[0] || '';
  assert.match(chip, /background:color-mix\(in srgb,var\(--dsw-alias-state-error-primary\) 10%,var\(--smooth-surface-2-mild\)\)/, 'the effort error reads as an alert chip');
  assert.match(chip, /color:color-mix\(in srgb,var\(--dsw-alias-state-error-primary\) 82%,var\(--smooth-text\)\)/, 'the error ink keeps its contrast over its own tint');
  // Both pages of the panel share one viewport and cross-fade, so their insets must agree
  // or the content jumps sideways on every switch.
  const paneBody = skin.match(/\.smooth-model-body\{[^}]*\}/)?.[0] || '';
  const paneList = skin.match(/\.smooth-model-list\{[^}]*\}/)?.[0] || '';
  assert.equal(paneBody.match(/padding:([^;}]+)/)?.[1], paneList.match(/padding:([^;}]+)/)?.[1], 'the two pages share one inset rhythm');
});

test('the workspace menu scrolls its rows inside a bounded popover', () => {
  // The stock picker listed every workspace in one column. The skin's list owns a
  // scrollport so a long account cannot push the menu past the window edge, while the
  // search row and the add row stay put.
  assert.match(skin, /\.smooth-workspace-menu\{overflow:hidden\}/, 'the popover itself never grows a second scrollbar');
  assert.match(skin, /\.smooth-workspace-menu \.smooth-git-list\{[^}]*max-height:min\(38vh,300px\)[^}]*overscroll-behavior:contain/, 'the rows scroll inside a capped height');
  assert.match(skin, /\.smooth-workspace-menu \.smooth-git-footer\{flex:none\}/, 'the add row never shrinks away behind the list');
  assert.match(skin, /\.smooth-workspace-menu \.smooth-git-list\{[^}]*flex:1 1 auto/, 'the list takes the remaining height');
  assert.match(skin, /\.smooth-workspace-menu \.smooth-git-row\[data-active="true"\]\{background:color-mix\(in srgb,var\(--smooth-surface-3-mild\) 72%,var\(--smooth-text\)\);box-shadow:inset 0 0 0 1px var\(--smooth-accent\)\}/, 'the keyboard row lifts off the menu surface and takes the accent focus ring');
  assert.match(skin, /\.smooth-workspace-menu \.smooth-git-row:hover:not\(:disabled\):not\(\[data-current="true"\]\)\{background:color-mix/, 'hover is visible on the mixed menu surface without overriding the selected row');
  assert.doesNotMatch(skin, /\.smooth-workspace-path\{/, 'the row carries the workspace name only, no path line');
  assert.match(skin, /\.smooth-git-check\{[^}]*width:14px;height:14px/, "the row check keeps the host menu's own 14px glyph size");
  assert.match(skin, /\.smooth-workspace-clear\{[^}]*color:var\(--smooth-accent\)/, 'the empty state offers the search reset in the link colour');
});

test('the top-stop wash stays on the blue fill and its core lands on the strip', () => {
  // The wash used to sit on the whole track with blobs hundreds of px tall whose centre
  // fell far below the 24px strip: only their almost transparent edge showed, so the
  // pale light was invisible. It is now clipped to the fill's own width and every blob
  // is centred with translate, so the gradient core actually lands inside the bar.
  const glow = skin.match(/\.smooth-model-glow\{[^}]*\}/)?.[0] || '';
  const blob = skin.match(/\.smooth-model-glow-blob\{[^}]*\}/)?.[0] || '';
  assert.match(glow, /width:calc\(13px \+ \(100% - 26px\) \* var\(--smooth-model-ratio\)\)/, 'the wash must be clipped to the filled width, never the empty track');
  assert.match(glow, /z-index:1/);
  assert.match(blob, /translate:-50% -50%/, 'without centring, the gradient core falls below the strip and the wash reads as nothing');
  assert.match(blob, /mix-blend-mode:screen/);
  assert.match(skin, /\.smooth-model-sparks\{[^}]*z-index:2/, 'the particles paint over the wash');
});

test('the model panel settles in fast and closes before it unmounts', () => {
  // The panel is usable on the first frame: it mounts at full size and only a short
  // fade/rise settles it, so the click never waits for a collapsed frame or a height
  // transition. Closing plays the same motion out briefly before the portal is removed.
  assert.match(skin, /\.smooth-model-panel\{transform-origin:bottom center\}/);
  assert.match(skin, /\.smooth-model-panel\[data-state="open"\]\{animation:smooth-model-panel-in \.16s cubic-bezier\(\.2,\.8,\.3,1\)\}/);
  assert.match(skin, /@keyframes smooth-model-panel-in\{from\{opacity:0;transform:translateY\(6px\) scale\(\.99\)\}to\{opacity:1;transform:none\}\}/);
  assert.match(skin, /\.smooth-model-panel\[data-state="closing"\]\{animation:smooth-model-panel-out \.15s cubic-bezier\(\.4,0,1,1\) forwards;pointer-events:none\}/);
  assert.match(skin, /@keyframes smooth-model-panel-out\{from\{opacity:1;transform:none\}to\{opacity:0;transform:translateY\(6px\) scale\(\.99\)\}\}/);
  assert.match(skin, /@media\(prefers-reduced-motion:reduce\)\{body\[data-smooth-skin\] \.smooth-model-panel\{animation:none\}/, 'reduced motion skips the animation');
});

test('hostPart and accountPart match both host class-name conventions', () => {
  const sandbox = {};
  vm.runInNewContext(`${skin}\nglobalThis.__hostPart = hostPart; globalThis.__accountPart = accountPart;`, sandbox);
  // A class list is one string, so the selector's [class$="…"] / [class*="… "]
  // clauses can be exercised without a CSS engine. This is the seam the whole skin
  // hangs on: the host uses `_hash_root` for some packages and `hash_root` for others.
  const matches = (selector, className) => [...selector.matchAll(/\[class([$*^])="([^"]+)"\]/g)]
    .some(([, operator, value]) => operator === '$' ? className.endsWith(value) : operator === '^' ? className.startsWith(value) : className.includes(value));
  assert.equal(matches(sandbox.__hostPart('root'), '_2H3hWW_root'), true);
  assert.equal(matches(sandbox.__hostPart('trigger'), 'wCInkW_trigger'), true);
  assert.equal(matches(sandbox.__hostPart('root'), '_rooted'), false, 'the suffix must end at the local name');
  assert.equal(matches(sandbox.__accountPart('card'), 'kh1pJG_card'), true);
  assert.equal(matches(sandbox.__accountPart('card'), '_card_1p79o_9'), true);
  assert.equal(matches(sandbox.__accountPart('card'), 'cardigan'), false);
});

test('the desktop update pill folds into the icon rail without catching the connection indicator', async () => {
  // The host renders that pill only while the sidebar reports itself as wide, and its
  // label is a bare text span: the rail keeps the icon and clips the label the same way
  // the settings trigger's label is clipped, so aria-label and the tooltip keep the copy.
  // The pill hangs in its own line above the footer, so its place does not depend on how
  // the host nests it inside the settings row: the footer is the positioned ancestor and
  // bottom:100% lands it directly above the account button.
  assert.match(skin, /\$\{hostPart\('indicator'\)\}\[aria-disabled\]\{[^}]*position:absolute[^}]*bottom:calc\(100% \+ 8px\)[^}]*width:var\(--smooth-rail-button-size\)/);
  assert.match(skin, /\$\{hostPart\('indicator'\)\}\[aria-disabled\]>span:last-child\{[^}]*clip-path:inset\(50%\)/);
  // The rail buttons are transparent; the host's update pill is a brand-tinted call to
  // action, so its box goes and only the blue status icon keeps the brand colour.
  assert.match(skin, /\$\{hostPart\('indicator'\)\}\[aria-disabled\]\{[^}]*border:0;background:transparent;color:var\(--dsw-alias-brand-primary-new-colorprimary-new-color\)/);
  assert.match(skin, /\$\{hostPart\('indicator'\)\}\[aria-disabled\]:hover:not\(\[aria-disabled="true"\]\)\{background:var\(--smooth-surface-3-mild\);color:var\(--dsw-alias-brand-primary-new-colorprimary-new-color\)\}/);
  // An error is status, not chrome: it keeps the native red dot on the neutral button.
  assert.match(skin, /\$\{hostPart\('indicator'\)\}\[aria-disabled\] \$\{hostPart\('errorDot'\)\}\{background:var\(--dsw-alias-state-error-primary\)\}/);
  // aria-disabled is the discriminator: the connection status beside it carries data-phase
  // instead, so no rule may target every *_indicator node in the footer.
  assert.ok(!/\$\{hostPart\('indicator'\)\}\{/.test(skin), 'a bare indicator rule would also restyle the connection status');
});

test('the account popup grows out of its bottom-left corner without stalling', () => {
  // The avatar sits under the popup's bottom-left corner. Scaling the native menu from
  // that corner (instead of fading it in place) makes the panel read as coming out of the
  // avatar; the host still owns the menu contents, focus and dismissal.
  //
  // Two details keep the entrance smooth: the popup drops the host's backdrop blur (its
  // 96%-opaque surface hides it anyway, and a blurred backdrop forces every scale step to
  // re-filter), and the portal arms the entrance only after it has laid out. The delayed
  // animation is the fallback for a client half that never arms it.
  assert.match(skin, /\$\{accountMenu\}\{[\s\S]*?--dsw-menu-backdrop-filter:none/);
  assert.match(skin, /\$\{accountMenu\}\{[\s\S]*?transform-origin:left bottom;\s*will-change:transform,opacity;\s*animation:smooth-account-pop \.2s cubic-bezier\(\.2,0,0,1\) \.12s both/);
  assert.match(skin, /@keyframes smooth-account-pop\{from\{opacity:0;transform:scale\(\.82\) translateY\(4px\)\}to\{opacity:1;transform:none\}\}/);
  assert.match(skin, /\$\{accountMenu\}\[data-smooth-account-open\]\{animation:smooth-account-pop-armed \.2s cubic-bezier\(\.2,0,0,1\) both\}/);
  assert.match(skin, /@keyframes smooth-account-pop-armed\{from\{opacity:0;transform:scale\(\.82\) translateY\(4px\)\}to\{opacity:1;transform:none\}\}/);
  // The host unmounts the closed menu at once, so account.js runs the reverse keyframes
  // on a clone tagged data-smooth-account-leave instead of losing the exit motion.
  assert.match(skin, /@keyframes smooth-account-leave\{from\{opacity:1;transform:none\}to\{opacity:0;transform:scale\(\.82\) translateY\(4px\)\}\}/);
  assert.match(skin, /\$\{accountMenu\}\[data-smooth-account-leave\]\{animation:smooth-account-leave \.16s cubic-bezier\(\.4,0,1,1\) both;pointer-events:none\}/);
  assert.match(skin, /@media\(prefers-reduced-motion:reduce\)\{\$\{accountMenu\},\$\{accountMenu\}\[data-smooth-account-open\],\$\{accountMenu\}\[data-smooth-account-leave\]\{animation:none\}\}/);
});

test('the tab scroll arrows float over the strip instead of squeezing its width', () => {
  // As flex items, the arrows took 22px + gap out of the nav whenever an edge began
  // to overflow, reflowing every tab and feeding the overflow observer. They are
  // absolute overlays now, so showing/hiding one cannot change the strip width.
  assert.match(skin, /\.smooth-tab-scroll\{[^}]*position:absolute[^}]*background:var\(--smooth-surface-mild\)/);
  assert.match(skin, /\.smooth-tab-scroll\[data-side="left"\]\{left:calc\(10 \* var\(--smooth-u\)\)\}/);
  assert.match(skin, /\.smooth-tab-scroll\[data-side="right"\]\{right:calc\(10 \* var\(--smooth-u\)\)\}/);
  assert.ok(!/\.smooth-tab-scroll\{[^}]*flex:none/.test(skin), 'the arrows no longer participate in the flex line');
  // The bar reserves the right arrow's slot in its own padding, so the strip stops a
  // gap short of the floating arrow and a tab's close button is never under it.
  assert.match(skin, /\.smooth-workspace-bar\{[^}]*padding:0 35px 0 5px/);
  assert.ok(!/\.smooth-tab-scroll:disabled\{/.test(skin), 'an arrow that cannot scroll is not drawn at all');
});

test('the native caption buttons have a fully transparent backdrop', () => {
  // The preload measures this probe's background as the Window Controls Overlay fill.
  // Making it rgba(0,0,0,0) removes the button strip's ground; the glyph colour is
  // measured from the unchanged label-primary token.
  assert.match(skin, /body\[data-smooth-skin\]>span\[style\*="--dsw-specific-sidebar-fill"\]\[style\*="--dsw-alias-label-primary"\]\{--dsw-specific-sidebar-fill:rgba\(0,0,0,0\)\}/);
});

test('a collapsed sidebar keeps its caption buttons clear of the tab strip', () => {
  // The expand toggle (12px) and the new-conversation button (48px) are fixed in the
  // caption's left corner when the sidebar collapses. The strip starts after both, so
  // they are neither covered by its surface nor squeezed by its tabs.
  assert.match(skin, /body\[data-smooth-skin\]:has\(\[data-sidebar-collapsed\]\) \.smooth-workspace-bar\{left:var\(--smooth-caption-leading,100px\);padding-left:5px\}/);
  assert.match(skin, /\[data-sidebar-collapsed\]\) :is\(\.smooth-rail-home,\.smooth-rail-plugins\)\{opacity:0;pointer-events:none\}/);
  // The host pins both collapsed buttons at 28px; the skin keeps that box and only
  // recolours it, so the new-conversation icon stays aligned with the expand toggle.
  const collapsedSession = skin.match(/\[data-sidebar-collapsed\][^\n]*\{[^}]*height:28px[^}]*\}/)?.[0] || '';
  assert.match(collapsedSession, /width:28px;height:28px;min-height:28px/);
  assert.match(collapsedSession, /left:48px;top:calc\(\(var\(--smooth-caption\) - 28px\) \/ 2\)/);
});

test('the new-conversation row is a compact button above the session list', () => {
  // The wide 46-unit row pushed the session list's divider below the conversation
  // header's; a 30-unit button with hairline margins restores the two rows' rhythm.
  assert.match(skin, /\$\{hostPart\('newSession'\)\}\{height:calc\(30 \* var\(--smooth-l\)\);min-height:calc\(30 \* var\(--smooth-l\)\);margin-top:calc\(2 \* var\(--smooth-l\)\);margin-bottom:calc\(3 \* var\(--smooth-l\) \+ 1px\);border-radius:var\(--smooth-radius-md\);font-size:calc\(14 \* var\(--smooth-l\)\)\}/);
});

test('the selected workspace tab keeps the shared fill and only a whisper of a rim', () => {
  // Mixing the white caption surface with the dark muted label produced a grey chip
  // that read as black in light mode; the palette's selected token is the blue the
  // rest of the light selection states already use. The rim is no longer a full-strength
  // indicator outline: it is mixed mostly into that fill, so it softens the chip's edge
  // instead of drawing a second border around the active tab.
  assert.match(skin, /body\[data-smooth-skin\] \.smooth-workspace-tab\[data-selected="true"\]\{background:var\(--smooth-selected-mild\);border-color:transparent;box-shadow:inset 0 0 0 1px color-mix\(in srgb,var\(--smooth-indicator\) 22%,transparent\)\}/);
  assert.match(skin, /body\[data-smooth-skin\] \.smooth-workspace-tab\[data-selected="true"\]:hover\{background-color:color-mix\(in srgb,var\(--smooth-selected-mild\) 94%,var\(--smooth-text\)\)\}/);
  assert.ok(!/smooth-workspace-tab\[data-selected="true"\]\{background-color:color-mix/.test(skin), 'the muted-grey mix is gone');
  assert.ok(!/workspace-tab\[data-selected="true"\]\{[^}]*inset 0 0 0 1px var\(--smooth-indicator\)/.test(skin), 'the full-strength ring is gone');
});

test('the light tones keep the selected caption chip at the sidebar weight', async () => {
  // The caption ground is near-white while the sidebar's is grey, so the shared selection
  // token landed on the bar as a 1.31:1 chip — a dark block at the top of a light window —
  // while the very same token is a 1.12:1 whisper in the sidebar. The light tones therefore
  // mix the fill back toward the caption surface, and both hover steps are scaled to that
  // lighter chip: the selected hover deepens one step, and the unselected hover is a whisper
  // of ink instead of a grey layer that sat closer to the chip than to the bar. Dark tones
  // keep the plain token, because there the bar ground already matches the token's tone.
  assert.match(skin, /body\[data-smooth-skin\]:not\(\[data-ds-dark-theme\]\) \.smooth-workspace-tab\[data-selected="true"\]\{background:color-mix\(in srgb,var\(--smooth-selected-mild\) 46%,var\(--smooth-surface-mild\)\)\}/);
  assert.match(skin, /body\[data-smooth-skin\]:not\(\[data-ds-dark-theme\]\) \.smooth-workspace-tab:not\(\[data-selected="true"\]\):hover\{background-color:color-mix\(in srgb,var\(--smooth-text\) 4%,var\(--smooth-surface-mild\)\)\}/);
  assert.match(skin, /body\[data-smooth-skin\]:not\(\[data-ds-dark-theme\]\) \.smooth-workspace-tab\[data-selected="true"\]:hover\{background-color:color-mix\(in srgb,var\(--smooth-selected-mild\) 64%,var\(--smooth-surface-mild\)\)\}/);
  assert.ok(!/body\[data-smooth-skin\]\[data-ds-dark-theme\][^\n]*\.smooth-workspace-tab\[data-selected="true"\]\{background:color-mix/.test(skin), 'dark tones keep the plain token');

  // The chip should weigh what the same token weighs on the sidebar's own ground.
  const mix = (from, into, weight) => '#' + [1, 3, 5].map((index) => Math.round(
    Number.parseInt(from.slice(index, index + 2), 16) * weight
      + Number.parseInt(into.slice(index, index + 2), 16) * (1 - weight),
  ).toString(16).padStart(2, '0')).join('');
  const { buildTokens, themeTone, THEME_PRESETS } = await loadHostHalf();
  for (const id of THEME_PRESETS.filter((name) => themeTone(name) === 'light')) {
    const tokens = buildTokens({ enabled: true, theme: id });
    const bar = tokens['--smooth-surface'].light;
    const chip = mix(tokens['--smooth-selected'].light, bar, .46);
    const chipOnBar = contrastRatio(chip, bar);
    const sidebarWeight = contrastRatio(tokens['--smooth-selected'].light, tokens['--smooth-sidebar'].light);
    assert.ok(Math.abs(chipOnBar - sidebarWeight) < .05, `${id}: chip ${chipOnBar.toFixed(2)}:1 against the bar, sidebar ${sidebarWeight.toFixed(2)}:1`);
    assert.ok(chipOnBar < contrastRatio(tokens['--smooth-selected'].light, bar), `${id}: the chip stays lighter than the raw token`);
  }
});

test('the selected workspace tab keeps the same weight as the others', () => {
  // Selection is carried by the fill; a heavier label made the strip jump when the
  // active tab changed.
  assert.ok(!/\.smooth-workspace-tab\[data-selected="true"\]\{[^}]*font-weight/.test(skin), 'the selected tab adds no weight');
  assert.match(skin, /\.smooth-workspace-tab\{[^}]*font-weight:500/);
});

test('the workspace list keeps the reference list rhythm and its leading dot', () => {
  // The reference draws a tighter list than the host: 28px session rows and 29px
  // workspace rows, session titles one size under the workspace names, and the time
  // sharing the title's colour instead of a dimmer step. The leading cell carries the
  // reference's hollow dot as a background ring: a running session paints the host's
  // own status dot over it, so no second marker appears beside it.
  assert.match(skin, /\$\{hostPart\('sidebarCol'\)\} \$\{hostPart\('sessionRow'\)\}\{height:28px;border-radius:var\(--smooth-radius-sm\)\}/);
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\} \$\{hostPart\('title'\)\}\{font-size:12\.5px;line-height:18px;color:var\(--smooth-muted\)\}/);
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\}[^{]*\[aria-selected="true"\] \$\{hostPart\('title'\)\}\{color:var\(--smooth-text\);font-weight:600\}/);
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\} \$\{hostPart\('time'\)\}\{font-size:11px;line-height:16px;color:var\(--smooth-muted\)\}/);
  // The dot is the host spinner's own circle drawn as a mask (r=9.5, stroke 2.71 in
  // the spinner's 24-unit viewBox, shown at 8.84px): the two states then share one
  // vector path and read identically, which a CSS border ring did not.
  assert.match(skin, /::before\{content:""[^}]*width:8\.84px;height:8\.84px[^}]*background:color-mix\(in srgb,var\(--smooth-muted\) 72%,transparent\);(-webkit-)?mask:url\("data:image\/svg\+xml[^}]*stroke-width='2\.71'[^}]*\}/);
  assert.match(skin, /::before\{content:""[^}]*mask:url\("data:image\/svg\+xml[^}]*r='9\.5'[^}]*\}/);
  // A running row keeps the rotation: the host's spinner takes the cell on the same
  // 8.84px/2.71 geometry, and the idle dot steps aside instead of filling.
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\}>\$\{hostPart\('slot'\)\}:has\(svg\)::before\{opacity:0\}/);
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\}>\$\{hostPart\('slot'\)\} svg\{width:8\.84px;height:8\.84px;color:color-mix\(in srgb,var\(--smooth-muted\) 72%,transparent\)\}/);
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\}>\$\{hostPart\('slot'\)\} svg \*\{stroke-width:2\.71\}/);
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\}>\$\{hostPart\('slot'\)\} svg g>circle:first-child\{opacity:\.4\}/);
  assert.match(skin, /\$\{hostPart\('projectRow'\)\}\{height:29px;border-radius:var\(--smooth-radius-sm\)\}/);
  // Every workspace group title — a named workspace, the default workspace and the
  // ungrouped bucket — renders from the same row/title hook, so it must resolve to one
  // host token and one weight. 400 is deliberate: the CJK fallback has no 500 face, so at
  // 500 the Latin titles took Segoe UI Medium while 默认工作区 / 未分组 fell back to YaHei
  // Regular and read as a lighter colour.
  assert.match(skin, /\$\{hostPart\('projectRow'\)\} \$\{hostPart\('title'\)\}\{font-size:13\.5px;line-height:19px;font-weight:400;color:var\(--dsw-alias-label-primary\)\}/);
  assert.ok(!/\$\{hostPart\('projectRow'\)\} \$\{hostPart\('title'\)\}\{[^}]*color:(?!var\(--dsw-alias-label-primary\))/.test(skin), 'group titles keep the host label token, never a skin tint');
  assert.match(skin, /\$\{hostPart\('sectionLabel'\)\}\{font-size:12px;line-height:18px\}/);
});

test('every rectangle corner comes from the shared five-step radius scale', () => {
  // Shape consistency: the skin's own rectangles snap to 26 / 16 / 11 / 8 / 4 through
  // the radius tokens. Pills, circles, window chrome and data marks keep their literal
  // values; a new literal radius anywhere else fails this test.
  assert.match(skin, /--smooth-radius-xl:26px;--smooth-radius-lg:16px;--smooth-radius-md:11px;--smooth-radius-sm:8px;--smooth-radius-xs:4px/);
  const allowed = new Set([
    '0', '999px', '50%', '1px', '2px', '3px', '18px 0 0 0',
    'var(--smooth-radius-xl)', 'var(--smooth-radius-lg)', 'var(--smooth-radius-md)',
    'var(--smooth-radius-sm)', 'var(--smooth-radius-xs)', 'var(--smooth-rail-button-radius)',
    'var(--smooth-radius-md,11px)', 'var(--smooth-radius-xs,4px)',
    'var(--smooth-radius-xl) 0 0 var(--smooth-radius-xl)',
    '0 var(--smooth-radius-lg) 0 0',
    '0 0 0 var(--smooth-radius-xl)',
    'calc(var(--smooth-radius-lg) - 1px) calc(var(--smooth-radius-lg) - 1px) 0 0',
    'calc(var(--smooth-radius-sm) - 2px)',
    '0 0 var(--smooth-radius-sm) var(--smooth-radius-sm)',
  ]);
  const stray = [];
  for (const [name, css] of [['skin', skin], ['client', client]]) {
    for (const match of css.matchAll(/border-radius\s*:\s*([^;}]+)/g)) {
      const value = match[1].trim();
      if (!allowed.has(value)) stray.push(`${name}: ${value}`);
    }
  }
  assert.deepEqual(stray, [], `every corner must use the shared scale: ${stray.join(' | ')}`);
});

test('inline code borrows the link blue while fenced blocks keep their palette', () => {
  // Native file mentions paint themselves with the link colour; inline code is the same
  // kind of reference, so it takes that blue instead of the body text colour.
  assert.match(skin, /body\[data-smooth-skin\] \[data-conversation-scroll\] :not\(pre\)>code\{color:var\(--dsw-alias-link\)\}/);
  assert.ok(!/\[data-conversation-scroll\] pre\s*\{[^}]*color:/.test(skin), 'fenced code blocks are not recoloured');
});

test('the answer field keeps its quiet border while focused', () => {
  // The host paints the answer block's border business-blue on :focus-within; the caret
  // already communicates focus, so the skin restores the idle border colour.
  assert.match(skin, /\$\{hostPart\('customBlock'\)\}:focus-within\{border-color:var\(--smooth-line\)\}/);
  // The surrounding custom-answer row may still take the accent ring; the inner field does not.
  assert.match(skin, /\$\{hostPart\('customRow'\)\}:focus-within\{border-color:var\(--smooth-accent\)/);
  assert.ok(!/customBlock'\)[^}]*:focus-within\{border-color:var\(--smooth-accent\)/.test(skin),
    'the inner answer block never paints an accent focus border');
});

test('the conversation header follows the reference: chips under the title, switch beside its 更多 menu', () => {
  // The host stacks the view tabs in a second grid row spanning the header and renders the
  // 更多 launcher for the collapsed views as that row's other child. The skin centres the
  // row's contents — the launcher rides beside the switch and fades with it — and splits
  // the title cluster so its action chips sit under the title instead of beside it. Only
  // the ground stays the skin's own; the type, pills and spacing are the reference's.
  assert.match(skin, /:has\(\[data-content-phase\]\) \$\{hostPart\('header'\)\}:has\(\[data-conversation-tabs\]\)\{position:relative;padding:4px 18px 6px 14px;min-height:0\}/);
  assert.match(skin, /\$\{hostPart\('titleRow'\)\}\{grid-column:2;grid-row:1;display:grid;grid-template-columns:minmax\(0,1fr\) auto auto;align-items:start;column-gap:6px;min-height:0\}/);
  assert.match(skin, /\$\{hostPart\('titleCluster'\)\}\{display:grid;grid-template-columns:minmax\(0,1fr\);align-content:center;gap:1px\}/);
  // The view switch is a segmented pill: one track, a thumb that slides between the two
  // views. The row holding it and the 更多 launcher is centred and faded as one control;
  // a same-size leading spacer keeps the switch itself on the header's centre line.
  assert.match(skin, /\$\{hostPart\('tabs'\)\}\{position:absolute;left:0;right:0;top:6px;display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:6px;width:auto;margin:0;padding:0;z-index:3;opacity:0;pointer-events:none;transition:opacity \.18s ease\}/);
  // The lifted row is full-width and transparent: only the switch and its 更多 launcher
  // may take clicks, or the title row's actions under it become visible-but-dead.
  assert.match(skin, /\$\{hostPart\('tabs'\)\} :is\(\[data-conversation-tabs\],\$\{hostPart\('viewsMoreAnchor'\)\}\)\{pointer-events:auto\}/, 'the rest of the lifted row passes clicks through to the header actions');
  assert.match(skin, /\$\{hostPart\('tabs'\)\}:has\(\$\{hostPart\('viewsMoreAnchor'\)\}\)::before\{content:"";flex:none;width:26px;height:1px\}/);
  assert.match(skin, /\$\{hostPart\('tabs'\)\} \$\{hostPart\('viewsMore'\)\}\{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:26px;height:26px;margin:0;padding:0;border:0;border-radius:999px/);
  assert.match(skin, /\[data-conversation-tabs\]\{position:relative;display:inline-flex;box-sizing:border-box;gap:0;margin:0;padding:0;border:1px solid var\(--smooth-line\);border-radius:999px;background:transparent;overflow:hidden\}/);
  assert.match(skin, /\[data-conversation-tabs\]::before\{content:"";position:absolute;top:0;bottom:0;left:0;width:50%;[^}]*transition:transform \.26s cubic-bezier\(\.22,1,\.36,1\)\}/);
  assert.match(skin, /\[data-conversation-tabs\]:has\(>\[role="tab"\]:nth-child\(2\)\[aria-selected="true"\]\)::before\{transform:translateX\(100%\)\}/);
  // The host tab is a 35px hit area with a negative margin; the pill is 27px, so the
  // label must be centred by the button itself, not by the host's padding/margin.
  assert.match(skin, /\[data-conversation-tabs\] \[role="tab"\]\{[^}]*display:flex;align-items:center;justify-content:center;flex:1 1 0;height:23px;min-height:0;margin:0 -10px;padding:0 18px;[^}]*line-height:1\}/);
  assert.match(skin, /\$\{hostPart\('centerCol'\)\}:hover \$\{hostPart\('header'\)\} \$\{hostPart\('tabs'\)\}/);
  // Clicking a view leaves :focus on the tab; only keyboard focus may pin the row open,
  // so the reveal keys on :focus-visible rather than :focus-within. An open 更多 menu
  // keeps the row visible as well, so its trigger never fades from under it.
  assert.match(skin, /\$\{hostPart\('tabs'\)\}:has\(:focus-visible\)/);
  assert.match(skin, /\$\{hostPart\('tabs'\)\}:has\(\[aria-expanded="true"\]\)\{opacity:1\}/);
  assert.ok(!/\$\{hostPart\('tabs'\)\}:focus-within/.test(skin), 'a clicked view must not pin the switch open');
});

test('the attach button leads the access-mode chip in the composer footer', () => {
  // The host renders the add button before the modes group; the skin must not pull the
  // modes ahead of it, so the plus stays first and the access-mode chip follows it.
  assert.match(skin, /\$\{hostPart\('tools'\)\} \$\{hostPart\('modes'\)\}\{order:0\}/);
  assert.ok(!/\$\{hostPart\('tools'\)\} \$\{hostPart\('modes'\)\}\{order:-1\}/.test(skin), 'the plus must not be pushed behind the mode chip');
});

test('the archived-row delete action follows the host icon-button geometry', () => {
  // 16px hit box, 4px radius and the host's tertiary label colour keep the trailing
  // delete button indistinguishable from the archive/pin row actions at rest.
  assert.match(skin, /body\[data-smooth-skin\] \.smooth-session-delete\{[^}]*width:16px;height:16px[^}]*border-radius:var\(--smooth-radius-xs\)[^}]*color:var\(--dsw-alias-label-tertiary\)/);
  assert.match(skin, /\.smooth-session-delete svg\{width:14px;height:14px\}/);
  assert.match(skin, /\.smooth-session-delete:hover\{color:var\(--dsw-alias-state-error-primary\)\}/);
  assert.match(skin, /\.smooth-session-delete:focus-visible\{outline:2px solid var\(--smooth-accent\)/);
});

test('a clicked tab does not pin its close button open', () => {
  assert.match(skin, /\.smooth-workspace-tab:hover \.smooth-tab-close/);
  assert.match(skin, /\.smooth-workspace-tab:has\(:focus-visible\) \.smooth-tab-close\{opacity:1;pointer-events:auto\}/);
  assert.ok(!/\.smooth-workspace-tab:is\(:hover,:focus-within\)/.test(skin), 'a mouse click must not leave the close button visible');
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

/* The two tests above read the host's own light and dark bases. A shipped preset paints
 * both tones from ONE palette, so it is the presets that decide what users actually see —
 * and nothing above exercises them. These two walk the real preset ids. */
const shippedPresets = ['snow', 'iron', 'moss', 'sunset', 'deepsea'];

test('every shipped preset keeps all three label inks readable on every reading surface', async () => {
  const { buildTokens, themeTone } = await loadHostHalf();
  for (const id of shippedPresets) {
    const tokens = buildTokens({ enabled: true, theme: id });
    const tone = themeTone(id);
    for (const foreground of ['--dsw-alias-label-primary', '--dsw-alias-label-secondary', '--dsw-alias-label-tertiary']) {
      for (const background of readingSurfaces) {
        const contrast = contrastRatio(tokens[foreground][tone], tokens[background][tone]);
        assert.ok(contrast >= 4.5, `${id}: ${foreground} on ${background}: ${contrast.toFixed(2)}:1`);
      }
    }
  }
});

test('every shipped preset separates its surfaces and keeps the ring ink legible', async () => {
  const { buildTokens, themeTone } = await loadHostHalf();
  const atLeast = (tokens, tone, foreground, background, minimum, label) => {
    const contrast = contrastRatio(tokens[foreground][tone], tokens[background][tone]);
    assert.ok(contrast >= minimum, `${label}: ${contrast.toFixed(2)}:1`);
  };
  for (const id of shippedPresets) {
    const tokens = buildTokens({ enabled: true, theme: id });
    const tone = themeTone(id);
    // Adjacent surfaces must be visibly apart, or elevation is only a token name.
    atLeast(tokens, tone, '--smooth-surface', '--smooth-surface-2', 1.07, `${id} layer1/layer2`);
    atLeast(tokens, tone, '--smooth-surface-2', '--smooth-surface-3', 1.07, `${id} layer2/layer3`);
    atLeast(tokens, tone, '--smooth-app', '--smooth-surface', 1.09, `${id} app/layer1`);
    atLeast(tokens, tone, '--smooth-sidebar', '--smooth-app', 1.05, `${id} sidebar/app`);
    atLeast(tokens, tone, '--smooth-selected', '--smooth-sidebar', 1.10, `${id} selected/sidebar`);
    // Tertiary has to stay visibly quieter than secondary, or the two dim inks collapse
    // into one colour and timestamps read as loudly as titles.
    atLeast(tokens, tone, '--dsw-alias-label-secondary', '--dsw-alias-label-tertiary', 1.12, `${id} muted/faint`);
    // The indicator inks the selected tab's keyboard focus ring, which is drawn inside
    // that same selected fill, so it keeps clearing the 3:1 a non-text cue needs.
    atLeast(tokens, tone, '--smooth-indicator', '--smooth-selected', 3, `${id} indicator/selected`);
  }
});

test('the selected sidebar row is named by its fill and title, with no leading bar', () => {
  // The inset leading bar that marked the selected row is gone: it read as a stripe
  // pinned to one side of the row rather than as the row's own selection. The fill and
  // the title's ink and weight carry the state.
  assert.match(skin, /\[role="treeitem"\]\[aria-selected="true"\]\{background:var\(--smooth-selected-mild\);border-color:transparent;box-shadow:none\}/);
  assert.match(skin, /\[aria-selected="true"\] \$\{hostPart\('title'\)\}\{color:var\(--smooth-text\);font-weight:600\}/);
  assert.ok(!/inset 2px 0 0/.test(skin), 'no leading selection bar survives in the sidebar');
});

test('every CSS custom property the skin reads exists as a plugin token or a literal', async () => {
  const { buildTokens } = await loadHostHalf();
  const tokens = new Set(Object.keys(buildTokens({ enabled: true, theme: 'auto' })));
  const used = new Set([...skin.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]));
  // The native composer exposes the user's font preference, its side clearance and the
  // card width ceiling; keep their literal fallbacks.
  const hostProperties = new Set(['--dsh-content-font-size', '--dsh-composer-side-clearance', '--dsh-composer-card-max-width', '--dsw-font-family']);
  const localProperties = new Set([...skin.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]));
  for (const [, name] of skin.matchAll(/@property\s+(--smooth-[a-z0-9-]+)/g)) localProperties.add(name);
  // The active workspace title is supplied as a CSS string by the native tabs.
  localProperties.add('--smooth-workspace-label');
  // The chrome measures the native caption menu and publishes where the tab strip starts.
  localProperties.add('--smooth-caption-leading');
  // The composer bakes each max-stop spark inline: travel, speed and size per particle.
  for (const spark of ['--spark-size', '--spark-opacity', '--spark-dx', '--spark-dy', '--spark-duration', '--spark-delay']) localProperties.add(spark);
  for (const glow of ['--glow-opacity', '--glow-dx', '--glow-dy', '--glow-duration', '--glow-delay']) localProperties.add(glow);
  assert.match(skin, /var\(--dsh-content-font-size,14px\)/);
  const missing = [...used].filter((name) => !tokens.has(name) && !hostProperties.has(name) && !localProperties.has(name) && !name.startsWith('--dsw-alias-') && name !== '--dsh-windows-titlebar-height');
  assert.deepEqual(missing, [], `unresolved custom properties: ${missing.join(', ')}`);
});

test('the skin follows the host font-family preference', () => {
  // DSH 0.2.1 adds user-selectable text/code/terminal fonts and exposes the text stack
  // through --dsw-font-family. A hard-coded body stack would shadow it for every
  // inherited surface, so the body rule must read the host token with its old stack as
  // the fallback (which also keeps DSH 0.2.0, where the token is a fixed default, intact).
  assert.match(skin, /body\[data-smooth-skin\]\{[\s\S]*?font-family:var\(--dsw-font-family,"Segoe UI","Microsoft YaHei","PingFang SC",system-ui,sans-serif\)/);
});

test('the skin stylesheet is scoped to the gating body attribute and never hides host content', async () => {
  const selectors = skin.matchAll(/(^|\})([^{}@]+)\{/g);
  let rules = 0;
  for (const [, , selector] of selectors) {
    const trimmed = selector.trim();
    if (!trimmed.startsWith('body[data-smooth-skin]')) continue;
    rules += 1;
    // The allowed hides each replace something this layout already provides: the
    // plugin-owned collapsible balance panel, the settings close button (whose job the tab
    // bar in the same header already does), the welcome row (the card's own info row
    // already names the workspace and the branch), the card itself while no tab is open
    // (there is nowhere to type yet), the workspace row's folder/chevron glyph (the
    // reference list names the workspace in type alone, and both glyphs share the same
    // 16px cell, so hiding only one would shift the label on hover), the host's own
    // context meter in the composer dock (the skin's pie draws the same reading next to
    // the model selector), and the two shipped stat pills in that dock (the skin's live
    // usage line carries the same figures). The rest of the row is that usage line, and
    // the host's own preview badge is left alone.
    const contentRules = skin.replace(/body\[data-smooth-skin\] \.smooth-account-balance\{[^}]*\}/, '')
      .replace(/body\[data-smooth-skin\] \[data-shortcut-modal="settings"\] \$\{hostPart\('header'\)\}>\$\{accountPart\('close'\)\}\{display:none\}/, '')
      .replace(/body\[data-smooth-skin\] \$\{hostPart\('composerHero'\)\} \$\{hostPart\('heroWorkspaceRow'\)\}\{[^}]*display:none[^}]*\}/, '')
      .replace(/body\[data-smooth-skin\]\[data-smooth-home\][\s\S]*?\{display:none/, '')
      .replace(/body\[data-smooth-skin\] \$\{hostPart\('sidebarCol'\)\} \$\{hostPart\('projectRow'\)\} :is\(\$\{hostPart\('folder'\)\},\$\{hostPart\('chevron'\)\}\)\{display:none\}/, '')
      .replace(/body\[data-smooth-skin\] \[data-composer-dock\]>\$\{hostPart\('root'\)\}\{display:none\}/, '')
      .replace(/body\[data-smooth-skin\] \[data-composer-dock\] \[data-composer-stat\]\{display:none\}/, '')
      .replace(/body\[data-smooth-skin\]\[data-smooth-usage-placement="(?:context|bottom)"\] \[data-composer-dock\][\s\S]*?\{display:none\}/, '');
    assert.ok(!/\b(display\s*:\s*none|visibility\s*:\s*hidden)\b/.test(contentRules), 'only the balance panel, settings close, welcome row, empty-workspace card, workspace folder cell, host context meter and shipped stat pills may be hidden');
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

test('a palette switch opens the new theme as a circle from the top-left corner', () => {
  // The View Transition API snapshots the page before the token write: the old palette is
  // the still image outside the circle, the new one fills it as the circle grows out of
  // the caption's corner, and the snapshots never cross-fade. The root attribute keeps
  // that keying off any other view transition in the host page.
  assert.match(skin, /html\[data-smooth-theme-switch\]::view-transition-old\(root\),\nhtml\[data-smooth-theme-switch\]::view-transition-new\(root\)\{animation:none;mix-blend-mode:normal\}/);
  assert.match(skin, /html\[data-smooth-theme-switch\]::view-transition-new\(root\)\{clip-path:circle\(0% at 0 0\);animation:smooth-theme-reveal \.52s cubic-bezier\(\.22,1,\.36,1\) both\}/);
  assert.match(skin, /@keyframes smooth-theme-reveal\{from\{clip-path:circle\(0% at 0 0\)\}to\{clip-path:circle\(150% at 0 0\)\}\}/);
  assert.match(skin, /@media\(prefers-reduced-motion:reduce\)\{html\[data-smooth-theme-switch\]::view-transition-old\(root\),html\[data-smooth-theme-switch\]::view-transition-new\(root\)\{animation:none\}\}/);
  // The client starts it only for a real palette replacement, keeps the gate on until the
  // animation finishes, and writes instantly when the API or motion is unavailable.
  assert.match(client, /document\.startViewTransition\(async \(\) => \{/);
  assert.match(client, /if \(committed\.theme !== previous\.theme && previous\.enabled && committed\.enabled\)/);
  assert.match(client, /root\.setAttribute\(THEME_SWITCH_ATTRIBUTE, ''\)/);
  assert.match(client, /transition\.finished\.then\(clear, clear\)/);
  assert.match(client, /prefers-reduced-motion: reduce/);
});

test('the built artifacts exist and agree with the sources', async () => {
  const index = await read('../lib/index.js');
  const bundle = await read('../lib/client.js');
  assert.equal(index, `${shared}\n${pricing}\n${boot}\n${host}`, 'rebuild the Host artifact after changing its sources');
  assert.equal(bundle, `window.__ModuleLoader__.load({id:'dsh-smooth-skin',factory:(require)=>{const exports={};\n${shared}\n${pricing}\n${skin}\n${boot}\n${watch}\n${bridge}\n${cost}\n${think}\n${composer}\n${usage}\n${account}\n${layout}\n${scrollbar}\n${client}\nreturn exports;}});\n`, 'rebuild the Client artifact after changing its sources');
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


test('the page keeps a flat finish without the light sheen or ambient shadow', () => {
  // The page is flat: the white light wash, the inset top highlight, the ambient panel
  // shadow and the local reflection on selected controls are all gone.
  assert.ok(!skin.includes('--smooth-light-wash'), 'the white light wash is gone');
  assert.ok(!skin.includes('--smooth-light-edge'), 'the inset top highlight is gone');
  assert.ok(!skin.includes('--smooth-shadow-workspace'), 'the ambient workspace shadow is gone');
  assert.ok(!/linear-gradient\(160deg,#ffffff/.test(skin), 'the white sheen gradient is gone');
  assert.ok(!/box-shadow:[^;}]*var\(--smooth-light/.test(skin), 'no rule stacks a highlight into its shadow');
});

test('the skin leaves plugin switches alone and only sizes the host general-settings row', () => {
  // The old global switch rules resized and recoloured every [role="switch"], which broke
  // plugin-provided toggles (e.g. the skills list): a plugin's own switch kept its own
  // geometry while the skin repainted it. The skin now stays off plugin switches; the
  // only switch it sizes is the host's own general-settings row, re-asserting its size.
  assert.ok(!/body\[data-smooth-skin\] \[role="switch"\]/.test(skin), 'no global [role=switch] styling');
  assert.ok(!/\[role="switch"\]:not\(\[data-plugin-panel\] \*\)/.test(skin), 'the old plugin-panel exemption is gone with the rule');
  assert.ok(!/\[role="switch"\][^{]*\{[^}]*width:44px/.test(skin), 'the skin no longer resizes switches globally');
  assert.match(skin, /body\[data-smooth-skin\] \[data-shortcut-modal="settings"\] \[data-slot="settings.general.item"\] button\[role="switch"\]\{width:36px;height:20px;padding:2px\}/);
});

test('the settings nav groups are three: account, application, extensions', () => {
  // The host renders settings.section as one flat list, so the headings are anchored by
  // position. 应用 also owns the built-in plugins and agent presets; 扩展 then gathers
  // prompt optimisation, the plugin market, the Smooth skin and the sidebar cards (the
  // old 外观 heading folded into it instead of opening a fourth group).
  assert.match(skin, /button:nth-child\(1\)::after\{content:"账户"\}/);
  assert.match(skin, /button:nth-child\(2\)::after\{content:"应用"\}/);
  assert.match(skin, /button:nth-child\(6\)::after\{content:"扩展"\}/);
  assert.doesNotMatch(skin, /content:"外观"/, 'the fourth heading is gone');
  assert.doesNotMatch(skin, /button:nth-child\(7\)/, 'the seventh cell no longer starts a group');
  const labels = skin.match(/::after\{content:"(?:账户|应用|扩展|外观)"/g) || [];
  assert.equal(labels.length, 3, 'exactly three group headings');
  // Only the two group starts carry the 34px label gap; extensions start at the sixth.
  assert.match(skin, />button:nth-child\(2\),[\s\S]{0,400}?>button:nth-child\(6\)\{margin-top:34px\}/);
});

test('the full-workspace settings page lets the shell behind it receive clicks', () => {
  // The host frames settings in a fixed modal overlay above the whole app. The skin
  // pins the panel into the workspace (right of the rail), so the overlay and its
  // transparent mask must stop hit-testing and only the panel may take clicks —
  // otherwise the rail, tab strip and home button are visible but dead.
  assert.match(skin, /\[role="presentation"\]:has\(>\[data-shortcut-modal="settings"\]\)\{pointer-events:none\}/);
  assert.match(skin, /\[role="presentation"\]:has\(>\[data-shortcut-modal="settings"\]\)>\[aria-hidden="true"\]\{background:transparent;backdrop-filter:none;pointer-events:none\}/);
  assert.match(skin, /\[data-shortcut-modal="settings"\]\{position:fixed;inset:var\(--smooth-caption\) 0 0 var\(--smooth-rail-width\);[^}]*pointer-events:auto\}/);
  // The host's grid first column is its native 188px nav; the skin widens the nav to
  // the app-sidebar width, so the column must widen with it or the nav paints over
  // the content (text appears to sit outside its own column).
  assert.match(skin, /\[data-shortcut-modal="settings"\]\{[^}]*grid-template-columns:calc\(var\(--smooth-left-width\) - var\(--smooth-rail-width\)\) minmax\(0,1fr\)/);
});

test('the rail more launcher stays the lowest icon whatever later entries append', () => {
  // A third-party panel row (the memory library) appends itself to the host's panelList
  // after the host's own children, which left 更多 above it. The launcher is ordered last
  // so every later plugin entry still sits above it.
  assert.match(skin, /\$\{hostPart\('panelList'\)\}>:is\(\$\{hostPart\('moreAnchor'\)\},\*:has\(\$\{hostPart\('moreAnchor'\)\}\)\)\{order:1\}/);
});

test('the page glass is one backdrop plus a single translucent page fill', () => {
  // The body owns the glass weight and the palette-derived backdrop; every page surface
  // derives its translucent colour from that one weight, and the page fill is painted
  // once on the centre column so no surface stacks a second layer under it.
  assert.match(skin, /body\[data-smooth-skin\]\{[^}]*--smooth-glass:100%/);
  assert.match(skin, /--smooth-app-glass:color-mix\(in srgb,var\(--smooth-app\) var\(--smooth-glass\),transparent\)/);
  assert.match(skin, /--smooth-sidebar-glass:color-mix\(in srgb,var\(--smooth-sidebar\) var\(--smooth-glass\),transparent\)/);
  assert.match(skin, /--smooth-rail-glass:color-mix\(in srgb,var\(--smooth-rail\) var\(--smooth-glass\),transparent\)/);
  // The backdrop is a fixed, negative-z layer inside the body's own stacking context,
  // so it sits above the body fill and below every child of the shell.
  assert.match(skin, /body\[data-smooth-skin\]::before\{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:[^}]*var\(--smooth-app\)\}/);
  const backdrop = skin.slice(skin.indexOf('body[data-smooth-skin]::before'));
  assert.ok(!/#[0-9a-f]{3,8}/i.test(backdrop.slice(0, backdrop.indexOf('}'))), 'the backdrop is palette tokens only');
  // The page fill moved to the centre column; the surfaces inside it stay unpainted.
  assert.match(skin, /\$\{hostPart\('centerCol'\)\}\{position:relative;z-index:1;[^}]*background:var\(--smooth-app-glass\)/);
  assert.match(skin, /\$\{hostPart\('sidebarCol'\)\}\{background:var\(--smooth-sidebar-glass\);border-right:0\}/);
  // The frame drops its own fill but keeps the notch the centre column's bottom-left
  // radius cuts out of the sidebar: one sidebar-glass tile anchored to that corner.
  assert.match(skin, /\$\{hostPart\('frame'\)\}:has\(>\$\{hostPart\('sidebarCol'\)\}\)\{[^}]*background-position:var\(--smooth-left-width\) 100%;background-image:radial-gradient\(circle at 100% 0,transparent 0 var\(--smooth-radius-xl\),var\(--smooth-sidebar-glass\) var\(--smooth-radius-xl\)\)/
  );
  assert.match(skin, /\$\{hostPart\('centerCol'\)\}>\$\{hostPart\('root'\)\}\{background:transparent\}/);
  assert.match(skin, /\[data-content-phase\]\{background:transparent\}/);
  assert.match(skin, /\[data-conversation-scroll\]\{background:transparent\}/);
  assert.ok(!/\[data-content-phase\]\{background:var\(--smooth-app\)\}/.test(skin), 'the page fill is not repeated on the conversation surfaces');
  // The composer seat fades to the same glass colour, not to an opaque page colour.
  assert.match(skin, /\$\{hostPart\('composerSeat'\)\}\{background:linear-gradient\(180deg,color-mix\(in srgb,var\(--smooth-app\) 0%,transparent\) 0,var\(--smooth-app-glass\) 36px\)/);
  // A patched desktop window hands the ground to the system acrylic: the page and its
  // in-app backdrop stop painting, and only the glass surfaces remain over the material.
  assert.match(skin, /html:has\(>body\[data-smooth-window-glass\]\),\s*body\[data-smooth-window-glass\]\{background:transparent\}/);
  assert.match(skin, /body\[data-smooth-window-glass\]::before\{content:none\}/);
});



test('region grounds follow the slider while components keep a mild fill', () => {
  // The big grounds (conversation, tab strip, icon rail, sidebar) take the page weight.
  assert.match(skin, /\$\{hostPart\('centerCol'\)\}\{position:relative;z-index:1;[^}]*background:var\(--smooth-app-glass\)/);
  assert.match(skin, /\$\{hostPart\('sidebarCol'\)\}\{background:var\(--smooth-sidebar-glass\);border-right:0\}/);
  assert.match(skin, /\.smooth-workspace-bar\{[^}]*background:var\(--smooth-surface-glass\)/);
  assert.match(skin, /::after\{[^}]*background:var\(--smooth-rail-soft\)/);
  // Components keep their own weight but follow the slider mildly: the buttons, rows,
  // tabs and cards only move a little.
  assert.match(skin, /\$\{hostPart\('newSession'\)\}\{[^}]*background:var\(--smooth-surface-2-mild\)/);
  assert.match(skin, /\[role="treeitem"\]\[aria-selected="true"\]\{background:var\(--smooth-selected-mild\)/);
  assert.match(skin, /\.smooth-workspace-tab\[data-selected="true"\]\{background:var\(--smooth-selected-mild\)/);
  assert.match(skin, /\$\{hostPart\('composerSeat'\)\}\{background:linear-gradient\(180deg,color-mix\(in srgb,var\(--smooth-app\) 0%,transparent\) 0,var\(--smooth-app-glass\) 36px\)/);
  // The settings surface is deliberately solid even while the page behind it is glass:
  // at a high translucency the underlying page (or a stale opening frame) reads as a
  // half-faded second copy of the same rows. Menus keep the overlay weight below.
  assert.match(skin, /\[data-shortcut-modal="settings"\]\{[^}]*background:var\(--smooth-app\)/);
  assert.match(skin, /\[data-shortcut-modal="settings"\]>nav\{[^}]*background:var\(--smooth-sidebar\)/);
  assert.match(skin, /\[data-shortcut-modal="settings"\]>\$\{hostPart\('content'\)\}\{[^}]*background:var\(--smooth-app\)/);
  assert.match(skin, /\[role="menu"\]\{[^}]*background:color-mix\(in srgb,var\(--dsw-alias-bg-overlay\) var\(--smooth-glass-overlay\),transparent\)/);
  assert.match(skin, /\.smooth-git-menu\{[^}]*var\(--smooth-glass-overlay\),transparent\)/);
  // The conversation shell root (data-phase) is cleared so the centre glass shows.
  assert.match(skin, /\[data-phase="active"\][^}]*\{background:transparent\}/);
  // The caption strip's sidebar->surface step sits on the sidebar edge, so the tab
  // strip's own background is one colour from its first pixel to the right edge.
  assert.match(skin, /linear-gradient\(to right,var\(--smooth-sidebar-glass\) 0 var\(--smooth-left-width\),transparent var\(--smooth-left-width\) 100%\)/);
  // The rounded corner is carried by a wedge tile instead of a full-height sidebar band.
  assert.match(skin, /\.smooth-workspace-bar::before\{[^}]*width:18px;height:18px[^}]*radial-gradient\(circle at 100% 100%,transparent 0 17\.5px,var\(--smooth-sidebar-glass\) 18px\)/);
  // The host's session-list bottom fade paints with the sidebar fill token; inside
  // #root it has to be the same glass value as the column, or it stays an opaque band.
  assert.match(skin, /body\[data-smooth-skin\]>#root\{--dsw-specific-sidebar-fill:var\(--smooth-sidebar-glass\)/);
  // The fade itself takes the steeper stacked weight so it clears faster than the page.
  assert.match(skin, /--smooth-sidebar-fade:color-mix\(in srgb,var\(--smooth-sidebar\) var\(--smooth-glass-soft\),transparent\)/);
  assert.match(skin, /\$\{hostPart\('sidebarCol'\)\} \$\{hostPart\('fade'\)\}\{background:linear-gradient\(to bottom,transparent,var\(--smooth-sidebar-fade\)\)\}/);

  // Overlays keep most of their fill; the client drives them a quarter as fast.
  assert.match(skin, /--smooth-glass-overlay:100%/);
  assert.match(skin, /--smooth-app-overlay:color-mix\(in srgb,var\(--smooth-app\) var\(--smooth-glass-overlay\),transparent\)/);
  // The two stacked chrome grounds use the steeper weight so they do not compound.
  assert.match(skin, /--smooth-glass-soft:100%/);
  assert.match(skin, /--smooth-rail-soft:color-mix\(in srgb,var\(--smooth-rail\) var\(--smooth-glass-soft\),transparent\)/);
  assert.match(skin, /--smooth-surface-soft:color-mix\(in srgb,var\(--smooth-surface\) var\(--smooth-glass-soft\),transparent\)/);
});
