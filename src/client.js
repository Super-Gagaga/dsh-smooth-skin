/**
 * Client half of the Smooth bundle. It owns the whole rendering surface:
 * browser-local persisted state, the theme-token overrides,
 * the scoped stylesheet and one Settings page.
 */

const React = require('react');
const h = React.createElement;
const inject = ['slots', 'theme', 'locale', 'layout', 'uiWorkspace', 'sessions', 'modelDirectories', 'remote', 'remote.session', 'remote.workspaceFiles'];
const LOCALE_NS = 'smooth';

const CSS = `/* injected through the package stylesheet; kept beside the skin rules */
.smooth-settings{width:100%;max-width:820px;margin:0 auto;padding:8px 0 32px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6;box-sizing:border-box}
.smooth-settings h2{font-size:26px;font-weight:600;margin:0;letter-spacing:-.4px}
.smooth-settings h3{font-size:15px;font-weight:600;margin:0}
.smooth-page-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.smooth-badge{display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:500;letter-spacing:.02em}
.smooth-badge::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-label-tertiary,rgba(128,128,128,.6))}
.smooth-badge[data-on="true"]::before{background:var(--dsw-alias-state-success-primary,#4ea36b);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-success-primary,#4ea36b) 24%,transparent)}
.smooth-settings p.smooth-description{margin:8px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px;max-width:660px}
.smooth-settings section{border-top:1px solid var(--dsw-alias-border-l1);margin-top:20px;padding:20px 0 4px}
.smooth-settings section:first-of-type{border-top:0;margin-top:0;padding-top:16px}
.smooth-group-title{margin:0;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.smooth-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0}
.smooth-row + .smooth-row{border-top:1px solid var(--dsw-alias-border-l1)}
.smooth-row--appearance{align-items:stretch;flex-direction:column;gap:14px}
.smooth-row-copy{min-width:0;flex:1}
.smooth-row-action{display:flex;align-items:center;flex:none}
.smooth-button--compact{font-size:12.5px;padding:6px 13px;border-radius:999px;white-space:nowrap}
.smooth-row-copy small{display:block;margin-top:4px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6}
.smooth-switch{appearance:none;flex:none;width:44px;height:26px;margin:2px 0 0;border-radius:999px;border:1px solid var(--dsw-alias-border-l3);background:var(--smooth-surface-3,rgba(128,128,128,.25));position:relative;cursor:pointer;transition:background-color .18s ease}
.smooth-switch::after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:var(--dsw-alias-switch-thumb,#fff);transition:transform .18s ease}
.smooth-switch:checked{background:var(--dsw-alias-button-primary-fill,#f7f7f8);border-color:transparent}
.smooth-switch:checked::after{transform:translateX(18px);background:var(--dsw-alias-label-primary-foreground,#181a1e)}
.smooth-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.smooth-switch:disabled{opacity:.5;cursor:default}
.smooth-themes{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;width:100%;flex:none}
.smooth-theme{display:flex;flex-direction:column;align-items:center;gap:9px;padding:12px 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--smooth-radius-md,11px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;line-height:18px;cursor:pointer;transition:background-color .16s ease,border-color .16s ease,color .16s ease}
.smooth-theme:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.smooth-theme[aria-checked="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16));border-color:var(--dsw-alias-label-secondary);color:var(--dsw-alias-label-primary);font-weight:600}
.smooth-theme:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.smooth-theme:disabled{opacity:.5;cursor:default}
.smooth-theme-swatch{display:flex;align-items:center;gap:4px}
.smooth-theme-swatch i{display:block;width:12px;height:12px;border-radius:50%;border:1px solid rgba(128,128,128,.28)}
.smooth-marks{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;width:100%;flex:none}
.smooth-mark{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 4px;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--smooth-radius-md,11px);background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;cursor:pointer;font-family:inherit}
.smooth-mark:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.smooth-mark[aria-checked="true"]{border-color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16));color:var(--dsw-alias-label-primary);font-weight:600}
.smooth-mark:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.smooth-mark:disabled{opacity:.5;cursor:default}
.smooth-mark i{display:block;width:14px;height:14px;border-radius:50%;border:1px solid rgba(128,128,128,.28)}
.smooth-footer{display:flex;align-items:center;justify-content:space-between;gap:10px 20px;flex-wrap:wrap}
.smooth-footer-copy{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.smooth-note{font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.smooth-size{display:flex;align-items:center;gap:10px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.smooth-size label{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.smooth-size input{font:inherit;font-size:13px;width:72px;padding:6px 9px;border-radius:var(--smooth-radius-md,11px);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;text-align:right}
.smooth-size input:focus-visible{outline:2px solid var(--dsw-alias-border-l3);outline-offset:2px}
.smooth-size input:disabled{opacity:.5}
.smooth-size-times{color:var(--dsw-alias-label-secondary);font-size:12.5px}
.smooth-size-meta{display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;margin-top:7px;font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.smooth-range{display:flex;align-items:center;gap:12px;flex:none;width:min(280px,46vw)}
.smooth-range input[type="range"]{flex:1;min-width:0;height:20px;margin:0;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer;accent-color:var(--dsw-alias-brand-primary,#3f6fd8)}
.smooth-range input[type="range"]::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}
.smooth-range input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;box-sizing:border-box;width:16px;height:16px;margin-top:-6px;border:0;border-radius:50%;background:var(--dsw-alias-brand-primary,#3f6fd8);box-shadow:0 1px 2px rgba(0,0,0,.18)}
.smooth-range input[type="range"]::-moz-range-track{height:4px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}
.smooth-range input[type="range"]::-moz-range-thumb{box-sizing:border-box;width:16px;height:16px;border:0;border-radius:50%;background:var(--dsw-alias-brand-primary,#3f6fd8)}
.smooth-range input[type="range"]:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:4px;border-radius:999px}
.smooth-range input[type="range"]:disabled{opacity:.5;cursor:default}
.smooth-range-value{flex:none;min-width:42px;text-align:right;font-size:12.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.smooth-link{font:inherit;font-size:12px;padding:0;border:0;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;text-decoration:underline;text-underline-offset:2px;text-decoration-color:color-mix(in srgb,currentColor 35%,transparent)}
.smooth-link:hover:not(:disabled){color:var(--dsw-alias-label-primary)}
.smooth-link:disabled{opacity:.45;cursor:default;text-decoration:none}
.smooth-link:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px;border-radius:var(--smooth-radius-xs,4px)}
.smooth-button{font:inherit;font-size:13px;padding:8px 16px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;cursor:pointer}
.smooth-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.smooth-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.smooth-button:disabled{opacity:.5;cursor:default}
.smooth-status{font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.smooth-status[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
@media(max-width:600px){.smooth-themes{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.smooth-theme{padding:10px 4px;font-size:12px}.smooth-row{gap:14px}.smooth-row--size{flex-direction:column;align-items:stretch;gap:12px}.smooth-size{justify-content:flex-start}.smooth-size input{width:64px}.smooth-range{width:100%}}
@media(prefers-reduced-motion:reduce){.smooth-switch,.smooth-switch::after,.smooth-theme{transition:none}}
`;

function apply(ctx) {
  let state = normalize();
  let ready = false;
  let disposed = false;
  let failure = '';
  let tokenSignature = '';
  let tokensDispose;
  let styleDispose;
  let settingsDispose;
  let referenceShell;
  const scrollbarMotion = installScrollbarMotion();
  let previousPreference;
  let appliedPreference;

  // Services come from `inject`, but a plugin that throws during activation blanks
  // its own slot entry, so every use below is guarded rather than assumed.
  const theme = ctx.theme && typeof ctx.theme.setTheme === 'function' ? ctx.theme : undefined;
  const slots = ctx.slots && typeof ctx.slots.inject === 'function' ? ctx.slots : undefined;
  const locale = ctx.locale && typeof ctx.locale.register === 'function' ? ctx.locale : undefined;
  const layout = ctx.layout;
  const uiWorkspace = ctx.uiWorkspace;
  // The session catalog face: the archived-row delete dialog refreshes it after the
  // Host half removes the stored log, so the row disappears without a page reload.
  const sessions = ctx.sessions;
  const modelDirectories = ctx.modelDirectories;
  const remote = ctx.remote;

  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); };

  /**
   * The durable store is this browser profile's localStorage. Nothing here reaches
   * for a host service, so no missing service name can fail activation.
   */
  function readState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) state = normalize(JSON.parse(raw));
    } catch (error) {
      failure = String(error && error.message ? error.message : error);
    }
    ready = true;
    emit();
    sync();
  }

  /** Only the numbers move the visible window. The switch is a launch-time preference:
   * it decides whether the opening applies the size at all, so flipping it must never
   * touch the window the user is looking at. */
  function sameWindowDimensions(a, b) {
    return a?.width === b?.width && a?.height === b?.height;
  }

  /** Replace the palette under a View Transition snapshot: the old colours stay on screen
   * while a circle cut out of the new ones grows out of the caption's top-left corner.
   * The token write (and the host tone change beside it) is synchronous inside the
   * callback; one frame is spent on React painting the selected swatch before the new
   * snapshot is taken, and a timeout keeps that wait from starving in a hidden window. */
  let themeSwitchSeq = 0;
  function startThemeTransition(commit) {
    const reduced = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition !== 'function' || reduced || disposed) { commit(); return; }
    const root = document.documentElement;
    const seq = ++themeSwitchSeq;
    const clear = () => { if (seq === themeSwitchSeq) root.removeAttribute(THEME_SWITCH_ATTRIBUTE); };
    root.setAttribute(THEME_SWITCH_ATTRIBUTE, '');
    let transition;
    try {
      transition = document.startViewTransition(async () => {
        // A newer click (or a rebuilt transition) owns the palette now; this captured
        // snapshot must not write its superseded preset over the newer one.
        if (seq !== themeSwitchSeq) return;
        commit();
        await new Promise((resolve) => {
          let settled = false;
          const done = () => { if (settled) return; settled = true; resolve(); };
          if (typeof window.requestAnimationFrame !== 'function') { done(); return; }
          window.requestAnimationFrame(done);
          window.setTimeout(done, 60);
        });
      });
    } catch (error) {
      clear();
      commit();
      return;
    }
    transition.finished.then(clear, clear);
  }

  function writeState(next) {
    const previous = state;
    const previousSize = previous.windowSize;
    const committed = normalize(next);
    /** Land one write on the current state. The animated path merges only its preset, so a
     * setting changed while the snapshot is being taken is not rolled back by the theme
     * click that started the transition. */
    const commit = (apply) => {
      state = apply();
      failure = '';
      emit();
      sync();
      // Only an edited width or height moves the window. At launch the injected opening has
      // already sized it while the window was still hidden; repeating that on a theme or
      // animation toggle used to call resizeTo on every switch (outerWidth carries the
      // window frame, so it rarely equals the configured width) and nudged the window.
      if (!sameWindowDimensions(previousSize, state.windowSize)) applyWindowSize();
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        failure = String(error && error.message ? error.message : error);
        emit();
      }
    };
    // Only a switch that actually repaints the palette animates. The host renders the
    // slice of each token pair that matches its tone, so "following the theme" and pinning
    // the preset it already resolves to paint the same page: no circle opens over an
    // identical screen. Every non-theme setting writes directly too.
    let repainted = false;
    if (committed.theme !== previous.theme && previous.enabled && committed.enabled) {
      const scheme = theme?.getTheme?.()?.active?.colorScheme;
      const currentTone = scheme === 'dark' ? 'dark' : 'light';
      const nextTone = themeTone(committed.theme) || currentTone;
      const currentTokens = buildTokens(previous);
      const nextTokens = buildTokens(committed);
      repainted = Object.keys(nextTokens).some((name) => nextTokens[name][nextTone] !== currentTokens[name][currentTone]);
    }
    if (repainted) startThemeTransition(() => commit(() => normalize({ ...state, theme: committed.theme })));
    else commit(() => committed);
    return Promise.resolve();
  }

  function restoreTheme() {
    if (!appliedPreference || !theme) return;
    if (theme.getTheme().preference === appliedPreference) theme.setTheme(previousPreference || 'system');
    previousPreference = appliedPreference = undefined;
  }

  function syncHostTheme() {
    if (!theme) return;
    if (!state.enabled || state.theme === 'auto') { restoreTheme(); return; }
    // A fixed preset paints its own palette; ask the host for the tone that palette reads
    // as so native surfaces outside the skin's own tokens agree with it. Following the
    // theme leaves the host preference exactly as the user set it.
    const tone = themeTone(state.theme);
    if (!tone) { restoreTheme(); return; }
    const current = theme.getTheme().preference;
    if (!appliedPreference || current !== appliedPreference) previousPreference = current;
    appliedPreference = tone;
    theme.setTheme(tone);
  }

  /** Electron's frame adds a pixel around the requested outer size (a 1440 x 900 request
   * reports as 1441 x 901 once the frame is applied), so an exact comparison reads the
   * window as "wrong" on every write and requests the same size again. Two pixels of slack
   * absorb the frame on either axis. */
  const WINDOW_FRAME_SLACK = 2;

  /**
   * Put the desktop window into the configured size while the application loads.
   *
   * The desktop app creates its main window at 1280 x 820 with a 520 x 600 minimum and
   * never persists bounds, and neither the renderer bridge (`dshDesktop`) nor the host
   * process protocol carries a window size — but Electron does honour the renderer's own
   * `window.resizeTo`, including on a window created hidden. That is exactly the window
   * the app shows only after `loadURL` resolves, so the size is in place before the first
   * visible frame and the user never sees the default. In a browser tab the call is a
   * no-op, which is why this needs no platform check.
   *
   * Anything beyond the screen's work area is clamped: a window larger than the display
   * would put its own controls out of reach, and there is no way to move it back from the
   * renderer.
   */
  function applyWindowSize() {
    const wanted = state.windowSize;
    if (!state.enabled || !wanted?.enabled) return;
    if (typeof window.resizeTo !== 'function') return;
    // Frames keep the size their parent gave them; only the app's own window is ours.
    try { if (window.top !== window.self) return; } catch (error) { return; }
    const screen_ = window.screen || {};
    const limitWidth = Number(screen_.availWidth) || WINDOW_SIZE.maxWidth;
    const limitHeight = Number(screen_.availHeight) || WINDOW_SIZE.maxHeight;
    const width = Math.max(WINDOW_SIZE.minWidth, Math.min(wanted.width, limitWidth));
    const height = Math.max(WINDOW_SIZE.minHeight, Math.min(wanted.height, limitHeight));
    if (Math.abs(window.outerWidth - width) <= WINDOW_FRAME_SLACK
      && Math.abs(window.outerHeight - height) <= WINDOW_FRAME_SLACK) return;
    // Every resize re-applies the window frame, and Windows re-anchors the window by that
    // delta: clicking the same size control over and over walked the window across the
    // screen. Pin the origin across the call instead — this setting may change the size,
    // never where the window sits.
    const left = Number(window.screenX);
    const top = Number(window.screenY);
    try {
      window.resizeTo(width, height);
    } catch (error) {
      failure = String(error && error.message ? error.message : error);
      return;
    }
    keepWindowOrigin(left, top, width, height, screen_);
  }

  /** Put the window back on the origin it had before a resize, kept inside the work area so
   * a bigger size cannot leave the restored window partly off-screen. */
  function keepWindowOrigin(left, top, width, height, screen_) {
    if (!Number.isFinite(left) || !Number.isFinite(top)) return;
    if (typeof window.moveTo !== 'function') return;
    const areaLeft = Number(screen_.availLeft) || 0;
    const areaTop = Number(screen_.availTop) || 0;
    const areaWidth = Number(screen_.availWidth) || 0;
    const areaHeight = Number(screen_.availHeight) || 0;
    const maxLeft = areaWidth ? Math.max(areaLeft, areaLeft + areaWidth - width) : left;
    const maxTop = areaHeight ? Math.max(areaTop, areaTop + areaHeight - height) : top;
    const nextLeft = areaWidth ? Math.min(Math.max(left, areaLeft), maxLeft) : left;
    const nextTop = areaHeight ? Math.min(Math.max(top, areaTop), maxTop) : top;
    try { window.moveTo(Math.round(nextLeft), Math.round(nextTop)); } catch (error) { /* the size still applied */ }
  }

  function attachStyle() {
    if (styleDispose) return;
    const style = document.createElement('style');
    // An untagged <style> is claimed by whichever plugin materializes next and is
    // then deleted when that plugin is hot-replaced, which would take the skin with
    // it; the module tags its own sheet so another rebuild cannot adopt it.
    style.dataset.plugin = PLUGIN_ID;
    style.dataset.pluginCss = `${PLUGIN_ID}/client.css`;
    style.dataset.smoothSkin = 'true';
    style.textContent = SKIN_CSS + CSS;
    document.head.append(style);
    styleDispose = () => { style.remove(); styleDispose = undefined; };
  }

  /** The translucency is one CSS variable on the body: the stylesheet derives every
   * translucent surface colour from it, so changing the slider is a single paint and
   * reaches no host service. 100% keeps every page surface solid. */
  function syncGlass() {
    const style = document.body && document.body.style;
    if (!style || typeof style.setProperty !== 'function') return;
    if (!state.enabled) {
      style.removeProperty('--smooth-glass');
      style.removeProperty('--smooth-glass-soft');
      style.removeProperty('--smooth-glass-overlay');
      style.removeProperty('--smooth-glass-mild');
      return;
    }
    style.setProperty('--smooth-glass', `${100 - state.translucency}%`);
    // The icon rail sits on the sidebar and the tab strip sits on the caption strip, so
    // the page weight would stack there and leave a nearly solid band. These two grounds
    // drop faster (the page weight to the fourth): at 30% they read about as see-through
    // as the conversation, while 0% still leaves the old solid rail and strip.
    const soft = Math.round(((100 - state.translucency) / 100) ** 4 * 100);
    style.setProperty('--smooth-glass-soft', `${soft}%`);
    // Overlays (settings, menus) keep almost all of their fill: a page-weight panel over
    // the conversation shows the text behind it, which is what made them hard to read.
    // They still slide with the setting, but eight times slower and never below 85%.
    style.setProperty('--smooth-glass-overlay', `${Math.max(85, 100 - Math.round(state.translucency / 8))}%`);
    // Component fills move a third as fast as the page: at 30% they are 90% opaque, at
    // 100% 67%. 1/2 read as too much of a change next to the page's own glass; 1/5 was
    // invisible. This sits between the two.
    style.setProperty('--smooth-glass-mild', `${100 - Math.round(state.translucency / 3)}%`);
  }


  function sync() {
    if (disposed) return;
    document.body.toggleAttribute(SKIN_ATTRIBUTE, !!state.enabled);
    syncGlass();
    // The welcome block's flag is published by the chrome component while it is mounted,
    // so a skin that is switched off has to take it down itself.
    if (!state.enabled) document.body.removeAttribute(HOME_ATTRIBUTE);
    scrollbarMotion.setEnabled(!!state.enabled);
    referenceShell?.setEnabled?.(!!state.enabled);
    syncHostTheme();
    attachStyle();
    if (!state.enabled) {
      tokensDispose?.();
      tokensDispose = undefined;
      tokenSignature = '';
      return;
    }
    if (!theme || typeof theme.overrideTokens !== 'function') return;
    const tokens = buildTokens(state);
    const signature = JSON.stringify(tokens);
    if (signature === tokenSignature) return;
    if (tokensDispose) tokensDispose();
    tokensDispose = theme.overrideTokens(PLUGIN_ID, tokens);
    tokenSignature = signature;
  }

  function text(key, fallback) {
    if (!locale || typeof locale.translate !== 'function') return fallback;
    return locale.translate(LOCALE_NS, key) ?? fallback;
  }

  if (locale) ctx.effect(() => locale.register(LOCALE_NS, { zh: zhCN, en: enUS }), 'smooth-skin: locale');

  function useSmoothState() {
    const [, tick] = React.useReducer((value) => value + 1, 0);
    React.useEffect(() => { listeners.add(tick); return () => { listeners.delete(tick); }; }, []);
    return { state, ready, failure, update: writeState };
  }

  /** The opening's stylesheet arrives with the index. A page that never received it
   * (older index, plugin installed later) still previews with the same rules. */
  let splashStyle;
  function ensureSplashStyle() {
    let injected = false;
    for (const sheet of document.styleSheets || []) {
      const text = sheet && sheet.ownerNode && sheet.ownerNode.textContent;
      if (text && text.includes(SPLASH_ID)) { injected = true; break; }
    }
    if (injected || splashStyle) return;
    splashStyle = document.createElement('style');
    splashStyle.dataset.plugin = PLUGIN_ID;
    splashStyle.dataset.smoothSplash = 'true';
    splashStyle.textContent = SPLASH_CSS;
    document.head.append(splashStyle);
  }

  /** Replay the index opening over the settings page: the same markup, the same
   * stylesheet and the same timings, so the preview cannot drift from the real one. */
  function SplashPreview(props) {
    const [leaving, setLeaving] = React.useState(false);
    React.useEffect(() => {
      const timers = [
        window.setTimeout(() => setLeaving(true), SPLASH_HOLD_MS),
        window.setTimeout(props.onDone, SPLASH_HOLD_MS + SPLASH_SETTLE_MS),
      ];
      return () => { for (const id of timers) window.clearTimeout(id); };
    }, []);
    const { createPortal } = require('react-dom');
    return createPortal(h('div', {
      id: SPLASH_ID,
      'aria-hidden': 'true',
      'data-smooth-splash-live': '',
      'data-smooth-splash-out': leaving ? '' : undefined,
      dangerouslySetInnerHTML: { __html: splashInnerHtml() },
    }), document.body);
  }

  function ToggleRow(props) {
    return h('div', { className: 'smooth-row' },
      h('div', { className: 'smooth-row-copy' },
        h('h3', null, props.title),
        props.hint ? h('small', null, props.hint) : null),
      props.action ? h('div', { className: 'smooth-row-action' }, props.action) : null,
      h('input', {
        className: 'smooth-switch',
        type: 'checkbox',
        role: 'switch',
        'aria-label': props.title,
        checked: props.checked,
        disabled: props.disabled,
        onChange: (event) => props.onChange(event.target.checked),
      }));
  }

  /** One palette chip: three dots for a preset, the two host tones for following it. */
  function ThemeSwatch(props) {
    if (props.id === 'auto') {
      return h('span', { className: 'smooth-theme-swatch', 'aria-hidden': true },
        h('i', { style: { background: PALETTE.snow.app } }),
        h('i', { style: { background: PALETTE.iron.app } }));
    }
    const palette = PALETTE[props.id];
    return h('span', { className: 'smooth-theme-swatch', 'aria-hidden': true },
      h('i', { style: { background: palette.app } }),
      h('i', { style: { background: palette.layer1 } }),
      h('i', { style: { background: palette.brand } }));
  }

  function ThemeRow(props) {
    return h('div', { className: 'smooth-row smooth-row--appearance' },
      h('div', { className: 'smooth-row-copy' },
        h('h3', null, props.title),
        props.hint ? h('small', null, props.hint) : null),
      h('div', { className: 'smooth-themes', role: 'radiogroup', 'aria-label': props.title },
        ...props.options.map((option) => h('button', {
          key: option.value,
          type: 'button',
          role: 'radio',
          'aria-checked': props.value === option.value,
          className: 'smooth-theme',
          'data-theme': option.value,
          disabled: props.disabled,
          onClick: () => props.onChange(option.value),
        }, h(ThemeSwatch, { id: option.value }), h('span', null, option.label)))));
  }

  /** One chip per mark colour. The chosen colour is written to the host's link token and
   * to the plugin's mark token, so the conversation's referenced files/key hints and the
   * sidebar's workspace names all follow the same choice. */
  function MarkRow(props) {
    return h('div', { className: 'smooth-row smooth-row--appearance' },
      h('div', { className: 'smooth-row-copy' },
        h('h3', null, props.title),
        props.hint ? h('small', null, props.hint) : null),
      h('div', { className: 'smooth-marks', role: 'radiogroup', 'aria-label': props.title },
        ...props.options.map((option) => h('button', {
          key: option.value,
          type: 'button',
          role: 'radio',
          'aria-checked': props.value === option.value,
          className: 'smooth-mark',
          'data-mark': option.value,
          title: option.label,
          disabled: props.disabled,
          onClick: () => props.onChange(option.value),
        }, h('i', { style: { background: option.color } }), h('span', null, option.label)))));
  }

  /** One percentage slider: the page's glass weight. The number sits beside the track so
   * the setting is readable without hovering the thumb; the stylesheet reads it from the
   * CSS variable the page writes on the body. */
  function RangeRow(props) {
    return h('div', { className: 'smooth-row smooth-row--range' },
      h('div', { className: 'smooth-row-copy' },
        h('h3', null, props.title),
        props.hint ? h('small', null, props.hint) : null),
      h('div', { className: 'smooth-range' },
        h('input', {
          type: 'range',
          min: props.min ?? 0,
          max: props.max ?? 100,
          step: props.step ?? 1,
          value: props.value,
          disabled: props.disabled,
          'aria-label': props.title,
          onChange: (event) => props.onChange(Number(event.target.value)),
        }),
        h('output', { className: 'smooth-range-value', 'aria-hidden': 'true' }, `${props.value}%`)));
  }

  /** The outer size of the window the settings page is drawn in, or an empty string when
   * the platform does not expose it (a browser tab still exposes it, a frame does not). */
  function windowSizeReadout() {
    const width = Number(window.outerWidth);
    const height = Number(window.outerHeight);
    return width && height ? `${width} × ${height}` : '';
  }

  /** Two numbers and a switch: the size the desktop window is put into at launch. The
   * meta line names the window that is on screen right now and offers a one-click reset,
   * so the numbers have a reference instead of floating alone. */
  function SizeRow(props) {
    const value = props.value;
    const [current, setCurrent] = React.useState(windowSizeReadout);
    React.useEffect(() => {
      if (typeof window.addEventListener !== 'function') return undefined;
      const update = () => setCurrent(windowSizeReadout());
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }, []);
    const field = (key, label) => h('label', null,
      h('span', null, label),
      h('input', {
        type: 'number',
        inputMode: 'numeric',
        min: key === 'width' ? WINDOW_SIZE.minWidth : WINDOW_SIZE.minHeight,
        max: key === 'width' ? WINDOW_SIZE.maxWidth : WINDOW_SIZE.maxHeight,
        step: 10,
        value: value[key],
        disabled: props.disabled,
        'aria-label': label,
        // An out-of-range value is repaired by `normalizeSize` before it reaches the
        // window, so a half-typed number simply keeps the current size.
        onChange: (event) => props.onChange({ ...value, [key]: Number(event.target.value) }),
      }));
    const atDefault = value.width === DEFAULT_WINDOW_SIZE.width && value.height === DEFAULT_WINDOW_SIZE.height;
    return h('div', { className: 'smooth-row smooth-row--size' },
      h('div', { className: 'smooth-row-copy' },
        h('h3', null, props.title),
        props.hint ? h('small', null, props.hint) : null,
        h('div', { className: 'smooth-size-meta' },
          current ? h('span', null, `${text('settings.windowSizeCurrent', 'Current window')} ${current}`) : null,
          h('button', {
            type: 'button',
            className: 'smooth-link',
            disabled: props.disabled || atDefault,
            onClick: () => props.onChange({ ...value, width: DEFAULT_WINDOW_SIZE.width, height: DEFAULT_WINDOW_SIZE.height }),
          }, text('settings.windowSizeDefault', 'Reset to 1440 × 900')))),
      h('div', { className: 'smooth-size' },
        field('width', text('settings.windowSizeWidth', 'Width')),
        h('span', { className: 'smooth-size-times' }, '×'),
        field('height', text('settings.windowSizeHeight', 'Height')),
        h('input', {
          className: 'smooth-switch',
          type: 'checkbox',
          role: 'switch',
          'aria-label': props.title,
          checked: value.enabled,
          disabled: props.disabled,
          onChange: (event) => props.onChange({ ...value, enabled: event.target.checked }),
        })));
  }

  function SmoothSettings() {
    const view = useSmoothState();
    const current = view.state;
    const disabled = !view.ready;
    // The patched desktop shell marks the body after each load; the stylesheet keys its
    // window-glass rules on the same attribute, and the copy follows it here.
    const windowGlass = document.body.hasAttribute(WINDOW_GLASS_ATTRIBUTE);
    const [playing, setPlaying] = React.useState(false);
    const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const themeOptions = [
      ['auto', 'Follow theme'],
      ['snow', 'First snow'],
      ['iron', 'Iron black'],
      ['moss', 'Moss green'],
      ['sunset', 'Sunset orange'],
      ['deepsea', 'Deep sea blue'],
    ].map(([value, fallback]) => ({ value, label: text(`settings.theme.${value}`, fallback) }));
    const markOptions = [
      ['blue', 'Blue'],
      ['cyan', 'Cyan'],
      ['violet', 'Violet'],
      ['green', 'Green'],
      ['orange', 'Orange'],
      ['rose', 'Rose'],
    ].map(([value, fallback]) => ({ value, label: text(`settings.mark.${value}`, fallback), color: MARK_CHOICES[value].dark }));
    return h('div', { className: 'smooth-settings' },
      h('header', null,
        h('div', { className: 'smooth-page-title' },
          h('h2', null, text('settings.title', 'Smooth')),
          h('span', {
            className: 'smooth-badge',
            'data-on': current.enabled ? 'true' : 'false',
          }, text(current.enabled ? 'settings.stateOn' : 'settings.stateOff', current.enabled ? 'Enabled' : 'Disabled'))),
        h('p', { className: 'smooth-description' }, text('settings.subtitle', 'One skin for the whole Harness: palette, radii, tabs and the composer.'))),
      h('section', null,
        h('h4', { className: 'smooth-group-title' }, text('settings.groupAppearance', 'Appearance')),
        h(ToggleRow, {
          title: text('settings.enable', 'Enable the Smooth skin'),
          hint: text('settings.enableHint', 'Turning this off restores the stock appearance.'),
          checked: current.enabled,
          disabled,
          onChange: (value) => view.update({ ...current, enabled: value }),
        }),
        h(ThemeRow, {
          title: text('settings.theme', 'Theme'),
          hint: text('settings.themeHint', 'Following the theme uses First snow in light and Iron black in dark.'),
          value: current.theme,
          disabled: disabled || !current.enabled,
          options: themeOptions,
          onChange: (value) => view.update({ ...current, theme: value }),
        }),
        h(RangeRow, {
          title: text('settings.translucency', 'Background transparency'),
          hint: windowGlass
            ? text('settings.translucencyHintWindow', '0% keeps the page solid; higher values let the window’s system acrylic — a frosted view of the desktop — show through the background.')
            : text('settings.translucencyHint', '0% keeps the page background solid; higher values let the skin’s own soft gradient show through.'),
          value: current.translucency,
          disabled: disabled || !current.enabled,
          onChange: (value) => view.update({ ...current, translucency: value }),
        }),
        h(MarkRow, {
          title: text('settings.mark', 'Mark colour'),
          hint: text('settings.markHint', 'Referenced files and key hints in the conversation, and the workspace names in the sidebar.'),
          value: current.mark,
          disabled: disabled || !current.enabled,
          options: markOptions,
          onChange: (value) => view.update({ ...current, mark: value }),
        })),
      h('section', null,
        h('h4', { className: 'smooth-group-title' }, text('settings.groupStartup', 'Startup')),
        h(ToggleRow, {
          title: text('settings.boot', 'Launch animation'),
          hint: text('settings.bootHint', 'Plays the brand opening on page load; it applies on the next load.')
            + (reducedMotion ? ` ${text('settings.bootReduced', 'Reduced motion is on, so the opening is skipped at startup.')}` : ''),
          checked: current.boot,
          disabled: disabled || !current.enabled,
          action: h('button', {
            type: 'button',
            className: 'smooth-button smooth-button--compact',
            disabled: disabled || !current.enabled || reducedMotion || playing,
            'aria-label': text('settings.bootPreviewLabel', 'Preview the launch animation'),
            onClick: () => { ensureSplashStyle(); setPlaying(true); },
          }, text(playing ? 'settings.bootPlaying' : 'settings.bootPreview', playing ? 'Playing…' : 'Preview')),
          onChange: (value) => view.update({ ...current, boot: value }),
        }),
        // The preview layer portals itself to the body; keeping it inside the startup
        // section leaves the section order where the layout expects it.
        playing ? h(SplashPreview, { onDone: () => setPlaying(false) }) : null,
        h(SizeRow, {
          title: text('settings.windowSize', 'Window size at launch'),
          hint: text('settings.windowSizeHint', 'Sizes the desktop window while the application loads.'),
          value: current.windowSize,
          disabled: disabled || !current.enabled,
          onChange: (value) => view.update({ ...current, windowSize: value }),
        })),
      h('section', null,
        h('div', { className: 'smooth-footer' },
          h('div', { className: 'smooth-footer-copy' },
            h('button', {
              type: 'button',
              className: 'smooth-button',
              disabled,
              onClick: () => view.update({ enabled: true, theme: 'auto', boot: true, mark: 'blue', translucency: DEFAULTS.translucency, windowSize: { enabled: true, ...DEFAULT_WINDOW_SIZE } }),
            }, text('settings.reset', 'Reset to defaults')),
            h('span', { className: 'smooth-note' }, text('settings.autosave', 'Changes are saved automatically.'))),
          h('span', {
            className: 'smooth-status',
            'data-error': view.failure ? 'true' : 'false',
          }, view.failure || (!view.ready ? text('settings.loading', 'Reading settings…') : '')))));
  }

  if (slots) {
    settingsDispose = slots.inject('settings.section', () => slots.register({
      name: 'settings.section',
      id: PLUGIN_ID,
      order: 72,
      label: text('section.title', 'Smooth'),
    }, SmoothSettings));
  }

  ctx.effect(() => () => {
    disposed = true;
    listeners.clear();
    settingsDispose?.();
    referenceShell?.dispose?.();
    scrollbarMotion.dispose();
    restoreTheme();
    tokensDispose?.();
    styleDispose?.();
    splashStyle?.remove?.();
    splashStyle = undefined;
    // The glass weight is inline state on the body; the host body comes back as it was.
    document.body.style?.removeProperty?.('--smooth-glass');
    document.body.removeAttribute(SKIN_ATTRIBUTE);
    // The welcome block's flag is published while the chrome is mounted; a disabled
    // skin must not leave it behind (it is gated on the skin attribute anyway, but the
    // host body should come back exactly as it was).
    document.body.removeAttribute(HOME_ATTRIBUTE);
    // A palette switch in flight would otherwise leave the circle-reveal gate on the root.
    document.documentElement.removeAttribute(THEME_SWITCH_ATTRIBUTE);
  }, 'smooth-skin');

  referenceShell = installReferenceShell({ slots, layout, uiWorkspace, sessions, modelDirectories, theme, remote, useSmoothState, text });
  readState();
}

// The module loader activates the returned exports object, not local declarations.
exports.name = PLUGIN_ID;
exports.inject = inject;
exports.apply = apply;

