import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/layout.js', import.meta.url), 'utf8');
function runtime({ width = 1282, overflow = null, workspaceStore = true } = {}) {
  const registrations = new Map();
  const properties = new Map();
  const calls = [];
  const workspaceCalls = [];
  const settingsCloses = [];
  const bridgeCalls = [];
  let sessionRefreshes = 0;
  const layoutState = { layoutInfo: { sidebar: 280 } };
  const settingsState = { open: false, activeId: undefined };
  const settingsListeners = new Set();
  const notifySettings = () => { for (const listener of settingsListeners) listener(); };
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
    getSnapshot: () => settingsState,
    subscribe: listener => { settingsListeners.add(listener); return () => settingsListeners.delete(listener); },
    actions: {
      open: () => { settingsState.open = true; notifySettings(); },
      close: () => { settingsCloses.push(settingsState.open); settingsState.open = false; settingsState.activeId = undefined; notifySettings(); },
      openSection: id => { settingsState.open = true; settingsState.activeId = id; calls.push(['settings', id]); notifySettings(); },
    },
  };
  // The host's workspace browser publishes its persisted viewing store on the region
  // entry; archivedFilter is the state the hover filter and the view menu share.
  const workspaceState = { archivedFilter: 'default' };
  const workspaceEntry = {
    getSnapshot: () => workspaceState,
    subscribe: () => () => {},
    actions: { setArchivedFilter: filter => { workspaceCalls.push([filter]); workspaceState.archivedFilter = filter; } },
  };
  // The workspace *list* snapshot (not the viewing store): archivedSessionIds is what
  // the tab ledger follows when a conversation is archived.
  const workspaceList = { items: [], archivedSessionIds: [] };
  const slots = {
    // SlotCore publishes store on the entry, outside the serialized options.
    entries: name => [{
      options: {},
      store: { create: () => !workspaceStore && name === 'sidebar.workspaces' ? undefined
        : name === 'root' ? layoutStore
        : name === 'sidebar.workspaces' ? workspaceEntry
        : settingsStore },
    }],
    inject: (_name, fn) => fn(),
    register: (options, component) => {
      const key = `${options.name}/${options.id}`;
      registrations.set(key, { options, component });
      return () => registrations.delete(key);
    },
  };
  const h = (type, props, ...children) => ({ type, props: props || {}, children });
  const React = { Fragment: 'fragment', useState: value => [value && typeof value === 'object' && 'right' in value ? { left: false, right: false, ...overflow } : value, () => {}], useSyncExternalStore: (_subscribe, read) => read(), useEffect: fn => fn(), useRef: () => ({ current: null }) };
  const bodyAttributes = new Set();
  const sandbox = {
    React, h, PLUGIN_ID: 'smooth', hostPart: name => `.${name}`, HOME_ATTRIBUTE: 'data-smooth-home',
    window: {
      innerWidth: width,
      addEventListener: (type, fn) => events.set(`window:${type}`, fn),
      removeEventListener: type => events.delete(`window:${type}`),
    },
    installComposerLayout: () => () => {}, installAccountMenu: () => () => {}, installUsage: () => () => {},
    // The archived-row dialog's irreversible call rides the Host bridge; the harness
    // records the action and settles immediately.
    bridgeRequest: (action, payload) => { bridgeCalls.push([action, payload]); return Promise.resolve({ deleted: true }); },
    document: {
      addEventListener: (type, fn) => events.set(type, fn), removeEventListener: type => events.delete(type),
      querySelector: () => null,
      body: {
        style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) },
        toggleAttribute: (name, on) => { if (on) bodyAttributes.add(name); else bodyAttributes.delete(name); },
        removeAttribute: name => bodyAttributes.delete(name),
        hasAttribute: name => bodyAttributes.has(name),
      },
    },
    require: name => { assert.equal(name, '@deepseek-ai/dsh-client-ui-primitives'); return new Proxy({}, { get: (_t, key) => key }); },
  };
  runInNewContext(source + '\nglobalThis.install = installReferenceShell; globalThis.createTabs = createWorkspaceTabs; globalThis.currentTab = currentWorkspaceTab; globalThis.isCreated = isCreatedSession; globalThis.applyWidth = applyConversationWidth; globalThis.isOperation = isWorkspaceOperation; globalThis.installScroll = installTabScroll; globalThis.tabOverflow = tabOverflow; globalThis.placeFilter = placeWorkspaceFilter;', sandbox);
  const shell = sandbox.install({ slots, layout: { selectPanel: id => { panelState.activePanelId = id; calls.push(['panel', id]); } }, uiWorkspace: {
    clearMain: () => { snapshot.current = undefined; panelState.activePanelId = null; calls.push(['home']); },
    startSession: () => { snapshot.current = 'blank'; calls.push(['new']); },
    openSession: id => { snapshot.current = id; panelState.activePanelId = null; calls.push(['session', id]); },
  }, sessions: { refresh: () => { sessionRefreshes += 1; return Promise.resolve(); } }, theme: { getTheme: () => ({ preference: 'system' }) }, useSmoothState: () => ({ state: { enabled: true } }), text: (_key, fallback) => fallback });
  const render = (inSettings = false) => {
    const registration = registrations.get(inSettings ? 'settings.action/smooth.tabs' : 'shell.overlay/smooth.chrome');
    const props = { useSessions: fn => fn(snapshot), usePanelInfo: fn => fn(panelState), useWorkspaces: fn => fn(workspaceList) };
    let view = registration.component(props);
    // The harness runs effects immediately; reread the external tab ledger after
    // the route effect publishes, as useSyncExternalStore does in React.
    view = registration.component(props);
    if (inSettings) { view = view.type(view.props); view = registration.component(props); view = view.type(view.props); }
    return view;
  };
  const flatten = node => node ? [node, ...node.children.flat(Infinity).filter(x => x && typeof x === 'object').flatMap(flatten)] : [];
  const operate = () => events.get('input')({ type: 'input', target: { closest: selector => selector.includes('[data-slot="main"]') || selector.startsWith('input,') ? {} : null } });
  return { shell, render, flatten, registrations, calls, layoutState, settingsState, settingsCloses, notifySettings, snapshot, panelState, events, operate, properties, subscriptions, sandbox, bodyAttributes, workspaceState, workspaceCalls, workspaceList, bridgeCalls, get sessionRefreshes() { return sessionRefreshes; } };
}

test('the welcome block follows the main surface, not the tab count', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  // The host's home surface: no session retained, no panel, settings closed.
  r.snapshot.current = undefined;
  r.render();
  assert.equal(r.bodyAttributes.has('data-smooth-home'), true, 'the home surface is the welcome page');

  // A session surface brings the input card back.
  r.snapshot.current = 'a';
  r.render();
  r.render();
  assert.equal(r.bodyAttributes.has('data-smooth-home'), false, 'a conversation is not the welcome page');

  // Closing its tab clears the main view, so the welcome page is back — the strip may
  // still hold a tab of its own (settings, plugins) and that no longer matters.
  const nodes = r.flatten(r.render());
  nodes.find(n => n.props.className === 'smooth-tab-close').props.onClick({ stopPropagation() {} });
  r.render();
  r.render();
  assert.equal(r.bodyAttributes.has('data-smooth-home'), true, 'and clearing it brings the welcome page back');
});

test('a rail panel click closes the settings page before the host panel opens', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  const click = r.events.get('click');
  assert.equal(typeof click, 'function', 'the rail navigation listener is installed');
  // The host's rail panel button lives behind the settings overlay; the capture
  // listener must close the page first, or the selected panel stays hidden.
  r.settingsState.open = true;
  click({ target: { closest: selector => selector.includes('panelList') ? {} : null } });
  assert.deepEqual(r.settingsCloses, [true], 'the settings page closes for a rail selection');
  // A click inside the page itself (or the account menu above the overlay) leaves it open.
  r.settingsState.open = true;
  click({ target: { closest: () => null } });
  assert.deepEqual(r.settingsCloses, [true], 'other clicks leave the settings page open');
  r.shell.dispose();
});

test('native shared stores drive width, real navigation and full-page settings', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  assert.equal(r.layoutState.layoutInfo.sidebar, 352);
  assert.equal(r.properties.get('--smooth-left-width'), '352px');
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
  r.shell.dispose();
  assert.equal(r.layoutState.layoutInfo.sidebar, 280);
  assert.equal(r.properties.size, 0);
  assert.equal(r.registrations.size, 0);
  assert.equal(r.subscriptions.size, 0);
  assert.equal(r.events.size, 0);
});

test('the settings tab returns to the settings page the user left', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  // Give the conversation a pinned tab so the settings surface can open over it.
  r.render(); r.render();
  r.operate(); r.render();
  // Settings opened on the skin's own page: the host publishes that active section.
  r.settingsState.open = true;
  r.settingsState.activeId = 'dsh-smooth-skin';
  r.notifySettings();
  r.render(true);
  // Leaving through the conversation tab closes the dialog; the host drops its active
  // section with it, but the strip keeps the settings tab.
  const session = () => r.flatten(r.render(true)).find(node => node.props.role === 'tab' && node.props.title === '实际会话');
  session().props.onClick();
  assert.equal(r.settingsState.open, false);
  assert.equal(r.settingsState.activeId, undefined, 'the host cleared its active section');
  const settingsTab = () => r.flatten(r.render()).find(node => node.props.role === 'tab' && node.props.title === '设置');
  assert.ok(settingsTab(), 'the settings tab is still in the strip');
  settingsTab().props.onClick();
  assert.deepEqual(r.calls.filter(call => call[0] === 'settings'), [['settings', 'dsh-smooth-skin']]);
  assert.equal(r.settingsState.open, true);
  assert.equal(r.settingsState.activeId, 'dsh-smooth-skin', 'the tab restored the page that was left');
  r.shell.dispose();
});

test('disabling preserves a subsequent manual sidebar resize', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  r.layoutState.layoutInfo.sidebar = 400;
  r.shell.setEnabled(false);
  assert.equal(r.layoutState.layoutInfo.sidebar, 400);
  assert.ok(!r.registrations.has('settings.general.item/smooth-skin.heading'));
  r.shell.dispose();
});

test('the saved 352px sidebar width is the default at every window size', () => {
  // The width comes from the layout the user resized to, not from 28.5vw: the
  // skin must not overwrite it as the window grows or shrinks.
  for (const width of [900, 1282, 1915, 3000]) {
    const r = runtime({ width });
    r.shell.setEnabled(true);
    assert.equal(r.layoutState.layoutInfo.sidebar, 352);
    r.shell.dispose();
    assert.equal(r.layoutState.layoutInfo.sidebar, 280);
  }
});

test('collapsing and reopening the sidebar restores the width it had', () => {
  const r = runtime();
  const notify = () => { for (const fn of [...r.subscriptions]) fn(); };
  r.shell.setEnabled(true);
  assert.equal(r.layoutState.layoutInfo.sidebar, 352);
  r.layoutState.layoutInfo.sidebar = 0; notify();
  assert.equal(r.properties.get('--smooth-left-width'), '0px', 'the collapsed column publishes zero');
  // The host's toggle reopens at its own 280px rather than the width that was there.
  r.layoutState.layoutInfo.sidebar = 280; notify();
  assert.equal(r.layoutState.layoutInfo.sidebar, 352, 'the pre-collapse width comes back');
  assert.equal(r.properties.get('--smooth-left-width'), '352px', 'the left column keeps its size');
  r.shell.dispose();
});

test('a genuinely dragged 280px sidebar is not mistaken for the toggle default', () => {
  const r = runtime();
  const notify = () => { for (const fn of [...r.subscriptions]) fn(); };
  r.shell.setEnabled(true);
  r.layoutState.layoutInfo.sidebar = 280; notify();
  assert.equal(r.layoutState.layoutInfo.sidebar, 280, 'a real 280px choice is kept');
  r.layoutState.layoutInfo.sidebar = 0; notify();
  r.layoutState.layoutInfo.sidebar = 280; notify();
  assert.equal(r.layoutState.layoutInfo.sidebar, 280, 'reopening at 280 stays 280 when that was the width');
  r.shell.dispose();
});

test('tab descriptors only use the current surface, never unrelated sessions', () => {
  const r = runtime();
  const text = (_key, fallback) => fallback;
  const snapshot = { current: 'empty', ids: ['empty', 'a', 'b'], byId: { empty: { blank: true }, a: { title: 'A' }, b: { title: 'B' } } };
  const blank = r.sandbox.currentTab(snapshot, null, false, null, text);
  assert.equal(blank.title, '新会话');
  assert.equal(blank.blank, true);
  assert.equal(r.sandbox.isCreated(blank), true, 'a conversation that was just created pins immediately');
  assert.equal(r.sandbox.currentTab(snapshot, 'plugins', false, null, text).key, 'panel:plugins');
  assert.equal(r.sandbox.currentTab(snapshot, null, true, null, text).key, 'settings');
  snapshot.current = 'a';
  const opened = r.sandbox.currentTab(snapshot, null, false, null, text);
  assert.equal(opened.title, 'A');
  assert.equal(opened.blank, false);
  assert.equal(r.sandbox.isCreated(opened), false, 'sessions opened from the tree stay in the preview slot');
  assert.equal(r.sandbox.isCreated({ kind: 'home' }), false);
  snapshot.current = undefined;
  assert.equal(r.sandbox.currentTab(snapshot, null, false, null, text).key, 'home');
  assert.equal(r.sandbox.currentTab(snapshot, null, false, null, text).title, '首页');
});

test('a new conversation stays a preview until a message is sent', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  r.snapshot.current = 'blank';
  r.render(); r.render();
  const tab = () => r.flatten(r.render()).find(node => typeof node.props?.className === 'string' && (node.props.className === 'smooth-workspace-tab' || node.props.className.startsWith('smooth-workspace-tab ')));
  assert.equal(tab().props['data-preview'], true, 'a fresh conversation opens as the replaceable preview');
  r.operate(); r.render();
  assert.equal(tab().props['data-preview'], true, 'operations inside a new conversation do not pin it');
  const keydown = r.events.get('keydown');
  keydown({ type: 'keydown', key: 'Enter', isComposing: false, shiftKey: false, target: { textContent: 'hello', closest: selector => selector === '[data-composer-card]' || selector === '[data-composer-input]' ? {} : null } });
  r.render();
  assert.equal(tab().props['data-preview'], false, 'sending the first message pins the tab');
});

test('archiving a conversation removes its tab and nothing brings it back', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  const tabs = () => r.flatten(r.render()).filter(node => node.props?.role === 'tab');
  const titles = () => Array.from(tabs(), tab => tab.props.title);
  // Two opened conversations: 'a' pinned first, then 'b'.
  r.snapshot.current = 'a';
  r.render(); r.render();
  r.operate();
  r.snapshot.byId.b = { title: 'B' };
  r.snapshot.current = 'b';
  r.render(); r.render();
  r.operate();
  assert.deepEqual(titles(), ['B', '实际会话'], 'both conversations hold tabs');

  // Archiving a background conversation drops only that tab.
  r.workspaceList.archivedSessionIds = ['a'];
  r.render(); r.render();
  assert.deepEqual(titles(), ['B'], 'the archived conversation leaves the strip');

  // Archiving the current conversation clears the main view in the host and the
  // strip loses its last tab; nothing is selected afterwards.
  r.workspaceList.archivedSessionIds = ['a', 'b'];
  r.snapshot.current = undefined;
  r.render(); r.render();
  assert.deepEqual(titles(), [], 'no tab remains once the current conversation is archived');
  assert.equal(tabs().filter(node => node.props['aria-selected']).length, 0, 'and no tab is current');

  // The host may keep the archived conversation on screen until it clears it; operating
  // inside it must not pin the dead tab back into the strip.
  r.snapshot.current = 'a';
  r.render(); r.render();
  r.operate();
  r.render();
  assert.deepEqual(titles(), [], 'an archived conversation never regains a tab');
});

test('an archived conversation offers a trailing delete action that confirms first', async () => {
  const r = runtime();
  r.shell.setEnabled(true);
  const row = r.registrations.get('sidebar.workspaces.session.row.action/smooth.delete');
  assert.ok(row, 'the delete action is registered in the host row-action slot');
  assert.equal(row.options.order, 300, 'it sits after the host archive/pin buttons');
  const renderRow = () => row.component({ sessionId: 'a', displayTitle: '实际会话', useWorkspaces: fn => fn(r.workspaceList) });
  assert.equal(renderRow(), null, 'a running conversation has no delete action');
  r.workspaceList.archivedSessionIds = ['a'];
  const button = r.flatten(renderRow()).find(node => node.props?.className === 'smooth-session-delete');
  assert.ok(button, 'the archived row carries the trailing delete button');
  assert.match(button.props['aria-label'], /实际会话/);
  button.props.onClick({ stopPropagation() {} });

  const dialogRegistration = r.registrations.get('shell.overlay/smooth.session-delete');
  assert.ok(dialogRegistration, 'the confirmation dialog is an overlay entry');
  const dialog = () => dialogRegistration.component({});
  let tree = dialog();
  assert.ok(tree, 'the request opens the confirmation');
  assert.match(tree.props.description, /实际会话/, 'the dialog names the conversation');
  let footer = tree.props.footer;
  const cancel = footer.children.find(node => node.children.includes('取消'));
  let confirm = footer.children.find(node => node.children.includes('删除'));
  assert.ok(cancel && confirm, 'the dialog offers cancel and delete');
  // Cancelling closes without touching the Host.
  cancel.props.onClick();
  assert.equal(dialog(), null, 'cancel drops the request');
  assert.deepEqual(r.bridgeCalls, [], 'cancel issues no bridge request');

  // Reopen and confirm: the bridge removes the stored log, then the session list is
  // re-pulled so the workspace tree drops the deleted row.
  button.props.onClick({ stopPropagation() {} });
  tree = dialog();
  footer = tree.props.footer;
  confirm = footer.children.find(node => node.children.includes('删除'));
  confirm.props.onClick();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(r.bridgeCalls.length, 1, 'one bridge request is sent');
  assert.equal(r.bridgeCalls[0][0], 'session-delete');
  assert.equal(r.bridgeCalls[0][1].sessionId, 'a');
  assert.equal(r.sessionRefreshes, 1, 'the deleted row is dropped by a fresh session list pull');
  assert.equal(dialog(), null, 'the dialog closes after the deletion');
});

test('the conversation width the user runs with becomes the plugin default', () => {
  const r = runtime();
  const store = new Map([['dsh.conversation.contentWidth', '812']]);
  const written = [];
  r.sandbox.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  r.sandbox.document.querySelectorAll = () => [{ style: { setProperty: (key, value) => written.push([key, value]) } }];
  r.sandbox.applyWidth();
  assert.equal(store.get('dsh.smooth.conversationWidth'), '812', 'the dragged width is saved as the plugin default');
  assert.equal(store.get('dsh.conversation.contentWidth'), '812');
  assert.deepEqual(written, [['--dsh-chat-user-width', '812px']], 'the running body is republished at that width');
  store.delete('dsh.conversation.contentWidth');
  r.sandbox.applyWidth();
  assert.equal(store.get('dsh.conversation.contentWidth'), '812', 'a cleared host preference falls back to the saved default');
});

test('with nothing stored, the measured conversation width is adopted as the default', () => {
  const r = runtime();
  const store = new Map();
  r.sandbox.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  r.sandbox.document.querySelectorAll = () => [{ style: { getPropertyValue: key => key === '--dsh-chat-user-width' ? '744px' : '', setProperty: () => {} } }];
  r.sandbox.applyWidth();
  assert.equal(store.get('dsh.smooth.conversationWidth'), '744');
  assert.equal(store.get('dsh.conversation.contentWidth'), '744');
});

test('a collapsed caption measures the native menu so the strip clears 编辑', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  const menu = { getBoundingClientRect: () => ({ right: 180.4, width: 96 }) };
  r.sandbox.document.querySelector = selector => selector === '[data-windows-menu]' ? menu
    : selector === '[data-sidebar-collapsed]' ? { getAttribute: () => 'true' } : null;
  const resize = r.events.get('window:resize');
  assert.equal(typeof resize, 'function', 'the chrome listens for caption relayouts');
  resize();
  assert.equal(r.properties.get('--smooth-caption-leading'), '188px', 'the strip starts 8px after the menu');
  r.sandbox.document.querySelector = () => null;
  resize();
  assert.equal(r.properties.has('--smooth-caption-leading'), false, 'an expanded sidebar drops the caption override');
  r.shell.dispose();
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

test('Home with no session tab returns to the welcome page instead of the retained conversation', () => {
  // DSH keeps the last conversation in its main view after its tab is gone, so a
  // Home click used to reveal a page the strip no longer stood for. The welcome page
  // is the only honest surface then.
  const r = runtime();
  r.shell.setEnabled(true);
  r.snapshot.current = undefined;
  r.settingsState.open = true;
  r.render(true);
  const home = () => r.flatten(r.render(true)).find(node => node.props.className === 'smooth-rail-home');
  assert.equal(home().props['aria-pressed'], false, 'the settings page is not the main page');
  home().props.onClick();
  assert.equal(r.settingsState.open, false);
  assert.deepEqual(r.calls, [['home']], 'clearing the main view is the whole navigation');
  assert.equal(r.snapshot.current, undefined);
  const main = r.flatten(r.render());
  const tabs = main.filter(node => node.props.role === 'tab');
  assert.deepEqual(Array.from(tabs, node => node.props['aria-selected']), [false],
    'the settings tab stays in the strip but nothing is current on the welcome page');
  assert.ok(main.some(node => node.props.className === 'smooth-rail-home' && node.props['aria-pressed'] === true),
    'the welcome page counts as the main page');
  // A session tab still protects its conversation: the click only closes the settings
  // page stacked above it. Operating inside the conversation pins its tab, which is
  // what keeps it in the ledger while another surface opens over it.
  r.snapshot.current = 'a';
  r.render(); r.render();
  r.operate();
  r.render();
  r.calls.length = 0;
  r.settingsState.open = true;
  r.render(true);
  r.flatten(r.render(true)).find(node => node.props.className === 'smooth-rail-home').props.onClick();
  assert.deepEqual(r.calls, [], 'the conversation stays when its tab is open');
  assert.equal(r.snapshot.current, 'a');
  r.shell.dispose();
});

test('previews replace each other; new tabs take the front, duplicates stay single', () => {
  const r = runtime();
  const tabs = r.sandbox.createTabs();
  const a = { key: 'a', title: 'A' }, b = { key: 'b', title: 'B' };
  tabs.show(a); tabs.show(b);
  assert.equal(tabs.getSnapshot().pinned.length, 0);
  assert.equal(tabs.getSnapshot().preview.key, 'b');
  tabs.pin(b); tabs.pin(b);
  for (const tab of [a, { key: 'c', title: 'C' }, { key: 'settings', title: '设置' }]) { tabs.show(tab); tabs.pin(tab); }
  assert.deepEqual(Array.from(tabs.getSnapshot().pinned, tab => tab.key), ['settings', 'c', 'a', 'b'],
    'pinning prepends: the newest tab sits at the front');
  tabs.show({ ...b, title: '改名后的 B' });
  assert.equal(tabs.getSnapshot().pinned.find(tab => tab.key === 'b').title, '改名后的 B', 'an update keeps its slot');
  assert.equal(tabs.getSnapshot().preview, null);
  const state = tabs.getSnapshot(); tabs.show({ ...b, title: '改名后的 B' });
  assert.equal(tabs.getSnapshot(), state, 'unchanged routes keep an external-store snapshot stable');
});

test('pinned tabs reorder by insertion index and a moved preview leads or pins', () => {
  const tabs = runtime().sandbox.createTabs();
  const a = { key: 'a', title: 'A' }, b = { key: 'b', title: 'B' }, c = { key: 'c', title: 'C' }, d = { key: 'd', title: 'D' }, e = { key: 'e', title: 'E' }, f = { key: 'f', title: 'F' };
  for (const tab of [a, b, c]) tabs.pin(tab);
  // Array.from lands the comparison in this realm; the ledger's array comes from the VM.
  const keys = () => Array.from(tabs.getSnapshot().pinned, tab => tab.key);
  const order = () => Array.from([tabs.getSnapshot().preview, ...tabs.getSnapshot().pinned].filter(Boolean), tab => tab.key);
  assert.deepEqual(keys(), ['c', 'b', 'a'], 'pinned tabs read newest first');

  tabs.move('a', 0);
  assert.deepEqual(keys(), ['a', 'c', 'b'], 'dropping before the first tab moves it to the front');
  tabs.move('a', 3);
  assert.deepEqual(keys(), ['c', 'b', 'a'], 'dropping after the last tab moves it to the end');
  tabs.move('b', 0);
  assert.deepEqual(keys(), ['b', 'c', 'a'], 'dropping at the front again');
  tabs.move('b', 1);
  assert.deepEqual(keys(), ['b', 'c', 'a'], 'dropping in place leaves the order alone');

  tabs.show(d);
  assert.deepEqual(order(), ['d', 'b', 'c', 'a'], 'a new tab leads the strip as the preview');
  tabs.move('d', 2);
  assert.equal(tabs.getSnapshot().preview, null, 'a dragged preview becomes pinned');
  assert.deepEqual(keys(), ['b', 'd', 'c', 'a'], 'in the slot it was dropped into');

  tabs.show(e);
  assert.deepEqual(order(), ['e', 'b', 'd', 'c', 'a']);
  tabs.move('e', 3);
  assert.deepEqual(keys(), ['b', 'd', 'e', 'c', 'a'], 'a preview dragged into the middle pins there');

  tabs.show(f);
  tabs.move('a', 0);
  assert.deepEqual(order(), ['f', 'a', 'b', 'd', 'e', 'c'], 'a pinned tab dropped at the front lands behind the preview');
  assert.equal(tabs.getSnapshot().preview.key, 'f', 'the preview keeps the leading slot');
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
  let rests = 0;
  const controller = r.sandbox.installScroll(node, () => { rests += 1; });
  const wheel = (deltaY, extra = {}) => {
    let prevented = false;
    listeners.get('wheel')({ deltaX: 0, deltaY, deltaMode: 0, ...extra, preventDefault() { prevented = true; } });
    return prevented;
  };
  assert.equal(wheel(120), true); assert.equal(offset, 0, 'the wheel must not jump immediately');
  tick(); assert.ok(offset > 0 && offset < 120, 'an intermediate animation frame is visible');
  wheel(120); assert.equal(frames.size, 1, 'continuous input shares one animation loop');
  settle(); assert.equal(offset, 240, 'wheel deltas accumulate before the previous animation ends');
  assert.equal(rests, 1, 'the strip reports the exact position it came to rest at');
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

test('each arrow exists only while its direction can still be scrolled', () => {
  const arrows = r => r.flatten(r.render()).filter(node => node.props && node.props.className === 'smooth-tab-scroll');
  const sides = r => arrows(r).map(node => node.props['data-side']);

  // Something to reveal on both sides: both arrows are up.
  const mid = runtime({ overflow: { left: true, right: true } });
  mid.shell.setEnabled(true);
  assert.deepEqual(sides(mid), ['left', 'right']);

  // Wheeled to the right end: nothing is left to the right, so that arrow is gone.
  const end = runtime({ overflow: { left: true, right: false } });
  end.shell.setEnabled(true);
  assert.deepEqual(sides(end), ['left'], 'the right arrow hides once the tabs reach the end');

  // At the very start only the right arrow is there.
  const start = runtime({ overflow: { left: false, right: true } });
  start.shell.setEnabled(true);
  assert.deepEqual(sides(start), ['right']);

  // A strip that fits has no arrows at all.
  const fits = runtime();
  fits.shell.setEnabled(true);
  assert.deepEqual(sides(fits), []);
});

test('each arrow is read from the strip extents and hides at its end', () => {
  const r = runtime();
  const node = { scrollLeft: 0, clientWidth: 400, scrollWidth: 528 };
  const read = () => ({ ...r.sandbox.tabOverflow(node) });
  assert.deepEqual(read(), { left: false, right: true }, 'content continues to the right');
  node.scrollLeft = 128;
  assert.deepEqual(read(), { left: true, right: false }, 'at the right end there is nothing left to scroll to');
  node.scrollLeft = 126;
  assert.deepEqual(read(), { left: true, right: false }, 'the last device pixel of rounding is not an overflow');
  node.scrollLeft = 0;
  node.scrollWidth = 400;
  assert.deepEqual(read(), { left: false, right: false }, 'a strip that fits is arrowed in neither direction');
  node.scrollWidth = 401;
  assert.deepEqual(read(), { left: false, right: false }, 'one pixel of rounding is not an overflow either');
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

/** The hover filter is a nested component, so the harness renders it on demand. */
function workspaceFilter(r, inSettings = false) {
  const node = r.flatten(r.render(inSettings)).find(entry => typeof entry.type === 'function');
  return node ? node.type(node.props) : undefined;
}

const filterOptions = tree => tree.children.filter(child => child.props.className === 'smooth-filter-option');

test('hovering the left column flips the workspace list between running and archived sessions', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  let filter = workspaceFilter(r);
  assert.ok(filter, 'the chrome layers the filter over the workspace title row');
  assert.equal(filter.props.role, 'group');
  assert.equal(filter.props['aria-label'], '工作区筛选');
  assert.equal(filter.props['data-smooth-workspace-filter'], '');
  let options = filterOptions(filter);
  assert.deepEqual(Array.from(options, option => option.children[0]), ['进行中', '已归档']);
  assert.deepEqual(Array.from(options, option => option.props['aria-pressed']), [true, false]);

  // Picking the archive publishes the host's own archived-only filter.
  options[1].props.onClick();
  assert.deepEqual(r.workspaceCalls, [['only']]);
  assert.equal(r.workspaceState.archivedFilter, 'only');
  filter = workspaceFilter(r);
  options = filterOptions(filter);
  assert.deepEqual(Array.from(options, option => option.props['aria-pressed']), [false, true], 'the archived side is highlighted');
  assert.deepEqual(Array.from(options, option => option.props['data-selected']), [false, true]);

  // The native menu can also show both; the quick switch reads that as the running
  // view and picking 进行中 normalizes it back to running-only.
  r.workspaceState.archivedFilter = 'show';
  options = filterOptions(workspaceFilter(r));
  assert.deepEqual(Array.from(options, option => option.props['aria-pressed']), [true, false]);
  options[0].props.onClick();
  assert.deepEqual(r.workspaceCalls, [['only'], ['default']]);
  // Re-picking the side that is already shown writes nothing.
  options[0].props.onClick();
  assert.deepEqual(r.workspaceCalls, [['only'], ['default']]);
  r.shell.dispose();
});

test('the icon rail keeps the filter revealed while the pointer rests on it', () => {
  const r = runtime();
  // The rail's top button is portalled into the shell overlay, outside the sidebar
  // column, so the column's own :hover never fires while the pointer is over it.
  r.sandbox.document.querySelector = selector => selector === '.smooth-rail-home'
    ? { getBoundingClientRect: () => ({ left: 4, right: 44, width: 40, height: 36 }) }
    : null;
  r.shell.setEnabled(true);
  workspaceFilter(r);
  const move = r.events.get('window:pointermove');
  assert.equal(typeof move, 'function', 'the chrome tracks the pointer against the icon rail');
  move({ clientX: 30 });
  assert.equal(r.bodyAttributes.has('data-smooth-rail-hover'), true, 'the icon rail reveals the filter');
  move({ clientX: 120 });
  assert.equal(r.bodyAttributes.has('data-smooth-rail-hover'), false, 'leaving the rail hands the reveal back to the sidebar');
  move({ clientX: 8 });
  r.events.get('window:blur')();
  assert.equal(r.bodyAttributes.has('data-smooth-rail-hover'), false, 'leaving the window clears the reveal');
  r.shell.dispose();
});

test('a clicked option releases focus so the overlay can follow the pointer out', () => {
  const r = runtime();
  r.shell.setEnabled(true);
  let options = filterOptions(workspaceFilter(r));
  let blurred = 0;
  const currentTarget = { blur: () => { blurred += 1; } };
  // A pointer click leaves :focus on the button (without :focus-visible); release it,
  // or the fixed overlay would stay visible after the pointer leaves the sidebar.
  options[1].props.onClick({ detail: 1, currentTarget });
  assert.equal(blurred, 1, 'a pointer click must not leave focus behind');
  assert.equal(r.workspaceState.archivedFilter, 'only');
  // Keyboard activation keeps focus: the option stays :focus-visible and is not blurred
  // out from under the keyboard user.
  options = filterOptions(workspaceFilter(r));
  options[0].props.onClick({ detail: 0, currentTarget });
  assert.equal(blurred, 1, 'a keyboard click keeps its focus');
  assert.equal(r.workspaceState.archivedFilter, 'default');
  r.shell.dispose();
});

test('a host without the workspace view store leaves the title alone', () => {
  const r = runtime({ workspaceStore: false });
  r.shell.setEnabled(true);
  assert.equal(workspaceFilter(r), null, 'the filter exists only when the host list can be driven');
  r.shell.dispose();
});

test('the hover filter covers the measured workspace title row', () => {
  const r = runtime();
  const header = {
    getBoundingClientRect: () => ({ left: 168, top: 204, width: 240, height: 36 }),
    querySelector: () => ({ getBoundingClientRect: () => ({ left: 180, top: 210, width: 36, height: 20 }) }),
  };
  r.sandbox.document.querySelector = selector => selector.includes('[data-slot="sidebar"]') ? header : null;
  const node = { style: {} };
  assert.equal(r.sandbox.placeFilter(node), true);
  assert.equal(node.style.left, '178px', 'the box starts at the title text');
  assert.equal(node.style.top, '210px', 'its 24px height is centred on the 36px header');
  // Without the label the header's own left padding is the anchor.
  header.querySelector = () => null;
  assert.equal(r.sandbox.placeFilter(node), true);
  assert.equal(node.style.left, '170px');
  // No header (collapsed sidebar) leaves the fixed coordinates untouched.
  r.sandbox.document.querySelector = () => null;
  assert.equal(r.sandbox.placeFilter(node), false);
});

test('the hover filter labels exist in both locales', async () => {
  const shared = await readFile(new URL('../src/shared.js', import.meta.url), 'utf8');
  const zh = shared.slice(shared.indexOf('const zhCN'), shared.indexOf('const enUS'));
  const en = shared.slice(shared.indexOf('const enUS'));
  for (const key of ['shell.workspaceFilter', 'shell.inProgress', 'shell.archived']) {
    const pattern = new RegExp(`'${key.replace(/\./g, '\\.')}':`);
    assert.match(zh, pattern, `missing zh ${key}`);
    assert.match(en, pattern, `missing en ${key}`);
  }
});
