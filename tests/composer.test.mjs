import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = (name) => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');
// The bundle order: pricing.js feeds the usage line, bridge.js + cost.js feed the
// settled/live money reading, composer.js watches surfaces.
const source = `${await read('pricing.js')}\n${await read('watch.js')}\n${await read('bridge.js')}\n${await read('cost.js')}\n${await read('composer.js')}`;
const sandbox = { PLUGIN_ID: 'smooth', hostPart: name => `.${name}` };
runInNewContext(source + '\nglobalThis.readBranch = readWorkspaceBranch; globalThis.install = installComposerLayout; globalThis.installHint = installComposerHint; globalThis.installFallback = installComposerFallbackHint; globalThis.installCaret = installSmoothCaret; globalThis.findChip = findNativeWorkspaceChip; globalThis.openPicker = openNativeWorkspacePicker; globalThis.occupancyOf = contextOccupancyOf; globalThis.tokensText = contextTokens; globalThis.exactText = contextExactTokens; globalThis.durationText = contextDuration; globalThis.cacheHit = contextCacheHit; globalThis.fill = contextFill; globalThis.priceModel = usagePriceModel; globalThis.inputTokens = usageInputTokens; globalThis.costMicro = usageCostMicro; globalThis.outputRate = usageOutputRate; globalThis.costText = usageCostText; globalThis.peakAt = usagePeakAt; globalThis.offersDefault = offersDefaultEffort; globalThis.filterWorkspaces = filterWorkspaces; globalThis.workspaceName = workspaceName; globalThis.combineCost = combineSessionCost; globalThis.estimateTokens = estimateStreamTokens; globalThis.sessionFeed = createSessionCostFeed; globalThis.streamMeter = createStreamingMeter;', sandbox);

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
function caretHarness({ liveRect, probeRect, liveNode, liveOffset = 0, nodes = [], text = 'hello world' }) {
  const frames = [];
  const caret = { style: {}, hidden: true, className: '', setAttribute() {}, remove() { this.removed = true; } };
  const grow = { appended: [], append(node) { this.appended.push(node); }, getBoundingClientRect: () => ({ left: 100, top: 50, width: 320, height: 22 }) };
  const card = { attributes: new Set(), setAttribute(name) { this.attributes.add(name); }, removeAttribute(name) { this.attributes.delete(name); } };
  const input = {
    nodeType: 1,
    nodeName: 'DIV',
    parentElement: grow,
    textContent: text,
    childNodes: nodes,
    closest: (selector) => selector === '[data-composer-card]' ? card : null,
    contains: () => true,
    querySelector: () => null,
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect: () => ({ left: 100, top: 50, width: 290, height: 22 }),
  };
  const live = { startContainer: liveNode || input, startOffset: liveOffset, rect: liveRect, getBoundingClientRect() { return this.rect; }, cloneRange() { return this; }, collapse() {} };
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
    select(rect, node = input, offset = 0) { live.rect = rect; live.startContainer = node; live.startOffset = offset; },
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

/** The DOM shape Lexical leaves after Shift+Enter: the line break becomes a <br>, and the
 * collapsed selection stays on the paragraph, one point past that trailing break. */
function softBreakNodes(breakRect) {
  const text = { nodeType: 3, nodeName: '#text' };
  const br = { nodeType: 1, nodeName: 'BR', previousSibling: text, getBoundingClientRect: () => breakRect };
  const paragraph = { nodeType: 1, nodeName: 'P', childNodes: [text, br], getBoundingClientRect: () => ({ left: 114, top: 54, width: 290, height: 44 }) };
  return { text, br, paragraph };
}

test('a soft line break keeps the caret on the line it opened, not the paragraph start', () => {
  // Shift+Enter leaves the DOM selection on the paragraph element, past the trailing
  // <br>; the paragraph's border box begins on the line above, which used to snap the bar
  // back to the paragraph's first line. The caret belongs on the line below the break —
  // whether the break reports its own box or nothing at all.
  for (const breakRect of [
    { left: 260, top: 54, width: 0, height: 22 },
    { left: 0, top: 0, width: 0, height: 0 },
  ]) {
    const { paragraph } = softBreakNodes(breakRect);
    const harness = caretHarness({
      liveRect: paragraph.getBoundingClientRect(),
      liveNode: paragraph,
      liveOffset: 2,
      probeRect: { left: 114, top: 54, width: 0, height: 22 },
    });
    try {
      assert.equal(harness.caret.style.transform, 'translate(14px,26px)', 'the bar sits on the new line');
      assert.equal(harness.caret.style.height, '22px');
      assert.equal(harness.caret.hidden, false);
    } finally {
      harness.dispose();
      harness.reset();
    }
  }
});

test('a new empty paragraph parks the caret on its own line', () => {
  // Enter puts the selection at the start of a fresh paragraph holding one <br>. Its box
  // is the only line there is, so the bar must sit on that box, not at the editor start.
  const br = { nodeType: 1, nodeName: 'BR', previousSibling: null, getBoundingClientRect: () => ({ left: 114, top: 76, width: 0, height: 22 }) };
  const paragraph = { nodeType: 1, nodeName: 'P', childNodes: [br], getBoundingClientRect: () => ({ left: 114, top: 76, width: 290, height: 22 }) };
  const harness = caretHarness({ liveRect: paragraph.getBoundingClientRect(), liveNode: paragraph, liveOffset: 0 });
  try {
    assert.equal(harness.caret.style.transform, 'translate(14px,26px)', 'the bar sits on the new paragraph line');
  } finally {
    harness.dispose();
    harness.reset();
  }
});

test('an unmeasurable element-level caret hands the native caret back', () => {
  // If the break and the block behind the point report no geometry at all, guessing the
  // editor start is worse than letting the browser draw its own caret in the right place.
  const text = { nodeType: 3, nodeName: '#text' };
  const br = { nodeType: 1, nodeName: 'BR', previousSibling: text, getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) };
  const paragraph = { nodeType: 1, nodeName: 'P', childNodes: [text, br], getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) };
  const harness = caretHarness({ liveRect: { left: 0, top: 0, width: 0, height: 0 }, liveNode: paragraph, liveOffset: 2 });
  try {
    assert.equal(harness.caret.hidden, true, 'the bar stays out of the way');
    assert.equal(harness.card.attributes.has('data-smooth-caret'), false, 'the native caret shows the real position');
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
    liveNode: { nodeType: 3, nodeName: '#text' },
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
  // The context reading is the last right-slot entry, immediately before the model
  // selector, so other right-slot buttons cannot squeeze between them.
  const contextSeat = overrides.get('conversation.input.right');
  assert.ok(contextSeat, 'the context reading registers in the right slot');
  assert.equal(contextSeat.options.id, 'smooth.usage.context');
  assert.equal(contextSeat.options.order, 1000);
  assert.equal(overrides.has('conversation.composer.bar'), false, 'the native composer retains its child-slot ownership');
  dispose(); assert.equal(overrides.size, 0);
});

test('the dock usage line writes the projection figures, not a scan', () => {
  const overrides = new Map();
  sandbox.h = (type, props, ...children) => ({ type, props, children });
  sandbox.require = name => name === 'react-dom' ? { createPortal() {} } : {};
  sandbox.React = {
    createElement: sandbox.h, Fragment: 'fragment',
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: (initial) => ({ current: initial }),
    useEffect: (fn) => { fn(); },
  };
  const slots = {
    inject: (_name, setup) => setup(), entries: () => [],
    register: (options, component) => { overrides.set(options.name, { options, component }); return () => overrides.delete(options.name); },
  };
  let usageFields = { cost: true, input: true, output: true, cache: true, counts: true, speed: true, context: true };
  let usagePlacement = 'row';
  const dispose = sandbox.install({
    slots, modelDirectories: {}, text: (_key, fallback) => fallback,
    useSmoothState: () => ({ state: { enabled: true, usageFields, usagePlacement } }),
  });
  const dock = overrides.get('conversation.composer.dock');
  assert.ok(dock, 'the live usage line lives in the dock below the card');
  assert.equal(dock.options.id, 'smooth.usage');
  assert.equal(dock.options.order, 10);
  const projections = {
    tokenUsage: { uncachedInputTokens: 606172, cacheReadTokens: 29702428, cacheWriteTokens: 0, outputTokens: 157390 },
    sessionStats: { turns: 16, steps: 485, decodeMs: 100000, decodeTokens: 18800 },
    modelSelection: { next: { model: 'deepseek-v4.1-flash' } },
  };
  const collect = (values) => {
    const tree = dock.component({ useProjection: key => values[key], sessionId: 's1' });
    const texts = [];
    const nodes = [];
    (function walk(node) {
      if (typeof node === 'string') { texts.push(node); return; }
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      nodes.push(node);
      (node.children || []).forEach(walk);
    })(tree);
    return { tree, text: texts.join(' '), nodes };
  };
  const { text: line, nodes } = collect(projections);
  const button = nodes.find(node => node.type === 'button' && String(node.props?.className || '').includes('smooth-usage-line'));
  assert.ok(button, 'the whole line is one button');
  assert.equal(button.props['aria-haspopup'], undefined, 'without a context reading there is no dialog to open');
  assert.doesNotMatch(line, /已用|输入|输出|缓存命中/, 'the visible labels are gone');
  assert.doesNotMatch(line, /¥/, 'the currency is the ¥-shaped icon, not a text symbol');
  assert.match(line, /[\d.]+/);
  assert.match(line, /30,308,600 tok/);
  assert.match(line, /157,390 tok/);
  assert.match(line, /98%/);
  assert.match(line, /16 轮 485 步/);
  assert.match(line, /188 tok\/s/);
  // The ¥ mark, direction arrows, cache-hit mark, staircase and gauge are the glyphs.
  const icons = nodes.filter(node => String(node.props?.className || '').includes('smooth-usage-icon'));
  assert.equal(icons.length, 6, 'cost, input, output, cache hit, steps and speed carry their icons');
  assert.equal(icons.filter(node => String(node.props.className).includes('smooth-usage-icon-hit')).length, 1);
  assert.equal(icons.filter(node => String(node.props.className).includes('smooth-usage-icon-yen')).length, 1);
  assert.equal(icons.filter(node => String(node.props.className).includes('smooth-usage-icon-step')).length, 1);
  assert.equal(icons.filter(node => String(node.props.className).includes('smooth-usage-icon-gauge')).length, 1);
  const labels = nodes.map(node => node.props?.['aria-label']).filter(Boolean);
  assert.ok(labels.includes('输入 30,308,600 tok'));
  assert.ok(labels.includes('输出 157,390 tok'));
  assert.ok(labels.includes('缓存命中 98%'));
  assert.ok(labels.some(value => /^已用 [\d.]+ 元$/.test(value)));
  // With a context reading the whole button becomes the dialog trigger and the pie sits
  // at its right end.
  const contextual = collect({
    ...projections,
    contextPressure: { pressureTokens: 440, contextWindow: 1000 },
    contextBreakdown: { systemTokens: 100, toolsTokens: 100, messageTokens: 240 },
  });
  const contextButton = contextual.nodes.find(node => node.type === 'button' && String(node.props?.className || '').includes('smooth-usage-line'));
  assert.ok(contextButton, 'the line stays one button with the pie');
  assert.equal(contextButton.props['aria-haspopup'], 'dialog');
  assert.equal(contextButton.props['aria-expanded'], false);
  assert.equal(typeof contextButton.props.onClick, 'function');
  assert.match(contextual.text, /44%/);
  assert.ok(String(contextButton.props['aria-label']).includes('上下文已用 44%'));
  assert.ok(contextual.nodes.some(node => String(node.props?.className || '').includes('smooth-context-pie-used')), 'the used wedge is inside the button');
  // Turning a field off removes that segment from the button; an all-off selection
  // removes the button entirely.
  usageFields = { ...usageFields, input: false, counts: false, context: false };
  const trimmed = collect({
    ...projections,
    contextPressure: { pressureTokens: 440, contextWindow: 1000 },
    contextBreakdown: { systemTokens: 100, toolsTokens: 100, messageTokens: 240 },
  });
  assert.doesNotMatch(trimmed.text, /54,781,449 tok/);
  assert.doesNotMatch(trimmed.text, /16 轮 485 步/);
  assert.doesNotMatch(trimmed.text, /44%/);
  assert.match(trimmed.text, /157,390 tok/);
  assert.ok(!trimmed.nodes.some(node => String(node.props?.className || '').includes('smooth-context-pie-used')), 'the pie is not rendered when the context field is off');
  usageFields = { cost: false, input: false, output: false, cache: false, counts: false, speed: false, context: false };
  assert.equal(dock.component({
    useProjection: key => ({
      ...projections,
      contextPressure: { pressureTokens: 440, contextWindow: 1000 },
      contextBreakdown: { systemTokens: 100, toolsTokens: 100, messageTokens: 240 },
    })[key],
    sessionId: 's1',
  }), null, 'no selected field means no button');
  usageFields = { cost: true, input: true, output: true, cache: true, counts: true, speed: true, context: true };
  // An unpriced route keeps the segment and says so instead of inventing an amount.
  const unpriced = collect({ ...projections, modelSelection: { next: { model: 'kimi-k3' } } });
  assert.match(unpriced.text, /—/);
  assert.doesNotMatch(unpriced.text, /¥/);
  // Without any projection there is nothing to say, so the dock row stays empty.
  assert.equal(dock.component({ useProjection: () => undefined, sessionId: 's1' }), null);
  // A fresh session projects the fields as zeros rather than omitting them; the button
  // must stay absent until there is a token, turn or step reading to show.
  const fresh = {
    tokenUsage: { uncachedInputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
    sessionStats: { turns: 0, steps: 0, decodeMs: 0, decodeTokens: 0 },
    contextPressure: { pressureTokens: 0, contextWindow: 1000 },
    contextBreakdown: { systemTokens: 0, toolsTokens: 0, messageTokens: 0 },
  };
  const freshByKey = key => fresh[key];
  assert.equal(dock.component({ useProjection: freshByKey, sessionId: 's1' }), null,
    'a brand-new session carries no data button');
  // The context-only seat follows the same rule.
  usagePlacement = 'context';
  const freshSeat = overrides.get('conversation.input.right');
  const freshSeatElement = freshSeat.component({ useProjection: freshByKey, sessionId: 's1' });
  assert.equal(freshSeatElement.type(freshSeatElement.props), null,
    'a fresh context seat does not render a 0% pie');
  usagePlacement = 'row';
  // In the context-row placement the dock yields and the input-right seat carries only
  // the pie and its reading.
  usagePlacement = 'context';
  const withContext = {
    ...projections,
    contextPressure: { pressureTokens: 440, contextWindow: 1000 },
    contextBreakdown: { systemTokens: 100, toolsTokens: 100, messageTokens: 240 },
  };
  const byKey = key => withContext[key];
  assert.equal(dock.component({ useProjection: byKey, sessionId: 's1' }), null);
  const seat = overrides.get('conversation.input.right');
  assert.ok(seat, 'the context reading registers in the right slot');
  const seatElement = seat.component({ useProjection: byKey, sessionId: 's1' });
  const seatTree = seatElement.type(seatElement.props);
  const seatButton = seatTree.children.find(child => child && child.type === 'button');
  assert.equal(seatButton.props.className, 'smooth-usage-context');
  assert.equal(seatButton.props['aria-haspopup'], 'dialog');
  let seatText = '';
  (function walk(node) {
    if (typeof node === 'string') { seatText += ` ${node}`; return; }
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    (node.children || []).forEach(walk);
  })(seatButton);
  assert.match(seatText, /44%/);
  assert.doesNotMatch(seatText, / tok|轮|步/, 'the other figures are not in the context seat');
  dispose();
  assert.equal(overrides.has('conversation.composer.dock'), false);
  // The supplied target-like hit mark, ¥-shaped mark, staircase, gauge and arrows are inline.
  assert.match(source, /smooth-usage-icon-hit/);
  assert.match(source, /smooth-usage-icon-yen/);
  assert.match(source, /smooth-usage-icon-step/);
  assert.match(source, /IconGaugeOutlineRegular/);
  assert.match(source, /M3 19 L9 19 L9 13 L15 13 L15 7 L21 7/);
  assert.match(source, /M3\.1 2\.5 6 5\.6l2\.9-3\.1/);
  assert.match(source, /M544 876\.8/);
  assert.match(source, /USAGE_ARROW_DOWN/);
  // Figures count to a new reading on the frame loop; reduced motion writes it directly.
  assert.match(source, /useRollingReadings/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /\(prefers-reduced-motion: reduce\)/);
  assert.match(source, /const duration = 5000/);
  assert.match(source, /rollingCacheText/);
});

test('the money reading joins a settled Host amount with the live output tail', async () => {
  const offPeak = Date.parse('2026-01-01T12:00:00Z');
  const peak = Date.parse('2026-01-08T02:00:00Z');
  assert.equal(sandbox.outputRate('deepseek-v4.1-flash', offPeak), 4);
  assert.equal(sandbox.outputRate('deepseek-v4.1-flash', peak), 8);
  assert.equal(sandbox.outputRate('mystery-model', offPeak), null);
  assert.equal(sandbox.peakAt(Date.parse('2026-09-24T02:00:00Z')), true);
  assert.equal(sandbox.peakAt(Date.parse('2026-10-01T02:00:00Z')), false, 'National Day is off-peak all day');
  assert.ok(Math.abs(sandbox.estimateTokens('hello world') - 1.5798) < 1e-9);
  assert.ok(Math.abs(sandbox.estimateTokens('你好') - 1.047) < 1e-9);
  assert.equal(sandbox.combineCost({ costMicro: 1_000_000, partial: false }, 10, 4, 0), 1_000_040);
  assert.equal(sandbox.combineCost({ costMicro: 0, partial: false }, 10, 4, 500_000), 500_000,
    'an empty Host log next to a positive projection is settlement lag, not a free turn');
  assert.equal(sandbox.combineCost({ costMicro: 500_000, partial: true }, 10, 4, 900_000), 900_000,
    'one unpriced settlement falls back instead of showing a confidently short bill');
  assert.equal(sandbox.combineCost(null, 10, 4, 123), 123);

  const calls = [];
  const feed = sandbox.sessionFeed('session-1', async (action, payload) => {
    calls.push({ action, payload });
    return { costMicro: calls.length * 100, partial: false, model: 'deepseek-v4.1-flash' };
  });
  feed.follow('session-1');
  await feed.ask(1000, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].action, 'session-cost');
  assert.equal(calls[0].payload.sessionId, 'session-1');
  assert.equal(feed.value().costMicro, 100);
  await feed.ask(1200);
  assert.equal(calls.length, 1, 'the feed never asks more than once per 1.5s');
  await feed.ask(2600, true);
  assert.equal(calls.length, 2);
  feed.follow('session-2');
  assert.equal(feed.value(), null, 'following another session drops the previous reading');
  await feed.ask(2700, true);
  assert.equal(calls.at(-1).payload.sessionId, 'session-2');
  feed.stop();
});

test('the streaming meter counts text growth and calibrates itself on settlement', () => {
  const stream = { textContent: 'hello world', parentElement: null, isConnected: true };
  const calls = [];
  const scroller = {
    querySelectorAll(selector) {
      if (selector === '[data-streaming]') return [stream];
      if (selector === '[data-chat-call-id]') return calls;
      return [];
    },
  };
  sandbox.document = {
    querySelector(selector) {
      if (selector === '[data-conversation-scroll]') return scroller;
      if (selector === '[data-streaming]') return stream;
      return null;
    },
    body: null,
  };
  try {
    const meter = sandbox.streamMeter();
    meter.settle(0, 'deepseek-v4.1-flash');
    assert.ok(Math.abs(meter.tokens('deepseek-v4.1-flash') - 1.5798) < 1e-9);
    // Growth is counted, not the absolute text: a shorter second message still adds.
    stream.textContent = 'hello world again';
    assert.ok(Math.abs(meter.tokens('deepseek-v4.1-flash') - 2.5396) < 1e-9);
    // A tool call contributes its data-tool weight once (Bash weighs 370).
    calls.push({ id: 'call-1', getAttribute: () => 'Bash' });
    assert.ok(Math.abs(meter.tokens('deepseek-v4.1-flash') - 372.5396) < 1e-9);
    // Settlement calibrates the estimate against the real output delta and resets the tail.
    const before = meter.tokens('deepseek-v4.1-flash');
    meter.settle(Math.ceil(before), 'deepseek-v4.1-flash');
    assert.equal(meter.tokens('deepseek-v4.1-flash'), 0);
    stream.textContent = 'hello world again!';
    const tail = meter.tokens('deepseek-v4.1-flash');
    assert.ok(tail > 0.9 && tail < 1.1, 'the calibrated tail stays near the one appended character');
    meter.stop();
  } finally {
    delete sandbox.document;
  }
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
  // The context reading is the last entry in the right slot, immediately before the
  // model selector, so other right-slot buttons cannot squeeze between them.
  assert.ok(source.includes("slots.inject('conversation.input.right'"), 'the context reading uses the right slot');
  assert.ok(source.includes('order: 1000'), 'the context reading sorts after other right-slot entries');
  assert.ok(source.includes("variant: 'context'"));
  assert.ok(source.includes('conversation.composer.dock'));
  assert.match(source, /smooth-context-pie-used/);
  assert.match(source, /smooth-context-value/);
  assert.doesNotMatch(source, /className: 'smooth-context-pie'/, 'only the used wedge is scaled, so no shared group wrapper');
  assert.match(source, /props\.useProjection\('contextPressure'\)/);
  assert.match(source, /props\.useProjection\('contextBreakdown'\)/);
  assert.match(source, /props\.useProjection\('sessionStats'\)/);
  assert.match(source, /props\.useProjection\('tokenUsage'\)/);
  assert.match(source, /smooth-context-menu/);
  assert.match(source, /usagePlacement/);
  assert.match(source, /usageAlign/);
  assert.match(source, /state\.usageOrder/);
  assert.match(source, /smooth-usage-context/);
  assert.match(source, /smooth-usage-line--bottom/);
  assert.match(source, /smooth-usage-bottom-fixed/);
  // The line starts with the first chat row, not with the first token; the new-session
  // hero has neither a row nor a reading.
  assert.match(source, /data-chat-flow-kind/);
  assert.match(source, /data-submission-echo/);
  assert.match(source, /conversationStarted/);
  // The bottom-centre seat is a measurement, not a fixed centre: a permission or tool
  // button can arrive after the first frame, so a childList observer re-syncs the
  // measured controls and schedules a fresh centre.
  assert.match(source, /querySelectorAll\('button, \[role="button"\]'\)/);
  assert.match(source, /new MutationObserver\(\(\) => \{ observeTargets\(\); schedule\(\); \}\)/);
  assert.match(source, /childList: true, subtree: true/);
  assert.match(source, /row \|\| modelButton/);
  // The blank area starts at the permission control's right edge, not at the rightmost
  // left-group button: plan / review controls after it must not push the centre right.
  assert.match(source, /\[data-slot="conversation\.input\.permission"\]/);
  assert.match(source, /permissionEdge/);
  assert.match(source, /slots\.inject\('conversation\.input\.left'/);
  assert.match(source, /variant: 'bottom'/);
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

test('the workspace menu filters by name, case-insensitively, and never by path', () => {
  const items = [
    { workspaceId: 'a', title: 'dsh-smooth', path: 'C:/work/dsh-smooth' },
    { workspaceId: 'b', title: 'Design', path: 'C:/work/design' },
    { workspaceId: 'c', title: 'default-workspace', path: 'C:/work/plain' },
  ];
  const ids = (query, name = '默认工作区') => sandbox.filterWorkspaces(items, query, name).map((workspace) => workspace.workspaceId);
  assert.deepEqual(ids(''), ['a', 'b', 'c'], 'an empty query keeps every workspace in catalogue order');
  assert.deepEqual(ids('  SMOO '), ['a'], 'the query trims and ignores case');
  assert.deepEqual(ids('ign'), ['b']);
  assert.deepEqual(ids('默认'), ['c'], 'the automatic title reads as the active language default name');
  assert.deepEqual(ids('work'), [], 'paths are context, not search text');
  assert.equal(sandbox.workspaceName(items[2], '默认工作区'), '默认工作区');
  assert.equal(sandbox.workspaceName(items[0], '默认工作区'), 'dsh-smooth', 'user titles read verbatim');
  assert.equal(sandbox.workspaceName(undefined, '默认工作区'), '');
});

test('the new-session workspace menu replaces the native list with a filtered, scrollable panel', () => {
  // The Host keeps the chip, the open state and the switch; only the menu surface and
  // its list rendering are the skin's, so turning the skin off restores the native menu.
  assert.match(source, /decorate\('conversation\.hero\.workspace', \(Native\) => function SmoothWorkspacePicker/);
  assert.match(source, /return skin\.state\.enabled \? h\(WorkspacePicker, props\) : h\(Native, props\)/);
  assert.match(source, /className: 'smooth-git-menu smooth-workspace-menu'/);
  assert.match(source, /className: 'smooth-git-search smooth-workspace-search'/);
  assert.match(source, /className: 'smooth-git-list', role: 'listbox'/);
  assert.match(source, /'aria-activedescendant': current/, 'the highlighted row is announced from the search field');
  assert.match(source, /if \(event\.key !== 'Tab'\) return;/, 'Tab stays inside the popover while its picker is open');
  assert.match(source, /trigger\?\.isConnected\) trigger\.focus\?\.\(\)/, 'closing the picker hands focus back to the visible trigger');
  assert.match(source, /'data-current': selected \? 'true' : undefined/, 'the selected workspace keeps its highlight hook');
  // Every selected row wears the Host menu's own check glyph (IconCheckOutlineRegular,
  // 1px stroke) instead of a font character, so it matches the native check.
  assert.match(source, /selected \? h\(ui\.IconCheckOutlineRegular, \{ className: 'smooth-git-check' \}\) : null\)/);
  assert.match(source, /branchName === current && h\(ui\.IconCheckOutlineRegular, \{ className: 'smooth-git-check' \}\)/);
  assert.match(source, /selected && h\(ui\.IconCheckOutlineRegular, \{ className: 'smooth-git-check' \}\)/);
  assert.doesNotMatch(source, /'✓'/, 'no font check character survives anywhere');
  assert.match(source, /filterWorkspaces\(items, query, defaultName\)/);
  assert.doesNotMatch(source, /smooth-workspace-path|\bworkspace\.path\b/, 'a row shows the workspace name only, never its address');
  assert.match(source, /onPick\?\.\(workspace\.workspaceId\)/, 'the pick runs the Host selection flow');
  assert.match(source, /composer\.workspaceNoMatch/, 'an unmatched query has its own empty state');
  assert.match(source, /composer\.workspaceEmpty/, 'a workspace-less account has its own empty state');
  assert.match(source, /composer\.clearSearch/);
  assert.match(source, /const flowAvailable = typeof useDirectoryFlow === 'function'/, 'the add row only appears when the Host directory flow is mounted');
  assert.match(source, /renderSlot\('conversation\.hero\.workspace\.directoryFlow', flowOwner\)/, 'adding a folder still runs the Host flow');
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

test('the workspace slot swap keeps the native picker as the fallback and picks through the host', () => {
  // Drive the real component with one hook frame, the way the client harness does, so the
  // slot wiring itself is exercised instead of only its source shape.
  const saved = { React: sandbox.React, h: sandbox.h, document: sandbox.document, window: sandbox.window, require: sandbox.require };
  const picked = [];
  sandbox.h = (type, props, ...children) => ({ type, props, children });
  sandbox.React = {
    createElement: sandbox.h, Fragment: 'fragment',
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useRef: () => ({ current: null }),
    useEffect: () => {},
  };
  sandbox.require = (name) => name === 'react-dom' ? { createPortal: (node) => node } : {};
  sandbox.window = { innerWidth: 1024, innerHeight: 768 };
  sandbox.document = { querySelector: () => null };
  try {
    const descendants = { 'conversation.hero.workspace.directoryFlow': { kind: 'single', scope: 'root' } };
    const native = { component: function NativePicker() { return null; }, options: { children: descendants } };
    const entries = new Map([['conversation.hero.workspace', [native]]]);
    const registered = [];
    const slots = {
      inject: (_name, setup) => setup(),
      entries: (name) => entries.get(name) || [],
      subscribe: () => () => {},
      register: (options, component) => { registered.push({ options, component }); return () => {}; },
    };
    let enabled = true;
    sandbox.install({ slots, useSmoothState: () => ({ state: { enabled } }), text: (_key, fallback) => fallback });
    const wrapper = registered.find((entry) => entry.options.name === 'conversation.hero.workspace');
    assert.ok(wrapper, 'the workspace menu is decorated onto the host slot');
    assert.equal(wrapper.options.priority, -10, 'the skin entry wins the slot cell');
    assert.equal(wrapper.options.children, descendants, 'the directory-flow declaration carries over for the add row');
    enabled = false;
    assert.equal(wrapper.component({}).type, native.component, 'turning the skin off hands the slot back to the native picker');
    enabled = true;
    const element = wrapper.component({});
    assert.equal(typeof element.type, 'function', 'the enabled slot renders the skin panel');
    const props = {
      open: true,
      anchorRef: { current: null },
      useWorkspaces: () => ({
        phase: 'ready',
        items: [
          { workspaceId: 'a', title: 'dsh-smooth', path: 'C:/dsh-smooth' },
          { workspaceId: 'b', title: 'archived', path: 'C:/archived' },
        ],
      }),
      selectedId: 'a',
      onPick: (id) => picked.push(id),
      onClose: () => {},
    };
    const tree = element.type(props);
    const all = [];
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { for (const child of node) walk(child); return; }
      all.push(node);
      for (const child of node.children || []) walk(child);
    };
    walk(tree);
    const menu = all.find((node) => node.type === 'div' && /smooth-workspace-menu/.test(node.props?.className || ''));
    assert.ok(menu, 'the panel is portalled as the skin popover');
    assert.equal(menu.props.role, 'dialog');
    const search = all.find((node) => node.type === 'input');
    assert.equal(search.props.placeholder, '搜索工作区名');
    assert.equal(search.props.role, 'combobox');
    const rows = all.filter((node) => node.type === 'button' && node.props?.role === 'option');
    assert.equal(rows.length, 2, 'every workspace gets a row');
    assert.equal(rows[0].props['data-current'], 'true', 'the current workspace keeps its highlight hook');
    assert.equal(rows[0].props['aria-selected'], true);
    assert.equal(rows[1].props['aria-selected'], false);
    rows[1].props.onClick();
    assert.deepEqual(picked, ['b'], 'a row runs the Host selection callback');
  } finally {
    Object.assign(sandbox, saved);
  }
});
