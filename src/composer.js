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

/** The hero workspace chip is the native picker's owner: it keeps the open state and
 * the anchor ref. The metadata bar re-points that anchor at its own chip, then clicks
 * the native control, so the real picker (workspace list + directory flow) opens. */
function findNativeWorkspaceChip() {
  const scope = `[data-content-phase="hero"] ${hostPart('heroWorkspaceRow')}`;
  return document.querySelector(`${scope} button[aria-haspopup="menu"]`) || document.querySelector(`${scope} button`);
}

function pointNativeWorkspaceAnchor(chip, button) {
  if (!chip) return chip;
  // Keep the original rect on the node and the visible button in a mutable slot: the
  // metadata bar can remount (skin toggle) without the native chip losing its anchor.
  if (!chip.__smoothRectPatched) {
    const original = chip.getBoundingClientRect.bind(chip);
    chip.getBoundingClientRect = () => chip.__smoothAnchorButton?.getBoundingClientRect?.() || original();
    chip.__smoothRectPatched = true;
  }
  chip.__smoothAnchorButton = button;
  return chip;
}

/** Find, re-anchor and toggle the native picker; returns the chip for the caller's
 * aria-expanded observer, or undefined when the hero row has not mounted yet. */
function openNativeWorkspacePicker(button) {
  const chip = findNativeWorkspaceChip();
  if (!chip) return undefined;
  pointNativeWorkspaceAnchor(chip, button);
  chip.click();
  return chip;
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
  /** The Host half injects its route origin and a per-activation token into the
   * index. A client-only preview (or an older Host half) has no bridge and the
   * menus surface that instead of inventing successful Git operations. */
  function gitBridge() {
    const bridge = globalThis.__SMOOTH_GIT__;
    if (!bridge || typeof bridge.base !== 'string' || !bridge.base || typeof bridge.token !== 'string' || !bridge.token) return undefined;
    return bridge;
  }

  /** Clipboard text with a fallback for a renderer that hides navigator.clipboard. */
  async function copyText(value) {
    if (!value) return false;
    try { await navigator.clipboard.writeText(value); return true; } catch (error) {}
    try {
      const area = document.createElement('textarea');
      area.value = value; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(area); area.select();
      const copied = document.execCommand?.('copy') ?? false;
      area.remove(); return copied;
    } catch (error) { return false; }
  }

  async function gitRequest(action, payload) {
    const bridge = gitBridge();
    if (!bridge) throw new Error('git-bridge-unavailable');
    const body = JSON.stringify({ action, ...payload });
    // The desktop renderer can reach the bridge either through the origin injected
    // beside the token or through the same custom-scheme path. Try both before
    // declaring the service unavailable; an app-level error is never retried.
    let lastError;
    for (const url of [`${bridge.base}/smooth-skin/git`, '/smooth-skin/git']) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 60_000);
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-smooth-token': bridge.token },
          body,
          signal: controller.signal,
        });
      } catch (error) {
        lastError = error;
        continue;
      } finally {
        window.clearTimeout(timer);
      }
      if (!response.ok) {
        lastError = new Error(`Git bridge HTTP ${response.status}`);
        continue;
      }
      let data;
      try {
        data = await response.json();
      } catch (error) {
        lastError = error;
        continue;
      }
      if (!data?.ok) throw new Error(data?.error?.message || 'Git request failed');
      return data.value;
    }
    throw lastError ?? new Error('Git bridge connection failed');
  }

  /** The branch and work-location popovers. They are plain portals over the
   * composer so the skin keeps its own visual language while the Host owns Git. */
  function GitMenu({ kind, anchor, cwd, onClose, onBranch, text }) {
    const [status, setStatus] = React.useState(undefined);
    const [error, setError] = React.useState('');
    const [query, setQuery] = React.useState('');
    const [creating, setCreating] = React.useState(false);
    const [name, setName] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const menuRef = React.useRef(null);
    const searchRef = React.useRef(null);
    const nameRef = React.useRef(null);
    const describe = (reason) => {
      const message = reason?.message || '';
      if (message === 'git-bridge-unavailable') return text('composer.gitUnavailable', 'Git 服务未加载，请重启 DSH 后再试');
      if (/Failed to fetch|NetworkError|HTTP \d+|Unexpected token|JSON|AbortError/i.test(message)) {
        return text('composer.gitConnectionFailed', 'Git 服务连接失败，请重启 DSH 后再试');
      }
      return message || text('composer.gitFailed', 'Git 操作失败');
    };
    React.useEffect(() => {
      if (kind !== 'branch') return undefined;
      let active = true;
      gitRequest('status', { cwd }).then((value) => {
        if (active) setStatus(value);
      }).catch((reason) => {
        if (active) setError(describe(reason));
      });
      return () => { active = false; };
    }, [kind, cwd]);
    React.useEffect(() => {
      const outside = (event) => {
        if (menuRef.current?.contains?.(event.target)) return;
        if (event.target?.closest?.('[data-smooth-git-trigger]')) return;
        onClose();
      };
      const escape = (event) => { if (event.key === 'Escape') onClose(); };
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', escape);
      return () => {
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', escape);
      };
    }, [onClose]);
    React.useEffect(() => {
      if (kind === 'branch' && status) searchRef.current?.focus?.();
      if (creating) nameRef.current?.focus?.();
    }, [kind, status, creating]);
    const run = async (action, payload) => {
      setBusy(true); setError('');
      try {
        const value = await gitRequest(action, { cwd, ...payload });
        if (action === 'checkout') { onBranch(value); onClose(); }
        return value;
      } catch (reason) {
        setError(describe(reason));
        return undefined;
      } finally {
        setBusy(false);
      }
    };
    const choose = (branchName) => {
      if (!status || branchName === status.current) { onClose(); return; }
      run('checkout', { branch: branchName, create: false });
    };
    const create = () => {
      const trimmed = name.trim();
      if (!trimmed || busy) return;
      run('checkout', { branch: trimmed, create: true });
    };
    const width = 320;
    const height = 380;
    const left = Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - height - 8));
    const style = { left: `${left}px`, top: `${top}px`, width: `${width}px` };
    const current = status?.current;
    const filtered = status?.branches?.filter((branchName) => branchName.toLowerCase().includes(query.trim().toLowerCase())) || [];
    return createPortal(h('div', { ref: menuRef, className: 'smooth-git-menu smooth-git-branch', style, role: 'menu', 'data-smooth-git-menu': '' },
      h('div', { className: 'smooth-git-heading' }, text('composer.branchMenu', '分支')),
      h('input', {
        ref: searchRef, className: 'smooth-git-search', type: 'search', value: query,
        placeholder: text('composer.searchBranch', '搜索分支'),
        onChange: (event) => setQuery(event.target.value),
      }),
      error && h('div', { className: 'smooth-git-error', role: 'alert' }, error),
      status
        ? filtered.length
          ? h('div', { className: 'smooth-git-list' }, filtered.map((branchName) =>
            h('button', {
              key: branchName, type: 'button', className: 'smooth-git-row', role: 'menuitemradio',
              'aria-checked': branchName === current, 'data-current': branchName === current ? 'true' : undefined,
              onClick: () => choose(branchName),
            },
              h(ui.IconBranchOutlineRegular, { size: 16, 'aria-hidden': true }),
              h('span', { className: 'smooth-git-row-main' },
                h('span', { className: 'smooth-git-name' }, branchName),
                branchName === current && h('span', { className: 'smooth-git-note' }, status.dirty > 0
                  ? `${text('composer.uncommitted', '未提交')}: ${status.dirty} ${text('composer.files', '个文件')}`
                  : text('composer.clean', '工作区干净'))),
              branchName === current && h('span', { className: 'smooth-git-check', 'aria-hidden': true }, '✓'))))
          : h('div', { className: 'smooth-git-note', role: 'status' }, text('composer.noBranches', '没有分支'))
        : error ? null : h('div', { className: 'smooth-git-note', role: 'status' }, text('composer.loading', '正在读取…')),
      creating
        ? h('div', { className: 'smooth-git-create' },
          h('input', {
            ref: nameRef, className: 'smooth-git-search', value: name,
            placeholder: text('composer.newBranch', '新分支名称'),
            onChange: (event) => setName(event.target.value),
            onKeyDown: (event) => { if (event.key === 'Enter') create(); },
          }),
          h('button', { type: 'button', className: 'smooth-git-create-action', disabled: busy || !name.trim(), onClick: create }, text('composer.create', '创建')),
          h('button', { type: 'button', className: 'smooth-git-create-action', onClick: () => setCreating(false) }, text('composer.cancel', '取消')))
        : h('button', { type: 'button', className: 'smooth-git-footer', disabled: busy, onClick: () => setCreating(true) },
          h(ui.IconPlusOutlineRegular, { size: 16, 'aria-hidden': true }), text('composer.createBranch', '创建并检出新分支…'))
    ), document.body);
  }

  function Metadata(props) {
    const skin = useSmoothState();
    const sessions = props.useSessions((value) => value);
    const workspaces = props.useWorkspaces((value) => value);
    const session = sessions.byId?.[props.sessionId];
    const workspace = workspaces.items?.find((item) => item.sessionIds.includes(props.sessionId));
    const name = workspace?.title || session?.cwd?.split(/[\\/]/).filter(Boolean).pop();
    const cwd = session?.cwd;
    const card = useTarget(`${hero} [data-composer-card]`);
    const row = useTarget(`${hero} ${hostPart('heroWorkspaceRow')}`);
    const branch = useBranch(card && skin.state.enabled ? props.sessionId : undefined, cwd);
    const workspaceButton = React.useRef(null);
    const branchButton = React.useRef(null);
    const pickerObserver = React.useRef(null);
    const pickerChip = React.useRef(null);
    const copyTimer = React.useRef(0);
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const [menu, setMenu] = React.useState(undefined);
    const [copied, setCopied] = React.useState('');
    const [branchOverride, setBranchOverride] = React.useState(undefined);
    React.useEffect(() => () => {
      pickerObserver.current?.disconnect();
      window.clearTimeout(copyTimer.current);
    }, []);
    // Find the native chip lazily on click (the hero row can mount a beat after the
    // card), re-point its picker anchor at our visible chip, then toggle it.
    const openWorkspace = () => {
      const chip = findNativeWorkspaceChip();
      if (!chip) return;
      pointNativeWorkspaceAnchor(chip, workspaceButton.current);
      if (pickerChip.current !== chip) {
        pickerObserver.current?.disconnect();
        pickerChip.current = chip;
        pickerObserver.current = new MutationObserver(() => setPickerOpen(chip.getAttribute('aria-expanded') === 'true'));
        pickerObserver.current.observe(chip, { attributes: true, attributeFilter: ['aria-expanded'] });
      }
      setPickerOpen((open) => !open);
      chip.click();
    };
    const openMenu = (kind, button) => {
      const rect = button.current?.getBoundingClientRect?.();
      if (!rect) return;
      setMenu((current) => current?.kind === kind ? undefined : { kind, anchor: { left: rect.left, bottom: rect.bottom } });
    };
    if (!skin.state.enabled || !card) return null;
    const shownBranch = branchOverride && branchOverride.cwd === cwd ? branchOverride.branch : branch;
    const bridgeReady = Boolean(gitBridge());
    const copy = async (value, kind) => {
      if (!(await copyText(value))) return;
      setCopied(kind);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(''), 1200);
    };
    const triggerBranch = () => {
      if (bridgeReady) openMenu('branch', branchButton);
      else copy(shownBranch, 'branch');
    };
    const branchLabel = copied === 'branch' ? text('composer.copied', '已复制') : shownBranch;
    const branchText = shownBranch && h('span', { className: 'smooth-meta-branch' },
      h(ui.IconBranchOutlineRegular, { size: 16, 'aria-hidden': true }), shownBranch);
    const workspaceControl = h('button', {
      ref: workspaceButton, type: 'button', className: 'smooth-meta-workspace smooth-meta-button',
      title: text('composer.switchWorkspace', '切换工作区'), 'aria-label': text('composer.switchWorkspace', '切换工作区'),
      'aria-haspopup': 'menu', 'aria-expanded': pickerOpen ? 'true' : undefined, onClick: openWorkspace,
    }, h('span', null, name || text('composer.chooseWorkspace', '选择工作区')));
    const git = shownBranch && h('button', {
      ref: branchButton, type: 'button', className: 'smooth-meta-branch smooth-meta-button',
      'data-smooth-git-trigger': bridgeReady ? '' : undefined,
      title: bridgeReady ? `${text('composer.branchMenu', '分支')}：${shownBranch}` : `${text('composer.copyBranch', '复制分支名')}：${shownBranch}`,
      'aria-label': bridgeReady ? `${text('composer.branchMenu', '分支')}：${shownBranch}` : `${text('composer.copyBranch', '复制分支名')}：${shownBranch}`,
      'aria-haspopup': bridgeReady ? 'menu' : undefined, 'aria-expanded': bridgeReady && menu?.kind === 'branch' ? 'true' : undefined,
      onClick: triggerBranch,
    }, h(ui.IconBranchOutlineRegular, { size: 16, 'aria-hidden': true }), h('span', null, branchLabel));
    return h(React.Fragment, null,
      createPortal(h('div', { className: 'smooth-composer-meta' },
        workspaceControl, git,
        h('div', { 'data-smooth-permission-seat': '' })), card),
      row && branchText && createPortal(h('span', { className: 'smooth-hero-branch' }, h('span', { 'aria-hidden': true }, '/'), branchText), row),
      menu && createPortal(h(GitMenu, {
        kind: menu.kind, anchor: menu.anchor, cwd,
        onClose: () => setMenu(undefined),
        onBranch: (status) => setBranchOverride({ cwd, branch: status.current }),
        text,
      }), document.body));
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
