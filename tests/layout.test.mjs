import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/layout.js', import.meta.url), 'utf8');
function runtime({ width = 1282 } = {}) {
  const registrations = new Map();
  const properties = new Map();
  const calls = [];
  const settingsCloses = [];
  const layoutState = { layoutInfo: { sidebar: 280 } };
  const settingsState = { open: false };
  const subscriptions = new Set();
  const events = new Map();
  const snapshot = { current: 'a', byId: { a: { title: '实际会话', cwd: 'C:\\work\\demo' }, blank: { blank: true } } };
  const panelState = { activePanelId: null };
  const layoutStore = {
    getSnapshot: () => layoutState,
    subscribe: fn => { subscriptions.add(fn); return () => subscriptions.delete(fn); },
    actions: { setSidebar: width => { layoutState.layoutInfo.sidebar = width; for (const fn of subscriptions) fn(); } },
  };
  const settingsStore = {
    getSnapshot: () => settingsState, subscribe: () => () => {},
    actions: { open: () => { settingsState.open = true; }, close: () => { settingsCloses.push(settingsState.open); settingsState.open = false; }, openSection: id => { settingsState.open = true; calls.push(['settings', id]); } },
  };
  const slots = {
    // SlotCore publishes store on the entry, outside the serialized options.
    entries: name => [{ options: {}, store: { create: () => name === 'root' ? layoutStore : settingsStore } }],
    inject: (_name, fn) => fn(),
    register: (options, component) => {
      const key = `${options.name}/${options.id}`;
      registrations.set(key, { options, component });
      return () => registrations.delete(key);
    },
  };
  const h = (type, props, ...children) => ({ type, props: props || {}, children });
  const React = { Fragment: 'fragment', useState: value => [value, () => {}], useSyncExternalStore: (_subscribe, read) => read(), useEffect: fn => fn(), useRef: () => ({ current: null }) };
  const sandbox = {
    React, h, PLUGIN_ID: 'smooth', hostPart: name => `.${name}`, window: { innerWidth: width }, installComposerLayout: () => () => {}, installAccountMenu: () => () => {},
    document: { addEventListener: (type, fn) => events.set(type, fn), removeEventListener: type => events.delete(type), body: { style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) } } },
    require: name => { assert.equal(name, '@deepseek-ai/dsh-client-ui-primitives'); return new Proxy({}, { get: (_t, key) => key }); },
  };
  runInNewContext(source + '\nglobalThis.install = installReferenceShell; globalThis.createTabs = createWorkspaceTabs; globalThis.currentTab = currentWorkspaceTab; globalThis.isOperation = isWorkspaceOperation; globalThis.installScroll = installTabScroll;', sandbox);
  const shell = sandbox.install({ slots, layout: { selectPanel: id => { panelState.activePanelId = id; calls.push(['panel', id]); } }, uiWorkspace: {
    clearMain: () => { snapshot.current = undefined; panelState.activePanelId = null; calls.push(['home']); },
    startSession: () => { snapshot.current = 'blank'; calls.push(['new']); },
    openSession: id => { snapshot.current = id; panelState.activePanelId = null; calls.push(['session', id]); },
  }, theme: { getTheme: () => ({ preference: 'system' }) }, subscribeTheme: () => () => {}, chooseTheme: id => calls.push(['theme', id]), useSmoothState: () => ({ state: { enabled: true } }), text: (_key, fallback) => fallback });
  const render = (inSettings = false) => {
    const registration = registrations.get(inSettings ? 'settings.action/smooth.tabs' : 'shell.overlay/smooth.chrome');
    const props = { useSessions: fn => fn(snapshot), usePanelInfo: fn => fn(panelState) };
    let view = registration.component(props);
    // The harness runs effects immediately; reread the external tab ledger after
    // the route effect publishes, as useSyncExternalStore does in React.
    view = registration.component(props);
    if (inSettings) { view = view.type(view.props); view = registration.component(props); view = view.type(view.props); }
    return view;
  };
  const flatten = node => node ? [node, ...node.children.flat(Infinity).filter(x => x && typeof x === 'object').flatMap(flatten)] : [];
  const operate = () => events.get('input')({ type: 'input', target: { closest: selector => selector.includes('[data-slot="main"]') || selector.startsWith('input,') ? {} : null } });
  return { shell, render, flatten, registrations, calls, layoutState, settingsState, settingsCloses, snapshot, panelState, events, operate, properties, subscriptions, sandbox };
}

test('native shared stores drive width, real navigation and full-page settings', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  assert.equal(r.layoutState.layoutInfo.sidebar, 365);
  assert.equal(r.properties.get('--smooth-left-width'), '365px');
  let nodes = r.flatten(r.render());
  nodes.find(n => n.props.role === 'tab' && n.props.title === '实际会话').props.onClick();
  nodes.find(n => n.props.className === 'smooth-rail-home').props.onClick();
  r.panelState.activePanelId = 'plugins';
  nodes = r.flatten(r.render());
  nodes.find(n => n.props.role === 'tab' && n.props.title === '插件').props.onClick();
  r.settingsState.open = true;
  nodes = r.flatten(r.render(true));
  nodes.find(n => n.props.role === 'tab' && n.props.title === '设置').props.onClick();
  assert.deepEqual(r.calls, [['session', 'a'], ['panel', 'plugins'], ['settings', 'general']]);
  assert.equal(r.render(), null, 'main chrome yields to the settings focus trap');
  const appearance = r.registrations.get('settings.general.item/appearance');
  assert.equal(appearance.options.priority, -10);
  const modes = r.flatten(appearance.component()).filter(n => n.props.role === 'radio');
  assert.deepEqual(modes.map(n => n.props['aria-checked']), [false, false, true]);
  modes[1].props.onClick();
  assert.deepEqual(r.calls.at(-1), ['theme', 'dark']);
  r.shell.dispose();
  assert.equal(r.layoutState.layoutInfo.sidebar, 280);
  assert.equal(r.properties.size, 0);
  assert.equal(r.registrations.size, 0);
  assert.equal(r.subscriptions.size, 0);
  assert.equal(r.events.size, 0);
});

test('disabling preserves a subsequent manual sidebar resize', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  r.layoutState.layoutInfo.sidebar = 400;
  r.shell.setEnabled(false);
  assert.equal(r.layoutState.layoutInfo.sidebar, 400);
  assert.ok(!r.registrations.has('settings.general.item/appearance'));
  r.shell.dispose();
});

test('reference sidebar width scales through desktop and ultrawide sizes', () => {
  for (const [width, expected] of [[900, 320], [1282, 365], [1915, 546], [3000, 560]]) {
    const r = runtime({ width });
    r.shell.setEnabled(true);
    assert.equal(r.layoutState.layoutInfo.sidebar, expected);
    r.shell.dispose();
    assert.equal(r.layoutState.layoutInfo.sidebar, 280);
  }
});

test('tab descriptors only use the current surface, never unrelated sessions', () => {
  const r = runtime();
  const text = (_key, fallback) => fallback;
  const snapshot = { current: 'empty', ids: ['empty', 'a', 'b'], byId: { empty: { blank: true }, a: { title: 'A' }, b: { title: 'B' } } };
  assert.equal(r.sandbox.currentTab(snapshot, null, false, null, text).title, '新会话');
  assert.equal(r.sandbox.currentTab(snapshot, 'plugins', false, null, text).key, 'panel:plugins');
  assert.equal(r.sandbox.currentTab(snapshot, null, true, null, text).key, 'settings');
  snapshot.current = 'a';
  assert.equal(r.sandbox.currentTab(snapshot, null, false, null, text).title, 'A');
  snapshot.current = undefined;
  assert.equal(r.sandbox.currentTab(snapshot, null, false, null, text).key, 'home');
  assert.equal(r.sandbox.currentTab(snapshot, null, false, null, text).title, '首页');
});

test('the outlined Home button only dismisses other surfaces and is inert on the main page', () => {
  const r = runtime(); r.shell.setEnabled(true); r.render(); r.operate();
  const sessionsBefore = JSON.stringify(r.snapshot.byId);
  const home = (inSettings = false) => r.flatten(r.render(inSettings)).find(node => node.props.className === 'smooth-rail-home');
  assert.equal(home().props['aria-pressed'], true);
  assert.equal(home().props['aria-label'], '主页面');
  const icon = r.flatten(home()).find(node => node.type === 'svg');
  assert.equal(icon.props.fill, 'none');
  assert.equal(icon.props.stroke, 'currentColor');
  home().props.onClick();
  home().props.onClick();
  assert.equal(r.snapshot.current, 'a');
  assert.deepEqual(r.calls, [], 'repeated clicks on the main page perform no navigation');
  assert.deepEqual(r.settingsCloses, [], 'the main-page click does not even call settings.close');
  assert.equal(home().props['aria-pressed'], true);
  assert.ok(r.flatten(r.render()).some(node => node.props.role === 'tab' && node.props.title === '实际会话'), 'operated conversations stay available');
  r.panelState.activePanelId = 'plugins';
  assert.equal(home().props['aria-pressed'], false);
  home().props.onClick();
  assert.equal(r.snapshot.current, 'a', 'returning from Plugins preserves the current conversation');
  r.settingsState.open = true; home(true).props.onClick();
  assert.deepEqual(r.settingsCloses, [true]);
  r.panelState.activePanelId = 'plugins'; r.settingsState.open = true; home(true).props.onClick();
  assert.equal(r.settingsState.open, false);
  assert.equal(r.panelState.activePanelId, null);
  assert.equal(JSON.stringify(r.snapshot.byId), sessionsBefore);
  assert.equal(r.snapshot.current, 'a');
  assert.deepEqual(r.calls, [['panel', null], ['panel', null]]);
  r.snapshot.current = 'blank'; home().props.onClick();
  assert.equal(r.snapshot.current, 'blank', 'an existing blank conversation stays selected');
  r.snapshot.current = undefined; home().props.onClick();
  assert.equal(r.snapshot.current, undefined);
  assert.deepEqual(r.calls, [['panel', null], ['panel', null]], 'no new session, clearMain or session reopening occurs');
  r.shell.dispose();
});

test('previews replace each other; operations pin without duplicates or a two-tab cap', () => {
  const r = runtime();
  const tabs = r.sandbox.createTabs();
  const a = { key: 'a', title: 'A' }, b = { key: 'b', title: 'B' };
  tabs.show(a); tabs.show(b);
  assert.equal(tabs.getSnapshot().pinned.length, 0);
  assert.equal(tabs.getSnapshot().preview.key, 'b');
  tabs.pin(b); tabs.pin(b);
  for (const tab of [a, { key: 'c', title: 'C' }, { key: 'settings', title: '设置' }]) { tabs.show(tab); tabs.pin(tab); }
  assert.deepEqual(Array.from(tabs.getSnapshot().pinned, tab => tab.key), ['b', 'a', 'c', 'settings']);
  tabs.show({ ...b, title: '改名后的 B' });
  assert.equal(tabs.getSnapshot().pinned[0].title, '改名后的 B');
  assert.equal(tabs.getSnapshot().preview, null);
  const state = tabs.getSnapshot(); tabs.show({ ...b, title: '改名后的 B' });
  assert.equal(tabs.getSnapshot(), state, 'unchanged routes keep an external-store snapshot stable');
});

test('closing tabs selects a neighbor only for the active tab and never deletes a session', () => {
  const r = runtime(); r.shell.setEnabled(true); r.render(); r.operate();
  r.snapshot.byId.b = { title: 'B' }; r.snapshot.current = 'b'; r.render(); r.operate();
  let nodes = r.flatten(r.render());
  nodes.find(node => node.props['aria-label'] === '关闭标签页：实际会话').props.onClick({ stopPropagation() {} });
  assert.deepEqual(r.calls, [], 'closing an inactive tab must not navigate');
  nodes = r.flatten(r.render());
  assert.equal(nodes.filter(node => node.props.role === 'tab').length, 1);
  nodes.find(node => node.props['aria-label'] === '关闭标签页：B').props.onClick({ stopPropagation() {} });
  assert.deepEqual(r.calls, [['home']]);
  // The welcome page is the surface itself, so the emptied strip must stay empty.
  nodes = r.flatten(r.render());
  assert.equal(nodes.filter(node => node.props.role === 'tab').length, 0, 'the home view must not publish a tab of its own');
  assert.ok(r.snapshot.byId.a && r.snapshot.byId.b);
  const tabs = r.sandbox.createTabs();
  for (const key of ['a', 'b', 'c']) { const tab = { key, title: key }; tabs.show(tab); tabs.pin(tab); }
  assert.equal(tabs.close('c').next.key, 'b');
  assert.equal(tabs.close('a').active, false);
  assert.equal(tabs.close('b').next, undefined);
  r.shell.dispose();
});

test('only actual content operations pin; browsing, navigation and synthetic updates do not', () => {
  const r = runtime();
  const target = flags => ({ closest: selector => {
    if (selector.includes('.sidebarCol')) return flags.sidebar ? {} : null;
    if (selector.includes('[data-slot="main"]')) return flags.content ? {} : null;
    if (selector.startsWith('input,')) return flags.editor ? {} : null;
    if (selector.startsWith('button,')) return flags.button ? {} : null;
    return null;
  } });
  assert.equal(r.sandbox.isOperation({ type: 'input', target: target({ content: true, editor: true }) }), true);
  assert.equal(r.sandbox.isOperation({ type: 'click', target: target({ content: true, button: true }) }), true);
  assert.equal(r.sandbox.isOperation({ type: 'click', target: target({ content: true }) }), false);
  assert.equal(r.sandbox.isOperation({ type: 'scroll', target: target({ content: true }) }), false);
  assert.equal(r.sandbox.isOperation({ type: 'click', target: target({ sidebar: true, content: true, button: true }) }), false);
  assert.equal(r.sandbox.isOperation({ type: 'input', isTrusted: false, target: target({ content: true, editor: true }) }), false);
});

test('the tab wheel eases accumulated movement, normalizes units and cancels cleanly', () => {
  const r = runtime();
  const listeners = new Map();
  const frames = new Map();
  let nextFrame = 0;
  let time = 0;
  r.sandbox.window.requestAnimationFrame = fn => { const id = ++nextFrame; frames.set(id, fn); return id; };
  r.sandbox.window.cancelAnimationFrame = id => frames.delete(id);
  const tick = () => {
    time += 16;
    for (const [id, fn] of [...frames]) { frames.delete(id); fn(time); }
  };
  const settle = () => { for (let i = 0; i < 60; i++) tick(); assert.equal(frames.size, 0); };
  let offset = 0;
  const node = {
    clientWidth: 300, scrollWidth: 1200,
    get scrollLeft() { return offset; },
    set scrollLeft(value) { offset = Math.round(Math.max(0, Math.min(this.scrollWidth - this.clientWidth, value))); },
    addEventListener(name, fn, options) { if (name === 'wheel') assert.equal(options.passive, false); listeners.set(name, fn); },
    removeEventListener(name, fn) { assert.equal(fn, listeners.get(name)); listeners.delete(name); },
  };
  const controller = r.sandbox.installScroll(node);
  const wheel = (deltaY, extra = {}) => {
    let prevented = false;
    listeners.get('wheel')({ deltaX: 0, deltaY, deltaMode: 0, ...extra, preventDefault() { prevented = true; } });
    return prevented;
  };
  assert.equal(wheel(120), true); assert.equal(offset, 0, 'the wheel must not jump immediately');
  tick(); assert.ok(offset > 0 && offset < 120, 'an intermediate animation frame is visible');
  wheel(120); assert.equal(frames.size, 1, 'continuous input shares one animation loop');
  settle(); assert.equal(offset, 240, 'wheel deltas accumulate before the previous animation ends');
  controller.scrollBy(240); settle(); assert.equal(offset, 480, 'right arrow still works after a wheel animation');
  controller.scrollBy(-240); settle(); assert.equal(offset, 240, 'left arrow still works after a wheel animation');
  wheel(120); tick(); controller.scrollBy(240); settle();
  assert.equal(offset, 600, 'an arrow and a pending wheel animation share their target');
  controller.scrollBy(-240); controller.scrollBy(-120); settle(); assert.equal(offset, 240);
  wheel(-40); settle(); assert.equal(offset, 200);
  wheel(2, { deltaMode: 1 }); settle(); assert.equal(offset, 232);
  wheel(1, { deltaMode: 2 }); settle(); assert.equal(offset, 532);
  assert.equal(wheel(100, { ctrlKey: true }), false);
  assert.equal(wheel(2, { deltaX: 90 }), false);
  assert.equal(offset, 532, 'zoom and horizontal trackpad gestures remain native');
  wheel(2000); settle(); assert.equal(offset, 900);
  assert.equal(wheel(100), true, 'overflowing tabs absorb the wheel at the edge');
  settle();
  node.scrollWidth = node.clientWidth;
  assert.equal(wheel(100), false, 'a tab strip without overflow does not intercept scrolling');
  node.scrollWidth = 1200;
  wheel(-120); tick();
  assert.equal(wheel(2, { deltaX: 90 }), false); assert.equal(frames.size, 0, 'trackpad input takes over immediately');
  wheel(-120); listeners.get('pointerdown')(); assert.equal(frames.size, 0, 'clicks stop pending wheel motion');
  wheel(-120); assert.equal(frames.size, 1);
  controller.dispose(); assert.equal(listeners.size, 0); assert.equal(frames.size, 0);
  assert.equal(r.sandbox.installScroll(null), undefined);
});

test('the tab wheel respects the reduced-motion preference', () => {
  const r = runtime();
  r.sandbox.window.matchMedia = () => ({ matches: true });
  let onWheel;
  const node = { scrollLeft: 0, scrollWidth: 1200, clientWidth: 300,
    addEventListener: (name, fn) => { if (name === 'wheel') onWheel = fn; }, removeEventListener() {} };
  const controller = r.sandbox.installScroll(node);
  onWheel({ deltaX: 0, deltaY: 120, deltaMode: 0, preventDefault() {} });
  assert.equal(node.scrollLeft, 120);
  controller.scrollBy(240); assert.equal(node.scrollLeft, 360);
  controller.dispose();
});
