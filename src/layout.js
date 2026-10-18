/** The installed root/settings registrations publish shared store instances.
 * Navigation uses native actions; tabs never retain, delete or rename sessions. */
function sharedSurfaceStore(slots, name, action) {
  if (typeof slots?.entries !== 'function') return undefined;
  for (const entry of slots.entries(name)) {
    const store = entry.store?.create?.();
    if (typeof store?.actions?.[action] === 'function') return store;
  }
}

/** The sidebar width the skin opens with. This is the 352px layout the user
 * resized to and asked to keep: deriving 28.5vw on every enable overwrote that
 * choice whenever the window width changed. The bounds still guard the native
 * 264-420px clamp and the skin's 320-560px rail window. */
const DEFAULT_SIDEBAR_WIDTH = 352;

function currentWorkspaceTab(snapshot, panel, settingsOpen, panelTitle, text) {
  if (settingsOpen) return { key: 'settings', kind: 'settings', title: text('shell.settings', '设置') };
  if (panel) return { key: `panel:${panel}`, kind: 'panel', id: panel, title: panelTitle || (panel === 'plugins' ? text('shell.plugins', '插件') : panel) };
  const byId = snapshot?.byId || {};
  const currentId = snapshot?.current || Object.keys(byId).find((id) => byId[id]?.retainedBy?.mainView > 0);
  const current = byId[currentId];
  return currentId && current
    ? { key: `session:${currentId}`, kind: 'session', id: currentId, title: current.blank ? text('shell.new', '新会话') : current.title || text('shell.untitled', '未命名会话') }
    : { key: 'home', kind: 'home', title: text('shell.home', '首页') };
}

/** UI-only ledger: one replaceable preview and an ordered list of operated tabs.
 * New tabs open at the front of the strip: the preview owns the leading slot while it
 * exists, and pinning it keeps it there. Closing an entry only changes this ledger;
 * session lifetime belongs to DSH. */
function createWorkspaceTabs() {
  let state = { pinned: [], preview: null, activeKey: null };
  const listeners = new Set();
  const publish = (next) => { state = next; for (const listener of listeners) listener(); };
  const items = () => [...(state.preview ? [state.preview] : []), ...state.pinned];
  return {
    getSnapshot: () => state,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    show(tab) {
      const existing = state.pinned.find(item => item.key === tab.key);
      if (state.activeKey === tab.key && (existing || state.preview)?.title === tab.title) return;
      publish({ activeKey: tab.key,
        pinned: existing ? state.pinned.map(item => item.key === tab.key ? tab : item) : state.pinned,
        preview: existing ? state.preview : tab });
    },
    pin(tab) {
      if (!tab) return;
      const existing = state.pinned.find(item => item.key === tab.key);
      if (existing?.title === tab.title) return;
      publish({ ...state, activeKey: tab.key,
        pinned: existing ? state.pinned.map(item => item.key === tab.key ? tab : item) : [tab, ...state.pinned],
        preview: state.preview?.key === tab.key ? null : state.preview });
    },
    /** Move one visible tab to `index`, counted from the leading slot. The replaceable
     * preview owns that slot while it exists, so a pinned tab dropped in front of it
     * lands directly behind it; a preview that is dragged becomes pinned where it was
     * dropped instead of being discarded. */
    move(key, index) {
      const list = items();
      const from = list.findIndex(item => item.key === key);
      if (from < 0) return;
      const movingPreview = state.preview?.key === key;
      const target = Math.max(0, Math.min(Number.isFinite(index) ? Math.round(index) : list.length, list.length));
      if (target === from || target === from + 1) return;
      const next = [...list];
      const [moving] = next.splice(from, 1);
      // Removing one entry before the insertion point shifts it one slot left.
      next.splice(target > from ? target - 1 : target, 0, moving);
      const preview = movingPreview ? null : state.preview;
      const pinned = preview ? next.filter(item => item.key !== preview.key) : next;
      if (!movingPreview && pinned.every((item, i) => item.key === state.pinned[i]?.key)) return;
      publish({ ...state, pinned, preview, activeKey: state.activeKey });
    },
    /** The main surface no longer belongs to any tab: nothing in the strip is current. */
    clearActive() {
      if (state.activeKey === null) return;
      publish({ ...state, activeKey: null });
    },
    close(key) {
      const list = items();
      const index = list.findIndex(item => item.key === key);
      if (index < 0) return;
      const active = state.activeKey === key;
      const remaining = list.filter(item => item.key !== key);
      const next = active ? remaining[Math.max(0, index - 1)] || remaining[0] : undefined;
      publish({ pinned: state.pinned.filter(item => item.key !== key), preview: state.preview?.key === key ? null : state.preview,
        activeKey: active ? next?.key || null : state.activeKey });
      return { active, next };
    },
  };
}

function isWorkspaceOperation(event) {
  const target = event.target;
  if (event.isTrusted === false || !target?.closest) return false;
  if (target.closest(`.smooth-workspace-bar,.smooth-rail-home,.smooth-rail-plugins,${hostPart('sidebarCol')},[data-smooth-account-menu]`)) return false;
  if (!target.closest(`[data-slot="main"],[data-shortcut-modal="settings"],${hostPart('centerCol')}`)) return false;
  return event.type === 'click'
    ? !!target.closest('button,a[href],[role="button"],[role="switch"],[role="checkbox"],[role="radio"],[role="menuitem"],[role="tab"]')
    : ['input', 'change'].includes(event.type) && !!target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');
}

/** One animation owns wheel and arrow movement, so neither can override the other.
 * Use a native non-passive listener so the content below cannot scroll with it.
 * `onSettle` runs when the animation actually comes to rest: the last assignment is
 * made inside a frame callback, and the caller must re-read the strip at that exact
 * position instead of trusting the scroll events the easing produced. */
function installTabScroll(node, onSettle) {
  if (!node) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let frame = null;
  let target = node.scrollLeft;
  let lastTime;
  const stop = () => {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastTime = undefined;
  };
  const rest = () => { frame = null; lastTime = undefined; onSettle?.(); };
  const animate = (time) => {
    const elapsed = lastTime === undefined ? 16 : Math.min(48, time - lastTime);
    lastTime = time;
    target = Math.max(0, Math.min(node.scrollWidth - node.clientWidth, target));
    const distance = target - node.scrollLeft;
    if (Math.abs(distance) < .5 || reducedMotion?.matches) {
      node.scrollLeft = target;
      rest();
      return;
    }
    // Time-based easing keeps the speed consistent on high refresh-rate screens.
    const previous = node.scrollLeft;
    node.scrollLeft += distance * (1 - Math.exp(-elapsed / 55));
    // Scroll offsets can round to device pixels. Finish when the easing step
    // becomes too small to move, instead of leaving a frame loop running forever.
    if (node.scrollLeft === previous) {
      node.scrollLeft = target;
      rest();
      return;
    }
    frame = window.requestAnimationFrame(animate);
  };
  const scrollBy = (delta) => {
    if (frame === null) target = node.scrollLeft;
    target = Math.max(0, Math.min(node.scrollWidth - node.clientWidth, target + delta));
    if (reducedMotion?.matches) { stop(); node.scrollLeft = target; onSettle?.(); }
    else if (frame === null) frame = window.requestAnimationFrame(animate);
  };
  const onWheel = (event) => {
    // Keep browser zoom and horizontal trackpad gestures native.
    if (event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) >= Math.abs(event.deltaY)
      || node.scrollWidth <= node.clientWidth + 1) { stop(); return; }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? node.clientWidth : 1;
    event.preventDefault();
    scrollBy(event.deltaY * unit);
  };
  node.addEventListener('wheel', onWheel, { passive: false });
  node.addEventListener('pointerdown', stop);
  return {
    scrollBy,
    dispose() {
      stop();
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('pointerdown', stop);
    },
  };
}

/** Scroll state of the tab strip, read from the strip's own scroll extents: each
 * arrow exists only while that direction can still move the strip, so it is gone by
 * the time the tabs reach the end. The two-pixel allowance absorbs the rounding of
 * scrollWidth/clientWidth against a fractional scrollLeft at non-integer DPI, which
 * otherwise leaves an arrow pointing at a strip that cannot move any further. */
function tabOverflow(node) {
  return {
    left: node.scrollLeft > 2,
    right: node.scrollLeft + node.clientWidth < node.scrollWidth - 2,
  };
}

function installReferenceShell({ slots, layout, uiWorkspace, modelDirectories, theme, remote, subscribeTheme, chooseTheme, useSmoothState, text }) {
  if (!slots || !layout || !uiWorkspace) return { dispose() {} };
  const ui = require('@deepseek-ai/dsh-client-ui-primitives');
  const layoutStore = sharedSurfaceStore(slots, 'root', 'setSidebar');
  const settingsStore = sharedSurfaceStore(slots, 'sidebar.settings', 'open');
  let previousWidth;
  let appliedWidth;
  let active = false;
  const workspaceTabs = createWorkspaceTabs();
  let currentView;
  let appearanceDispose;
  let headingDispose;
  let composerDispose;
  let accountDispose;
  let usageDispose;
  const disposers = [];
  // The home view is the page itself, not a tab, so it never becomes a pin target.
  const recordOperation = (event) => { if (active && currentView && isWorkspaceOperation(event)) workspaceTabs.pin(currentView); };
  for (const type of ['input', 'change', 'click']) {
    document.addEventListener(type, recordOperation, true);
    disposers.push(() => document.removeEventListener(type, recordOperation, true));
  }
  const setLeftWidth = () => {
    const info = layoutStore?.getSnapshot().layoutInfo;
    if (info) document.body.style.setProperty('--smooth-left-width', `${info.sidebar || 0}px`);
  };
  function setEnabled(enabled) {
    if (enabled === active) return;
    active = enabled;
    if (enabled) {
      composerDispose = installComposerLayout({ slots, modelDirectories, remote, useSmoothState, text });
      accountDispose = installAccountMenu({ slots, text });
      usageDispose = installUsage({ slots, useSmoothState, text });
    } else {
      composerDispose?.(); composerDispose = undefined;
      accountDispose?.(); accountDispose = undefined;
      usageDispose?.(); usageDispose = undefined;
    }
    if (enabled && theme) {
      appearanceDispose = slots.inject('settings.general.item', () => slots.register({ name: 'settings.general.item', id: 'appearance', order: 10, priority: -10 }, Appearance));
      headingDispose = slots.inject('settings.general.item', () => slots.register({ name: 'settings.general.item', id: `${PLUGIN_ID}.heading`, order: -100 }, () => h('h1', { className: 'smooth-general-title' }, text('shell.general', '通用设置'))));
    } else {
      appearanceDispose?.(); headingDispose?.();
      appearanceDispose = headingDispose = undefined;
    }
    if (!layoutStore) return;
    const current = layoutStore.getSnapshot().layoutInfo.sidebar;
    if (enabled) {
      previousWidth = current;
      if (current > 0) {
        appliedWidth = Math.min(560, Math.max(320, DEFAULT_SIDEBAR_WIDTH));
        layoutStore.actions.setSidebar(appliedWidth);
      }
    } else if (current === appliedWidth) layoutStore.actions.setSidebar(previousWidth);
    setLeftWidth();
  }
  if (layoutStore) { disposers.push(layoutStore.subscribe(setLeftWidth)); setLeftWidth(); }
  function closeSettings() { settingsStore?.actions.close(); }
  function openSession(id) { closeSettings(); uiWorkspace.openSession(id); }
  function openHome() { closeSettings(); uiWorkspace.clearMain(); }
  /* The home view is the page itself, not a tab: while a session tab is open the
   * click only steps off the settings or panel stacked over it, and the conversation
   * stays. With no session tab there is nothing to step back to — DSH still holds the
   * last conversation in its main view, and showing it would put a page on screen that
   * the strip no longer stands for — so that view is cleared too and the welcome page
   * takes the surface, with no tab marked current. */
  function openMain(panel, settingsOpen) {
    const state = workspaceTabs.getSnapshot();
    const sessionTab = [...(state.preview ? [state.preview] : []), ...state.pinned].some((item) => item.kind === 'session');
    if (!sessionTab) {
      closeSettings();
      if (panel) layout.selectPanel(null);
      workspaceTabs.clearActive();
      uiWorkspace.clearMain();
      return;
    }
    if (!panel && !settingsOpen) return;
    if (settingsOpen) closeSettings();
    if (panel) layout.selectPanel(null);
  }
  function openPlugins() { closeSettings(); layout.selectPanel('plugins'); }
  function openSettings() {
    if (settingsStore?.actions.openSection) settingsStore.actions.openSection('general');
    else settingsStore?.actions.open();
  }
  function activateTab(tab) {
    if (tab.kind === 'session') openSession(tab.id);
    else if (tab.kind === 'settings') openSettings();
    else if (tab.kind === 'panel') { closeSettings(); layout.selectPanel(tab.id); }
    else openHome();
  }
  function closeTab(tab) {
    const result = workspaceTabs.close(tab.key);
    if (!result?.active) return;
    if (result.next) activateTab(result.next);
    // Closing the last tab leaves the strip empty; the welcome page stands on its own.
    else openHome();
  }
  function Appearance() {
    const preference = React.useSyncExternalStore(subscribeTheme, () => theme.getTheme().preference);
    const modes = [
      ['light', 'shell.light', '浅色', ui.IconLightOutlineRegular],
      ['dark', 'shell.dark', '深色', ui.IconDarkOutlineRegular],
      ['system', 'shell.system', '跟随系统', ui.IconFollowsystemOutlineRegular],
    ];
    return h('section', { className: 'smooth-native-appearance' },
      h('h3', null, text('shell.appearance', '外观')),
      h('div', { className: 'smooth-native-appearance-options', role: 'radiogroup', 'aria-label': text('shell.appearance', '外观') },
        ...modes.map(([id, key, fallback, icon]) => h('button', {
          key: id, type: 'button', role: 'radio', 'aria-checked': preference === id,
          onClick: () => chooseTheme(id),
        }, h(icon, { size: 24, 'aria-hidden': true }), text(key, fallback)))));
  }
  function Chrome(props) {
    const skin = useSmoothState();
    const snapshot = props.useSessions((value) => value);
    const panel = props.usePanelInfo((value) => value.activePanelId);
    const settingsOpen = React.useSyncExternalStore(
      settingsStore?.subscribe || (() => () => {}),
      settingsStore ? () => settingsStore.getSnapshot().open : () => false,
    );
    const panelEntry = panel && slots.entries('sidebar.panellist').find(entry => entry.options.id === panel || entry.options.key === panel);
    const panelTitle = typeof panelEntry?.options.label === 'function' ? panelEntry.options.label() : panelEntry?.options.label;
    const view = currentWorkspaceTab(snapshot, panel, settingsOpen, panelTitle, text);
    const tabState = React.useSyncExternalStore(workspaceTabs.subscribe, workspaceTabs.getSnapshot);
    const ownsSurface = skin.state.enabled && !!props.inSettings === settingsOpen;
    React.useEffect(() => {
      if (!ownsSurface) return;
      currentView = view.kind === 'home' ? undefined : view;
      if (currentView) workspaceTabs.show(view);
    }, [ownsSurface, view.key, view.title]);
    const scroll = React.useRef(null);
    const tabScroll = React.useRef(null);
    // Declared before the scroll effect so its callbacks can re-read the strip.
    const [overflow, setOverflow] = React.useState({ left: false, right: false });
    const updateOverflow = () => {
      const node = scroll.current;
      if (!node) return;
      const next = tabOverflow(node);
      setOverflow((old) => old.left === next.left && old.right === next.right ? old : next);
    };
    React.useEffect(() => {
      if (!ownsSurface) return;
      const node = scroll.current;
      // The strip is re-read when the eased scroll comes to rest and when the browser
      // reports the end of any other scroll, so an arrow never outlives its direction.
      const controller = installTabScroll(node, updateOverflow);
      const sync = () => updateOverflow();
      node?.addEventListener('scrollend', sync);
      tabScroll.current = controller;
      return () => { node?.removeEventListener('scrollend', sync); controller?.dispose(); tabScroll.current = null; };
    }, [ownsSurface]);
    // New tabs open at the front: the preview leads, pinned tabs follow newest first.
    const tabs = [...(tabState.preview ? [tabState.preview] : []), ...tabState.pinned];
    const tabSignature = `${tabState.activeKey}/${tabs.map(item => `${item.key}:${item.title}`).join('/')}`;
    /* Pointer-based reordering: the tab content is a native button, so HTML5 drag
     * does not reliably start from it. A four-pixel threshold keeps clicks and the
     * close action intact; the nav captures the pointer only after the drag begins.
     * dropAt is an insertion index in the visible list; the preview stays last. */
    const [drag, setDrag] = React.useState(null);
    const dragRef = React.useRef(null);
    const tabNodes = React.useRef(null);
    const suppressClick = React.useRef(0);
    if (!tabNodes.current) tabNodes.current = new Map();
    const dropIndexAt = (clientX) => {
      // The preview leads the strip, so a pinned tab can be dropped behind it but
      // never in front of it; the preview itself is the only tab that may sit first.
      const floor = tabState.preview ? 1 : 0;
      for (let index = 0; index < tabs.length; index += 1) {
        const node = tabNodes.current.get(tabs[index].key);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) return Math.max(floor, index);
      }
      return tabs.length;
    };
    /* Put the | in the gap rather than on a tab border: the tab clips its own
     * overflow, so a pseudo-element at left:-N was cut to a border-like line. */
    const dropLeftAt = (index) => {
      if (!tabs.length) return 0;
      if (index >= tabs.length) {
        const last = tabNodes.current.get(tabs[tabs.length - 1].key);
        return last ? last.offsetLeft + last.offsetWidth + 4 : 0;
      }
      const node = tabNodes.current.get(tabs[index].key);
      if (!node) return 0;
      return index === 0 ? 1 : Math.max(1, node.offsetLeft - 4);
    };
    const startDrag = (event, item) => {
      if (event.button !== 0) return;
      if (event.target.closest?.('.smooth-tab-close')) return;
      dragRef.current = { key: item.key, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, active: false };
    };
    const moveDrag = (event) => {
      const current = dragRef.current;
      if (!current || current.pointerId !== event.pointerId) return;
      if (!current.active) {
        if (Math.max(Math.abs(event.clientX - current.startX), Math.abs(event.clientY - current.startY)) < 4) return;
        current.active = true;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) {}
      }
      event.preventDefault();
      const dropAt = dropIndexAt(event.clientX);
      const left = dropLeftAt(dropAt);
      setDrag((old) => old && old.key === current.key && old.dropAt === dropAt && old.left === left ? old : { key: current.key, dropAt, left });
    };
    const endDrag = (event, drop) => {
      const current = dragRef.current;
      if (!current || current.pointerId !== event.pointerId) return;
      dragRef.current = null;
      try { event.currentTarget.releasePointerCapture(event.pointerId); } catch (error) {}
      if (current.active) {
        if (drop) workspaceTabs.move(current.key, dropIndexAt(event.clientX));
        suppressClick.current = Date.now() + 300;
        event.preventDefault();
      }
      setDrag(null);
    };
    /* The welcome page is the host's own home surface — no session, panel or settings is
     * showing — not "the strip is empty": Home clears the conversation without closing the
     * strip, and the page it lands on is still the welcome page. The flag is published on
     * the body because the block belongs to the host's hero, outside this component's own
     * tree; the rules that read it live in src/skin.js. A session, panel or settings
     * surface brings the input card back. */
    const welcomePage = view.kind === 'home';
    React.useEffect(() => { document.body.toggleAttribute(HOME_ATTRIBUTE, welcomePage); }, [welcomePage]);
    React.useEffect(() => {
      const node = scroll.current;
      if (!node) return;
      node.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      updateOverflow();
      const observer = new ResizeObserver(updateOverflow);
      observer.observe(node);
      for (const child of node.children) observer.observe(child);
      return () => observer.disconnect();
    }, [tabSignature, skin.state.enabled]);
    if (!ownsSurface) return null;
    const tabItems = tabs.map((item, index) => {
      const selected = item.key === tabState.activeKey;
      const preview = item.key === tabState.preview?.key;
      const dragging = drag?.key === item.key;
      return h('div', {
        key: item.key,
        ref: node => { if (node) tabNodes.current.set(item.key, node); else tabNodes.current.delete(item.key); },
        className: `smooth-workspace-tab${dragging ? ' smooth-tab-dragging' : ''}`,
        'data-selected': selected, 'data-preview': preview,
        onPointerDown: event => startDrag(event, item),
      },
      h('button', { role: 'tab', type: 'button', className: 'smooth-tab-label', 'aria-selected': selected, tabIndex: selected ? 0 : -1,
        title: item.title, onClick: event => {
          if (Date.now() < suppressClick.current) { event.preventDefault(); event.stopPropagation(); return; }
          activateTab(item);
        }, onDoubleClick: () => { if (Date.now() < suppressClick.current) return; workspaceTabs.pin(item); }, onKeyDown: event => {
          if (event.key === 'Delete') { event.preventDefault(); event.stopPropagation(); closeTab(item); }
        } }, h('span', null, item.title)),
      h('button', { type: 'button', className: 'smooth-tab-close', tabIndex: selected ? 0 : -1,
        'aria-label': `${text('shell.closeTab', '关闭标签页')}：${item.title}`, title: text('shell.closeTab', '关闭标签页'),
        onClick: event => { event.stopPropagation(); if (Date.now() < suppressClick.current) return; closeTab(item); } },
        h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('path', { d: 'm4 4 8 8M12 4l-8 8' }))));
    });
    return h(React.Fragment, null,
      h('button', { type: 'button', className: 'smooth-rail-home', 'aria-pressed': !panel && !settingsOpen, title: text('shell.main', '主页面'), 'aria-label': text('shell.main', '主页面'), onClick: () => openMain(panel, settingsOpen) },
        h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: 'm3 10.5 9-7.5 9 7.5M5 9v10a2 2 0 0 0 2 2h3v-7h4v7h3a2 2 0 0 0 2-2V9' }))),
      props.inSettings && h('button', { type: 'button', className: 'smooth-rail-plugins', title: '插件', 'aria-label': '插件', onClick: openPlugins }, h(ui.IconPluginPinwheelOutlineRegular, { size: 23, 'aria-hidden': true })),
      h('div', { className: 'smooth-workspace-bar' },
        overflow.left && h('button', { type: 'button', className: 'smooth-tab-scroll', 'data-side': 'left', 'aria-label': '向左滚动标签页', onClick: () => tabScroll.current?.scrollBy(-240) }, h(ui.IconChevronLeftOutlineRegular, { size: 15 })),
        h('nav', { ref: scroll, onScroll: updateOverflow, className: 'smooth-workspace-tabs', role: 'tablist', 'aria-label': '工作区标签页',
          'data-dragging': drag ? 'true' : undefined,
          onPointerMove: moveDrag,
          onPointerUp: event => endDrag(event, true),
          onPointerCancel: event => endDrag(event, false),
          onLostPointerCapture: event => endDrag(event, false),
          onKeyDown: (event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const buttons = [...event.currentTarget.querySelectorAll('[role="tab"]')];
            const current = event.target.closest('[role="tab"]') || event.target.closest('.smooth-workspace-tab')?.querySelector('[role="tab"]');
            const index = buttons.indexOf(current);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
            event.preventDefault(); buttons[next]?.focus(); buttons[next]?.click();
          } },
          drag && h('span', { className: 'smooth-tab-drop', style: { left: `${drag.left}px` }, 'aria-hidden': 'true' }),
          ...tabItems),
        /* Both arrows only exist while that direction can still be scrolled, so an arrow
           never sits over a strip with nothing left behind it. The bar keeps the right
           arrow's slot as padding either way, so its appearance never moves a tab. */
        overflow.right && h('button', { type: 'button', className: 'smooth-tab-scroll', 'data-side': 'right', 'aria-label': '向右滚动标签页', onClick: () => tabScroll.current?.scrollBy(240) }, h(ui.IconChevronRightOutlineRegular, { size: 15 })),
      ));
  }
  disposers.push(slots.inject('shell.overlay', () => slots.register({ name: 'shell.overlay', id: `${PLUGIN_ID}.chrome`, order: 10 }, Chrome)));
  if (settingsStore) disposers.push(slots.inject('settings.action', () => slots.register({ name: 'settings.action', id: `${PLUGIN_ID}.tabs`, order: 10 }, (props) => h(Chrome, { ...props, inSettings: true }))));
  return {
    setEnabled,
    dispose() {
      setEnabled(false);
      for (const dispose of disposers.reverse()) dispose?.();
      document.body.style.removeProperty('--smooth-left-width');
    },
  };
}
