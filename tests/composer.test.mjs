import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = (name) => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');
// The bundle order: composer.js watches surfaces through watch.js.
const source = `${await read('watch.js')}\n${await read('composer.js')}`;
const sandbox = { PLUGIN_ID: 'smooth', hostPart: name => `.${name}` };
runInNewContext(source + '\nglobalThis.readBranch = readWorkspaceBranch; globalThis.install = installComposerLayout; globalThis.installHint = installComposerHint; globalThis.installFallback = installComposerFallbackHint; globalThis.installCaret = installSmoothCaret; globalThis.findChip = findNativeWorkspaceChip; globalThis.openPicker = openNativeWorkspacePicker; globalThis.occupancyOf = contextOccupancyOf; globalThis.tokensText = contextTokens; globalThis.exactText = contextExactTokens; globalThis.durationText = contextDuration; globalThis.cacheHit = contextCacheHit; globalThis.fill = contextFill; globalThis.offersDefault = offersDefaultEffort;', sandbox);

function files(entries) {
  const calls = [];
  return {
    calls,
    read: async (id, path, range, signal) => {
      calls.push({ id, path, range, signal });
      return entries[path] === undefined ? { ok: false, error: { code: 'workspace-file/not-found' } } : { ok: true, value: { text: entries[path] } };
    },
  };
}

test('Git branch is read from the selected session, including branch names with slashes', async () => {
  const api = files({ 'C:/repo/.git/HEAD': 'ref: refs/heads/feature/skin\n' });
  const signal = new AbortController().signal;
  assert.equal(await sandbox.readBranch(api, 'live', 'C:\\repo', signal), 'feature/skin');
  assert.equal(api.calls[0].id, 'live');
  assert.equal(api.calls[0].signal, signal);
});

test('worktrees, subdirectories and detached HEAD retain actual Git identity', async () => {
  const api = files({ 'C:/repo/.git': 'gitdir: ../main/.git/worktrees/repo', 'C:/repo/../main/.git/worktrees/repo/HEAD': 'ref: refs/heads/worktree' });
  assert.equal(await sandbox.readBranch(api, 's', 'C:/repo/src', new AbortController().signal), 'worktree');
  assert.equal(await sandbox.readBranch(files({ '/repo/.git/HEAD': 'a'.repeat(40) }), 's', '/repo', new AbortController().signal), 'aaaaaaaa');
});

test('missing repositories and cancelled reads never invent branch or file statistics', async () => {
  assert.equal(await sandbox.readBranch(files({}), 's', 'C:/repo', new AbortController().signal), undefined);
  const controller = new AbortController(); controller.abort();
  const api = files({});
  assert.equal(await sandbox.readBranch(api, 's', 'C:/repo', controller.signal), undefined);
  assert.equal(api.calls.length, 0);
});

test('compact prompts preserve native unavailable, workspace, planning and running hints', () => {
  let notify, disconnected = false;
  sandbox.MutationObserver = class {
    constructor(fn) { notify = fn; }
    observe(node, options) { assert.equal(node, input); assert.deepEqual(Array.from(options.attributeFilter), ['data-placeholder', 'aria-disabled']); }
    disconnect() { disconnected = true; }
  };
  const attributes = new Map([['data-placeholder', 'Original hero'], ['aria-label', 'Original hero']]);
  const input = { getAttribute: key => attributes.get(key) ?? null };
  const marker = new Map(), properties = new Map([['--smooth-composer-placeholder', '"Previous"']]);
  const placeholder = {
    textContent: 'Original hero', parentElement: { querySelector: () => input },
    style: { getPropertyValue: key => properties.get(key) || '', getPropertyPriority: () => 'important', setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) },
    getAttribute: key => marker.get(key) ?? null, setAttribute: (key, value) => marker.set(key, value), removeAttribute: key => marker.delete(key),
  };
  const dispose = sandbox.installHint(placeholder, ['Original hero', 'Original message'], 'Short prompt');
  assert.equal(properties.get('--smooth-composer-placeholder'), '"Short prompt"');
  assert.equal(marker.has('data-smooth-placeholder'), true);
  for (const prompt of ['Choose workspace', 'Plan guidance', 'Parent unavailable', 'Steer queued messages', 'Custom prompt']) {
    attributes.set('data-placeholder', prompt); notify();
    assert.equal(marker.has('data-smooth-placeholder'), false);
  }
  attributes.set('data-placeholder', 'Original message'); attributes.set('aria-disabled', 'true'); notify();
  assert.equal(marker.has('data-smooth-placeholder'), false);
  attributes.delete('aria-disabled'); notify(); assert.equal(marker.has('data-smooth-placeholder'), true);
  assert.equal(placeholder.textContent, 'Original hero', 'never replace React-owned text');
  assert.equal(attributes.get('aria-label'), 'Original hero', 'screen-reader instructions remain native');
  dispose(); assert.equal(disconnected, true); assert.equal(marker.size, 0);
  assert.equal(properties.get('--smooth-composer-placeholder'), '"Previous"');
  assert.equal(sandbox.installHint(null, [], ''), undefined);
});

test('the hint survives attachments, when the host drops its placeholder element', () => {
  let notify; let disconnects = 0;
  sandbox.MutationObserver = class {
    constructor(fn) { notify = fn; }
    observe() {}
    disconnect() { disconnects += 1; }
  };
  sandbox.document = { createElement: () => ({ className: '', hidden: true, textContent: '', attributes: new Map(), setAttribute(key, value) { this.attributes.set(key, value); }, remove() { this.removed = true; } }) };
  const grow = { element: null, append(element) { this.element = element; } };
  let nativePlaceholder = null;
  const attributes = new Map();
  const card = { querySelector: (selector) => selector === '[data-composer-placeholder]' ? nativePlaceholder : null };
  const input = {
    parentElement: grow,
    textContent: '',
    closest: () => card,
    querySelector: () => null,
    getAttribute: (key) => attributes.get(key) ?? null,
  };
  const dispose = sandbox.installFallback(input, 'Short prompt');
  assert.ok(grow.element, 'a hint node is placed in the editor box');
  assert.equal(grow.element.className, 'smooth-composer-fallback');
  assert.equal(grow.element.textContent, 'Short prompt');
  assert.equal(grow.element.attributes.get('aria-hidden'), 'true');
  assert.equal(grow.element.hidden, false, 'the hint is visible while the editor is empty');
  input.textContent = 'typed';
  notify();
  assert.equal(grow.element.hidden, true, 'typing hides the fallback');
  input.textContent = '';
  nativePlaceholder = {};
  notify();
  assert.equal(grow.element.hidden, true, 'the native placeholder takes over when it returns');
  nativePlaceholder = null;
  notify();
  assert.equal(grow.element.hidden, false);
  attributes.set('aria-disabled', 'true');
  notify();
  assert.equal(grow.element.hidden, true, 'disabled editors keep their native state');
  dispose();
  assert.equal(grow.element.removed, true);
  assert.equal(disconnects, 2);
});

test('the smooth caret degrades when the platform cannot report a selection', () => {
  assert.equal(sandbox.installCaret(null), undefined);
  assert.equal(sandbox.installCaret({ parentElement: {}, closest: () => ({}) }), undefined);
});

/** A composer whose editor reports the selection shapes that broke the first placement:
 * a container-level caret with no rect at all, and one that measures the border box. */
function caretHarness({ liveRect, probeRect }) {
  const frames = [];
  const caret = { style: {}, hidden: true, className: '', setAttribute() {}, remove() { this.removed = true; } };
  const grow = { appended: [], append(node) { this.appended.push(node); }, getBoundingClientRect: () => ({ left: 100, top: 50, width: 320, height: 22 }) };
  const card = { attributes: new Set(), setAttribute(name) { this.attributes.add(name); }, removeAttribute(name) { this.attributes.delete(name); } };
  const input = {
    parentElement: grow,
    textContent: 'hello world',
    closest: (selector) => selector === '[data-composer-card]' ? card : null,
    contains: () => true,
    querySelector: () => null,
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 290, height: 22 }),
  };
  const live = { startContainer: input, rect: liveRect, getBoundingClientRect() { return this.rect; }, cloneRange() { return this; }, collapse() {} };
  const probe = { selectNodeContents() {}, collapse() {}, getBoundingClientRect: () => probeRect };
  const document = {
    activeElement: input,
    createElement: () => caret,
    createRange: () => probe,
    addEventListener() {}, removeEventListener() {},
  };
  const window = {
    getSelection: () => ({ rangeCount: 1, isCollapsed: true, getRangeAt: () => live }),
    getComputedStyle: () => ({ paddingLeft: '14px', borderLeftWidth: '0px', paddingTop: '4px', borderTopWidth: '0px', lineHeight: '22px' }),
    requestAnimationFrame: (fn) => { frames.push(fn); return frames.length; },
    cancelAnimationFrame() {},
    addEventListener() {}, removeEventListener() {},
  };
  // The caret follows the editor's own content mutations; these tests drive the observer.
  const observers = [];
  const MutationObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  sandbox.document = document;
  sandbox.window = window;
  sandbox.MutationObserver = MutationObserver;
  const dispose = sandbox.installCaret(input);
  const flush = () => { for (let guard = 0; guard < 20 && frames.length; guard++) frames.shift()(16); };
  flush();
  const result = {
    caret, card, grow, input, live, flush, dispose, document, window, observers,
    /** Move the live DOM selection (and its measured rect) somewhere else. */
    select(rect, node = input) { live.rect = rect; live.startContainer = node; },
    /** Deliver the editor's content mutation, the way a programmatic clear does. */
    mutate() { for (const observer of observers) observer.callback(); },
  };
  // The sandbox is shared between tests; drop the DOM so later tests start clean.
  result.reset = () => { delete sandbox.document; delete sandbox.window; delete sandbox.MutationObserver; };
  return result;
}

test('an empty editor puts the smooth caret where its text starts, not in the padding', () => {
  // Lexical can anchor the caret on the editable itself: no rect (left) or the border box
  // (right). Both used to place the bar 14px early, inside the card's leading padding.
  for (const liveRect of [{ left: 100, top: 50, width: 0, height: 0 }, { left: 100, top: 50, width: 0, height: 22 }]) {
    const harness = caretHarness({ liveRect, probeRect: { left: 114, top: 54, width: 0, height: 22 } });
    try {
      assert.equal(harness.caret.hidden, false, 'the bar is shown once a caret exists');
      assert.equal(harness.caret.style.transform, 'translate(14px,4px)', 'the bar sits at the text origin, offset from the grow box');
      assert.equal(harness.caret.style.height, '22px');
      assert.equal(harness.card.attributes.has('data-smooth-caret'), true, 'the native caret stays hidden while the bar is drawn');
      assert.equal(harness.grow.appended.length, 1, 'the bar lives in the editor grow box');
      harness.dispose();
      assert.equal(harness.caret.removed, true);
      assert.equal(harness.card.attributes.has('data-smooth-caret'), false, 'disposing hands the native caret back');
    } finally {
      harness.reset();
    }
  }
});

test('the smooth caret measures twice before it animates, so a late layout does not stick', () => {
  // The first pass can land before the editor commits its paragraph; the second pass
  // re-reads the same frame budget and the bar still has no transition.
  const harness = caretHarness({
    liveRect: { left: 100, top: 50, width: 0, height: 0 },
    probeRect: { left: 114, top: 54, width: 0, height: 22 },
  });
  try {
    assert.equal(harness.caret.style.transition, '', 'the settle frame restores the glide');
  } finally {
    harness.dispose();
    harness.reset();
  }
});

test('the caret snaps back to the start when the host clears the draft after a send', () => {
  // Sending clears the committed draft inside a Lexical update. The browser re-anchors
  // the DOM selection to the empty root without firing `selectionchange`, so the bar kept
  // the transform of the sent text's end and stayed there. The content mutation must move
  // it to the editor's initial position instead.
  const harness = caretHarness({
    liveRect: { left: 414, top: 68, width: 0, height: 20 },
    probeRect: { left: 114, top: 54, width: 0, height: 22 },
  });
  try {
    assert.equal(harness.caret.style.transform, 'translate(314px,18px)', 'the bar sits where the typed text ends');
    assert.equal(harness.observers.length, 1, 'the caret follows the editor content');
    // The host's clear: text gone, selection re-anchored to the empty editor, no
    // selectionchange involved. Only the content observer sees this.
    harness.input.textContent = '';
    harness.select({ left: 100, top: 50, width: 0, height: 0 }, harness.input);
    harness.mutate();
    harness.flush();
    assert.equal(harness.caret.style.transform, 'translate(14px,4px)', 'the bar returns to the text origin');
    assert.equal(harness.caret.style.height, '22px');
    assert.equal(harness.caret.hidden, false);
    assert.equal(harness.card.attributes.has('data-smooth-caret'), true, 'the drawn bar keeps replacing the native caret');
    assert.equal(harness.caret.style.transition, '', 'the settle frame restores the glide after the snap');
  } finally {
    harness.dispose();
    assert.equal(harness.observers[0].disconnected, true, 'disposing stops following the editor content');
    harness.reset();
  }
});

test('the model panel host mounts for every session, the new-session hero included', () => {
  const overrides = new Map();
  sandbox.h = (type, props, ...children) => ({ type, props, children });
  sandbox.require = name => name === 'react-dom' ? { createPortal() {} } : {};
  const slots = {
    inject: (_name, setup) => setup(), entries: () => [],
    register: (options, component) => { overrides.set(options.name, { options, component }); return () => overrides.delete(options.name); },
  };
  const dispose = sandbox.install({
    slots, modelDirectories: {}, text: () => 'Short prompt',
    useSmoothState: () => ({ state: { enabled: true } }),
  });
  // The overlay renders inside the composer card with any Session — the hero (new
  // conversation) and the resident composer both. `conversation.input.right` requires
  // an active input state, so the hero never mounted it and the native model menu opened
  // there instead of the effort panel.
  const seat = overrides.get('conversation.input.overlay');
  assert.ok(seat, 'the model/effort panel host lives beside the composer overlays');
  assert.equal(seat.options.id, 'smooth.model');
  assert.equal(seat.options.order, -70);
  // The ring does belong in input.right: that list renders immediately before the native
  // model seat in the resident composer's control row, and only once a session has input
  // state (the hero has no context to measure, so no ring is expected there).
  const meter = overrides.get('conversation.input.right');
  assert.ok(meter, 'the context ring sits in the control row before the model seat');
  assert.equal(meter.options.id, 'smooth.context');
  assert.equal(meter.options.order, 60);
  assert.equal(typeof meter.component, 'function');
  assert.equal(overrides.has('conversation.composer.bar'), false, 'the native composer retains its child-slot ownership');
  dispose(); assert.equal(overrides.size, 0);
});

test('the context meter keeps the host reading, its ring style and the moved panel', () => {
  // The ring is the bounded occupancy reading; the host's dock row used the same maths.
  assert.deepEqual(
    { ...sandbox.occupancyOf({ pressureTokens: 150, contextWindow: 1000 }) },
    { percent: 15, usedTokens: 150, contextWindow: 1000 },
  );
  assert.equal(sandbox.occupancyOf({ pressureTokens: 3000, contextWindow: 1000 }).percent, 100, 'clamped to 100');
  assert.equal(sandbox.occupancyOf({ projectedTokens: 640, pressureTokens: 10, contextWindow: 1000 }).percent, 64, 'the projected reading wins');
  assert.equal(sandbox.occupancyOf({ pressureTokens: 10 }), null, 'no capacity yet means no ring');
  assert.equal(sandbox.occupancyOf(undefined), null);

  const text = (key, fallback) => fallback;
  assert.equal(sandbox.tokensText(517, text), '517');
  assert.equal(sandbox.tokensText(12200, text), '12.2K');
  assert.equal(sandbox.tokensText(517000, text), '517K');
  assert.equal(sandbox.tokensText(1200000, text), '1.2M');
  assert.equal(sandbox.exactText(4055212, text), '4,055,212');
  assert.equal(sandbox.durationText(45200, text), '45.2秒');
  assert.equal(sandbox.durationText(4870000, text), '81分10秒');
  assert.equal(sandbox.cacheHit({ cacheReadTokens: 99, uncachedInputTokens: 1 }), '99');
  assert.equal(sandbox.cacheHit({ cacheReadTokens: 100 }), '100');
  assert.equal(sandbox.cacheHit({ cacheReadTokens: 999, uncachedInputTokens: 1 }), '99.9', 'a partial hit never reads as flat 100%');
  assert.equal(sandbox.cacheHit({}), null);
  assert.equal(sandbox.fill('~%s / %s', '681K', '1M'), '~681K / 1M');
  // The dock row is hidden by the stylesheet; the seat draws the ring and its own panel.
  assert.match(source, /conversation\.input\.right/);
  assert.match(source, /smooth-context-ring-fill/);
  assert.match(source, /props\.useProjection\('contextPressure'\)/);
  assert.match(source, /props\.useProjection\('contextBreakdown'\)/);
  assert.match(source, /props\.useProjection\('sessionStats'\)/);
  assert.match(source, /props\.useProjection\('tokenUsage'\)/);
  assert.match(source, /smooth-context-menu/);
});

test('the effort panel offers a Default auto chip exactly where the host menu does', () => {
  // The host adds its "Default" effort choice only to catalogues without a fixed default
  // stop, so the chip follows the same rule: Kimi-style provider-default models get it,
  // DeepSeek's fixed-High catalogue does not.
  assert.equal(sandbox.offersDefault({ efforts: [{ id: 'off' }, { id: 'high' }] }), true, 'no defaultEffort means Default is offered');
  assert.equal(sandbox.offersDefault({ efforts: [{ id: 'off' }], defaultEffort: 'high' }), false, 'a fixed default stop leaves no Default choice');
  assert.equal(sandbox.offersDefault({ efforts: [] }), false, 'a model without levels has no effort panel');
  assert.equal(sandbox.offersDefault(undefined), false);
  // The chip sits in the level row and returns the selection without reasoningEffort,
  // which is exactly the host's provider-default request.
  assert.match(source, /aria-pressed': defaultActive/);
  assert.match(source, /'data-active': defaultActive/);
  // Its visible label is the state it sets, taken from the locale table, rather than a
  // hard-coded Latin string sitting inside an otherwise localised row.
  assert.match(source, /text\('composer\.effortDefault', 'Default'\)/);
  assert.doesNotMatch(source, /\}, 'auto'\)/, 'the chip label must be reachable by the locale table');
  assert.match(source, /className: 'smooth-model-auto'/);
  assert.match(source, /props\.select\(\{ provider: current\.provider, model: current\.model \}\)/);
  assert.match(source, /const defaultActive = defaultOption && draft == null/);
  // Default is not a stop on the scale: the slider dims while the provider owns the level.
  assert.match(source, /'data-default': defaultActive \? 'true' : undefined/);
});

test('the metadata workspace chip toggles the native picker and anchors it to the visible chip', () => {
  let clicked = 0;
  const rect = { left: 10, top: 20, width: 30, height: 18 };
  const chip = {
    dataset: {},
    click: () => { clicked += 1; },
    getAttribute: () => 'false',
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
  };
  sandbox.document = {
    querySelector: selector => selector.includes('heroWorkspaceRow') && selector.includes('button[aria-haspopup="menu"]') ? chip : null,
  };
  const button = { getBoundingClientRect: () => rect };
  assert.equal(sandbox.findChip(), chip, 'the hidden native workspace chip is the picker owner');
  assert.equal(sandbox.openPicker(button), chip);
  assert.equal(clicked, 1, 'the visible metadata chip clicks the native control');
  assert.equal(chip.getBoundingClientRect(), rect, 'the picker anchors to the visible chip, not the hidden row');
  sandbox.openPicker(button);
  assert.equal(clicked, 2, 'a second click still toggles the native picker');
});

test('relocated native controls retain injection, locale, store, child slots and clean up', () => {
  const entries = new Map();
  const listeners = new Map();
  const children = { 'conversation.hero.agentPreset.detail': { kind: 'single', scope: 'session', inline: true } };
  const native = { component: () => 'native', options: { priority: 0, children }, locale: 'native', inject: () => ({}), store: {} };
  entries.set('conversation.hero.agentPreset', [native]);
  const registered = [];
  sandbox.require = name => name === 'react-dom' ? { createPortal() {} } : {};
  const slots = {
    inject: (_name, setup) => setup(),
    entries: name => entries.get(name) || [],
    subscribe: (name, fn) => { listeners.set(name, fn); return () => listeners.delete(name); },
    register: (options, component) => {
      const entry = { ...options, options, component };
      entries.set(options.name, [...(entries.get(options.name) || []), entry]);
      registered.push(entry);
      return () => entries.set(options.name, entries.get(options.name).filter(item => item !== entry));
    },
  };
  sandbox.PLUGIN_ID = 'smooth';
  const dispose = sandbox.install({ slots });
  const relocated = registered.find(item => item.options.name === 'conversation.hero.agentPreset');
  assert.equal(relocated.inject, native.inject);
  assert.equal(relocated.store, native.store);
  assert.equal(relocated.locale, native.locale);
  assert.equal(relocated.options.children, children, 'the relocated entry keeps its nested slot declarations');
  assert.equal(relocated.options.priority, -10);
  dispose();
  assert.equal(entries.get('conversation.hero.agentPreset').length, 1);
  assert.equal(entries.get('conversation.input.overlay').length, 0);
  assert.equal(listeners.size, 0);
});

test('the model panel keeps its open/close motion in the component, not just the stylesheet', () => {
  // The portal mount is the open animation's first frame: collapsed, then flipped to
  // `open` after the browser painted that frame. Closing flips to `closing` and only
  // unmounts when the 280ms timer (the .26s transition plus a frame) settles.
  assert.match(source, /'data-state': phase/);
  assert.match(source, /React\.useState\('open'\)/, 'the panel mounts already open: no frame is spent collapsed');
  assert.match(source, /setPhase\('closing'\)/);
  assert.match(source, /window\.setTimeout\(onClose, 160\)/, 'the exit animation is short and the portal is removed right after it');
  assert.match(source, /window\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/, 'reduced motion skips the animation');
  // The trigger's own second click is routed through the panel so the collapse plays.
  assert.match(source, /if \(closeRef\.current\) \{ closeRef\.current\(\); return; \}/);
  assert.match(source, /closeRef\.current = requestClose/);
});

test('the dialog trigger states whether its pane is showing', () => {
  // 'menu' promised an arrow-key contract this panel never had, so the trigger announces a
  // dialog. A dialog trigger also has to report its expanded state, the way the context
  // ring's trigger does, or assistive tech is told about a dialog and never its state.
  // Pinned as the ordered triple the model trigger actually renders: a bare
  // `aria-haspopup: 'dialog'` match would pass off the context ring's unrelated trigger.
  assert.match(source, /'aria-haspopup': 'dialog',\s*'aria-expanded': props\.modelsOpen === undefined \? undefined : \(props\.modelsOpen \? 'true' : 'false'\),\s*onClick: \(\) => props\.onOpenModels\?\.\(\),/);
  assert.match(source, /modelsOpen: view === 'models'/, 'the pane on screen is what the trigger reports');
});

test('every composer locale key the panel asks for exists in both tables', () => {
  // A key that exists only at its call site falls back to the Chinese literal in the English
  // UI, which is how `composer.back` shipped unreachable. Check the whole keyspace, not a list.
  const composer = source;
  const shared = readFile(new URL('../src/shared.js', import.meta.url), 'utf8');
  return shared.then((table) => {
    const zh = table.slice(table.indexOf('const zhCN'), table.indexOf('const enUS'));
    const en = table.slice(table.indexOf('const enUS'));
    const used = new Set([...composer.matchAll(/text\('([a-z][\w.]*)'/g)].map((match) => match[1]));
    assert.ok(used.size > 40, `expected the panel to ask for many keys, saw ${used.size}`);
    for (const key of used) {
      const pattern = new RegExp(`'${key.replace(/\./g, '\\.')}':`);
      assert.match(zh, pattern, `missing zh ${key}`);
      assert.match(en, pattern, `missing en ${key}`);
    }
    assert.match(zh, /'composer\.back': '返回'/);
    assert.match(en, /'composer\.back': 'Back'/);
  });
});
