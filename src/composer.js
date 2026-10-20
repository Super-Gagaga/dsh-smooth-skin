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

/** With attachments present the host does not render the native placeholder at all, so
 * the compact hint has nothing to style. Draw a plugin-owned line inside the editor's own
 * box instead, shown only while the editor is empty and the native placeholder is absent. */
function installComposerFallbackHint(input, prompt) {
  const grow = input?.parentElement;
  const card = input?.closest?.('[data-composer-card]');
  if (!grow || !card || typeof document === 'undefined') return undefined;
  const fallback = document.createElement('span');
  fallback.className = 'smooth-composer-fallback';
  fallback.setAttribute('aria-hidden', 'true');
  fallback.textContent = prompt;
  fallback.hidden = true;
  grow.append(fallback);
  const update = () => {
    const native = card.querySelector('[data-composer-placeholder]');
    const empty = String(input.textContent || '').replace(/[\u200b\u00a0\s]/g, '') === ''
      && input.querySelector('img, [contenteditable="false"]') === null;
    fallback.hidden = Boolean(native) || !empty || input.getAttribute('aria-disabled') === 'true';
  };
  update();
  const editor = new MutationObserver(update);
  editor.observe(input, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-disabled'] });
  const surface = new MutationObserver(update);
  surface.observe(card, { childList: true, subtree: true });
  return () => { editor.disconnect(); surface.disconnect(); fallback.remove(); };
}

/** A native caret cannot be animated, so one is drawn for the composer: the real caret is
 * hidden only while the selection sits in the editor, and the plugin's bar glides between
 * caret positions and fades its blink. While an IME composes, the caret rides the end of
 * the composition text so pinyin input gets the same smooth bar. */
function installSmoothCaret(input) {
  const grow = input?.parentElement;
  const card = input?.closest?.('[data-composer-card]');
  if (!grow || !card || typeof document === 'undefined' || typeof window === 'undefined' || typeof window.getSelection !== 'function') return undefined;
  const scroller = input.closest?.('[data-input-scroll]') || null;
  const caret = document.createElement('span');
  caret.className = 'smooth-composer-caret';
  caret.setAttribute('aria-hidden', 'true');
  caret.hidden = true;
  let placed = false;
  let composing = false;
  let frame = 0;
  let lastX;
  let lastY;
  const nativeCaret = (on) => {
    if (on) card.removeAttribute('data-smooth-caret');
    else card.setAttribute('data-smooth-caret', '');
  };
  const hide = () => { caret.hidden = true; };
  /** Where the editor's text starts. A collapsed range that anchors on the editable
   * itself measures its border box, which begins in the padding: the bar then sits in
   * front of the text instead of at the caret. */
  const textOrigin = () => {
    const box = input.getBoundingClientRect();
    const style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(input) : null;
    const offset = (name) => {
      const value = style ? parseFloat(style[name]) : 0;
      return Number.isFinite(value) ? value : 0;
    };
    return { left: box.left + offset('borderLeftWidth') + offset('paddingLeft'), top: box.top + offset('borderTopWidth') + offset('paddingTop'), height: offset('lineHeight') || box.height };
  };
  /** The caret an empty editor should show: the start of its contents, not its border. */
  const startRect = () => {
    try {
      const probe = document.createRange();
      probe.selectNodeContents(input);
      probe.collapse(true);
      const rect = probe.getBoundingClientRect();
      if (rect && rect.height) return rect;
    } catch (error) { /* fall back to the text box below */ }
    return { left: textOrigin().left, top: input.getBoundingClientRect().top, height: textOrigin().height };
  };
  const update = () => {
    frame = 0;
    if (document.activeElement !== input) { hide(); nativeCaret(true); return; }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) { hide(); nativeCaret(true); return; }
    let range = selection.getRangeAt(0);
    // Composing keeps a range over the pinyin; the caret belongs at its end.
    if (!selection.isCollapsed) {
      if (!composing) { hide(); nativeCaret(true); return; }
      range = range.cloneRange();
      range.collapse(false);
    }
    if (!input.contains(range.startContainer)) { hide(); nativeCaret(true); return; }
    const host = grow.getBoundingClientRect();
    // A mount that has not been laid out yet reports an empty grow box; placing the bar
    // against it would pin the caret to the card's corner until the next keystroke.
    if (!host.width && !host.height) { hide(); nativeCaret(true); return; }
    let rect = range.getBoundingClientRect();
    if (!rect || !rect.height) rect = startRect();
    // A container-level selection may still report the editor's own box; never park the
    // bar on the border when the caret itself has to start inside the text area.
    const origin = textOrigin();
    if (rect && rect.height) {
      const left = rect.left < origin.left - .5 ? origin.left : rect.left;
      const top = rect.top < origin.top - .5 ? origin.top : rect.top;
      if (left !== rect.left || top !== rect.top) rect = { left, top, height: rect.height };
    }
    if (!rect || !rect.height) { hide(); nativeCaret(true); return; }
    nativeCaret(false);
    const x = Math.round(rect.left - host.left);
    const y = Math.round(rect.top - host.top);
    // The first placement and every jump to another line is a snap: a glide out of a
    // stale spot is exactly how a wrong initial position stays visible for a second.
    const snap = !placed || Math.abs(y - lastY) > 18 || Math.abs(x - lastX) > 24;
    if (snap) caret.style.transition = 'none';
    caret.style.transform = `translate(${x}px,${y}px)`;
    caret.style.height = `${Math.round(rect.height)}px`;
    caret.hidden = false;
    lastX = x;
    lastY = y;
    if (snap) {
      // The first measurement can land before the editor commits its empty paragraph, so
      // the caret is read once more on the next frame while the bar still cannot animate.
      if (!placed) schedule();
      placed = true;
      window.requestAnimationFrame(() => { caret.style.transition = ''; });
    }
  };
  const schedule = () => {
    if (!frame && typeof window.requestAnimationFrame === 'function') frame = window.requestAnimationFrame(update);
  };
  const onCompositionStart = () => { composing = true; schedule(); };
  const onCompositionEnd = () => { composing = false; schedule(); };
  document.addEventListener('selectionchange', schedule);
  for (const event of ['input', 'keyup', 'mouseup', 'focus', 'blur']) input.addEventListener(event, schedule);
  input.addEventListener('compositionstart', onCompositionStart);
  input.addEventListener('compositionupdate', schedule);
  input.addEventListener('compositionend', onCompositionEnd);
  scroller?.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  grow.append(caret);
  schedule();
  return () => {
    document.removeEventListener('selectionchange', schedule);
    for (const event of ['input', 'keyup', 'mouseup', 'focus', 'blur']) input.removeEventListener(event, schedule);
    input.removeEventListener('compositionstart', onCompositionStart);
    input.removeEventListener('compositionupdate', schedule);
    input.removeEventListener('compositionend', onCompositionEnd);
    scroller?.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (frame) window.cancelAnimationFrame(frame);
    nativeCaret(true);
    caret.remove();
  };
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
function installComposerLayout({ slots, modelDirectories, remote, useSmoothState, text }) {
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
      if (message === 'smooth-bridge-unavailable') return text('composer.gitUnavailable', 'Git 服务未加载，请重启 DSH 后再试');
      if (/Failed to fetch|NetworkError|HTTP \d+|Unexpected token|JSON|AbortError/i.test(message)) {
        return text('composer.gitConnectionFailed', 'Git 服务连接失败，请重启 DSH 后再试');
      }
      return message || text('composer.gitFailed', 'Git 操作失败');
    };
    React.useEffect(() => {
      if (kind !== 'branch') return undefined;
      let active = true;
      bridgeRequest('status', { cwd }).then((value) => {
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
        const value = await bridgeRequest(action, { cwd, ...payload });
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

  /** The model picker behind the control's model name. The Host directory is the
   * same catalog the native selector used; selecting goes through its `select`. */
  /** The model catalogue as the panel's second page. The panel slides this page in
   * from the effort page the way the account menu reveals its help page, and picking
   * a model slides it back to the effort page of the newly selected model. */
  function ModelList({ groups, current, onPick, onBack, onDone, active, text }) {
    const [query, setQuery] = React.useState('');
    const [error, setError] = React.useState('');
    const [busy, setBusy] = React.useState(false);
    const searchRef = React.useRef(null);
    React.useEffect(() => { if (active) searchRef.current?.focus?.(); }, [active]);
    const needle = query.trim().toLowerCase();
    const filtered = groups.map((group) => ({
      ...group,
      models: (group.models || []).filter((model) => !needle || model.name.toLowerCase().includes(needle)),
    })).filter((group) => group.models.length > 0);
    const pick = async (group, model) => {
      setBusy(true); setError('');
      try {
        await onPick(group, model);
        onDone();
      } catch (reason) {
        setError(reason?.message || text('composer.modelFailed', '模型切换失败'));
      } finally {
        setBusy(false);
      }
    };
    return h('div', { className: 'smooth-model-list', role: 'group', 'aria-label': text('composer.modelMenu', '模型') },
      h('div', { className: 'smooth-model-list-head' },
        h('button', {
          type: 'button', className: 'smooth-model-back', onClick: onBack,
          'aria-label': text('composer.back', '返回'),
        }, h(ui.IconChevronLeftOutlineRegular, { size: 16, 'aria-hidden': true })),
        h('span', { className: 'smooth-model-list-title' }, text('composer.modelMenu', '模型'))),
      h('input', {
        ref: searchRef, className: 'smooth-git-search', type: 'search', value: query,
        placeholder: text('composer.searchModel', '搜索模型'),
        onChange: (event) => setQuery(event.target.value),
      }),
      error && h('div', { className: 'smooth-git-error', role: 'alert' }, error),
      h('div', { className: 'smooth-git-list', role: 'listbox', 'aria-label': text('composer.modelMenu', '模型') }, filtered.map((group) =>
        h('div', { key: group.id, className: 'smooth-model-group', role: 'group', 'aria-label': group.name },
          h('div', { className: 'smooth-git-heading' }, group.name),
          (group.models || []).map((model) => {
            const selected = group.id === current?.provider && model.id === current?.model;
            return h('button', {
              key: model.id, type: 'button', className: 'smooth-git-row', disabled: busy,
              role: 'option', 'aria-selected': selected, 'data-current': selected ? 'true' : undefined,
              onClick: () => pick(group, model),
            },
              h('span', { className: 'smooth-git-row-main' }, h('span', { className: 'smooth-git-name' }, model.name)),
              selected && h('span', { className: 'smooth-git-check', 'aria-hidden': true }, '✓'));
          })))),
      !filtered.length && h('div', { className: 'smooth-git-note' }, text('composer.noModels', '没有模型')));
  }

  /** The level artwork is a DeepSeek touch: only the DeepSeek and DeepSeek Account
   * groups get the backdrop, every other provider keeps the plain panel. */
  function deepseekBackdrop(group) {
    return Boolean(group && /deepseek/i.test(`${group.id || ''} ${group.name || ''}`));
  }

  /** The panel backdrop for one reasoning level. Effort ids name the artwork first;
   * a model with a different effort set still gets a sensible picture by position. */
  const THINK_LEVELS = ['off', 'low', 'high', 'max'];
  function thinkArtFor(efforts, index) {
    const id = String(efforts[index]?.id || '').toLowerCase();
    if (THINK_ART[id]) return id;
    const ratio = efforts.length > 1 ? index / (efforts.length - 1) : 1;
    return THINK_LEVELS[Math.max(0, Math.min(THINK_LEVELS.length - 1, Math.round(ratio * (THINK_LEVELS.length - 1))))];
  }

  /** Pale glints for the top effort stop: a few small, very faint white spots wander
 * across the blue fill at unrelated speeds. The bar keeps its own blue — each spot is
 * only a local lift of a few dozen px at low opacity, never a wash over the track. The
 * geometry is baked once, like the spark field, so re-renders never reshuffle it. */
const MODEL_GLOWS = Array.from({ length: 4 }, (_, index) => {
  const random = (salt) => {
    const value = Math.sin((index + 3.7) * salt) * 43758.5453;
    return value - Math.floor(value);
  };
  return {
    left: 6 + random(17.31) * 88,
    top: (random(63.97) - .5) * 8,
    opacity: .13 + random(88.13) * .12,
    size: 32 + random(45.77) * 36,
    dx: (random(29.53) - .5) * 160,
    dy: (random(74.11) - .5) * 28,
    duration: 4.5 + random(12.71) * 4,
    delay: -random(59.37) * 8,
  };
});

/** One fixed particle field for the top effort stop. The randomness is baked once, with a
 * cheap sine hash, so a drag that crosses stops — and therefore re-renders — never
 * reshuffles a stream that is already running. Each spark starts somewhere across the
 * filled track and drifts left at its own speed, height, size and opacity. */
const MODEL_SPARKS = Array.from({ length: 96 }, (_, index) => {
  const random = (salt) => {
    const value = Math.sin((index + 1) * salt) * 43758.5453;
    return value - Math.floor(value);
  };
  // Packed by the thumb: the left third is almost empty, the right half carries most.
  // Size and opacity follow that weight as well, so the field is loudest where it starts.
  const left = 4 + Math.pow(random(12.9898), .38) * 94;
  const weight = Math.min(1, Math.max(0, (left - 4) / 94));
  return {
    left,
    top: (random(78.233) - .5) * 18,
    dx: -(40 + random(37.719) * 140),
    dy: (random(4.898) - .5) * 14,
    duration: .8 + random(93.989) * 1.4,
    delay: -random(23.14) * 2.6,
    size: 2.2 + weight * 2.4 + random(68.7) * 1.2,
    opacity: .35 + weight * .4 + random(51.3) * .25,
  };
});

/** The composer's model seat: model name above a reasoning-effort slider. The
   * slider drafts locally and commits through the injected directory `select`. */
  function ModelEffortControl(props) {
    const directory = props.directory;
    const state = React.useSyncExternalStore(
      (listener) => directory.subscribe(listener),
      () => directory.getSnapshot(),
    );
    const [draft, setDraft] = React.useState(null);
    const [error, setError] = React.useState('');
    const triggerRef = React.useRef(null);
    const draftRef = React.useRef(null);
    const committedRef = React.useRef(null);
    React.useEffect(() => {
      if (props.available !== false) props.load?.();
    }, [props.available, props.load]);
    const groups = state.groups || [];
    const current = state.current;
    const choices = groups.flatMap((group) => (group.models || []).map((model) => ({ group, model })));
    const choice = choices.find(({ group, model }) => group.id === current?.provider && model.id === current?.model);
    const model = choice?.model;
    const group = choice?.group;
    const reasoning = model?.reasoning;
    const efforts = reasoning?.efforts || [];
    const effective = current?.reasoningEffort ?? reasoning?.defaultEffort;
    const currentIndex = Math.max(0, efforts.findIndex((effort) => effort.id === effective));
    const index = draft == null ? currentIndex : Math.max(0, Math.min(draft, efforts.length - 1));
    const disabled = Boolean(props.locked) || props.available === false;
    // 0..1 share of the thumb's travel; the fill and the glider share it so the blue
    // edge stops under the thumb centre instead of under its left half.
    const ratio = efforts.length > 1 ? index / (efforts.length - 1) : 1;
    const sliderRef = React.useRef(null);
    const ratioRef = React.useRef(ratio);
    ratioRef.current = ratio;
    const dragRef = React.useRef(null);
    // While the pointer is down the thumb rides the pointer itself: the ratio is written
    // straight onto the slider as a custom property (no re-render per move, so the sparks
    // and the cutouts are not re-created mid-drag), and the store's stop ratio takes back
    // over on release. A click, a stop label or the keyboard still lets the glider slide.
    const setPointerRatio = (clientX) => {
      const node = sliderRef.current;
      const track = node?.querySelector?.('.smooth-model-track');
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const span = Math.max(1, rect.width - 26);
      const pointerRatio = Math.min(1, Math.max(0, (clientX - rect.left - 13) / span));
      node.style.setProperty('--smooth-model-ratio', String(pointerRatio));
    };
    // Handing the property back to the stored ratio: a drag that ended between two stops
    // glides onto the nearer one instead of sticking wherever the pointer left it.
    const restoreRatio = () => {
      sliderRef.current?.classList.remove('is-dragging');
      sliderRef.current?.style.setProperty('--smooth-model-ratio', String(ratioRef.current));
    };
    const beginDrag = (event) => {
      dragRef.current = { x: event.clientX, y: event.clientY };
      setPointerRatio(event.clientX);
    };
    const endDrag = () => {
      dragRef.current = null;
      restoreRatio();
    };
    // The rendered ratio is written straight onto the element as well, so React and the
    // pointer never fight over the property: only an idle slider follows the store.
    React.useEffect(() => {
      if (dragRef.current) return;
      sliderRef.current?.style.setProperty('--smooth-model-ratio', String(ratio));
    }, [ratio]);
    // Every open starts where the thumb already is: the property is written before the
    // first paint with the transition switched off for that one frame, so the panel never
    // replays a slide from the leftmost stop. The class comes off on the next frame, and
    // the ratio is unchanged by then, so no transition fires.
    React.useLayoutEffect(() => {
      const node = sliderRef.current;
      if (!node) return undefined;
      node.style.setProperty('--smooth-model-ratio', String(ratioRef.current));
      node.classList.add('is-dragging');
      const frame = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(() => node.classList.remove('is-dragging'))
        : null;
      return () => { if (frame != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame); };
    }, []);
    React.useEffect(() => {
      const move = (event) => {
        const start = dragRef.current;
        if (!start || !event.buttons) return;
        if (Math.abs(event.clientX - start.x) < 4 && Math.abs(event.clientY - start.y) < 4) return;
        sliderRef.current?.classList.add('is-dragging');
        setPointerRatio(event.clientX);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
      return () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', endDrag);
        window.removeEventListener('pointercancel', endDrag);
      };
    }, []);
    const commit = (next) => {
      const effort = efforts[next];
      if (!effort || !current) return;
      committedRef.current = next;
      setError('');
      Promise.resolve(props.select({
        provider: current.provider,
        model: current.model,
        reasoningEffort: effort.id,
      })).catch((reason) => {
        if (committedRef.current === next) committedRef.current = null;
        if (draftRef.current === next) {
          draftRef.current = null;
          setDraft(null);
        }
        setError(reason?.message || text('composer.modelFailed', '模型切换失败'));
      });
    };
    // Commit on every stop the thumb crosses, so the Host selection changes while
    // dragging; the draft only keeps the visual thumb ahead until the store catches up.
    const preview = (next) => {
      setDraft(next); draftRef.current = next;
      if (committedRef.current !== next) commit(next);
    };
    const flush = () => {
      const next = draftRef.current;
      if (next == null || committedRef.current === next) return;
      commit(next);
    };
    React.useEffect(() => {
      // Once the durable selection catches up, hand the thumb back to the store.
      if (draft != null && currentIndex === draft) {
        draftRef.current = null;
        setDraft(null);
      }
    }, [currentIndex, draft]);
    // The top stop is a release: a stream of sparks runs left along the filled track.
    const atMax = efforts.length > 0 && index === efforts.length - 1;
    const level = reasoning && efforts.length > 0 ? thinkArtFor(efforts, index) : undefined;
    const backdrop = Boolean(level && deepseekBackdrop(group));
    const levelName = efforts[index]?.name || '';
    return h('div', { className: 'smooth-model-effort' },
      // The panel's backdrop follows the level the thumb is on, so a drag previews it
      // the moment the thumb crosses a stop. All four cutouts stay mounted and cross-fade.
      backdrop && h('div', { className: 'smooth-model-media', 'data-level': level, 'aria-hidden': true },
        THINK_LEVELS.map((key) => h('img', {
          key, className: 'smooth-model-art', src: THINK_ART[key], alt: '',
          'data-active': key === level ? 'true' : undefined, draggable: false,
        }))),
      h('div', { className: 'smooth-model-body' },
        // The slider carries no tick labels any more: the current level sits above the
        // model selector and re-enters on every change, so the panel still names it.
        levelName && h('div', { className: 'smooth-model-level', 'aria-live': 'polite' },
          h('span', { key: level, className: 'smooth-model-level-name' }, levelName)),
        h('button', {
          ref: triggerRef, type: 'button', className: 'smooth-model-trigger',
          'data-smooth-model-trigger': '', disabled, title: model?.name,
          'aria-haspopup': 'menu',
          onClick: () => props.onOpenModels?.(),
        },
          h('span', { className: 'smooth-model-name' }, model?.name || text('composer.modelLoading', '正在读取…')),
          h(ui.IconChevronRightOutlineRegular, { size: 14, 'aria-hidden': true })),
        reasoning && efforts.length > 0 && h('div', {
          ref: sliderRef, className: 'smooth-model-slider',
        },
          h('div', { className: 'smooth-model-track', 'aria-hidden': true },
            h('div', { className: 'smooth-model-fill' }),
            efforts.map((effort, at) => {
              const percent = efforts.length > 1 ? at / (efforts.length - 1) : 0;
              return h('span', {
                key: `dot:${effort.id}`, className: 'smooth-model-dot',
                style: { left: `calc(13px + (100% - 26px) * ${percent})` },
              });
            }),
            // The pale wash lives inside the track and is clipped to the filled width,
            // so it only ever lands on the blue bar and never on the empty ground right
            // of the thumb.
            atMax && h('div', { className: 'smooth-model-glow' },
              MODEL_GLOWS.map((glow, index) => h('span', {
                key: `glow:${index}`, className: 'smooth-model-glow-blob',
                style: {
                  left: `${glow.left}%`,
                  top: `calc(50% + ${glow.top}px)`,
                  width: `${glow.size}px`,
                  height: `${glow.size}px`,
                  '--glow-opacity': String(glow.opacity),
                  '--glow-dx': `${glow.dx}px`,
                  '--glow-dy': `${glow.dy}px`,
                  '--glow-duration': `${glow.duration}s`,
                  '--glow-delay': `${glow.delay}s`,
                },
              })))),
          atMax && h('div', { className: 'smooth-model-sparks', 'aria-hidden': true },
            MODEL_SPARKS.map((spark, index) => h('span', {
              key: `spark:${index}`, className: 'smooth-model-spark',
              style: {
                left: `${spark.left}%`,
                top: `calc(50% + ${spark.top}px)`,
                '--spark-size': `${spark.size}px`,
                '--spark-opacity': String(spark.opacity),
                '--spark-dx': `${spark.dx}px`,
                '--spark-dy': `${spark.dy}px`,
                '--spark-duration': `${spark.duration}s`,
                '--spark-delay': `${spark.delay}s`,
              },
            }))),
          h('input', {
            type: 'range', min: 0, max: Math.max(0, efforts.length - 1), step: 1, value: index,
            disabled: disabled,
            'aria-label': text('composer.reasoningEffort', '思考强度'),
            'aria-valuetext': levelName,
            onChange: (event) => { if (!disabled) preview(Number(event.target.value)); },
            onPointerDown: beginDrag,
            onPointerUp: () => { endDrag(); flush(); },
            onPointerCancel: endDrag,
            onKeyUp: flush, onBlur: () => { endDrag(); flush(); },
          }),
          h('span', { className: 'smooth-model-glider', 'aria-hidden': true })),
        error && h('div', { className: 'smooth-model-error', role: 'alert' }, error)));
  }

  /** The reference panel opens above the compact native model control. The native
   * control stays exactly as shipped (name, release badge, effort, chevron); only its
   * click is captured, so the expansion can show the larger effort slider. The panel
   * has two pages — effort and the model catalogue — that slide into each other the
   * way the account menu slides its help page over the launcher rows. */
  function ModelPanel({ anchor, directory, load, select, text, onClose, closeRef }) {
    const panelRef = React.useRef(null);
    const effortRef = React.useRef(null);
    const modelsRef = React.useRef(null);
    const [view, setView] = React.useState('effort');
    // The pane's measured height plus the motion phase. The panel mounts already at
    // its final size and plays a short CSS entrance animation, so the click reads as
    // immediate; a close request flips to `closing`, plays the exit animation and only
    // then unmounts the portal.
    const [contentHeight, setContentHeight] = React.useState(0);
    const [phase, setPhase] = React.useState('open');
    const closingRef = React.useRef(false);
    const closeTimer = React.useRef(0);
    const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    const requestClose = () => {
      if (closingRef.current) return;
      closingRef.current = true;
      if (reduced()) { onClose(); return; }
      setPhase('closing');
      closeTimer.current = window.setTimeout(onClose, 160);
    };
    const state = React.useSyncExternalStore(
      (listener) => directory.subscribe(listener),
      () => directory.getSnapshot(),
    );
    // The panel is bottom-anchored, so its height comes from the page that is on
    // screen; observing that page keeps the size right through filtering and errors.
    React.useLayoutEffect(() => {
      const pane = (view === 'models' ? modelsRef : effortRef).current;
      if (!pane) return undefined;
      const update = () => setContentHeight(pane.offsetHeight);
      update();
      const observer = new ResizeObserver(update);
      observer.observe(pane);
      return () => observer.disconnect();
    }, [view]);
    React.useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);
    // The host's trigger click toggles the panel; route its close through the motion
    // instead of unmounting on the spot. Assigning after every render keeps the
    // callback current without a dependency array that would churn the listener.
    React.useEffect(() => {
      if (!closeRef) return undefined;
      closeRef.current = requestClose;
      return () => { if (closeRef.current === requestClose) closeRef.current = null; };
    });
    React.useEffect(() => {
      const outside = (event) => {
        if (panelRef.current?.contains?.(event.target)) return;
        if (event.target?.closest?.('[data-slot="conversation.input.model"]')) return;
        requestClose();
      };
      document.addEventListener('pointerdown', outside, true);
      return () => document.removeEventListener('pointerdown', outside, true);
    }, [onClose]);
    React.useEffect(() => {
      const escape = (event) => {
        if (event.key !== 'Escape') return;
        if (view === 'models') setView('effort');
        else requestClose();
      };
      document.addEventListener('keydown', escape);
      return () => document.removeEventListener('keydown', escape);
    }, [view, onClose]);
    const pick = async (group, model) => {
      await select({
        provider: group.id,
        model: model.id,
        ...(model.reasoning?.defaultEffort === undefined ? {} : { reasoningEffort: model.reasoning.defaultEffort }),
      });
    };
    // Match the compact trigger's width (within readable bounds) and right-align the
    // panel to it; the reference slider stays legible without outgrowing the control.
    const width = Math.min(Math.max(anchor.width || 0, 260), 360, window.innerWidth - 16);
    const right = anchor.right ?? anchor.left + width;
    const left = Math.max(8, Math.min(right - width, window.innerWidth - width - 8));
    // Anchor the panel's bottom just above the compact control, so the expanded
    // range occupies the empty space between the slider and the trigger instead of
    // floating over the conversation above it.
    const bottom = Math.max(8, window.innerHeight - anchor.top + 8);
    return createPortal(h('div', {
      ref: panelRef, className: 'smooth-git-menu smooth-model-panel', 'data-view': view, 'data-state': phase,
      style: { left: `${left}px`, bottom: `${bottom}px`, width: `${width}px` },
      role: 'dialog', 'aria-label': view === 'models' ? text('composer.modelMenu', '模型') : text('composer.reasoningEffort', '思考强度'),
    },
      h('div', { className: 'smooth-model-panel-viewport', style: contentHeight ? { height: `${contentHeight}px` } : undefined },
        h('div', {
          ref: effortRef, className: 'smooth-model-panel-pane', 'data-pane': 'effort',
          'data-active': view === 'effort' ? 'true' : undefined, 'aria-hidden': view === 'models', inert: view === 'models',
        },
          h(ModelEffortControl, {
            directory, load, select, text, available: true, locked: false,
            onOpenModels: () => setView('models'),
          })),
        h('div', {
          ref: modelsRef, className: 'smooth-model-panel-pane', 'data-pane': 'models',
          'data-active': view === 'models' ? 'true' : undefined, 'aria-hidden': view !== 'models', inert: view !== 'models',
        },
          h(ModelList, {
            groups: state.groups || [], current: state.current, text,
            active: view === 'models',
            onPick: pick,
            onBack: () => setView('effort'),
            onDone: () => setView('effort'),
          })))),
      document.body);
  }

  /** Listens on the shipped model trigger; the panel component owns all changes. */
  function ModelPanelHost(props) {
    const skin = useSmoothState();
    let directory;
    if (skin.state.enabled && modelDirectories && props.sessionId) {
      try {
        directory = modelDirectories.directoryFor(props.sessionId);
      } catch {}
    }
    const ready = Boolean(directory?.store);
    const [anchor, setAnchor] = React.useState(undefined);
    // The panel routes its own close through the expand/collapse transition; the
    // trigger click uses this handle so a second click plays the collapse instead of
    // yanking the portal out of the DOM.
    const closeRef = React.useRef(null);
    React.useEffect(() => {
      if (!ready) return undefined;
      let trigger;
      const capture = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (closeRef.current) { closeRef.current(); return; }
        const rect = trigger.getBoundingClientRect();
        setAnchor({
          left: rect.left, top: rect.top, width: rect.width, right: rect.right,
        });
      };
      const attach = () => {
        const next = document.querySelector('[data-slot="conversation.input.model"] button[aria-haspopup="menu"]')
          || document.querySelector('[data-slot="conversation.input.model"] button');
        if (!next || next === trigger) return;
        trigger?.removeEventListener('click', capture, true);
        trigger = next;
        trigger.addEventListener('click', capture, true);
      };
      attach();
      const observer = new MutationObserver(attach);
      observer.observe(document.body, { childList: true, subtree: true });
      return () => {
        observer.disconnect();
        trigger?.removeEventListener('click', capture, true);
      };
    }, [ready]);
    React.useEffect(() => {
      if (!ready) setAnchor(undefined);
    }, [ready]);
    if (!ready) return null;
    const load = () => {
      try { directory.load?.().catch?.(() => {}); } catch {}
    };
    const select = async (selection) => {
      const result = await directory.select(selection);
      if (result && result.ok === false) {
        throw new Error(result.error?.message || text('composer.modelFailed', '模型切换失败'));
      }
    };
    return anchor
      ? h(ModelPanel, {
        anchor, directory: directory.store, load, select, text, closeRef,
        onClose: () => setAnchor(undefined),
      })
      : null;
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
    const bridgeReady = Boolean(smoothBridge());
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
        workspaceControl,
        git ? h('span', { className: 'smooth-meta-divider', 'aria-hidden': true }) : null,
        git,
        git ? h('span', { className: 'smooth-meta-divider', 'aria-hidden': true }) : null,
        h('div', { className: 'smooth-meta-preset', 'data-smooth-preset-seat': '' })), card),
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
    const input = useTarget('[data-composer-card] [data-composer-input]');
    const heroPrompt = props.t('placeholder.hero');
    const normalPrompt = props.t('placeholder.default');
    const shortPrompt = text('composer.placeholder', '描述任务，/ 调用指令，@ 引用文件或对话');
    React.useEffect(() => {
      if (skin.state.enabled) return installComposerHint(target, [heroPrompt, normalPrompt], shortPrompt);
    }, [target, heroPrompt, normalPrompt, shortPrompt, skin.state.enabled]);
    // The host drops its placeholder element while attachments exist; keep the hint on
    // screen with the plugin-owned fallback until the draft gets text.
    React.useEffect(() => {
      if (skin.state.enabled) return installComposerFallbackHint(input, shortPrompt);
    }, [input, shortPrompt, skin.state.enabled]);
    return null;
  }
  disposers.push(slots.inject('conversation.input.overlay', () => slots.register({ name: 'conversation.input.overlay', id: `${PLUGIN_ID}.hint`, order: -90, locale: 'conversation' }, ComposerHint)));
  function ComposerCaret() {
    const skin = useSmoothState();
    const input = useTarget('[data-composer-card] [data-composer-input]');
    React.useEffect(() => {
      if (skin.state.enabled) return installSmoothCaret(input);
    }, [input, skin.state.enabled]);
    return null;
  }
  disposers.push(slots.inject('conversation.input.overlay', () => slots.register({ name: 'conversation.input.overlay', id: `${PLUGIN_ID}.caret`, order: -80 }, ComposerCaret)));
  function decorate(name, wrap, offset = -10) {
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
        disposeNative = slots.register({ ...inherited, name, locale, inject, store, priority: (native.options?.priority || 0) + offset, registrant: PLUGIN_ID },
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
  // The model/effort overlay's mount point. `conversation.input.right` only renders once
  // the composer owns an active input state, so the welcome (new-session) hero — which
  // still renders the model seat — never mounted this host and the native menu opened
  // there. `conversation.input.overlay` renders inside the same composer card for every
  // session in both the hero and the resident composer, so the custom panel now covers
  // new sessions too. The component renders nothing; it only attaches the trigger click.
  disposers.push(slots.inject('conversation.input.overlay', () => slots.register({
    name: 'conversation.input.overlay', id: `${PLUGIN_ID}.model`, order: -70,
  }, ModelPanelHost)));
  // The mode selector appears in two different slots depending on whether the welcome
  // page already owns a draft session: the hero slot when it does not, the generic left
  // slot when it does. Both are pointed at the same seat in the metadata line.
  disposers.push(relocate('conversation.hero.agentPreset', `${hero} [data-smooth-preset-seat]`, 'smooth-composer-preset'));
  disposers.push(relocate('conversation.input.left', `${hero} [data-smooth-preset-seat]`, 'smooth-composer-preset'));
  return () => { for (const dispose of disposers.reverse()) dispose?.(); };
}
