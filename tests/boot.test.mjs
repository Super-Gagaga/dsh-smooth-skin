import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = (url) => readFile(new URL(url, import.meta.url), 'utf8');
const shared = await read('../src/shared.js');
const boot = await read('../src/boot.js');

/** The Host artifact is exactly these files, so the tests evaluate them together. */
const hostHalf = runInNewContext(`${shared}\n${boot}\n({
  injections: bootInjections, css: SPLASH_CSS, squash: squashCss, html: splashHtml(), inner: splashInnerHtml(), script: splashScript(),
  id: SPLASH_ID, attribute: BOOT_ATTRIBUTE, storageKey: STORAGE_KEY,
  hold: SPLASH_HOLD_MS, cap: SPLASH_CAP_MS, settle: SPLASH_SETTLE_MS,
  path: SPLASH_WHALE_PATH,
})`, {});

function createNode(tag) {
  return {
    tagName: String(tag).toUpperCase(), className: '', textContent: '', children: [], parent: undefined, parentNode: undefined,
    childElementCount: 0, attributes: new Map(), isConnected: true,
    setAttribute(name, value) { this.attributes.set(name, String(value)); },
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; },
    hasAttribute(name) { return this.attributes.has(name); },
    removeAttribute(name) { this.attributes.delete(name); },
    get firstChild() { return this.children[0]; },
    appendChild(child) { child.parent = child.parentNode = this; this.children.push(child); this.childElementCount = this.children.length; return child; },
    removeChild(child) {
      const at = this.children.indexOf(child);
      if (at >= 0) this.children.splice(at, 1);
      child.parent = child.parentNode = undefined;
      this.childElementCount = this.children.length;
      return child;
    },
    querySelector(selector) {
      return (this.selectors?.[selector]) || null;
    },
  };
}

/** Run the injected script against a fake document, clock and storage. */
function runSplash({ stored, reduced = false, mounted = false, observe = true, rootPresent = true } = {}) {
  const body = createNode('body');
  const root = createNode('div');
  root.childElementCount = mounted ? 1 : 0;
  const layer = createNode('div');
  const animate = { begun: 0, beginElement() { this.begun += 1; } };
  layer.querySelector = (selector) => (selector === 'animate' ? animate : null);
  const documentElement = createNode('html');
  const nodes = rootPresent ? { [hostHalf.id]: layer, root } : { [hostHalf.id]: layer };
  const calls = { observers: 0, disconnected: 0, observed: [] };
  const timers = new Map();
  let now = 0;
  let nextTimer = 0;
  const sandbox = {
    document: {
      documentElement, body,
      getElementById: (id) => nodes[id] || null,
    },
    window: {
      localStorage: { getItem: () => (stored === undefined ? null : JSON.stringify(stored)) },
      matchMedia: () => ({ matches: reduced }),
      MutationObserver: observe ? class {
        constructor(fn) { this.fn = fn; calls.observers += 1; calls.instance = this; }
        observe(target, options) { calls.observed.push({ target, options }); }
        disconnect() { this.disconnected = true; calls.disconnected += 1; }
      } : undefined,
    },
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: now + (delay || 0) }); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    Date: { now: () => now },
  };
  body.appendChild(layer);
  runInNewContext(hostHalf.script, sandbox);
  /** Run timers the way a browser does: each callback observes its own deadline,
   * so a timer scheduled from inside one is not pushed out by the sweep. */
  const advance = (delay) => {
    const target = now + delay;
    for (let guard = 0; guard < 400; guard++) {
      const due = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = Math.max(now, due[1].at);
      due[1].fn();
    }
    now = target;
  };
  return {
    layer, animate, body, root, documentElement, calls, advance,
    // The shell cannot mount before its container exists, so both appear together.
    mount: () => { root.childElementCount = 1; nodes.root = root; },
    notify: () => calls.instance?.fn(),
    live: () => layer.getAttribute('data-smooth-splash-live'),
    phase: () => layer.getAttribute('data-smooth-splash-out'),
    attached: () => body.children.includes(layer),
    pending: () => timers.size,
  };
}

test('the splash rows are one style, one markup and one script, in that order', () => {
  const rows = hostHalf.injections();
  assert.deepEqual(Array.from(rows, (row) => String(row.kind)), ['style', 'html', 'script']);
  assert.equal(rows[0].text, hostHalf.squash(hostHalf.css), 'the style row is the readable sheet with its comments and indentation dropped');
  assert.equal(rows[1].html, hostHalf.html);
  assert.equal(rows[1].placement, 'body');
  assert.equal(rows[2].text, hostHalf.script);
  assert.equal(rows[2].placement, 'body');
  // Rows travel to the static deployment payload too, so they must stay JSON data.
  assert.equal(JSON.stringify(rows), JSON.stringify(JSON.parse(JSON.stringify(rows))));
  assert.ok(!/<\/script/i.test(hostHalf.script) && !/<\/script/i.test(hostHalf.html), 'a raw </script would end the injected tag');
  assert.ok(!/[<]/.test(hostHalf.script), 'the script keeps no `<` so the inline tag cannot be cut short');
});

test('the style row carries no comments, newlines or strings the squash could damage', () => {
  const [row] = hostHalf.injections();
  // The squash drops comments and whitespace without understanding strings, which is
  // only sound while no declaration carries one. Comments may hold an apostrophe —
  // they are gone by then — so the precondition is checked on the sheet without them.
  assert.ok(!/["']/.test(hostHalf.css.replace(/\/\*[\s\S]*?\*\//g, '')), 'the splash sheet holds no quoted value');
  assert.ok(!/\/\*/.test(row.text) && !/\n/.test(row.text), 'nothing that only helps a reader travels in the row');
  assert.ok(row.text.length < hostHalf.css.length * .8, `the row should shed its indentation: ${row.text.length} vs ${hostHalf.css.length}`);
  // Each rule that has to survive the squash, checked on the shipped text.
  for (const marker of [
    `#${hostHalf.id}{`, `body[data-ds-dark-theme] #${hostHalf.id}{`, '[data-smooth-splash-live]{',
    '[data-smooth-splash-out]{', 'width:clamp(112px,12vw,176px)', '--smooth-splash-ink:#000000',
    '--smooth-splash-ink:#ffffff', 'will-change:transform', '@keyframes smooth-splash-swim{',
    '@media(prefers-reduced-motion:reduce){', 'var(--dsh-boot-bg,',
  ]) assert.ok(row.text.includes(marker), `the squashed row lost ${marker}`);
  assert.equal(row.text, hostHalf.squash(row.text), 'squashing twice changes nothing');
  assert.equal((row.text.match(/\{/g) || []).length, (row.text.match(/\}/g) || []).length, 'the row still balances its blocks');
});

test('the opening watches the mount point, not the whole document', () => {
  const close = runSplash({});
  assert.equal(close.calls.observed.length, 1, 'the opening waits with one observer');
  assert.equal(close.calls.observed[0].target, close.root, 'the shell mounts into #root, so only its own children matter');
  // Compared field by field: the options object comes from the VM realm, so a strict
  // deep-equal would fail on prototypes rather than on content.
  assert.equal(close.calls.observed[0].options.childList, true);
  assert.equal(close.calls.observed[0].options.subtree, undefined, 'a subtree observer would hand over every mutation the shell makes');
  // The narrow watch still reveals the shell exactly as before.
  close.mount();
  close.notify();
  close.advance(hostHalf.hold);
  assert.equal(close.phase(), '', 'the opening still starts fading once the shell is mounted');
  assert.equal(close.body.getAttribute(hostHalf.attribute), 'reveal');

  // A page whose mount point has not been parsed yet keeps the old fallback: it cannot
  // watch a container it has never seen, and it still finds the shell when it appears.
  const late = runSplash({ rootPresent: false });
  assert.equal(late.calls.observed[0].target, late.documentElement);
  assert.equal(late.calls.observed[0].options.subtree, true);
  late.mount();
  late.notify();
  late.advance(hostHalf.hold);
  assert.equal(late.phase(), '', 'the fallback reveals on the same schedule');
});

test('the whale path ships rounded, within a fraction of a pixel of the original', () => {
  // Two decimals is what the injected row can afford: the worst-case coordinate shift
  // is 0.005 user units, and the mark is drawn at most 176px wide out of 23.16 units.
  for (const [, fraction] of hostHalf.path.matchAll(/\.(\d+)/g)) {
    assert.ok(fraction.length <= 2, `a coordinate kept more than two decimals: .${fraction}`);
  }
  assert.ok(!/(?:^|[\sA-Za-z])-0(?:[\sA-Za-z]|$)/.test(hostHalf.path), 'rounding must not leave a negative zero');
  assert.match(hostHalf.path, /^M[\d.\s-]+/, 'the silhouette still starts with a move');
  assert.ok(hostHalf.path.endsWith('Z'), 'and still closes its outline');
  assert.ok(hostHalf.path.length < 2400, `the silhouette should stay near 2.3 KB, got ${hostHalf.path.length}`);
  assert.ok(!/SPLASH_SWIM|HERO_SWIM/.test(boot), 'the morph frames are gone, not just unused');
});

test('the first splash frame contains only the native whale with no text or controls', () => {
  const html = hostHalf.html;
  assert.ok(html.startsWith(`<div id="${hostHalf.id}" aria-hidden="true">`));
  assert.match(html, /viewBox="0 0 23\.16 17\.04"/);
  assert.match(html, /fill="currentColor"/);
  assert.equal((html.match(/<path /g) || []).length, 1);
  assert.equal(html.replace(/<[^>]*>/g, '').trim(), '', 'no wordmark, caption or progress label remains');
  assert.ok(!/smooth-splash-(track|bar|name|chip|skin|wave)/.test(html));
  assert.ok(!/<(button|a|input)\b/.test(html), 'the opening holds nothing focusable');
});

test('the opening\u2019s only motion is a composited sway on the HTML box', () => {
  const html = hostHalf.html;
  // Morphing a path is main-thread work, and the opening is on screen exactly while the
  // app's first mount owns that thread: no SMIL, no per-frame geometry, no JavaScript.
  assert.ok(!/<animate\b/.test(html), 'no SMIL animation remains in the markup');
  assert.ok(!/attributeName|beginElement|Swim|swim/i.test(html), 'and none of the morph data ships with it');
  assert.match(html, new RegExp(`d="${hostHalf.path}"`), 'the silhouette is drawn inline and stays put');
  assert.ok(!/<animate\b/.test(hostHalf.script), 'the script never animates the whale');
  assert.ok(!/function swim|querySelector\("animate"\)/.test(hostHalf.script));
  // The sway hangs on the HTML wrapper: that is the element Chromium promotes and hands
  // to the compositor, so the motion survives a blocked main thread.
  const mark = /#dsh-smooth-splash \.smooth-splash-mark\{([^}]*)\}/.exec(hostHalf.css);
  assert.ok(mark, 'the whale box has its own rule');
  assert.match(mark[1], /will-change:transform/);
  assert.match(mark[1], /animation:2\.4s ease-in-out infinite smooth-splash-swim/);
  assert.match(mark[1], /transform-origin:50% 60%/);
  assert.match(hostHalf.css, /@keyframes smooth-splash-swim\{0%,to\{transform:none\}35%\{transform:rotate\(-2\.4deg\) translate\(-\.3px,-\.5px\)\}70%\{transform:rotate\(1deg\) translate\(\.2px,\.15px\)\}\}/);
  const svg = /#dsh-smooth-splash \.smooth-splash-mark>svg\{([^}]*)\}/.exec(hostHalf.css);
  assert.ok(svg, 'the whale itself keeps a plain rule');
  assert.ok(!/animation|will-change|transform:/.test(svg[1]), 'the svg carries no animation of its own');
  // The opening only ever fades out: no entrance animation on the mark, no exit one.
  assert.ok(!/smooth-splash-whale-(in|out)/.test(hostHalf.css), 'the whale has no entrance or exit animation of its own');
  assert.match(hostHalf.css, /#dsh-smooth-splash\[data-smooth-splash-out\]\{opacity:0;transition:opacity/);
  assert.ok(!/transition:opacity/.test(hostHalf.css.split('data-smooth-splash-out')[0]), 'appearing is instant, not a fade-in');
});

test('the splash stylesheet is self-contained and never blocks the app', () => {
  const css = hostHalf.css;
  for (const line of css.split('\n').map((value) => value.trim()).filter((value) => value.includes('{'))) {
    assert.match(line, new RegExp(`^(#${hostHalf.id}|body\\[data-ds-dark-theme\\] #${hostHalf.id}|@media\\(prefers-reduced-motion:reduce\\)|@keyframes )`), `ungated rule: ${line}`);
  }
  assert.match(css, /pointer-events:none/);
  assert.match(css, /opacity:0/);
  assert.ok(!/display\s*:\s*none/.test(css.slice(0, css.indexOf('@media(prefers-reduced-motion:reduce)'))), 'hiding is reserved for the reduced-motion skip');
  // The stylesheet is in the head before the skin tokens exist, so every token it
  // does not define itself carries a literal fallback: the layer must paint right on
  // the first frame.
  const local = new Set([...css.matchAll(/(--smooth-splash-[a-z-]+)\s*:/g)].map((match) => match[1]));
  assert.ok(local.has('--smooth-splash-ink'), 'the monochrome foreground is declared on the layer');
  for (const [, name, next] of css.matchAll(/var\((--[a-z0-9-]+)(.)/g)) {
    if (local.has(name)) continue;
    assert.equal(next, ',', `${name} is read without a fallback`);
  }
  assert.match(css, /var\(--dsh-boot-bg,/);
});

test('the whale is enlarged and monochrome without a backplate or a border', () => {
  assert.match(hostHalf.css, /width:clamp\(112px,12vw,176px\)/);
  assert.match(hostHalf.css, /--smooth-splash-ink:#000000/);
  assert.match(hostHalf.css, /--smooth-splash-ink:#ffffff/);
  assert.match(hostHalf.css, /border:0;border-radius:0;background:transparent;box-shadow:none/);
  assert.ok(!/radial-gradient|smooth-splash-sweep|smooth-splash-draw/.test(hostHalf.css));
  // The script only ever reaches into its own layer, and now not even for an animation.
  assert.ok(!/cloneNode|querySelector/.test(hostHalf.script), 'the first frame never waits for a sidebar icon');
});

test('the opening hands the same static whale to the shell', () => {
  assert.ok(hostHalf.html.includes(`d="${hostHalf.path}"`), 'the frame rests on the FishLogo silhouette');
  assert.ok(!/animateTransform|1\.8s/.test(hostHalf.html), 'none of the earlier sway shapes came back');
});

test('the opening keeps no main-thread animation to start', () => {
  assert.match(hostHalf.css, /will-change:transform/);
  assert.ok(!/function swim|beginElement/.test(hostHalf.script));
  assert.match(hostHalf.script, /function begin\(\)\{clearTimeout\(capTimer\);go\(\);\}/);

  const late = runSplash({});
  assert.equal(late.live(), '', 'the layer is up before the shell exists');
  late.mount();
  late.notify();
  late.advance(hostHalf.hold + hostHalf.settle);
  assert.equal(late.attached(), false, 'and still retires on the same schedule');
});

test('a disabled skin or a disabled setting never shows the opening', () => {
  for (const stored of [{ enabled: false, theme: 'auto', boot: true }, { enabled: true, theme: 'auto', boot: false }]) {
    const run = runSplash({ stored });
    assert.equal(run.attached(), false, 'the layer is dropped before the first paint');
    assert.equal(run.live(), null);
    assert.equal(run.body.getAttribute(hostHalf.attribute), null);
    assert.equal(run.pending(), 0);
  }
  const absent = runSplash({});
  assert.equal(absent.attached(), true, 'no stored state means the defaults, which play the opening');
  assert.equal(absent.live(), '');
});

test('reduced motion skips the opening without touching the shell', () => {
  const run = runSplash({ reduced: true });
  assert.equal(run.attached(), false);
  assert.equal(run.body.getAttribute(hostHalf.attribute), null);
  assert.equal(run.calls.observers, 0);
});

test('the opening waits for the app, then hands the shell over', () => {
  const run = runSplash();
  assert.equal(run.live(), '');
  assert.equal(run.calls.observers, 1, 'an unmounted app is watched instead of polled');
  run.mount();
  run.notify();
  run.advance(hostHalf.hold - 1);
  assert.equal(run.phase(), null, 'the opening holds for its minimum time');
  run.advance(1);
  assert.equal(run.phase(), '', 'the layer starts fading out');
  assert.equal(run.body.getAttribute(hostHalf.attribute), 'reveal', 'the shell fades in on the same tick');
  assert.equal(run.attached(), true);
  run.advance(hostHalf.settle);
  assert.equal(run.attached(), false);
  assert.equal(run.body.getAttribute(hostHalf.attribute), null);
  assert.equal(run.pending(), 0);
});

test('an app that never mounts still gets its screen back', () => {
  const run = runSplash({});
  run.advance(hostHalf.hold + hostHalf.cap - 1);
  assert.equal(run.phase(), null);
  run.advance(1);
  assert.equal(run.phase(), '');
  assert.equal(run.calls.disconnected, 1);
  run.advance(hostHalf.settle);
  assert.equal(run.attached(), false);
  assert.equal(run.body.getAttribute(hostHalf.attribute), null);
  assert.equal(run.pending(), 0);
});

test('an already mounted app reveals after the hold without waiting for a brand mark', () => {
  const run = runSplash({ mounted: true });
  assert.equal(run.calls.observers, 0);
  run.advance(hostHalf.hold - 1);
  assert.equal(run.phase(), null);
  run.advance(1);
  assert.equal(run.phase(), '', 'the whale is in the index, so no brand polling delays the handover');
});

test('without a MutationObserver the opening still ends', () => {
  const run = runSplash({ observe: false });
  run.advance(hostHalf.hold);
  assert.equal(run.phase(), '');
  assert.equal(run.attached(), true);
  run.advance(hostHalf.settle);
  assert.equal(run.attached(), false);
});

test('the exported whale asset is the injected whale, not a second drawing', async () => {
  const asset = await read('../assets/whale.svg');
  const viewBox = /viewBox="([^"]+)"/.exec(hostHalf.inner)[1];
  assert.ok(asset.includes(`viewBox="${viewBox}"`), 'the file scales with the same coordinate system');
  assert.ok(asset.includes(`d="${hostHalf.path}"`), 'the exported path is byte-for-byte the injected one');
  assert.match(asset, /fill="currentColor"/, 'the mark takes the surrounding ink colour');
  assert.doesNotMatch(asset, /<(script|animate|animateTransform|set)\b/, 'the asset carries no script and no frame-by-frame geometry');
  assert.match(asset, /tools\/export-icons\.mjs/, 'the file says how it is regenerated');
});
