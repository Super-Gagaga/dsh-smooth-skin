import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = (name) => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');
// The bundle order: composer.js watches surfaces through watch.js.
const source = `${await read('watch.js')}\n${await read('composer.js')}`;
const sandbox = { PLUGIN_ID: 'smooth', hostPart: name => `.${name}` };
runInNewContext(source + '\nglobalThis.readBranch = readWorkspaceBranch; globalThis.install = installComposerLayout; globalThis.installHint = installComposerHint; globalThis.installFallback = installComposerFallbackHint; globalThis.installCaret = installSmoothCaret; globalThis.findChip = findNativeWorkspaceChip; globalThis.openPicker = openNativeWorkspacePicker;', sandbox);

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
    closest: (selector) => selector === '[data-composer-card]' ? card : null,
    contains: () => true,
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 290, height: 22 }),
  };
  const live = { startContainer: input, getBoundingClientRect: () => liveRect, cloneRange() { return this; }, collapse() {} };
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
  sandbox.document = document;
  sandbox.window = window;
  const dispose = sandbox.installCaret(input);
  const flush = () => { for (let guard = 0; guard < 20 && frames.length; guard++) frames.shift()(16); };
  flush();
  const result = { caret, card, grow, input, flush, dispose, document, window };
  // The sandbox is shared between tests; drop the DOM so later tests start clean.
  result.reset = () => { delete sandbox.document; delete sandbox.window; };
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
  // an active input state, so the hero never mounted the host and the native model
  // menu opened there instead of the effort panel.
  const seat = overrides.get('conversation.input.overlay');
  assert.ok(seat, 'the model/effort panel host lives beside the composer overlays');
  assert.equal(seat.options.id, 'smooth.model');
  assert.equal(seat.options.order, -70);
  assert.equal(overrides.has('conversation.input.right'), false, 'input.right only renders with an active input state');
  assert.equal(overrides.has('conversation.composer.bar'), false, 'the native composer retains its child-slot ownership');
  dispose(); assert.equal(overrides.size, 0);
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
