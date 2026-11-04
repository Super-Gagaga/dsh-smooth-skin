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
  /** An editor with no text and no chips is back at its initial position. */
  const emptyEditor = () => String(input.textContent || '').replace(/[\u200b\u00a0\s]/g, '') === ''
    && !input.querySelector?.('img, [contenteditable="false"]');
  let wasEmpty = emptyEditor();
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
  const isElement = (node) => node?.nodeType === 1;
  const isText = (node) => node?.nodeType === 3;
  const isBreak = (node) => isElement(node) && (node.nodeName || node.tagName) === 'BR';
  const rectOf = (node) => {
    try {
      const box = node?.getBoundingClientRect?.();
      return box && (box.height || box.width) ? box : null;
    } catch (error) { return null; }
  };
  /** The caret rect of a text node's own first or last character. */
  const textRect = (node, atStart) => {
    try {
      const probe = document.createRange();
      probe.selectNodeContents(node);
      probe.collapse(Boolean(atStart));
      const rect = probe.getBoundingClientRect();
      return rect && rect.height ? rect : null;
    } catch (error) { return null; }
  };
  /** A collapsed range whose container is an element measures that element's box (or
   * nothing), not the caret. Lexical leaves a soft line break as an element-level point
   * just past the paragraph's trailing <br>, and the paragraph box still begins on the
   * line above, so Shift+Enter parked the bar at the paragraph's first line. Rebuild the
   * insertion point from the DOM position: content after a break starts the line the
   * caret is on, and a trailing break opens the line below the break. */
  const pointRect = (container, offset) => {
    const nodes = container.childNodes || [];
    const index = Math.max(0, Math.min(offset ?? 0, nodes.length));
    const prev = nodes[index - 1];
    const next = nodes[index];
    /** A line inside the editor: the text column's left edge and that line's top. */
    const lineStart = (top, height) => ({ left: textOrigin().left, top, height: height || textOrigin().height });
    /** The caret at the start of the node that follows the current point. */
    const nodeStart = (node) => {
      if (isText(node)) {
        const start = textRect(node, true);
        if (start) return start;
      }
      const box = rectOf(node);
      return box ? lineStart(box.top, textOrigin().height) : null;
    };
    if (isBreak(prev)) {
      // Whatever follows the break begins the line the caret moved to.
      if (next) return nodeStart(next);
      const br = rectOf(prev);
      // A break can report no box at all; the line it opens starts where the content
      // before it ends, which is the previous inline's own last caret rect.
      if (!br) {
        const before = prev.previousSibling;
        const end = before && (isText(before) ? textRect(before, false) : rectOf(before));
        return end ? lineStart(end.top + end.height, end.height) : null;
      }
      // A trailing break opens a new line only when the block already held content; the
      // single <br> of an empty block is the line itself.
      return lineStart(prev.previousSibling ? br.top + br.height : br.top, br.height);
    }
    if (index === 0) {
      if (!next) return startRect();
      // A first <br> without geometry still marks this block's own first line.
      return nodeStart(next) || lineStart(rectOf(container)?.top ?? textOrigin().top, textOrigin().height);
    }
    if (isText(prev)) {
      const end = textRect(prev, false);
      if (end) return end;
    }
    if (next) return nodeStart(next);
    // A point after an inline node sits at its right edge. A point after a block has no
    // line of its own to measure, so the native caret keeps it instead of a guess.
    if (container === input) return null;
    const end = rectOf(prev);
    return end ? { left: end.right, top: end.top, height: end.height } : null;
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
    let rect;
    if (isElement(range.startContainer)) {
      rect = pointRect(range.startContainer, range.startOffset);
    } else {
      rect = range.getBoundingClientRect();
      if (!rect || !rect.height) rect = null;
    }
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
  // The host clears the committed draft after a send by editing the editor state
  // programmatically, and the browser re-anchors the DOM selection to the empty root
  // without dispatching `selectionchange` (the editor update that clears is not followed
  // by a selection sync, so our only resync event never arrives). The bar kept its last
  // transform and stayed where the sent text ended instead of returning to the start.
  // Follow the editor's own content, and treat the transition to empty as the initial
  // position: snap there in one frame rather than gliding out of the stale spot.
  const content = new MutationObserver(() => {
    const empty = emptyEditor();
    if (empty && !wasEmpty) {
      placed = false;
      lastX = undefined;
      lastY = undefined;
    }
    wasEmpty = empty;
    schedule();
  });
  content.observe(input, { childList: true, subtree: true, characterData: true });
  grow.append(caret);
  schedule();
  return () => {
    content.disconnect();
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

/** Bounded context occupancy from the host's own pressure projection: the same reading
 * its dock meter used before this skin moved the meter into the composer row. */
function contextOccupancyOf(pressure) {
  const usedTokens = pressure?.projectedTokens ?? pressure?.pressureTokens;
  if (usedTokens === undefined || pressure?.contextWindow === undefined) return null;
  return {
    percent: Math.min(100, Math.round(usedTokens / pressure.contextWindow * 100)),
    usedTokens,
    contextWindow: pressure.contextWindow,
  };
}

/** `%s` substitution for the context panel's counters: the shared locale table has no
 * formatter, and a whole ICU layer for a handful of strings would outweigh the panel. */
function contextFill(template, ...values) {
  let index = 0;
  return template.replace(/%s/g, () => String(values[index++] ?? ''));
}

/** Compact token count: 517 / 12.2K / 517K / 1.2M, with the K/M unit from the locale. */
function contextTokens(value, text) {
  const total = Number(value) || 0;
  if (total < 1e3) return String(total);
  const scaled = (size) => {
    const number = total / size;
    return String(number >= 100 ? Math.round(number) : Math.round(number * 10) / 10);
  };
  if (total < 1e6) return contextFill(text('composer.context.thousand', '%sK'), scaled(1e3));
  return contextFill(text('composer.context.million', '%sM'), scaled(1e6));
}

/** Exact count with three-digit groups: 4,055,212. */
function contextExactTokens(value, text) {
  const digits = String(Math.max(0, Math.round(Number(value) || 0)));
  const groups = [];
  for (let end = digits.length; end > 0; end -= 3) groups.unshift(digits.slice(Math.max(0, end - 3), end));
  return groups.join(text('composer.context.group', ','));
}

/** Host-style duration: 45.2s under a minute, 81m10s from there on. */
function contextDuration(ms, text) {
  const seconds = Math.max(0, Number(ms) || 0) / 1e3;
  if (seconds < 60) return contextFill(text('composer.context.durationSeconds', '%s秒'), Math.round(seconds * 10) / 10);
  const whole = Math.round(seconds);
  return contextFill(text('composer.context.durationMinutes', '%s分%s秒'), Math.floor(whole / 60), whole % 60);
}

/** An honest cache-hit share: a partial hit never displays as a flat 100%. */
function contextCacheHit(usage) {
  const cacheRead = Number(usage?.cacheReadTokens) || 0;
  const prompt = cacheRead + (Number(usage?.uncachedInputTokens) || 0) + (Number(usage?.cacheWriteTokens) || 0);
  if (!prompt) return null;
  if (cacheRead >= prompt) return '100';
  const rounded = Math.round(cacheRead / prompt * 100);
  return rounded >= 100 ? (Math.round(cacheRead / prompt * 1000) / 10).toFixed(1) : String(rounded);
}

/** The host adds its provider-decided "Default" reasoning choice to exactly the models
 * whose catalogue has no fixed default stop (`defaultEffort === undefined`). The effort
 * panel's auto chip mirrors that condition, so a model that cannot be put back on
 * Default never shows one. */
function offersDefaultEffort(reasoning) {
  return Boolean(reasoning && reasoning.efforts?.length > 0 && reasoning.defaultEffort === undefined);
}

/** One workspace's menu label. The Host titles its first-use workspace
 * `default-workspace`; that one reads as the active language's default name, every
 * other title reads verbatim (the Host's own rule). */
function workspaceName(workspace, defaultName) {
  const title = workspace?.title || '';
  return title === 'default-workspace' ? (defaultName || '') : title;
}

/** The rows a live name filter leaves. Matching trims the query and ignores case; an
 * empty query keeps the catalogue order. */
function filterWorkspaces(workspaces, query, defaultName) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return workspaces;
  return workspaces.filter((workspace) => workspaceName(workspace, defaultName).toLowerCase().includes(needle));
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
    React.useEffect(() => {
      if (typeof document === 'undefined') return undefined;
      return surfaces.watch(selector, setTarget);
    }, [selector]);
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
              branchName === current && h(ui.IconCheckOutlineRegular, { className: 'smooth-git-check' }))))
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
    // Which single row owns the in-flight pick. `busy` alone would lock the whole
    // catalogue for the length of one provider round trip; holding the id lets every
    // other row keep responding while the picked one shows its pending state.
    const [picking, setPicking] = React.useState(null);
    const searchRef = React.useRef(null);
    React.useEffect(() => { if (active) searchRef.current?.focus?.(); }, [active]);
    const needle = query.trim().toLowerCase();
    const filtered = groups.map((group) => ({
      ...group,
      models: (group.models || []).filter((model) => !needle || model.name.toLowerCase().includes(needle)),
    })).filter((group) => group.models.length > 0);
    const pick = async (group, model) => {
      setBusy(true); setPicking(`${group.id}:${model.id}`); setError('');
      try {
        await onPick(group, model);
        onDone();
      } catch (reason) {
        setError(reason?.message || text('composer.modelFailed', '模型切换失败'));
      } finally {
        setPicking(null); setBusy(false);
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
      h('div', { className: 'smooth-git-list', role: 'group', 'aria-label': text('composer.modelMenu', '模型') }, filtered.map((group) =>
        h('div', { key: group.id, className: 'smooth-model-group', role: 'group', 'aria-label': group.name },
          h('div', { className: 'smooth-git-heading' }, group.name),
          (group.models || []).map((model) => {
            const selected = group.id === current?.provider && model.id === current?.model;
            return h('button', {
              key: model.id, type: 'button', className: 'smooth-git-row',
              // Only the row being picked locks: the listbox/option roles are gone because
              // nothing here implements the listbox focus contract, so the native buttons
              // carry the semantics themselves and the rest of the catalogue stays usable.
              disabled: busy && picking === `${group.id}:${model.id}`,
              'aria-current': selected ? 'true' : undefined, 'data-current': selected ? 'true' : undefined,
              onClick: () => { if (busy) return; pick(group, model); },
            },
              h('span', { className: 'smooth-git-row-main' }, h('span', { className: 'smooth-git-name' }, model.name)),
              selected && h(ui.IconCheckOutlineRegular, { className: 'smooth-git-check' }));
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
    // The auto chip paints its active state immediately; the store's `current` only
    // catches up after the provider round trip, and without this the chip would flash
    // back to the explicit level for that window.
    const [autoDraft, setAutoDraft] = React.useState(false);
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
    // Provider-decided reasoning: the host's own model menu offers "Default" for
    // catalogues without a fixed default stop, and selecting it drops reasoningEffort.
    const defaultOption = offersDefaultEffort(reasoning);
    const defaultActive = defaultOption && draft == null && (autoDraft || current?.reasoningEffort === undefined);
    const effective = defaultActive ? undefined : (current?.reasoningEffort ?? reasoning?.defaultEffort);
    const explicitIndex = defaultActive ? -1 : efforts.findIndex((effort) => effort.id === effective);
    const currentIndex = Math.max(0, explicitIndex);
    // While Default is in charge there is no explicit stop to point at; leave the thumb
    // on the last level the user picked so switching back to an explicit level is a
    // short move, and let the stylesheet neutralise the fill and track (never the thumb:
    // a faded control reads as disabled, and this one is still live) to say the provider,
    // not the scale, owns the level.
    const lastExplicitRef = React.useRef(currentIndex);
    React.useEffect(() => {
      if (explicitIndex >= 0) lastExplicitRef.current = explicitIndex;
    }, [explicitIndex]);
    const index = draft == null
      ? (defaultActive ? lastExplicitRef.current : currentIndex)
      : Math.max(0, Math.min(draft, efforts.length - 1));
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
    /** Hand the level back to the provider: the same selection the host's own model menu
     * makes for its "Default" row — no reasoningEffort in the request. */
    const chooseDefault = () => {
      if (!current || !defaultOption || defaultActive) return;
      committedRef.current = null;
      draftRef.current = null;
      setDraft(null);
      setAutoDraft(true);
      setError('');
      Promise.resolve(props.select({ provider: current.provider, model: current.model })).catch((reason) => {
        setAutoDraft(false);
        setError(reason?.message || text('composer.modelFailed', '模型切换失败'));
      });
    };
    // Commit on every stop the thumb crosses, so the Host selection changes while
    // dragging; the draft only keeps the visual thumb ahead until the store catches up.
    const preview = (next) => {
      setAutoDraft(false);
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
    React.useEffect(() => {
      // The provider settled a Default pick (no explicit effort) — stop faking it.
      if (autoDraft && current?.reasoningEffort === undefined) setAutoDraft(false);
    }, [autoDraft, current?.reasoningEffort]);
    // The top stop is a release: a stream of sparks runs left along the filled track.
    // Neither decoration may run while the provider decides the level: the thumb still
    // remembers the last explicit stop, but that stop is not governing.
    const atMax = !defaultActive && efforts.length > 0 && index === efforts.length - 1;
    const level = !defaultActive && reasoning && efforts.length > 0 ? thinkArtFor(efforts, index) : undefined;
    const backdrop = Boolean(level && deepseekBackdrop(group));
    const levelName = defaultActive ? text('composer.effortDefault', 'Default') : efforts[index]?.name || '';
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
        // The auto chip appears exactly for models whose catalogue offers the host's
        // "Default" effort; it sits before the level dot and returns the level to it.
        // The chip is the Default state's own label, so the level name beside it would
        // only repeat the same word — it is rendered exactly when Default is not active.
        // No aria-live here: the range below already announces the level through its
        // value text, and a live region on the container made every move say it twice.
        (levelName || defaultOption) && h('div', { className: 'smooth-model-level' },
          defaultOption && h('button', {
            type: 'button', className: 'smooth-model-auto',
            'data-active': defaultActive ? 'true' : undefined,
            'aria-pressed': defaultActive ? 'true' : 'false',
            'aria-label': text('composer.effortAuto', '使用 Default 思考强度'),
            title: text('composer.effortAuto', '使用 Default 思考强度'),
            disabled,
            onClick: chooseDefault,
          }, text('composer.effortDefault', 'Default')),
          // The key stays on the current level name: it is what re-runs the CSS entry
          // animation when the thumb lands somewhere else.
          levelName && !defaultActive && h('span', { key: levelName, className: 'smooth-model-level-name' }, levelName)),
        h('button', {
          ref: triggerRef, type: 'button', className: 'smooth-model-trigger',
          'data-smooth-model-trigger': '', disabled, title: model?.name,
          // The trigger opens the plugin's own panel, which is role="dialog" — 'menu'
          // would promise the host menu's arrow-key contract that this panel never had.
          // A dialog trigger also has to say whether its pane is showing, the way the
          // context pie's trigger already does.
          'aria-haspopup': 'dialog',
          'aria-expanded': props.modelsOpen === undefined ? undefined : (props.modelsOpen ? 'true' : 'false'),
          onClick: () => props.onOpenModels?.(),
        },
          h('span', { className: 'smooth-model-name' }, model?.name || text('composer.modelLoading', '正在读取…')),
          h(ui.IconChevronRightOutlineRegular, { size: 14, 'aria-hidden': true })),
        reasoning && efforts.length > 0 && h('div', {
          ref: sliderRef, className: 'smooth-model-slider',
          'data-default': defaultActive ? 'true' : undefined,
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
            // Both channels are needed: the value text names the stop, the value number
            // gives its position, and a range without the latter exposes no position at all.
            'aria-valuenow': index,
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
            // The trigger's own expanded state: it opens the models pane inside this
            // already-open panel, so the pane on screen is what it reports.
            modelsOpen: view === 'models',
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
  /** The new-session hero's workspace menu. The Host keeps the chip, the open state and
   * the switch itself — `onPick` carries the draft transfer to the chosen blank — so this
   * only replaces the menu surface. The stock menu lists every workspace in one growing
   * column; this one filters by name live, keeps the focused row visible, and scrolls
   * inside a bounded height instead of reaching past the window edge. The add-workspace
   * row keeps the Host's directory flow, so adding a folder still flows through the
   * native picker and its error handling. */
  function WorkspacePicker(props) {
    const { open, anchorRef, useWorkspaces, selectedId, onPick, onClose, createWorkspace, useDirectoryFlow, renderSlot, t } = props;
    const snapshot = useWorkspaces((state) => state);
    const items = snapshot?.items || [];
    const loading = snapshot?.phase !== 'ready';
    const [query, setQuery] = React.useState('');
    const [active, setActive] = React.useState(-1);
    const [flowOpen, setFlowOpen] = React.useState(false);
    const [picking, setPicking] = React.useState(false);
    const [flowError, setFlowError] = React.useState('');
    const menuRef = React.useRef(null);
    const searchRef = React.useRef(null);
    const listRef = React.useRef(null);
    // `occupied` is the Host's directory flow mounted in this slot; only then can the
    // menu offer the add row (and hand it the owner props it expects).
    const flowAvailable = typeof useDirectoryFlow === 'function' ? useDirectoryFlow((occupied) => occupied) : false;
    const translated = typeof t === 'function' ? t('workspace.defaultName') : '';
    const defaultName = translated && translated !== 'workspace.defaultName' ? translated : text('composer.defaultWorkspace', '默认工作区');
    const filtered = filterWorkspaces(items, query, defaultName);
    const current = active >= 0 && active < filtered.length ? filtered[active] : undefined;
    React.useEffect(() => {
      if (!open) return undefined;
      setQuery('');
      setActive(-1);
      searchRef.current?.focus?.();
      // Closing removes the focused field, so focus would fall to the body. Hand it back
      // to the visible trigger unless the user is already focused somewhere else.
      return () => {
        if (document.activeElement && document.activeElement !== document.body) return;
        const trigger = document.querySelector('.smooth-meta-workspace');
        if (trigger?.isConnected) trigger.focus?.();
      };
    }, [open]);
    React.useEffect(() => {
      if (!open) return undefined;
      const outside = (event) => {
        if (menuRef.current?.contains?.(event.target)) return;
        // The chip's own click toggles the Host picker; closing here would race it.
        if (event.target?.closest?.('.smooth-meta-workspace')) return;
        onClose?.();
      };
      const escape = (event) => { if (event.key === 'Escape') onClose?.(); };
      // Keep Tab inside the popover while it is open: the rows are not tab stops (the
      // search field owns the listbox focus), so only the search and the add row cycle.
      const tab = (event) => {
        if (event.key !== 'Tab') return;
        const stops = [...(menuRef.current?.querySelectorAll?.('input,button') || [])].filter((node) => node.tabIndex >= 0);
        if (stops.length === 0) return;
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus?.(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus?.(); }
      };
      document.addEventListener('pointerdown', outside, true);
      document.addEventListener('keydown', escape);
      document.addEventListener('keydown', tab);
      return () => {
        document.removeEventListener('pointerdown', outside, true);
        document.removeEventListener('keydown', escape);
        document.removeEventListener('keydown', tab);
      };
    }, [open, onClose]);
    React.useEffect(() => {
      if (!open || active < 0) return;
      listRef.current?.querySelector?.(`[data-active="true"]`)?.scrollIntoView?.({ block: 'nearest' });
    }, [open, active]);
    const choose = (workspace) => {
      if (!workspace || picking) return;
      onPick?.(workspace.workspaceId);
    };
    const move = (delta) => {
      if (filtered.length === 0) return;
      setActive((value) => {
        const base = value < 0 ? (delta > 0 ? -1 : 0) : value;
        return (base + delta + filtered.length) % filtered.length;
      });
    };
    const keys = (event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
      else if (event.key === 'Home') { event.preventDefault(); setActive(0); }
      else if (event.key === 'End') { event.preventDefault(); setActive(filtered.length - 1); }
      else if (event.key === 'Enter') { event.preventDefault(); choose(current || filtered[0]); }
      else if (event.key === 'Escape') { event.preventDefault(); onClose?.(); }
    };
    // The directory flow owns its own modal; a failed adoption comes back here so the
    // menu can name the problem and offer the same folder picker again.
    const adopt = (path) => {
      setPicking(true);
      Promise.resolve()
        .then(() => createWorkspace?.({ path }))
        .then((workspace) => {
          if (!workspace?.workspaceId) throw new Error(text('composer.workspaceMissing', '没有可用的工作区'));
          setFlowOpen(false);
          onPick?.(workspace.workspaceId);
        })
        .catch((reason) => {
          setFlowOpen(false);
          setFlowError(reason instanceof Error && reason.message ? reason.message : String(reason));
        })
        .finally(() => setPicking(false));
    };
    const openFlow = () => {
      onClose?.();
      setFlowError('');
      setFlowOpen(true);
    };
    const flowOwner = {
      open: flowOpen,
      busy: picking,
      onPicked: adopt,
      onCancel: () => setFlowOpen(false),
      onError: (message) => { setFlowOpen(false); setFlowError(String(message || '')); },
    };
    const flow = typeof renderSlot === 'function' ? renderSlot('conversation.hero.workspace.directoryFlow', flowOwner) : null;
    const dialog = flowError ? h(ui.Modal, {
      open: true,
      onClose: () => setFlowError(''),
      closeLabel: text('composer.cancel', '取消'),
      title: text('composer.workspaceErrorTitle', '无法添加工作区'),
      footer: h(React.Fragment, null,
        h(ui.Button, { variant: 'outline', onClick: () => setFlowError('') }, text('composer.cancel', '取消')),
        h(ui.Button, { variant: 'outline', onClick: () => { setFlowError(''); setFlowOpen(true); } }, text('composer.workspaceRetry', '重新选择'))),
    }, h('div', { role: 'alert', className: 'smooth-session-delete-error' }, flowError)) : null;
    if (!open) return h(React.Fragment, null, flow, dialog);
    // Anchor to the visible metadata chip: the Host's chip lives in the hidden hero row,
    // and the metadata bar re-points its rect while opening the picker.
    const rect = anchorRef?.current?.getBoundingClientRect?.()
      || document.querySelector('.smooth-meta-workspace')?.getBoundingClientRect?.();
    const width = Math.min(300, window.innerWidth - 16);
    const flip = rect ? window.innerHeight - rect.bottom < 230 && rect.top > window.innerHeight - rect.bottom : false;
    const room = rect ? (flip ? rect.top - 18 : window.innerHeight - rect.bottom - 18) : window.innerHeight - 32;
    const maxHeight = Math.max(180, Math.min(room, Math.round(window.innerHeight * 0.64), 420));
    const style = {
      left: `${rect ? Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) : 8}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
    };
    if (flip) style.bottom = `${Math.max(8, window.innerHeight - rect.top + 6)}px`;
    else style.top = `${rect ? rect.bottom + 6 : 8}px`;
    const rows = filtered.length
      ? h('div', {
        ref: listRef, id: 'smooth-workspace-list', className: 'smooth-git-list', role: 'listbox',
        'aria-label': text('composer.workspaceList', '工作区列表'),
      }, filtered.map((workspace, index) => {
        const selected = workspace.workspaceId === selectedId;
        const highlighted = index === active && !selected;
        return h('button', {
          key: workspace.workspaceId, type: 'button', role: 'option', tabIndex: -1,
          className: 'smooth-git-row smooth-workspace-row',
          'aria-selected': selected,
          'data-current': selected ? 'true' : undefined,
          'data-active': highlighted ? 'true' : undefined,
          onClick: () => choose(workspace),
        },
          h(selected ? ui.IconFolderOpenRegular : ui.IconFolderCloseRegular, { size: 16, 'aria-hidden': true }),
          h('span', { className: 'smooth-git-row-main' },
            h('span', { className: 'smooth-git-name' }, workspaceName(workspace, defaultName))),
          selected ? h(ui.IconCheckOutlineRegular, { className: 'smooth-git-check' }) : null);
      }))
      : h('div', { className: 'smooth-git-empty', role: 'status' },
        loading ? text('composer.workspaceLoading', '正在加载工作区…')
          : items.length ? text('composer.workspaceNoMatch', '没有匹配的工作区')
            : text('composer.workspaceEmpty', '还没有工作区'),
        items.length && query.trim() ? h('button', {
          type: 'button', className: 'smooth-workspace-clear',
          onClick: () => { setQuery(''); searchRef.current?.focus?.(); },
        }, text('composer.clearSearch', '清除搜索')) : null);
    const panel = createPortal(h('div', {
      ref: menuRef, className: 'smooth-git-menu smooth-workspace-menu',
      role: 'dialog', 'aria-label': text('composer.switchWorkspace', '切换工作区'),
      'data-smooth-workspace-menu': '', style,
    },
      h('input', {
        ref: searchRef, className: 'smooth-git-search smooth-workspace-search', type: 'search',
        value: query, placeholder: text('composer.searchWorkspace', '搜索工作区名'),
        'aria-label': text('composer.searchWorkspace', '搜索工作区名'),
        role: 'combobox', 'aria-expanded': 'true', 'aria-autocomplete': 'list',
        'aria-controls': filtered.length ? 'smooth-workspace-list' : undefined,
        'aria-activedescendant': current ? `smooth-workspace-${current.workspaceId}` : undefined,
        autoComplete: 'off', spellCheck: false,
        onKeyDown: keys,
        onChange: (event) => { setQuery(event.target.value); setActive(-1); },
      }),
      rows,
      flowAvailable ? h('button', {
        type: 'button', className: 'smooth-git-footer', disabled: picking || flowOpen, onClick: openFlow,
      }, h(ui.IconPlusOutlineRegular, { size: 16, 'aria-hidden': true }), text('composer.addWorkspace', '添加工作区…')) : null,
    ), document.body);
    return h(React.Fragment, null, panel, flow, dialog);
  }
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
  /** The token-direction arrows and the cache-hit mark are inline SVG so they take the
   * line's ink and never depend on a font glyph. The hit mark is the supplied target-like
   * asset: a ring with a centre dot. */
  const USAGE_ARROW_DOWN = 'M6 2.2v7.6M2.9 6.9 6 10l3.1-3.1';
  const USAGE_ARROW_UP = 'M6 9.8V2.2M2.9 5.1 6 2l3.1 3.1';
  function usageArrow(path) {
    return h('svg', {
      viewBox: '0 0 12 12', width: 12, height: 12, className: 'smooth-usage-icon',
      'aria-hidden': true, focusable: 'false',
    }, h('path', {
      d: path, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3,
      strokeLinecap: 'round', strokeLinejoin: 'round',
    }));
  }
  function usageHitIcon() {
    return h('svg', {
      viewBox: '0 0 1024 1024', width: 12, height: 12,
      className: 'smooth-usage-icon smooth-usage-icon-hit',
      'aria-hidden': true, focusable: 'false',
    }, h('path', {
      d: 'M544 876.8a332.8 332.8 0 1 0 0-665.6 332.8 332.8 0 0 0 0 665.6z m0 83.2a416 416 0 1 1 0-832 416 416 0 0 1 0 832z',
      fill: 'currentColor', fillOpacity: 0.65,
    }), h('path', {
      d: 'M544 627.2a83.2 83.2 0 1 1 0-166.4 83.2 83.2 0 0 1 0 166.4z',
      fill: 'currentColor',
    }));
  }
  function usageMoneyIcon() {
    // The same shape as the ¥ character, drawn as a line icon so it takes the line's
    // muted ink instead of being a text glyph.
    return h('svg', {
      viewBox: '0 0 12 12', width: 12, height: 12,
      className: 'smooth-usage-icon smooth-usage-icon-yen',
      'aria-hidden': true, focusable: 'false',
    }, h('g', {
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.2,
      strokeLinecap: 'round', strokeLinejoin: 'round',
    },
      h('path', { d: 'M3.1 2.5 6 5.6l2.9-3.1' }),
      h('path', { d: 'M6 5.6v4' }),
      h('path', { d: 'M3.5 6.7h5' }),
      h('path', { d: 'M3.5 8.4h5' })));
  }
  /** The steps mark is the supplied staircase asset, and the speed mark is the host's own
   * gauge primitive (the same one its activity pill uses). */
  function usageStepIcon() {
    return h('svg', {
      viewBox: '0 0 24 24', width: 12, height: 12,
      className: 'smooth-usage-icon smooth-usage-icon-step',
      'aria-hidden': true, focusable: 'false',
    }, h('path', {
      d: 'M3 19 L9 19 L9 13 L15 13 L15 7 L21 7',
      fill: 'none', stroke: 'currentColor', strokeWidth: 2.2,
      strokeLinecap: 'round', strokeLinejoin: 'round',
    }));
  }
  function usageSpeedIcon() {
    return h(ui.IconGaugeOutlineRegular, {
      size: 14, className: 'smooth-usage-icon smooth-usage-icon-gauge',
      'aria-hidden': true, focusable: 'false',
    });
  }
  const ROLLING_KEYS = ['cost', 'input', 'output', 'cache', 'turns', 'steps', 'speed', 'context'];
  function sameRolling(a, b) {
    for (const key of ROLLING_KEYS) if (a?.[key] !== b?.[key]) return false;
    return true;
  }
  /** Count the button's figures toward the newest reading. One frame loop stays alive
   * while a number is moving: a projection that lands mid-roll only becomes the new goal,
   * so frequent settlements keep the figures visibly rolling instead of restarting an
   * effect per update. A null target (no price, no speed, no context) is written as it is,
   * and reduced motion writes the new reading directly. */
  function useRollingReadings(target) {
    const [shown, setShown] = React.useState(target);
    const shownRef = React.useRef(target);
    const targetRef = React.useRef(target);
    const fromRef = React.useRef(target);
    const goalRef = React.useRef(target);
    const startRef = React.useRef(0);
    const rafRef = React.useRef(0);
    targetRef.current = target;
    const signature = JSON.stringify(target);
    const stop = () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
    const settle = () => {
      stop();
      shownRef.current = targetRef.current;
      setShown(targetRef.current);
    };
    const start = () => {
      if (rafRef.current) return;
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        settle();
        return;
      }
      if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        settle();
        return;
      }
      fromRef.current = shownRef.current;
      goalRef.current = targetRef.current;
      startRef.current = 0;
      const duration = 5000;
      const costDuration = 800;
      const tick = (now) => {
        rafRef.current = 0;
        const goal = targetRef.current;
        if (!sameRolling(goalRef.current, goal)) {
          fromRef.current = shownRef.current;
          goalRef.current = goal;
          startRef.current = now;
        }
        if (startRef.current === 0) startRef.current = now;
        const progress = Math.min(1, (now - startRef.current) / duration);
        const costProgress = Math.min(1, (now - startRef.current) / costDuration);
        const from = fromRef.current;
        const next = {};
        for (const key of ROLLING_KEYS) {
          const before = from[key];
          const after = goal[key];
          const eased = key === 'cost' ? costProgress : progress;
          next[key] = typeof before === 'number' && typeof after === 'number' && Number.isFinite(before) && Number.isFinite(after)
            ? before + (after - before) * eased
            : after;
        }
        if (progress >= 1) {
          shownRef.current = goal;
          setShown(goal);
          return;
        }
        shownRef.current = next;
        setShown(next);
        rafRef.current = window.requestAnimationFrame(tick);
      };
      rafRef.current = window.requestAnimationFrame(tick);
    };
    React.useEffect(() => {
      const from = shownRef.current;
      const goal = targetRef.current;
      const moved = ROLLING_KEYS.some((key) => {
        const before = from[key];
        const after = goal[key];
        return typeof before === 'number' && typeof after === 'number' && before !== after;
      });
      if (!moved) {
        settle();
        return;
      }
      start();
    }, [signature]);
    React.useEffect(() => stop, []);
    return shown;
  }
  /** The cache share while it counts: one decimal, never a false 100% before the target. */
  function rollingCacheText(value) {
    if (value === null || !Number.isFinite(value)) return null;
    if (value >= 100) return '100';
    return String(Math.round(Math.min(99.9, value) * 10) / 10);
  }
  /** The whole session meter is one button on the host's dock row under the composer:
   * the live figures followed by the context pie. Clicking it opens the panel with the
   * composition, timing and token details; the pie's used wedge pops on hover. Every
   * reading is a slot projection — nothing here rescans the session or reads another
   * component's DOM. */
  function UsageLine(props) {
    const skin = useSmoothState();
    const placement = skin.state.usagePlacement || 'row';
    const variant = props.variant || 'dock';
    const active = variant === 'dock' ? placement === 'row'
      : variant === 'bottom' ? placement === 'bottom'
        : variant === 'context' ? placement === 'context'
          : false;
    // The context-only seat shows no money figure, and the inactive seats stay mounted
    // in their slots; only the one visible figure may open a poller and a DOM meter.
    const costActive = active && variant !== 'context';
    const fields = skin.state.usageFields || {};
    const [open, setOpen] = React.useState(false);
    const triggerRef = React.useRef(null);
    const panelRef = React.useRef(null);
    const liveRef = React.useRef(null);
    const costFeedRef = React.useRef(null);
    const [, bumpLive] = React.useState(0);
    const usage = props.useProjection('tokenUsage');
    const stats = props.useProjection('sessionStats');
    const selection = props.useProjection('modelSelection');
    const pressure = props.useProjection('contextPressure');
    const breakdown = props.useProjection('contextBreakdown');
    const context = contextOccupancyOf(pressure);
    React.useEffect(() => {
      if (!context && open) setOpen(false);
    }, [context, open]);
    React.useEffect(() => {
      if (!open) return undefined;
      const dismiss = (event) => {
        if (panelRef.current?.contains?.(event.target)) return;
        if (triggerRef.current?.contains?.(event.target)) return;
        setOpen(false);
      };
      const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
      document.addEventListener('pointerdown', dismiss, true);
      document.addEventListener('keydown', escape);
      return () => {
        document.removeEventListener('pointerdown', dismiss, true);
        document.removeEventListener('keydown', escape);
      };
    }, [open]);
    React.useEffect(() => {
      if (!skin.state.enabled || !costActive) return undefined;
      const meter = createStreamingMeter();
      const feed = createSessionCostFeed(props.sessionId);
      liveRef.current = meter;
      costFeedRef.current = feed;
      const offLive = meter.onChange(() => bumpLive((value) => value + 1));
      const offCost = feed.onChange(() => bumpLive((value) => value + 1));
      meter.watch();
      feed.follow(props.sessionId);
      feed.ask(Date.now(), true);
      return () => {
        offLive();
        offCost();
        meter.stop();
        feed.stop();
        liveRef.current = null;
        costFeedRef.current = null;
      };
    }, [props.sessionId, skin.state.enabled, costActive]);
    const input = usage ? usageInputTokens(usage) : 0;
    const output = usage ? Math.round(Number(usage.outputTokens) || 0) : 0;
    const cacheHit = usage ? contextCacheHit(usage) : null;
    let model = selection?.next?.model ?? selection?.lastUsed?.model;
    if (!model && modelDirectories && props.sessionId) {
      try { model = modelDirectories.directoryFor(props.sessionId)?.getSnapshot?.().current?.model; } catch {}
    }
    const turns = stats ? Math.round(stats.turns) : 0;
    const steps = stats ? Math.round(stats.steps) : 0;
    React.useEffect(() => {
      if (skin.state.enabled && costActive) costFeedRef.current?.ask(Date.now());
    }, [usage?.uncachedInputTokens, usage?.cacheReadTokens, usage?.cacheWriteTokens, usage?.outputTokens, stats?.turns, stats?.steps, skin.state.enabled, costActive]);
    React.useEffect(() => {
      if (!costActive) return;
      liveRef.current?.settle(output, model);
      // The settlement resets the live tail and may reshape the calibration; render the
      // new amount now instead of waiting for the next stream tick.
      bumpLive((value) => value + 1);
    }, [output, model, costActive]);
    // A session with no tokens yet costs nothing even before a model is known. The Host
    // reading is the settled part; the meter adds only the stream not settled yet.
    const projectionCost = !usage ? null : input + output === 0 ? 0 : usageCostMicro(usage, model);
    const hostCost = costFeedRef.current?.value();
    const liveTokens = liveRef.current ? liveRef.current.tokens(model) : 0;
    const liveRate = usageOutputRate(model, Date.now());
    const cost = combineSessionCost(hostCost, liveTokens, liveRate, projectionCost);
    const speed = stats && stats.decodeMs > 0 && stats.decodeTokens > 0
      ? Math.round(stats.decodeTokens / (stats.decodeMs / 1e3))
      : null;
    const target = {
      cost: cost === null ? null : cost,
      input,
      output,
      cache: cacheHit === null ? null : Number(cacheHit),
      turns,
      steps,
      speed: speed === null ? null : speed,
      context: context ? context.percent : null,
    };
    const shown = useRollingReadings(target);
    if (!skin.state.enabled) return null;
    if (!active) return null;
    // A fresh session projects zero tokens, zero turns and (at most) a zero context;
    // its button would only read 0.000 / 0 tok. Leave the dock empty until the first
    // reading exists, including the context-only seat.
    if (!(input + output) && !turns && !steps) return null;
    const contextOnly = variant === 'context';
    const showContext = contextOnly ? !!context : !!context && fields.context !== false;
    const reading = context ? `${Math.round(shown.context)}%` : null;
    const piePercent = context ? shown.context : 0;
    // The pie follows the supplied asset: a pale disc for the remaining share and an
    // accent wedge for the used share, sweeping clockwise from 12 o'clock. Hovering the
    // whole button enlarges only that wedge around the pie centre.
    const size = contextOnly ? 20 : 24;
    const center = size / 2;
    const radius = size * 0.404;
    let edgeX = center;
    let edgeY = center;
    if (context) {
      const angle = (piePercent * 3.6 - 90) * Math.PI / 180;
      edgeX = center + radius * Math.cos(angle);
      edgeY = center + radius * Math.sin(angle);
    }
    const labels = [];
    const items = [];
    const item = (key, value, { icon, title, label } = {}) => h('span', {
      key, className: 'smooth-usage-item', title, 'aria-label': label,
    }, icon ?? null, h('span', { className: 'smooth-usage-value' }, value));
    const inputText = `${contextExactTokens(input, text)} tok`;
    const outputText = `${contextExactTokens(output, text)} tok`;
    const shownInputText = `${contextExactTokens(Math.round(shown.input), text)} tok`;
    const shownOutputText = `${contextExactTokens(Math.round(shown.output), text)} tok`;
    if (!contextOnly) {
    if (usage) {
      const costText = cost === null ? '—' : usageCostText(cost);
      const shownCostText = shown.cost === null ? '—' : usageCostText(shown.cost);
      const costLabel = cost === null
        ? `${text('composer.stats.used', '已用')} —`
        : `${text('composer.stats.used', '已用')} ${costText} ${text('composer.stats.currency', '元')}`;
      if (fields.cost !== false) {
        labels.push(costLabel);
        items.push(item('cost', shownCostText, {
          icon: usageMoneyIcon(),
          title: `${text('composer.stats.used', '已用')} · ${text('composer.stats.estimate', '按当前时段单价估算')}`,
          label: costLabel,
        }));
      }
      // The visible labels are gone; the icons carry the direction, and the title/aria
      // name keep the meaning for a pointer and a screen reader.
      if (fields.input !== false) {
        labels.push(`${text('composer.stats.input', '输入')} ${inputText}`);
        items.push(item('input', shownInputText, {
          icon: usageArrow(USAGE_ARROW_DOWN),
          title: text('composer.stats.input', '输入'),
          label: labels[labels.length - 1],
        }));
      }
      if (fields.output !== false) {
        labels.push(`${text('composer.stats.output', '输出')} ${outputText}`);
        items.push(item('output', shownOutputText, {
          icon: usageArrow(USAGE_ARROW_UP),
          title: text('composer.stats.output', '输出'),
          label: labels[labels.length - 1],
        }));
      }
      if (cacheHit !== null && fields.cache !== false) {
        labels.push(`${text('composer.stats.cache', '缓存命中')} ${cacheHit}%`);
        items.push(item('cache', `${rollingCacheText(shown.cache) ?? cacheHit}%`, {
          icon: usageHitIcon(),
          title: text('composer.stats.cache', '缓存命中'),
          label: labels[labels.length - 1],
        }));
      }
    }
    if ((turns || steps) && fields.counts !== false) {
      const countsText = contextFill(text('composer.stats.counts', '%s 轮 %s 步'), turns, steps);
      labels.push(`${text('composer.stats.countsTitle', '轮次与步数')} ${countsText}`);
      items.push(item('counts', contextFill(text('composer.stats.counts', '%s 轮 %s 步'), Math.round(shown.turns), Math.round(shown.steps)), {
        icon: usageStepIcon(),
        title: text('composer.stats.countsTitle', '轮次与步数'),
        label: labels[labels.length - 1],
      }));
    }
    if (speed !== null && fields.speed !== false) {
      const speedText = contextFill(text('composer.stats.speed', '%s tok/s'), speed);
      labels.push(`${text('composer.stats.speedTitle', '输出速度')} ${speedText}`);
      items.push(item('speed', contextFill(text('composer.stats.speed', '%s tok/s'), Math.round(shown.speed)), {
        icon: usageSpeedIcon(),
        title: text('composer.stats.speedTitle', '输出速度'),
        label: labels[labels.length - 1],
      }));
    }
    }
    if (showContext) labels.push(contextFill(text('composer.context.aria', '上下文已用 %s'), reading));
    if (contextOnly && !context) return null;
    if (!contextOnly && !items.length && !showContext) return null;
    let panel = null;
    if (open && context) {
      const rect = triggerRef.current?.getBoundingClientRect?.();
      const width = Math.min(268, window.innerWidth - 16);
      const left = rect ? Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)) : 8;
      const bottom = rect ? Math.max(8, window.innerHeight - rect.top + 8) : 8;
      const rows = [
        { key: 'systemTokens', tint: 'smooth-context-system', label: text('composer.context.system', '系统提示词'), tokens: breakdown?.systemTokens ?? 0 },
        { key: 'toolsTokens', tint: 'smooth-context-tools', label: text('composer.context.tools', '工具定义'), tokens: breakdown?.toolsTokens ?? 0 },
        { key: 'messageTokens', tint: 'smooth-context-messages', label: text('composer.context.messages', '对话消息'), tokens: breakdown?.messageTokens ?? 0 },
      ];
      const total = rows.reduce((sum, row) => sum + row.tokens, 0);
      const segments = breakdown && total > 0
        ? rows.map((row) => ({ key: row.key, tint: row.tint, width: context.percent * row.tokens / total })).filter((segment) => segment.width > 0)
        : [{ key: 'total', tint: 'smooth-context-messages', width: context.percent }];
      const statRows = stats ? [
        { key: 'llm', label: text('composer.context.llmTime', '模型用时'), value: stats.llmMs > 0 ? contextDuration(stats.llmMs, text) : null },
        { key: 'tool', label: text('composer.context.toolTime', '工具调用用时'), value: stats.toolMs > 0 ? contextDuration(stats.toolMs, text) : null },
        { key: 'ttft', label: text('composer.context.ttft', '首 token 平均（TTFT）'), value: stats.ttftSteps > 0 ? contextDuration(stats.ttftMs / stats.ttftSteps, text) : null },
        { key: 'tps', label: text('composer.context.tps', '输出速度（TPS）'), value: stats.decodeMs > 0 ? contextFill(text('composer.context.tpsValue', '%s tok/s'), Math.round(stats.decodeTokens / (stats.decodeMs / 1e3))) : null },
      ].filter((row) => row.value !== null) : [];
      const tokenRows = usage ? [
        { key: 'cacheHit', label: text('composer.context.cacheHit', '缓存命中'), value: cacheHit === null ? null : `${cacheHit}%` },
        { key: 'uncachedInput', label: text('composer.context.uncachedInput', '未缓存输入'), value: contextFill(text('composer.context.tok', '%s tok'), contextExactTokens(usage.uncachedInputTokens, text)) },
        { key: 'cacheRead', label: text('composer.context.cacheRead', '缓存读取'), value: contextFill(text('composer.context.tok', '%s tok'), contextExactTokens(usage.cacheReadTokens, text)) },
        { key: 'output', label: text('composer.context.output', '输出'), value: contextFill(text('composer.context.tok', '%s tok'), contextExactTokens(usage.outputTokens, text)) },
      ].filter((row) => row.value !== null) : [];
      const metric = (row) => h('div', { key: row.key, className: 'smooth-context-metric' },
        h('span', { className: 'smooth-context-metric-label' }, row.label),
        h('span', { className: 'smooth-context-metric-value' }, row.value));
      panel = createPortal(h('div', {
        ref: panelRef, className: 'smooth-context-menu', role: 'dialog',
        'aria-label': text('composer.context.title', '上下文占用与用量'),
        style: { left: `${left}px`, bottom: `${bottom}px`, width: `${width}px` },
      },
        h('div', { className: 'smooth-context-head' },
          h('span', { className: 'smooth-context-heading' }, text('composer.context.used', '上下文已用')),
          h('span', { className: 'smooth-context-head-value' }, reading),
          h('span', { className: 'smooth-context-figures' },
            `~${contextTokens(context.usedTokens, text)} / ${contextTokens(context.contextWindow, text)}`)),
        h('div', { className: 'smooth-context-bar', 'aria-hidden': true },
          segments.map((segment) => h('span', {
            key: segment.key, className: `smooth-context-segment ${segment.tint}`,
            style: { width: `${segment.width}%` },
          }))),
        breakdown ? h('dl', { className: 'smooth-context-legend' },
          rows.map((row) => h('div', { key: row.key, className: 'smooth-context-legend-row' },
            h('dt', null, h('i', { className: `smooth-context-swatch ${row.tint}`, 'aria-hidden': true }), row.label),
            h('dd', null, `~${contextTokens(row.tokens, text)}`)))) : null,
        statRows.length ? h(React.Fragment, null,
          h('hr', { className: 'smooth-context-rule' }),
          h('h4', { className: 'smooth-context-section' }, text('composer.context.stats', '会话统计')),
          h('div', { className: 'smooth-context-grid' }, statRows.map(metric))) : null,
        tokenRows.length ? h(React.Fragment, null,
          h('hr', { className: 'smooth-context-rule' }),
          h('h4', { className: 'smooth-context-section' }, text('composer.context.tokens', 'Token 用量')),
          h('div', { className: 'smooth-context-grid' }, tokenRows.map(metric))) : null,
      ), document.body);
    }
    const contextReading = showContext
      ? h('span', { key: 'context', className: 'smooth-context-reading' },
        h('svg', { viewBox: `0 0 ${size} ${size}`, width: size, height: size, 'aria-hidden': true },
          h('circle', { className: 'smooth-context-pie-rest', cx: center, cy: center, r: radius }),
          piePercent >= 100
            ? h('circle', { className: 'smooth-context-pie-used', cx: center, cy: center, r: radius })
            : piePercent > 0
              ? h('path', {
                  className: 'smooth-context-pie-used',
                  d: `M${center} ${center} L${center} ${center - radius} A${radius} ${radius} 0 ${piePercent > 50 ? 1 : 0} 1 ${edgeX} ${edgeY} Z`,
                })
              : null),
        h('span', { className: 'smooth-context-value' }, reading))
      : null;
    // Items are built in the default order above; the stored order only decides how the
    // already-built nodes are laid out, so adding a field never needs a second switch.
    const byKey = {};
    items.forEach((node, index) => {
      const key = node.key ?? node.props?.key;
      byKey[key] = { node, label: labels[index] };
    });
    if (showContext) byKey.context = { node: contextReading, label: labels[items.length] };
    const order = contextOnly ? ['context']
      : (skin.state.usageOrder || ['cost', 'input', 'output', 'cache', 'counts', 'speed', 'context']);
    const ordered = order.map((key) => byKey[key]).filter(Boolean);
    for (const [key, entry] of Object.entries(byKey)) {
      if (!order.includes(key)) ordered.push(entry);
    }
    const orderedLabels = ordered.map((entry) => entry.label);
    const orderedNodes = ordered.map((entry) => entry.node);
    const children = contextOnly
      ? [contextReading]
      : [h('span', { key: 'figures', className: 'smooth-usage-figures' }, orderedNodes)];
    const line = h(React.Fragment, null,
      h('button', {
        ref: triggerRef, type: 'button',
        className: contextOnly ? 'smooth-usage-context'
          : variant === 'bottom' ? 'smooth-usage-line smooth-usage-line--bottom'
            : 'smooth-usage-line',
        title: contextOnly || showContext
          ? contextFill(text('composer.context.aria', '上下文已用 %s'), reading)
          : text('composer.stats.aria', '本次对话用量'),
        'aria-label': orderedLabels.join('，'),
        'aria-haspopup': context ? 'dialog' : undefined,
        'aria-expanded': context ? open : undefined,
        onClick: context ? () => setOpen((value) => !value) : undefined,
      }, children),
      panel);
    return line;
  }
  function UsageBottomLeftSeat(props) {
    const skin = useSmoothState();
    const placement = skin.state.usagePlacement || 'row';
    const align = skin.state.usageAlign || 'left';
    return placement === 'bottom' && align === 'left'
      ? h(UsageLine, { ...props, variant: 'bottom' }) : null;
  }
  function UsageBottomCenter(props) {
    const skin = useSmoothState();
    const [rect, setRect] = React.useState(null);
    const menuButton = useTarget('[data-slot="conversation.input.model"] button[aria-haspopup="menu"]');
    const fallbackButton = useTarget('[data-slot="conversation.input.model"] button');
    const modelButton = menuButton || fallbackButton;
    const layoutEffect = React.useLayoutEffect || React.useEffect;
    layoutEffect(() => {
      if (!skin.state.enabled || !modelButton || typeof window === 'undefined') {
        setRect(null);
        return undefined;
      }
      const modelSeat = modelButton.closest?.('[data-slot="conversation.input.model"]');
      const row = modelSeat?.parentElement?.parentElement?.parentElement;
      const toolsOf = () => row?.children?.[0];
      let frame = 0;
      const requestFrame = typeof window.requestAnimationFrame === 'function'
        ? (fn) => window.requestAnimationFrame(fn)
        : (fn) => window.setTimeout(fn, 0);
      const cancelFrame = typeof window.cancelAnimationFrame === 'function'
        ? (id) => window.cancelAnimationFrame(id)
        : (id) => window.clearTimeout(id);
      const measure = () => {
        const tools = toolsOf();
        const modelRect = modelButton.getBoundingClientRect();
        const rowRect = row?.getBoundingClientRect?.();
        const toolsRect = tools?.getBoundingClientRect?.();
        // The centre is the blank area to the right of the permission control, not the
        // whole left tool group: plan / review controls can sit after it, and starting
        // from their edge would push the capsule too far right. The permission trigger
        // lives in its own slot, whose anchor is display:contents, so measure the real
        // button inside it; fall back to the left group before that button exists.
        const permissionSlot = row?.querySelector?.('[data-slot="conversation.input.permission"]');
        const permissionControls = permissionSlot
          ? [
            ...(permissionSlot.matches?.('button, [role="button"]') ? [permissionSlot] : []),
            ...Array.from(permissionSlot.querySelectorAll('button, [role="button"]')),
          ]
          : [];
        const visiblePermission = permissionControls.filter((element) => {
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          return !rowRect || (rect.top < rowRect.bottom && rect.bottom > rowRect.top);
        });
        const permissionEdge = visiblePermission.length
          ? Math.max(...visiblePermission.map((element) => element.getBoundingClientRect().right))
          : permissionSlot?.getBoundingClientRect?.().right;
        const leftEdge = permissionEdge || toolsRect?.right;
        if (!modelRect.width || !leftEdge || modelRect.left <= leftEdge) {
          setRect(null);
          return;
        }
        const gap = 8;
        setRect({
          left: leftEdge + gap,
          top: modelRect.top,
          width: Math.max(0, modelRect.left - leftEdge - gap * 2),
          height: modelRect.height,
        });
      };
      const schedule = () => {
        if (frame) return;
        frame = requestFrame(() => { frame = 0; measure(); });
      };
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
      const observeTargets = () => {
        if (!observer) return;
        observer.disconnect();
        const tools = toolsOf();
        const targets = [row, tools, modelButton];
        if (row) {
          targets.push(...row.querySelectorAll('button, [role="button"]'));
        } else if (tools) {
          targets.push(...tools.querySelectorAll('button, [role="button"]'));
        }
        if (tools) targets.push(...Array.from(tools.children).filter((element) => element.offsetWidth > 0));
        for (const element of targets) if (element) observer.observe(element);
      };
      measure();
      observeTargets();
      // childList catches a newly inserted button; the ResizeObserver above follows the
      // width of the button and the space it takes from the centre gap.
      const mutations = typeof MutationObserver === 'function'
        ? new MutationObserver(() => { observeTargets(); schedule(); })
        : null;
      mutations?.observe(row || modelButton, { childList: true, subtree: true });
      window.addEventListener('resize', schedule);
      window.addEventListener('scroll', schedule, true);
      return () => {
        if (frame) cancelFrame(frame);
        observer?.disconnect();
        mutations?.disconnect();
        window.removeEventListener('resize', schedule);
        window.removeEventListener('scroll', schedule, true);
      };
    }, [modelButton, skin.state.enabled]);
    if (skin.state.usagePlacement !== 'bottom' || (skin.state.usageAlign || 'left') !== 'center'
      || !rect || typeof document === 'undefined') return null;
    return createPortal(h('div', {
      className: 'smooth-usage-bottom-fixed',
      style: {
        left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
      },
    }, h(UsageLine, { ...props, variant: 'bottom' })), document.body);
  }
  function UsageSeat(props) {
    const skin = useSmoothState();
    const placement = skin.state.usagePlacement || 'row';
    const align = skin.state.usageAlign || 'left';
    if (placement === 'context') return h(UsageLine, { ...props, variant: 'context' });
    if (placement === 'bottom' && align === 'right') return h(UsageLine, { ...props, variant: 'bottom' });
    if (placement === 'bottom' && align === 'center') return h(UsageBottomCenter, props);
    return null;
  }
  // The host's dock row is the default home; the bottom-left seat uses the host's left
  // footer slot. The context reading and the bottom-right variant use the right slot.
  disposers.push(slots.inject('conversation.composer.dock', () => slots.register({
    name: 'conversation.composer.dock', id: `${PLUGIN_ID}.usage`, order: 10,
  }, UsageLine)));
  disposers.push(slots.inject('conversation.input.right', () => slots.register({
    name: 'conversation.input.right', id: `${PLUGIN_ID}.usage.context`, order: 1000,
  }, UsageSeat)));
  disposers.push(slots.inject('conversation.input.left', () => slots.register({
    name: 'conversation.input.left', id: `${PLUGIN_ID}.usage.bottom`, order: 10,
  }, UsageBottomLeftSeat)));
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
  // The new-session workspace menu. The Host owns the chip, the open state and the
  // switch; this wrapper swaps in the filtered list only while the skin is on, so
  // turning the skin off hands the slot straight back to the native picker.
  disposers.push(decorate('conversation.hero.workspace', (Native) => function SmoothWorkspacePicker(props) {
    const skin = useSmoothState();
    return skin.state.enabled ? h(WorkspacePicker, props) : h(Native, props);
  }));
  return () => { for (const dispose of disposers.reverse()) dispose?.(); };
}
