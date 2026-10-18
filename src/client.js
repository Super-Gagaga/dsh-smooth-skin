/**
 * Client half of the Smooth bundle. It owns the whole rendering surface:
 * browser-local persisted state, the theme-token overrides,
 * the scoped stylesheet and one Settings page.
 */

const React = require('react');
const h = React.createElement;
const inject = ['slots', 'theme', 'locale', 'layout', 'uiWorkspace', 'modelDirectories', 'remote', 'remote.workspaceFiles'];
const LOCALE_NS = 'smooth';

const CSS = `/* injected through the package stylesheet; kept beside the skin rules */
.smooth-settings{max-width:820px;margin:0 auto;padding:8px 0 28px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6}
.smooth-settings h2{font-size:26px;font-weight:600;margin:0 0 8px;letter-spacing:-.4px}
.smooth-settings h3{font-size:15px;font-weight:600;margin:0}
.smooth-settings p.smooth-description{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px}
.smooth-settings section{border-top:1px solid var(--dsw-alias-border-l1);padding:24px 0}
.smooth-settings section:first-of-type{border-top:0;padding-top:22px}
.smooth-row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px 0}
.smooth-row--appearance{align-items:stretch;flex-direction:column;gap:16px;border-top:1px solid var(--dsw-alias-border-l1);margin-top:12px;padding-top:24px}
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
.smooth-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;flex:none}
.smooth-choice{font:inherit;font-size:14px;padding:22px 10px;min-height:88px;border-radius:20px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background-color .16s ease,border-color .16s ease}
.smooth-choice:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.smooth-choice[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16));border-color:var(--dsw-alias-label-secondary);color:var(--dsw-alias-label-primary);font-weight:600}
.smooth-choice:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.smooth-choice:disabled{opacity:.5;cursor:default}
.smooth-footer{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.smooth-size{display:flex;align-items:center;gap:10px;flex:none}
.smooth-size label{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.smooth-size input{font:inherit;font-size:13px;width:74px;padding:6px 9px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;text-align:right}
.smooth-size input:focus-visible{outline:2px solid var(--dsw-alias-border-l3);outline-offset:2px}
.smooth-size input:disabled{opacity:.5}
.smooth-size-times{color:var(--dsw-alias-label-secondary);font-size:12.5px}
.smooth-button{font:inherit;font-size:13px;padding:8px 16px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;cursor:pointer}
.smooth-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.smooth-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.smooth-button:disabled{opacity:.5;cursor:default}
.smooth-status{font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.smooth-status[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
@media(max-width:600px){.smooth-choices{gap:8px}.smooth-choice{min-height:72px;font-size:12px;padding:16px 6px}.smooth-row{gap:14px}.smooth-row--size{flex-direction:column;align-items:flex-start;gap:12px}.smooth-size input{width:64px}}
@media(prefers-reduced-motion:reduce){.smooth-switch,.smooth-switch::after,.smooth-choice{transition:none}}
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

  function sameWindowSize(a, b) {
    return a?.enabled === b?.enabled && a?.width === b?.width && a?.height === b?.height;
  }

  function writeState(next) {
    const previousSize = state.windowSize;
    state = normalize(next);
    failure = '';
    emit();
    sync();
    // Only a window-size edit moves the window. At launch the injected opening has
    // already sized it while the window was still hidden; repeating that on a theme or
    // animation toggle used to call resizeTo on every switch (outerWidth carries the
    // window frame, so it rarely equals the configured width) and nudged the window.
    if (!sameWindowSize(previousSize, state.windowSize)) applyWindowSize();
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      failure = String(error && error.message ? error.message : error);
      emit();
    }
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
    const current = theme.getTheme().preference;
    if (!appliedPreference || current !== appliedPreference) previousPreference = current;
    appliedPreference = state.theme;
    theme.setTheme(state.theme);
  }

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
    if (window.outerWidth === width && window.outerHeight === height) return;
    try { window.resizeTo(width, height); } catch (error) { failure = String(error && error.message ? error.message : error); }
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

  function sync() {
    if (disposed) return;
    document.body.toggleAttribute(SKIN_ATTRIBUTE, !!state.enabled);
    // The welcome block's flag is published by the chrome component while it is mounted,
    // so a skin that is switched off has to take it down itself.
    if (!state.enabled) document.body.removeAttribute(NO_TABS_ATTRIBUTE);
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

  function ChoiceRow(props) {
    return h('div', { className: 'smooth-row smooth-row--appearance' },
      h('div', { className: 'smooth-row-copy' },
        h('h3', null, props.title),
        props.hint ? h('small', null, props.hint) : null),
      h('div', { className: 'smooth-choices' }, props.options.map((option) => h('button', {
        key: option.value,
        type: 'button',
        className: 'smooth-choice',
        'aria-pressed': props.value === option.value,
        disabled: props.disabled,
        onClick: () => props.onChange(option.value),
      }, option.label))));
  }

  /** Two numbers and a switch: the size the desktop window is put into at launch. */
  function SizeRow(props) {
    const value = props.value;
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
    return h('div', { className: 'smooth-row smooth-row--size' },
      h('div', { className: 'smooth-row-copy' },
        h('h3', null, props.title),
        props.hint ? h('small', null, props.hint) : null),
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
    const [playing, setPlaying] = React.useState(false);
    const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const modeOptions = [
      { value: 'auto', label: text('settings.theme.auto', 'Follow host') },
      { value: 'dark', label: text('settings.theme.dark', 'Dark') },
      { value: 'light', label: text('settings.theme.light', 'Light') },
    ];
    return h('div', { className: 'smooth-settings' },
      h('header', null,
        h('h2', null, text('settings.title', 'Smooth')),
        h('p', { className: 'smooth-description' }, text('settings.subtitle', 'Dark palette, radii and list-card texture for the whole Harness UI.'))),
      h('section', null,
        h(ToggleRow, {
          title: text('settings.enable', 'Enable the Smooth skin'),
          hint: text('settings.enableHint', 'Turning this off restores the stock appearance.'),
          checked: current.enabled,
          disabled,
          onChange: (value) => view.update({ ...current, enabled: value }),
        }),
        h(ChoiceRow, {
          title: text('settings.theme', 'Appearance'),
          hint: text('settings.themeHint', 'A fixed mode also syncs the host theme preference.'),
          value: current.theme,
          disabled: disabled || !current.enabled,
          options: modeOptions,
          onChange: (value) => view.update({ ...current, theme: value }),
        }),
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
        // The preview layer portals itself to the body; keeping it inside the section
        // leaves the section order (and the reset row) where the layout expects it.
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
          h('button', {
            type: 'button',
            className: 'smooth-button',
            disabled,
            onClick: () => view.update({ enabled: true, theme: 'auto', boot: true, windowSize: { enabled: true, ...DEFAULT_WINDOW_SIZE } }),
          }, text('settings.reset', 'Reset to defaults')),
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
    document.body.removeAttribute(SKIN_ATTRIBUTE);
    // The welcome block's flag is published while the chrome is mounted; a disabled
    // skin must not leave it behind (it is gated on the skin attribute anyway, but the
    // host body should come back exactly as it was).
    document.body.removeAttribute(NO_TABS_ATTRIBUTE);
  }, 'smooth-skin');

  referenceShell = installReferenceShell({ slots, layout, uiWorkspace, modelDirectories, theme, remote, useSmoothState, text,
    subscribeTheme: (listener) => ctx.on('theme/change', listener),
    chooseTheme: (preference) => { writeState({ ...state, theme: 'auto' }); theme?.setTheme(preference); },
  });
  readState();
}

// The module loader activates the returned exports object, not local declarations.
exports.name = PLUGIN_ID;
exports.inject = inject;
exports.apply = apply;

