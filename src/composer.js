/** Read Git's small text metadata through the host's existing read-only file API.
 * A missing repository or a denied read has no invented branch/count fallback. */
async function readWorkspaceBranch(files, sessionId, cwd, signal) {
  if (!files || !sessionId || !cwd) return undefined;
  const read = async (path) => {
    const result = await files.read(sessionId, path, { offset: 1, limit: 2 }, signal);
    return result.ok ? result.value.text.trim() : undefined;
  };
  let directory = cwd.replace(/\\/g, '/').replace(/\/$/, '');
  for (let depth = 0; depth < 16 && directory && !signal.aborted; depth++) {
    let head = await read(`${directory}/.git/HEAD`);
    if (!head) {
      const link = await read(`${directory}/.git`);
      const gitdir = link?.match(/^gitdir:\s*(.+)$/)?.[1];
      if (gitdir) {
        const target = /^(?:[a-z]:[\\/]|\/)/i.test(gitdir) ? gitdir : `${directory}/${gitdir}`;
        head = await read(`${target.replace(/\\/g, '/')}/HEAD`);
      }
    }
    if (head) {
      const branch = head.match(/^ref: refs\/heads\/(.+)$/)?.[1];
      if (branch) return branch;
      if (/^[0-9a-f]{40,64}$/i.test(head)) return head.slice(0, 8);
      return undefined;
    }
    const parent = directory.replace(/\/[^/]*$/, '');
    if (parent === directory || /^[a-z]:$/i.test(directory)) break;
    directory = parent;
  }
  return undefined;
}

/** Style the native aria-hidden placeholder without replacing its editor or slots.
 * Screen readers retain the complete native instructions and unavailable hints. */
function installComposerHint(placeholder, prompts, prompt) {
  const input = placeholder?.parentElement?.querySelector('[data-composer-input]');
  if (!input) return;
  const property = '--smooth-composer-placeholder';
  const attribute = 'data-smooth-placeholder';
  const original = placeholder.style.getPropertyValue(property);
  const priority = placeholder.style.getPropertyPriority(property);
  const marked = placeholder.getAttribute(attribute);
  const restore = () => {
    if (original) placeholder.style.setProperty(property, original, priority);
    else placeholder.style.removeProperty(property);
    if (marked === null) placeholder.removeAttribute(attribute);
    else placeholder.setAttribute(attribute, marked);
  };
  const update = () => {
    if (input.getAttribute('aria-disabled') === 'true' || !prompts.includes(input.getAttribute('data-placeholder'))) { restore(); return; }
    placeholder.style.setProperty(property, JSON.stringify(prompt));
    placeholder.setAttribute(attribute, '');
  };
  update();
  const observer = new MutationObserver(update);
  observer.observe(input, { attributes: true, attributeFilter: ['data-placeholder', 'aria-disabled'] });
  return () => { observer.disconnect(); restore(); };
}

/** Render native controls into reference positions without moving React-owned DOM.
 * The native component keeps its locale, injected actions, hooks and confirmations. */
function installComposerLayout({ slots, remote, useSmoothState, text }) {
  const { createPortal } = require('react-dom');
  const ui = require('@deepseek-ai/dsh-client-ui-primitives');
  const disposers = [];
  const hero = '[data-content-phase="hero"]';
  // The three targets this module decorates share one coalesced body observer; see
  // src/watch.js for why a per-target observer was a startup cost.
  const surfaces = createSurfaceWatcher();
  disposers.push(() => surfaces.dispose());
  function useTarget(selector) {
    const [target, setTarget] = React.useState(null);
    React.useEffect(() => surfaces.watch(selector, setTarget), [selector]);
    return target;
  }
  function useBranch(sessionId, cwd) {
    const [value, setValue] = React.useState({});
    React.useEffect(() => {
      if (!remote?.workspaceFiles || !sessionId || !cwd) return;
      let disposed = false;
      let pending;
      const update = async () => {
        pending?.abort();
        const controller = new AbortController();
        pending = controller;
        try {
          const branch = await readWorkspaceBranch(remote.workspaceFiles, sessionId, cwd, controller.signal);
          if (!disposed && !controller.signal.aborted) setValue({ sessionId, cwd, branch });
        } catch {
          if (!disposed && !controller.signal.aborted) setValue({ sessionId, cwd });
        }
      };
      update();
      const interval = window.setInterval(update, 30000);
      window.addEventListener('focus', update);
      return () => { disposed = true; pending?.abort(); window.clearInterval(interval); window.removeEventListener('focus', update); };
    }, [sessionId, cwd]);
    return value.sessionId === sessionId && value.cwd === cwd ? value.branch : undefined;
  }
  function Metadata(props) {
    const skin = useSmoothState();
    const sessions = props.useSessions((value) => value);
    const workspaces = props.useWorkspaces((value) => value);
    const session = sessions.byId?.[props.sessionId];
    const workspace = workspaces.items?.find((item) => item.sessionIds.includes(props.sessionId));
    const name = workspace?.title || session?.cwd?.split(/[\\/]/).filter(Boolean).pop();
    const card = useTarget(`${hero} [data-composer-card]`);
    const row = useTarget(`${hero} ${hostPart('heroWorkspaceRow')}`);
    const branch = useBranch(card && skin.state.enabled ? props.sessionId : undefined, session?.cwd);
    if (!skin.state.enabled || !card) return null;
    const git = branch && h('span', { className: 'smooth-meta-branch', title: branch }, h(ui.IconBranchOutlineRegular, { size: 16, 'aria-hidden': true }), branch);
    return h(React.Fragment, null,
      createPortal(h('div', { className: 'smooth-composer-meta' },
        name && h('span', { className: 'smooth-meta-workspace', title: session?.cwd }, name), git,
        h('span', { className: 'smooth-meta-divider', 'aria-hidden': true }),
        h('span', { className: 'smooth-meta-host' }, h(ui.IconFollowsystemOutlineRegular, { size: 16, 'aria-hidden': true }), text('shell.host', '当前主机')),
        h('div', { 'data-smooth-permission-seat': '' })), card),
      row && git && createPortal(h('span', { className: 'smooth-hero-branch' }, h('span', { 'aria-hidden': true }, '/'), git), row));
  }
  disposers.push(slots.inject('conversation.input.overlay', () => slots.register({ name: 'conversation.input.overlay', id: `${PLUGIN_ID}.metadata`, order: -100 }, Metadata)));
  function ComposerHint(props) {
    const skin = useSmoothState();
    const target = useTarget('[data-composer-card] [data-composer-placeholder]');
    const heroPrompt = props.t('placeholder.hero');
    const normalPrompt = props.t('placeholder.default');
    const shortPrompt = text('composer.placeholder', '描述任务，/ 调用指令，@ 引用文件或对话');
    React.useEffect(() => {
      if (skin.state.enabled) return installComposerHint(target, [heroPrompt, normalPrompt], shortPrompt);
    }, [target, heroPrompt, normalPrompt, shortPrompt, skin.state.enabled]);
    return null;
  }
  disposers.push(slots.inject('conversation.input.overlay', () => slots.register({ name: 'conversation.input.overlay', id: `${PLUGIN_ID}.hint`, order: -90, locale: 'conversation' }, ComposerHint)));
  function decorate(name, wrap) {
    return slots.inject(name, () => {
      let native;
      let disposeNative;
      const refresh = () => {
        const next = slots.entries(name).find((entry) => entry.registrant !== PLUGIN_ID && entry.component);
        if (next === native) return;
        disposeNative?.();
        native = next;
        if (!native) return;
        const original = native;
        // Carry the native registration's options over, not just the three the skin
        // used to need. DSH 0.3's model entry declares a child slot through `children`
        // (`conversation.input.model.label`), and the runtime only supplies `renderSlot`
        // to entries that declare it; dropping it made ModelSelect throw
        // "renderSlot is not a function". `id` stays out so the re-registration cannot
        // collide with the native entry; priority and registrant are ours.
        const inherited = { ...(native.options || {}) };
        delete inherited.id;
        delete inherited.priority;
        delete inherited.registrant;
        // Native entries in the wild carry these on the entry as well as in options.
        const locale = inherited.locale ?? native.locale;
        const inject = inherited.inject ?? native.inject;
        const store = inherited.store ?? native.store;
        disposeNative = slots.register({ ...inherited, name, locale, inject, store, priority: (native.options?.priority || 0) - 10, registrant: PLUGIN_ID },
          wrap(original.component));
      };
      refresh();
      const unsubscribe = slots.subscribe?.(name, refresh);
      return () => { unsubscribe?.(); disposeNative?.(); };
    });
  }
  function relocate(name, selector, className) {
    return decorate(name, Native => function Relocated(props) {
      const skin = useSmoothState();
      const target = useTarget(selector);
      const control = h(Native, props);
      return skin.state.enabled && target ? createPortal(h('div', { className }, control), target) : control;
    });
  }
  disposers.push(decorate('conversation.input.model', Native => function ModelControl(props) {
    const skin = useSmoothState();
    const control = h(Native, props);
    return skin.state.enabled ? h('div', { className: 'smooth-composer-model' }, control) : control;
  }));
  disposers.push(relocate('conversation.hero.agentPreset', `${hero} [data-composer-card] ${hostPart('tools')}`, 'smooth-composer-preset'));
  disposers.push(relocate('conversation.input.permission', `${hero} [data-smooth-permission-seat]`, 'smooth-composer-permission'));
  return () => { for (const dispose of disposers.reverse()) dispose?.(); };
}
