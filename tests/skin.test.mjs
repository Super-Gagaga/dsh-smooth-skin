import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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
const think = await read('../src/think.js');
const bridge = await read('../src/bridge.js');
const usage = await read('../src/usage.js');

/** Evaluate the shared + boot + host half as an ESM module through a data: URL. */
async function loadHostHalf() {
  const module = await import(`data:text/javascript,${encodeURIComponent(`${shared}\n${boot}\n${host}\nexport { normalize, configFromState, normalizeConfig, buildTokens, DEFAULTS, WINDOW_SIZE, DEFAULT_WINDOW_SIZE, SKIN_ATTRIBUTE, BOOT_ATTRIBUTE, bootInjections, SPLASH_ID, SPLASH_CSS, splashHtml, splashScript, PALETTE, THEME_PRESETS, themeTone };`)}`);
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
  assert.ok(!/\bctx\s*\.(?!on\b|get\b|effect\b)/.test(body), 'the Host only subscribes and keeps its private listener');
  assert.ok(!/\bhost\s*\.\s*call\b/.test(host), 'the Host half must not reference the browser bridge');
});

test('normalize clamps unknown persisted values to the defaults', async () => {
  const { normalize, DEFAULTS } = await loadHostHalf();
  assert.deepEqual(normalize(null), DEFAULTS);
  assert.deepEqual(normalize({ enabled: 'yes', theme: 'neon' }), DEFAULTS);
  assert.deepEqual(normalize({ enabled: false, theme: 'iron' }), { enabled: false, theme: 'iron', boot: true, windowSize: DEFAULTS.windowSize });
  assert.deepEqual(normalize({ enabled: true, theme: 'auto', boot: false }), { enabled: true, theme: 'auto', boot: false, windowSize: DEFAULTS.windowSize });
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
  assert.match(skin, /\$\{hostPart\('indicator'\)\}\[aria-disabled\]:hover:not\(\[aria-disabled="true"\]\)\{background:var\(--smooth-surface-3\);color:var\(--dsw-alias-brand-primary-new-colorprimary-new-color\)\}/);
  // An error is status, not chrome: it keeps the native red dot on the neutral button.
  assert.match(skin, /\$\{hostPart\('indicator'\)\}\[aria-disabled\] \$\{hostPart\('errorDot'\)\}\{background:var\(--dsw-alias-state-error-primary\)\}/);
  // aria-disabled is the discriminator: the connection status beside it carries data-phase
  // instead, so no rule may target every *_indicator node in the footer.
  assert.ok(!/\$\{hostPart\('indicator'\)\}\{/.test(skin), 'a bare indicator rule would also restyle the connection status');
});

test('the tab scroll arrows float over the strip instead of squeezing its width', () => {
  // As flex items, the arrows took 22px + gap out of the nav whenever an edge began
  // to overflow, reflowing every tab and feeding the overflow observer. They are
  // absolute overlays now, so showing/hiding one cannot change the strip width.
  assert.match(skin, /\.smooth-tab-scroll\{[^}]*position:absolute[^}]*background:var\(--smooth-surface\)/);
  assert.match(skin, /\.smooth-tab-scroll\[data-side="left"\]\{left:calc\(10 \* var\(--smooth-u\)\)\}/);
  assert.match(skin, /\.smooth-tab-scroll\[data-side="right"\]\{right:calc\(10 \* var\(--smooth-u\)\)\}/);
  assert.ok(!/\.smooth-tab-scroll\{[^}]*flex:none/.test(skin), 'the arrows no longer participate in the flex line');
  // The bar reserves the right arrow's slot in its own padding, so the strip stops a
  // gap short of the floating arrow and a tab's close button is never under it.
  assert.match(skin, /\.smooth-workspace-bar\{[^}]*padding:0 35px 0 5px/);
  assert.ok(!/\.smooth-tab-scroll:disabled\{/.test(skin), 'an arrow that cannot scroll is not drawn at all');
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
  assert.match(skin, /\$\{hostPart\('newSession'\)\}\{height:calc\(30 \* var\(--smooth-l\)\);min-height:calc\(30 \* var\(--smooth-l\)\);margin-top:calc\(2 \* var\(--smooth-l\)\);margin-bottom:calc\(3 \* var\(--smooth-l\) \+ 1px\);border-radius:calc\(10 \* var\(--smooth-l\)\);font-size:calc\(14 \* var\(--smooth-l\)\)\}/);
});

test('the light selected workspace tab uses the soft selection fill, not the muted grey', () => {
  // Mixing the white caption surface with the dark muted label produced a grey chip
  // that read as black in light mode; the palette's selected token is the blue the
  // rest of the light selection states already use.
  assert.match(skin, /body\[data-smooth-skin\]:not\(\[data-ds-dark-theme\]\) \.smooth-workspace-tab\[data-selected="true"\]\{background-color:var\(--smooth-selected\)\}/);
  assert.match(skin, /body\[data-smooth-skin\]:not\(\[data-ds-dark-theme\]\) \.smooth-workspace-tab\[data-selected="true"\]:hover\{background-color:color-mix\(in srgb,var\(--smooth-selected\) 94%,var\(--smooth-text\)\)\}/);
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
  assert.match(skin, /\$\{hostPart\('sidebarCol'\)\} \$\{hostPart\('sessionRow'\)\}\{height:28px;border-radius:8px\}/);
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\} \$\{hostPart\('title'\)\}\{font-size:12\.5px;line-height:18px;color:var\(--smooth-muted\)\}/);
  assert.match(skin, /\$\{hostPart\('sessionRow'\)\}[^{]*\[aria-selected="true"\] \$\{hostPart\('title'\)\}\{color:var\(--smooth-text\)\}/);
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
  assert.match(skin, /\$\{hostPart\('projectRow'\)\}\{height:29px;border-radius:8px\}/);
  assert.match(skin, /\$\{hostPart\('projectRow'\)\} \$\{hostPart\('title'\)\}\{font-size:13\.5px;line-height:19px;font-weight:500\}/);
  assert.match(skin, /\$\{hostPart\('sectionLabel'\)\}\{font-size:12px;line-height:18px\}/);
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

test('the conversation header follows the reference: chips under the title, tabs centred', () => {
  // The host stacks the view tabs in a second grid row spanning the header. The skin
  // moves them onto the title line, centred over the header, and splits the title
  // cluster so its action chips sit under the title instead of beside it. Only the
  // ground stays the skin's own; the type, pills and spacing are the reference's.
  assert.match(skin, /:has\(\[data-content-phase\]\) \$\{hostPart\('header'\)\}:has\(\[data-conversation-tabs\]\)\{position:relative;padding:4px 18px 6px 14px;min-height:0\}/);
  assert.match(skin, /\$\{hostPart\('titleRow'\)\}\{grid-column:2;grid-row:1;display:grid;grid-template-columns:minmax\(0,1fr\) auto auto;align-items:start;column-gap:6px;min-height:0\}/);
  assert.match(skin, /\$\{hostPart\('titleCluster'\)\}\{display:grid;grid-template-columns:minmax\(0,1fr\);align-content:center;gap:1px\}/);
  // The view switch is a segmented pill: one track, a thumb that slides between the two
  // views, and the whole control faded out until the pointer is in the conversation.
  assert.match(skin, /\[data-conversation-tabs\]\{position:absolute;left:50%;top:6px;transform:translateX\(-50%\)[^}]*opacity:0;transition:opacity \.18s ease\}/);
  assert.match(skin, /\[data-conversation-tabs\]::before\{content:"";position:absolute;top:0;bottom:0;left:0;width:50%;[^}]*transition:transform \.26s cubic-bezier\(\.22,1,\.36,1\)\}/);
  assert.match(skin, /\[data-conversation-tabs\]:has\(>\[role="tab"\]:nth-child\(2\)\[aria-selected="true"\]\)::before\{transform:translateX\(100%\)\}/);
  assert.match(skin, /\$\{hostPart\('centerCol'\)\}:hover \$\{hostPart\('header'\)\} \[data-conversation-tabs\]/);
  // Clicking a view leaves :focus on the tab; only keyboard focus may pin the switch
  // open, so the reveal keys on :focus-visible rather than :focus-within.
  assert.match(skin, /\[data-conversation-tabs\]:has\(:focus-visible\)\{opacity:1\}/);
  assert.ok(!/\[data-conversation-tabs\]:focus-within/.test(skin), 'a clicked view must not pin the switch open');
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

test('every CSS custom property the skin reads exists as a plugin token or a literal', async () => {
  const { buildTokens } = await loadHostHalf();
  const tokens = new Set(Object.keys(buildTokens({ enabled: true, theme: 'auto' })));
  const used = new Set([...skin.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]));
  // The native composer exposes the user's font preference, its side clearance and the
  // card width ceiling; keep their literal fallbacks.
  const hostProperties = new Set(['--dsh-content-font-size', '--dsh-composer-side-clearance', '--dsh-composer-card-max-width']);
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

test('the skin stylesheet is scoped to the gating body attribute and never hides host content', async () => {
  const selectors = skin.matchAll(/(^|\})([^{}@]+)\{/g);
  let rules = 0;
  for (const [, , selector] of selectors) {
    const trimmed = selector.trim();
    if (!trimmed.startsWith('body[data-smooth-skin]')) continue;
    rules += 1;
    // Four hides and one icon cell are allowed, each one replacing something this layout
    // already provides: the plugin-owned collapsible balance panel, the settings close
    // button (whose job the tab bar in the same header already does), the welcome row (the
    // card's own info row already names the workspace and the branch), the card itself while
    // no tab is open (there is nowhere to type yet) and the workspace row's folder/chevron
    // glyph (the reference list names the workspace in type alone, and both glyphs share the
    // same 16px cell, so hiding only one would shift the label on hover). The host's own
    // preview badge is left alone.
    const contentRules = skin.replace(/body\[data-smooth-skin\] \.smooth-account-balance\{[^}]*\}/, '')
      .replace(/body\[data-smooth-skin\] \[data-shortcut-modal="settings"\] \$\{hostPart\('header'\)\}>\$\{accountPart\('close'\)\}\{display:none\}/, '')
      .replace(/body\[data-smooth-skin\] \$\{hostPart\('composerHero'\)\} \$\{hostPart\('heroWorkspaceRow'\)\}\{[^}]*display:none[^}]*\}/, '')
      .replace(/body\[data-smooth-skin\]\[data-smooth-home\][\s\S]*?\{display:none/, '')
      .replace(/body\[data-smooth-skin\] \$\{hostPart\('sidebarCol'\)\} \$\{hostPart\('projectRow'\)\} :is\(\$\{hostPart\('folder'\)\},\$\{hostPart\('chevron'\)\}\)\{display:none\}/, '');
    assert.ok(!/\b(display\s*:\s*none|visibility\s*:\s*hidden)\b/.test(contentRules), 'only the balance panel, settings close, welcome row, empty-workspace card and the workspace folder cell may be hidden');
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
  assert.equal(bundle, `window.__ModuleLoader__.load({id:'dsh-smooth-skin',factory:(require)=>{const exports={};\n${shared}\n${skin}\n${boot}\n${watch}\n${bridge}\n${think}\n${composer}\n${usage}\n${account}\n${layout}\n${scrollbar}\n${client}\nreturn exports;}});\n`, 'rebuild the Client artifact after changing its sources');
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

