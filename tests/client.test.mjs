import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const built = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

function loadClient({ stored, unavailable = [], screen, outer, origin = [240, 66], framed = false, viewTransition = false, reducedMotion = false } = {}) {
  let registration;
  let settings;
  let dictionaries;
  let preference = 'system';
  let tokenLayers = 0;
  const effects = [];
  const styles = new Set();
  const resizes = [];
  const moves = [];
  let outerWidth = outer ? outer[0] : 1280;
  let outerHeight = outer ? outer[1] : 820;
  let screenX = origin[0];
  let screenY = origin[1];
  const attributes = new Set();
  const timers = new Map();
  // The View Transition API is driven by hand: a test reads the captured attribute state,
  // runs the update callback, then finishes the animation and checks the gate came off.
  const transitions = [];
  const documentElement = {
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); },
    removeAttribute(name) { this.attributes.delete(name); },
    getAttribute(name) { return this.attributes.get(name) ?? null; },
  };
  // The translucency is one inline CSS variable; the stub records the writes so a test
  // can read the weight the page handed to the stylesheet.
  const bodyStyle = {
    values: new Map(),
    setProperty(name, value) { this.values.set(name, value); },
    removeProperty(name) { this.values.delete(name); },
    getPropertyValue(name) { return this.values.get(name) ?? ''; },
  };
  // Each component function gets one hook frame, reused across its renders, so a
  // click's state survives until the component renders again.
  const frames = new Map();
  let currentFrame;
  let nextTimer = 0;
  const storage = new Map(stored ? [['dsh-smooth-skin:state', JSON.stringify(stored)]] : []);
  const renderComponent = (type, props) => {
    const frame = frames.get(type) || { cells: [], at: 0 };
    frame.at = 0;
    frames.set(type, frame);
    const previous = currentFrame;
    currentFrame = frame;
    try { return type(props); } finally { currentFrame = previous; }
  };
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useReducer: () => [0, () => {}],
    useEffect: (fn) => { const cleanup = fn(); if (typeof cleanup === 'function') effects.push(cleanup); },
    useState: (initial) => {
      assert.ok(currentFrame, 'useState ran outside a test render');
      const index = currentFrame.at++;
      const cell = currentFrame.cells[index] || (currentFrame.cells[index] = { value: initial });
      return [cell.value, (next) => { cell.value = typeof next === 'function' ? next(cell.value) : next; }];
    },
    useRef: (initial) => {
      assert.ok(currentFrame, 'useRef ran outside a test render');
      const index = currentFrame.at++;
      const cell = currentFrame.cells[index] || (currentFrame.cells[index] = { current: initial });
      return cell;
    },
  };
  const modules = { react, 'react-dom': { createPortal: (node) => ({ portal: node, props: node.props }) } };
  const services = {
    theme: {
      // The real snapshot resolves the active tone for `system`; the harness has no OS
      // scheme, so `system` reads light here exactly like the theme's own tests assume.
      getTheme: () => ({ preference, active: { colorScheme: preference === 'dark' ? 'dark' : 'light' } }),
      setTheme: (next) => { preference = next; },
      overrideTokens: () => { tokenLayers++; return () => { tokenLayers--; }; },
    },
    slots: {
      inject: (_name, callback) => callback(),
      register: (options, component) => {
        assert.equal(typeof options.label, 'string');
        settings = { options, component: () => renderComponent(component) };
        return () => { settings = undefined; };
      },
    },
    locale: {
      register: (_namespace, dicts) => { dictionaries = dicts; return () => { dictionaries = undefined; }; },
      translate: (_namespace, key) => dictionaries?.zh[key],
    },
  };
  for (const name of unavailable) delete services[name];
  // Stand-in for the previewed layer the portal mounts, so the wag start is observable.
  const swim = { begun: 0, beginElement() { this.begun += 1; } };
  const frameWindow = {
    __ModuleLoader__: { load: (value) => { registration = value; } },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, at: delay || 0 }); return id; },
    clearTimeout: (id) => timers.delete(id),
    // The desktop window the half sizes at launch; the test observes the requests.
    resizeTo: (width, height) => { resizes.push([width, height]); outerWidth = width; outerHeight = height; },
    moveTo: (x, y) => { moves.push([x, y]); screenX = x; screenY = y; },
    get outerWidth() { return outerWidth; },
    get outerHeight() { return outerHeight; },
    get screenX() { return screenX; },
    get screenY() { return screenY; },
    screen: screen || { availWidth: 2560, availHeight: 1440 },
  };
  // A frame reports the parent as a different window object, which is how the half tells
  // the application's own window apart from an embedded one.
  frameWindow.self = frameWindow;
  frameWindow.top = framed ? {} : frameWindow;
  runInNewContext(built, {
    window: frameWindow,
    document: {
      documentElement,
      addEventListener() {}, removeEventListener() {},
      createElement: () => { const style = { dataset: {}, remove: () => styles.delete(style) }; return style; },
      head: { append: (style) => styles.add(style) },
      styleSheets: [],
      // Chrome invokes the update callback after capturing the old snapshot; the stub
      // leaves that call to the test so it can inspect the captured state first.
      startViewTransition: viewTransition ? (update) => {
        let finish;
        const finished = new Promise((resolve) => { finish = resolve; });
        const record = { update, finished, finish: () => finish() };
        transitions.push(record);
        return { finished, skipTransition() {} };
      } : undefined,
      // The skin watches host surfaces through one body observer; nothing here matches
      // during startup, which is the state the first frame is in.
      querySelector: () => null,
      getElementById: (id) => (id === 'dsh-smooth-splash' ? { querySelector: (selector) => (selector === 'animate' ? swim : null) } : null),
      body: {
        toggleAttribute: (name, enabled) => enabled ? attributes.add(name) : attributes.delete(name),
        setAttribute: (name) => attributes.add(name),
        getAttribute: (name) => (attributes.has(name) ? '' : null),
        removeAttribute: (name) => attributes.delete(name),
        hasAttribute: (name) => attributes.has(name),
        style: bodyStyle,
      },
    },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe() {} disconnect() {}
    },
  });
  assert.equal(registration.id, manifest.name);
  const plugin = registration.factory((name) => {
    assert.ok(modules[name], `unexpected require ${name}`);
    return modules[name];
  });
  const ctx = new Proxy({}, {
    get: (_target, name) => {
      if (name === 'effect') return (callback) => { const dispose = callback(); if (dispose) effects.push(dispose); };
      assert.ok(plugin.inject.includes(name), `cannot get property "${String(name)}" without inject`);
      return services[name];
    },
  });
  return {
    plugin, ctx, styles, attributes, storage, timers, swim, resizes, moves, documentElement, transitions, bodyStyle,
    get outer() { return [outerWidth, outerHeight]; },
    get origin() { return [screenX, screenY]; },
    get settings() { return settings; },
    get tokenLayers() { return tokenLayers; },
    get preference() { return preference; },
    get dictionaries() { return dictionaries; },
    /** Render one child element the way React would (nested components are not
     * auto-rendered by this stub). */
    render: (element) => renderComponent(element.type, element.props),
    /** Run the oldest pending timer, returning the delay it was scheduled with. */
    fireTimer: () => {
      const entry = timers.entries().next().value;
      if (entry === undefined) return undefined;
      timers.delete(entry[0]);
      entry[1].fn();
      return entry[1].at;
    },
    dispose: () => { for (const fn of effects.reverse()) fn(); },
  };
}

/** Every child the Smooth page renders below its header, across its tab pages. */
const pageChildren = (runtime) => {
  const pages = runtime.settings.component().children
    .find((child) => child && child.props?.className === 'smooth-pages');
  return (pages?.children || []).flatMap((page) => (page && page.children) || []);
};

/** The page's settings rows, in order: the group headings carry no `title` prop. */
const settingRows = (runtime) => pageChildren(runtime)
  .filter((child) => child && typeof child.type === 'function' && child.props && 'title' in child.props);

/** The splash preview element, present only while it plays. */
const splashPart = (runtime) => pageChildren(runtime)
  .find((child) => child && child.props && 'onDone' in child.props);

/** The footer's one reset button. */
const resetButton = (runtime) => runtime.settings.component().children.at(-1)
  .children[0].children[0];

test('built client exports an activatable plugin with every service declared', () => {
  const runtime = loadClient();
  assert.equal(runtime.plugin.name, manifest.name);
  assert.equal(typeof runtime.plugin.apply, 'function');
  runtime.plugin.apply(runtime.ctx);
  assert.ok(runtime.attributes.has('data-smooth-skin'));
  assert.equal(runtime.styles.size, 1);
  assert.equal(runtime.tokenLayers, 1);
  assert.equal(runtime.settings.options.label, 'Smooth 皮肤');
  assert.ok(runtime.dictionaries.zh);
  runtime.dispose();
  assert.equal(runtime.styles.size, 0);
  assert.equal(runtime.tokenLayers, 0);
  assert.equal(runtime.attributes.size, 0);
  assert.equal(runtime.settings, undefined);
  assert.equal(runtime.dictionaries, undefined);
});

test('the metadata button labels exist in both locales', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  for (const key of ['composer.copied', 'composer.switchWorkspace', 'composer.chooseWorkspace', 'composer.workspaceList', 'composer.searchWorkspace', 'composer.workspaceLoading', 'composer.workspaceNoMatch', 'composer.workspaceEmpty', 'composer.clearSearch', 'composer.defaultWorkspace', 'composer.addWorkspace', 'composer.workspaceErrorTitle', 'composer.workspaceRetry', 'composer.workspaceMissing', 'composer.copyBranch', 'composer.branchMenu', 'composer.modelMenu', 'composer.searchModel', 'composer.modelLoading', 'composer.noModels', 'composer.reasoningEffort', 'composer.modelFailed', 'composer.searchBranch', 'composer.createBranch', 'composer.newBranch', 'composer.create', 'composer.cancel', 'composer.uncommitted', 'composer.files', 'composer.clean', 'composer.noBranches', 'composer.loading', 'composer.gitUnavailable', 'composer.gitConnectionFailed', 'composer.gitFailed']) {
    assert.equal(typeof runtime.dictionaries.zh[key], 'string', `missing zh ${key}`);
    assert.equal(typeof runtime.dictionaries.en[key], 'string', `missing en ${key}`);
  }
  runtime.dispose();
});

test('the archived-conversation delete labels exist in both locales', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  for (const key of ['shell.close', 'shell.deleteSession', 'shell.deleteSessionTitle', 'shell.deleteSessionDesc', 'shell.deleteSessionConfirm', 'shell.deleteSessionPending']) {
    assert.equal(typeof runtime.dictionaries.zh[key], 'string', `missing zh ${key}`);
    assert.equal(typeof runtime.dictionaries.en[key], 'string', `missing en ${key}`);
  }
  runtime.dispose();
});

test('hover-revealed controls cannot be pinned open by a clicked control', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const sheet = [...runtime.styles][0].textContent;
  // A clicked control keeps :focus but never :focus-visible. Keying a reveal on
  // :focus-within leaves that control visible after the pointer leaves the region.
  assert.match(sheet, /\.smooth-workspace-filter:has\(:focus-visible\)\{opacity:1;pointer-events:auto\}/);
  assert.ok(!/\.smooth-workspace-filter:focus-within\b/.test(sheet), 'a clicked option must not hold the overlay open');
  assert.match(sheet, /body\[data-smooth-skin\] \.smooth-workspace-filter\{[^}]*opacity:0/, 'the idle state is hidden');
  // The conversation 对话 / 轨迹 switch — with the 更多 launcher sharing its row — and a
  // tab's close button follow the same rule.
  assert.match(sheet, /:is\(\[class\$="_tabs"\],\[class\*="_tabs "\]\):has\(:focus-visible\)/);
  assert.match(sheet, /:is\(\[class\$="_tabs"\],\[class\*="_tabs "\]\)\{[^}]*opacity:0/, 'the idle switch row is hidden');
  assert.ok(!/:is\(\[class\$="_tabs"\],\[class\*="_tabs "\]\):focus-within/.test(sheet), 'a clicked view must not pin the switch open');
  assert.ok(!/\.smooth-workspace-tab:is\(:hover,:focus-within\)/.test(sheet), 'a clicked tab must not pin its close button');
  runtime.dispose();
});

test('the settings tabs and segment controls keep a visible track', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const sheet = [...runtime.styles][0].textContent;
  // On the settings page's near-white ground an accent wash sat within 1.1:1 of its own
  // track, so the control reads as one recessed track plus a raised surface pill; the
  // accent survives as the pill's hairline ring. Dark themes invert it: the pill must stay
  // lighter than the track, so the track takes the darkest surface and the pill the tint.
  assert.match(sheet, /\.smooth-tabs\{[^}]*border:1px solid var\(--smooth-line,var\(--dsw-alias-border-l2\)\)[^}]*background:color-mix\(in srgb,var\(--smooth-text,var\(--dsw-alias-label-primary\)\) 8%,var\(--smooth-surface-2,var\(--dsw-alias-bg-layer-2\)\)\)/);
  assert.match(sheet, /\.smooth-tabs-thumb\{[^}]*background:var\(--smooth-surface,var\(--dsw-alias-bg-layer-1\)\)[^}]*inset 0 0 0 1px color-mix\(in srgb,var\(--smooth-accent,var\(--dsw-alias-brand-primary\)\) 60%/);
  assert.match(sheet, /\.smooth-usage-placement,\.smooth-usage-align-options\{[^}]*border:1px solid var\(--smooth-line,var\(--dsw-alias-border-l2\)\)[^}]*background:color-mix\(/);
  assert.match(sheet, /\.smooth-segment-thumb\{[^}]*background:var\(--smooth-surface,var\(--dsw-alias-bg-layer-1\)\)[^}]*inset 0 0 0 1px color-mix\(/);
  assert.match(sheet, /body\[data-ds-dark-theme\] :is\(\.smooth-tabs-thumb,\.smooth-segment-thumb\)\{[^}]*26%/);
  runtime.dispose();
});

test('the launch window size is left to the opening and edited in settings', async () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  // The injected opening sizes the window while it is still hidden. Activating the module
  // afterwards must not move a window the user can already see.
  assert.deepEqual(runtime.resizes, [], 'activation leaves the launch size alone');
  const stored = () => JSON.parse(runtime.storage.get('dsh-smooth-skin:state'));
  // Rows are re-read after every change, the way React re-renders them.
  const sizeRow = () => {
    const rows = settingRows(runtime);
    const element = rows[rows.length - 1];
    const [width, times, height, toggle] = runtime.render(element).children[1].children;
    return { element, width, times, height, toggle };
  };

  const first = sizeRow();
  assert.equal(first.element.props.value.width, 1440);
  assert.equal(first.element.props.value.height, 900);
  assert.equal(first.times.children[0], '×');
  assert.equal(first.width.children[0].children[0], '宽');
  assert.equal(first.height.children[0].children[0], '高');
  assert.equal(first.width.children[1].props.type, 'number');
  assert.equal(first.width.children[1].props.min, 520, 'the app refuses anything narrower');
  assert.equal(first.height.children[1].props.min, 600);
  assert.equal(first.toggle.props.checked, true, 'the size is applied by default');
  assert.equal(first.toggle.props.role, 'switch');

  // A half-typed number is repaired into the current size instead of resizing anything,
  // so the window settles as soon as a usable pair has been typed.
  await first.width.children[1].props.onChange({ target: { value: '16' } });
  assert.deepEqual(runtime.resizes, [], 'an edit repaired back to the stored size leaves the window alone');
  assert.equal(stored().windowSize.width, 1440);
  await sizeRow().width.children[1].props.onChange({ target: { value: '1600' } });
  assert.deepEqual(runtime.resizes.at(-1), [1600, 900], 'a usable width is applied at once');
  assert.equal(stored().windowSize.width, 1600);

  await sizeRow().toggle.props.onChange({ target: { checked: false } });
  assert.equal(stored().windowSize.enabled, false);
  const before = runtime.resizes.length;
  await sizeRow().height.children[1].props.onChange({ target: { value: '1000' } });
  assert.equal(runtime.resizes.length, before, 'a disabled size row never touches the window');
  assert.equal(stored().windowSize.enabled, false, 'and editing a number does not switch it back on');
  assert.equal(stored().windowSize.height, 1000, 'the number itself is still remembered');

  await resetButton(runtime).props.onClick();
  assert.deepEqual(stored().windowSize, { enabled: true, width: 1440, height: 900 });
  runtime.dispose();
});

test('theme and animation switches never move the window; only a size edit does', async () => {
  // A manually resized window whose outer size no longer equals the configured size:
  // before the guard, every write called resizeTo and nudged it.
  const runtime = loadClient({
    stored: { theme: 'dark', windowSize: { enabled: true, width: 1440, height: 900 } },
    outer: [1469, 915],
  });
  runtime.plugin.apply(runtime.ctx);
  assert.deepEqual(runtime.resizes, [], 'activation leaves a visible window alone');
  const rows = () => settingRows(runtime);
  await rows()[1].props.onChange('snow');
  assert.equal(runtime.preference, 'light');
  assert.deepEqual(runtime.resizes, [], 'switching the theme must not resize or reposition the window');
  await rows()[4].props.onChange(false);
  assert.deepEqual(runtime.resizes, [], 'the launch-animation toggle must not touch the window either');

  const size = runtime.render(rows()[rows().length - 1]);
  const [width] = size.children[1].children;
  await width.children[1].props.onChange({ target: { value: '1600' } });
  assert.deepEqual(runtime.resizes, [[1600, 900]], 'a real size edit still applies');
  runtime.dispose();
});

test('the size switch never touches the visible window, even one the user resized', async () => {
  // The switch is a launch-time preference: it decides whether the opening applies the
  // size, not whether the window on screen is corrected now. Flipping it must leave a
  // window that no longer matches the configured size completely alone.
  const runtime = loadClient({
    stored: { windowSize: { enabled: true, width: 1440, height: 900 } },
    outer: [1469, 915],
    origin: [240, 66],
  });
  runtime.plugin.apply(runtime.ctx);
  const sizeRow = () => {
    const rows = settingRows(runtime);
    return runtime.render(rows[rows.length - 1]);
  };
  // The reported gesture: a dozen and one clicks on the switch.
  for (let click = 0; click < 13; click += 1) {
    const [, , , toggle] = sizeRow().children[1].children;
    await toggle.props.onChange({ target: { checked: click % 2 === 0 } });
  }
  assert.deepEqual(runtime.resizes, [], 'the switch must not resize the window');
  assert.deepEqual(runtime.moves, [], 'nor reposition it');
  assert.deepEqual(runtime.outer, [1469, 915], 'a manually sized window keeps its size');
  assert.deepEqual(runtime.origin, [240, 66], 'and its origin');
  // Editing a number is still immediate.
  const [width] = sizeRow().children[1].children;
  await width.children[1].props.onChange({ target: { value: '1600' } });
  assert.deepEqual(runtime.resizes, [[1600, 900]], 'a real size edit still applies');
  runtime.dispose();
});

test('a width or height edit within the window frame is not re-requested', async () => {
  // Electron applies its frame outside the requested outer size: 1440 x 900 reports back
  // as 1441 x 901. Editing only the height to 901 asks for that same frame back, so the
  // comparison allows the border either way instead of resizing (and re-anchoring) again.
  const runtime = loadClient({
    stored: { windowSize: { enabled: true, width: 1440, height: 900 } },
    outer: [1441, 901],
    origin: [240, 66],
  });
  runtime.plugin.apply(runtime.ctx);
  const row = runtime.render(settingRows(runtime).at(-1));
  const [, , height] = row.children[1].children;
  await height.children[1].props.onChange({ target: { value: '901' } });
  assert.deepEqual(runtime.resizes, [], 'the frame already holds this size');
  assert.deepEqual(runtime.moves, [], 'so nothing is touched');
  runtime.dispose();
});

test('the size row resets the width and height pair without touching the switch', async () => {
  const runtime = loadClient({ stored: { windowSize: { enabled: false, width: 1600, height: 1000 } } });
  runtime.plugin.apply(runtime.ctx);
  const row = runtime.render(settingRows(runtime).at(-1));
  // The copy block is [title, hint, meta]; the meta line carries [current size, reset].
  const reset = row.children[0].children[2].children[1];
  assert.equal(reset.props.disabled, false, 'a custom pair can be reset');
  await reset.props.onClick();
  assert.deepEqual(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).windowSize,
    { enabled: false, width: 1440, height: 900 }, 'only the numbers go back to the default pair');
  const atDefault = runtime.render(settingRows(runtime).at(-1));
  assert.equal(atDefault.children[0].children[2].children[1].props.disabled, true, 'and the reset idles at the default pair');
  runtime.dispose();
});

test('a size edit keeps the window on the origin it already had', async () => {
  const runtime = loadClient({
    stored: { windowSize: { enabled: true, width: 1440, height: 900 } },
    outer: [1469, 915],
    origin: [240, 66],
  });
  runtime.plugin.apply(runtime.ctx);
  const row = runtime.render(settingRows(runtime).at(-1));
  const [width] = row.children[1].children;
  await width.children[1].props.onChange({ target: { value: '1600' } });
  assert.deepEqual(runtime.resizes, [[1600, 900]]);
  assert.deepEqual(runtime.moves, [[240, 66]], 'only the size may change, not where the window sits');
  runtime.dispose();
});

test('a restored origin stays inside the screen work area', async () => {
  const runtime = loadClient({
    stored: { windowSize: { enabled: true, width: 1440, height: 900 } },
    outer: [1000, 700],
    origin: [300, 120],
    screen: { availWidth: 1280, availHeight: 720, availLeft: 0, availTop: 0 },
  });
  runtime.plugin.apply(runtime.ctx);
  const row = runtime.render(settingRows(runtime).at(-1));
  const [width] = row.children[1].children;
  await width.children[1].props.onChange({ target: { value: '1600' } });
  assert.deepEqual(runtime.resizes, [[1280, 720]], 'the request is clamped to the work area');
  assert.deepEqual(runtime.moves, [[0, 0]], 'the pinned origin is clamped so the window stays reachable');
  runtime.dispose();
});

test('an edited size is clamped to the screen work area and skipped when it fits', async () => {
  const edit = async (runtime, value) => {
    const rows = settingRows(runtime);
    const element = rows[rows.length - 1];
    const [width] = runtime.render(element).children[1].children;
    await width.children[1].props.onChange({ target: { value } });
  };

  // A 1280 x 720 display cannot hold the request: it shrinks to fit instead of putting the
  // window's own controls out of reach. Activation itself never moves the window.
  const small = loadClient({ screen: { availWidth: 1280, availHeight: 720 } });
  small.plugin.apply(small.ctx);
  assert.deepEqual(small.resizes, [], 'activation leaves the launch size alone');
  await edit(small, '1600');
  assert.deepEqual(small.resizes, [[1280, 720]]);
  small.dispose();

  // A window already at the requested size is left alone.
  const fitted = loadClient({ stored: { windowSize: { enabled: true, width: 1280, height: 820 } }, outer: [1280, 820] });
  fitted.plugin.apply(fitted.ctx);
  await edit(fitted, '1280');
  assert.deepEqual(fitted.resizes, []);

  // An embedded frame keeps the size its parent gave it.
  const framed = loadClient({ framed: true });
  framed.plugin.apply(framed.ctx);
  await edit(framed, '1600');
  assert.deepEqual(framed.resizes, []);

  // Without the setting (or without the skin) the request is ignored.
  const off = loadClient({ stored: { windowSize: { enabled: false, width: 1600, height: 1000 } } });
  off.plugin.apply(off.ctx);
  await edit(off, '1600');
  assert.deepEqual(off.resizes, []);
  const disabled = loadClient({ stored: { enabled: false, windowSize: { enabled: true, width: 1600, height: 1000 } } });
  disabled.plugin.apply(disabled.ctx);
  assert.deepEqual(disabled.resizes, [], 'a disabled skin never sizes the window');
});

test('turning the skin off restores tokens and theme, then re-enabling reapplies it', async () => {
  const runtime = loadClient({ stored: { enabled: true, theme: 'dark' } });
  runtime.plugin.apply(runtime.ctx);
  assert.equal(runtime.preference, 'dark');
  const getToggle = () => settingRows(runtime)[0];
  // The chrome publishes this flag while the workspace has no tab open; switching the
  // skin off has to take it down with the rest of the plugin's marks on the host body.
  runtime.attributes.add('data-smooth-home');
  await getToggle().props.onChange(false);
  assert.equal(runtime.attributes.has('data-smooth-home'), false, 'a disabled skin leaves no welcome-block flag behind');
  assert.equal(runtime.preference, 'system');
  assert.equal(runtime.tokenLayers, 0);
  assert.equal(runtime.attributes.size, 0);
  assert.equal(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).enabled, false);
  await getToggle().props.onChange(true);
  assert.equal(runtime.tokenLayers, 1);
  assert.equal(runtime.preference, 'dark');
  runtime.dispose();
  assert.equal(runtime.preference, 'system');
  assert.equal(runtime.tokenLayers, 0);
});

test('the settings page replaces the day/night choice with the six theme presets', async () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const row = () => settingRows(runtime)[1];
  const value = () => row().props.value;
  assert.equal(value(), 'auto', 'following the theme is the default');
  assert.deepEqual(Array.from(row().props.options, option => option.value),
    ['auto', 'snow', 'iron', 'moss', 'sunset', 'deepsea']);
  const element = runtime.render(row());
  const buttons = element.children[1].children;
  assert.deepEqual(buttons.map(button => button.props['aria-checked']), [true, false, false, false, false, false]);
  assert.deepEqual(buttons.map(button => button.props['data-theme']), ['auto', 'snow', 'iron', 'moss', 'sunset', 'deepsea']);
  await row().props.onChange('sunset');
  assert.equal(value(), 'sunset');
  assert.equal(runtime.preference, 'light', 'the sunset preset reads as a light tone');
  assert.equal(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).theme, 'sunset');
  await row().props.onChange('deepsea');
  assert.equal(runtime.preference, 'dark', 'the clear-blue preset reads as a dark tone');
  await row().props.onChange('auto');
  assert.equal(value(), 'auto');
  assert.equal(runtime.preference, 'system', 'following the theme restores the host preference');
  runtime.dispose();
});

test('a palette switch is captured first, then revealed by a circle from the top-left corner', async () => {
  const runtime = loadClient({ stored: { theme: 'iron' }, viewTransition: true });
  runtime.plugin.apply(runtime.ctx);
  const row = () => settingRows(runtime)[1];
  const pending = row().props.onChange('snow');
  // The old palette is captured before the write: until the transition callback runs the
  // persisted state, the host tone and the tokens are all still the previous preset.
  assert.equal(runtime.transitions.length, 1, 'one view transition owns the switch');
  assert.equal(runtime.documentElement.getAttribute('data-smooth-theme-switch'), '', 'the reveal gate is on while the old snapshot is captured');
  assert.equal(runtime.preference, 'dark', 'the host tone still belongs to the captured palette');
  assert.equal(row().props.value, 'iron', 'the settings row still reads the captured preset');
  // The callback writes the palette and the host tone; the new snapshot is taken after
  // it, so the circle can only expose the finished new theme.
  await runtime.transitions[0].update();
  assert.equal(runtime.preference, 'light');
  assert.equal(row().props.value, 'snow');
  assert.equal(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).theme, 'snow');
  assert.equal(runtime.documentElement.getAttribute('data-smooth-theme-switch'), '', 'the gate stays on for the whole animation');
  runtime.transitions[0].finish();
  await pending;
  await Promise.resolve();
  assert.equal(runtime.documentElement.getAttribute('data-smooth-theme-switch'), null, 'the gate comes off when the transition finishes');
  runtime.dispose();
});

test('a palette switch without the View Transition API or with reduced motion stays instant', async () => {
  const instant = loadClient({ stored: { theme: 'iron' } });
  instant.plugin.apply(instant.ctx);
  await settingRows(instant)[1].props.onChange('snow');
  assert.equal(instant.preference, 'light', 'no API: the write lands immediately');
  assert.equal(JSON.parse(instant.storage.get('dsh-smooth-skin:state')).theme, 'snow');
  instant.dispose();

  const reduced = loadClient({ stored: { theme: 'iron' }, viewTransition: true, reducedMotion: true });
  reduced.plugin.apply(reduced.ctx);
  await settingRows(reduced)[1].props.onChange('moss');
  assert.equal(reduced.transitions.length, 0, 'reduced motion never opens a circle');
  assert.equal(reduced.preference, 'light');
  assert.equal(JSON.parse(reduced.storage.get('dsh-smooth-skin:state')).theme, 'moss');
  reduced.dispose();
});

test('only a repainted palette animates; other settings write directly', async () => {
  const runtime = loadClient({ viewTransition: true });
  runtime.plugin.apply(runtime.ctx);
  const rows = () => settingRows(runtime);
  await rows()[3].props.onChange('violet');
  assert.equal(runtime.transitions.length, 0, 'the mark colour is not a palette switch');
  // Following the host theme and then pinning the preset it already resolves to paints
  // exactly the same page: no circle should open over an identical screen.
  await rows()[1].props.onChange('snow');
  assert.equal(runtime.transitions.length, 0, 'the preset the host theme already paints does not animate');
  assert.equal(runtime.preference, 'light');
  // A palette that really changes is captured and revealed.
  await rows()[1].props.onChange('iron');
  assert.equal(runtime.transitions.length, 1, 'a different palette opens a circle');
  await runtime.transitions[0].update();
  runtime.transitions[0].finish();
  await Promise.resolve();
  runtime.dispose();
});

test('rapid preset clicks hand the palette to the newest transition', async () => {
  const runtime = loadClient({ stored: { theme: 'iron' }, viewTransition: true });
  runtime.plugin.apply(runtime.ctx);
  const row = () => settingRows(runtime)[1];
  const first = row().props.onChange('snow');
  const second = row().props.onChange('moss');
  assert.equal(runtime.transitions.length, 2, 'each click captures its own snapshot');
  // The first transition was superseded before its callback ran; it must not write its
  // palette over the newer one when the browser gets around to calling it.
  await runtime.transitions[0].update();
  assert.equal(row().props.value, 'iron', 'a superseded snapshot writes nothing');
  await runtime.transitions[1].update();
  assert.equal(row().props.value, 'moss', 'the newest snapshot owns the switch');
  assert.equal(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).theme, 'moss');
  runtime.transitions[0].finish();
  runtime.transitions[1].finish();
  await Promise.all([first, second]);
  await Promise.resolve();
  assert.equal(runtime.documentElement.getAttribute('data-smooth-theme-switch'), null, 'the newest transition removes the gate');
  runtime.dispose();
});

test('the settings page carries the enable switch, the mode choice and the launch animation', async () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const rows = settingRows(runtime);
  assert.equal(rows[0].props.checked, true, 'the enable switch stays the first row');
  assert.equal(rows[1].props.value, 'auto');
  assert.equal(rows[2].props.value, 5, 'the background transparency follows the theme row');
  assert.equal(rows[3].props.value, 'blue', 'the mark colour follows the translucency row');
  assert.equal(rows[4].props.checked, true, 'the launch animation is on by default');
  assert.equal(rows[4].props.disabled, false);
  await rows[4].props.onChange(false);
  assert.deepEqual(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')),
    { enabled: true, theme: 'auto', boot: false, mark: 'blue', translucency: 5, windowSize: { enabled: true, width: 1440, height: 900 }, usageFields: { cost: true, input: true, output: true, cache: true, counts: false, speed: false, context: true }, usagePlacement: 'bottom', usageAlign: 'left', usageOrder: ['cost', 'input', 'output', 'cache', 'counts', 'speed', 'context'] });
  assert.equal(settingRows(runtime)[4].props.checked, false);
  await resetButton(runtime).props.onClick();
  assert.deepEqual(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')),
    { enabled: true, theme: 'auto', boot: true, mark: 'blue', translucency: 5, windowSize: { enabled: true, width: 1440, height: 900 }, usageFields: { cost: true, input: true, output: true, cache: true, counts: false, speed: false, context: true }, usagePlacement: 'bottom', usageAlign: 'left', usageOrder: ['cost', 'input', 'output', 'cache', 'counts', 'speed', 'context'] });
  runtime.dispose();
});

test('the settings page moves between three tabbed pages without remounting the controls', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const root = () => runtime.settings.component();
  const tablist = () => root().children
    .find((child) => child && child.props?.className === 'smooth-tabs');
  const tabs = () => tablist().children.filter((child) => child && child.props?.role === 'tab');
  const pages = () => root().children
    .find((child) => child && child.props?.className === 'smooth-pages').children;
  assert.equal(tablist().children[0].props.className, 'smooth-tabs-thumb', 'the selected pill is one sliding thumb');
  assert.equal(tablist().props.style['--smooth-tab-index'], '0');
  assert.deepEqual(tabs().map((tab) => tab.props['aria-selected']), [true, false, false]);
  assert.deepEqual(tabs().map((tab) => tab.children[1].children[0]), ['外观', '统计', '启动']);
  assert.deepEqual(pages().map((page) => page.props.hidden), [false, true, true]);
  assert.equal(pages()[0].props['data-active'], 'true');
  // Every page stays mounted; only the visible one is un-hidden, so switching tabs
  // never loses the draft state of a control (the theme grid, the field order, ...).
  tabs()[1].props.onClick();
  assert.equal(tablist().props.style['--smooth-tab-index'], '1', 'the thumb slides instead of jumping');
  assert.deepEqual(tabs().map((tab) => tab.props['aria-selected']), [false, true, false]);
  assert.deepEqual(pages().map((page) => page.props.hidden), [true, false, true]);
  assert.equal(pages()[1].props['data-active'], 'true');
  assert.equal(pages()[1].props['data-smooth-enter'], 'forward', 'the page arrives from the direction of travel');
  assert.equal(pages()[1].props['aria-labelledby'], 'smooth-tab-usage');
  // Arrow keys move the tab selection in both directions.
  tabs()[1].props.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
  assert.deepEqual(pages().map((page) => page.props.hidden), [true, true, false]);
  assert.equal(tablist().props.style['--smooth-tab-index'], '2');
  tabs()[2].props.onKeyDown({ key: 'ArrowLeft', preventDefault() {} });
  assert.deepEqual(pages().map((page) => page.props.hidden), [true, false, true]);
  assert.equal(pages()[1].props['data-smooth-enter'], 'back', 'going back slides the other way');
  runtime.dispose();
});

test('swiping or horizontally scrolling the tab strip changes page without a click', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const root = () => runtime.settings.component();
  const tablist = () => root().children
    .find((child) => child && child.props?.className === 'smooth-tabs');
  const pages = () => root().children
    .find((child) => child && child.props?.className === 'smooth-pages').children;
  let captures = 0;
  const pointer = (type, x) => tablist().props[type]({
    button: 0, clientX: x, clientY: 20, pointerId: 7,
    currentTarget: { setPointerCapture() { captures += 1; } },
  });
  // A plain press must not capture the pointer: capture retargets the following
  // click to the strip, so the tab button would never receive it.
  pointer('onPointerDown', 320);
  assert.equal(captures, 0, 'a press leaves the click on the tab button');
  // A leftward drag over the strip advances one page and names the entry direction.
  pointer('onPointerMove', 250);
  pointer('onPointerUp', 250);
  assert.deepEqual(pages().map((page) => page.props.hidden), [true, false, true]);
  assert.equal(pages()[1].props['data-smooth-enter'], 'forward');
  // A rightward drag goes back; it does not overshoot past the first page.
  pointer('onPointerDown', 200);
  pointer('onPointerMove', 280);
  pointer('onPointerUp', 280);
  assert.deepEqual(pages().map((page) => page.props.hidden), [false, true, true]);
  assert.equal(pages()[0].props['data-smooth-enter'], 'back');
  pointer('onPointerDown', 200);
  pointer('onPointerMove', 280);
  pointer('onPointerUp', 280);
  assert.deepEqual(pages().map((page) => page.props.hidden), [false, true, true], 'the first page is the end');
  // A vertical drag or a short horizontal wiggle is not a swipe.
  pointer('onPointerDown', 200);
  pointer('onPointerMove', 200 - 12);
  pointer('onPointerUp', 200 - 12);
  tablist().props.onWheel({ deltaX: 48, deltaY: 3 });
  assert.deepEqual(pages().map((page) => page.props.hidden), [true, false, true], 'a horizontal trackpad scroll advances one page');
  runtime.dispose();
});

test('the usage settings preview follows the selected figures', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const fieldsRow = () => pageChildren(runtime)
    .find((child) => child && typeof child.type === 'function' && child.props && 'fields' in child.props);
  assert.ok(fieldsRow(), 'the settings page carries the usage fields row');
  const collect = (tree) => {
    const out = [];
    (function walk(node) {
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (typeof node === 'string') { out.push(node); return; }
      if (!node || typeof node !== 'object') return;
      if (typeof node.type === 'function') { walk(node.type(node.props)); return; }
      out.push(node);
      (node.children || []).forEach(walk);
    })(tree);
    return out;
  };
  const fresh = () => collect(fieldsRow());
  const fields = () => fresh().filter((node) => node.props?.className === 'smooth-usage-field');
  const fieldValue = (key) => fields().find((node) => node.props.key === key).children
    .find((child) => child.props?.className === 'smooth-usage-field-value');
  const previewKeys = () => fields().map((node) => node.props.key);
  assert.deepEqual(previewKeys(), ['cost', 'input', 'output', 'cache', 'counts', 'speed', 'context']);
  // The sample figures are the deliberately uniform 8s from the design mock.
  const previewText = fresh().filter((part) => typeof part === 'string').join(' ');
  assert.match(previewText, /8\.888/);
  assert.match(previewText, /888,888,888 tok/);
  assert.match(previewText, /888,888 tok/);
  assert.match(previewText, /88%/);
  assert.match(previewText, /8 轮 8 步/);
  assert.match(previewText, /8 tok\/s/);
  // The checkbox below a field toggles its visibility, but the sortable field stays in
  // the editor so it can be dragged or re-enabled.
  const input = fresh().find((node) => node.type === 'input' && node.props?.name === 'input');
  assert.ok(input, 'one checkbox per figure');
  input.props.onChange({ target: { checked: false } });
  assert.equal(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).usageFields.input, false);
  const inputField = fields().find((node) => node.props.key === 'input');
  assert.equal(inputField.props['data-visible'], 'false');
  // Dragging the cost value onto the input value moves it after input and stores the order.
  const costValue = fieldValue('cost');
  const inputValue = fieldValue('input');
  costValue.props.onDragStart({ dataTransfer: { setData() {}, effectAllowed: 'move' } });
  inputValue.props.onDrop({ preventDefault() {}, dataTransfer: { getData: () => 'cost' } });
  assert.deepEqual(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).usageOrder,
    ['input', 'cost', 'output', 'cache', 'counts', 'speed', 'context']);
  assert.deepEqual(previewKeys(), ['input', 'cost', 'output', 'cache', 'counts', 'speed', 'context']);
  // The context checkbox hides the pie column without removing it from the editor.
  const context = fresh().find((node) => node.type === 'input' && node.props?.name === 'context');
  context.props.onChange({ target: { checked: false } });
  assert.equal(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).usageFields.context, false);
  assert.equal(fields().find((node) => node.props.key === 'context').props['data-visible'], 'false');
  runtime.dispose();
});

test('the usage placement buttons switch the seat and persist it', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const head = () => pageChildren(runtime)
    .find((child) => child && child.props?.className === 'smooth-usage-head');
  const controlsTree = () => head().children
    .find((child) => child && child.props?.className === 'smooth-usage-controls');
  const placementButtons = () => {
    const row = controlsTree().children
      .find((child) => child && typeof child.type === 'function' && child.props && 'value' in child.props && 'onChange' in child.props);
    return row.type(row.props).children.filter((child) => child && child.type === 'button');
  };
  const stored = () => JSON.parse(runtime.storage.get('dsh-smooth-skin:state'));
  assert.deepEqual(
    placementButtons().map((button) => button.props['data-placement']),
    ['context', 'bottom', 'row'],
  );
  placementButtons().find((button) => button.props['data-placement'] === 'context').props.onClick();
  assert.equal(stored().usagePlacement, 'context');
  assert.ok(runtime.attributes.has('data-smooth-usage-placement'), 'the page publishes the seat for the stylesheet');
  placementButtons().find((button) => button.props['data-placement'] === 'bottom').props.onClick();
  assert.equal(stored().usagePlacement, 'bottom');
  // The alignment control appears only for the bottom-bar placement, stacked under
  // the placement buttons inside the same row.
  const controlNodes = () => controlsTree().children
    .filter(Boolean)
    .map((child) => (typeof child.type === 'function' ? child.type(child.props) : child));
  const alignRow = () => controlNodes()
    .find((child) => child && child.props?.className === 'smooth-usage-align');
  assert.ok(alignRow(), 'the bottom placement shows the button-position control');
  const alignOptions = alignRow().children.find((child) => child.props?.className === 'smooth-usage-align-options');
  alignOptions.children.find((button) => button.props['data-align'] === 'center').props.onClick();
  assert.equal(stored().usageAlign, 'center');
  placementButtons().find((button) => button.props['data-placement'] === 'row').props.onClick();
  assert.equal(stored().usagePlacement, 'row');
  assert.ok(!alignRow(), 'the own-row placement hides the control');
  runtime.dispose();
});

test('the placement and alignment choices slide their pill and follow a drag', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const head = () => pageChildren(runtime)
    .find((child) => child && child.props?.className === 'smooth-usage-head');
  const controlsTree = () => head().children
    .find((child) => child && child.props?.className === 'smooth-usage-controls');
  const controlNodes = () => controlsTree().children
    .filter(Boolean)
    .map((child) => (typeof child.type === 'function' ? child.type(child.props) : child));
  const placement = () => controlNodes()
    .find((child) => child && child.props?.className === 'smooth-usage-placement');
  const alignOptions = () => controlNodes()
    .find((child) => child && child.props?.className === 'smooth-usage-align')
    ?.children.find((child) => child.props?.className === 'smooth-usage-align-options');
  const stored = () => JSON.parse(runtime.storage.get('dsh-smooth-skin:state'));
  const drag = (node, from, to) => {
    node.props.onPointerDown({ button: 0, clientX: from, clientY: 10, pointerId: 3 });
    node.props.onPointerMove({ clientX: to, clientY: 10, pointerId: 3 });
    node.props.onPointerUp({});
  };
  // The default seat is the middle option of both groups, so the pill starts there.
  assert.equal(placement().children[0].props.className, 'smooth-segment-thumb', 'the track has one sliding pill');
  assert.equal(placement().props.style['--smooth-segment-index'], '1');
  assert.equal(alignOptions().children[0].props.className, 'smooth-segment-thumb');
  assert.equal(alignOptions().props.style['--smooth-segment-index'], '0');
  // A click still moves the pill one slot.
  alignOptions().children.find((button) => button.props['data-align'] === 'center').props.onClick();
  assert.equal(stored().usageAlign, 'center');
  assert.equal(alignOptions().props.style['--smooth-segment-index'], '1');
  // Dragging left advances an option; dragging right goes back, and both stop at the ends.
  drag(alignOptions(), 260, 210);
  assert.equal(stored().usageAlign, 'right');
  assert.equal(alignOptions().props.style['--smooth-segment-index'], '2');
  drag(alignOptions(), 210, 260);
  assert.equal(stored().usageAlign, 'center');
  drag(placement(), 300, 250);
  assert.equal(stored().usagePlacement, 'row');
  assert.ok(!alignOptions(), 'the own-row seat still hides the alignment choice');
  runtime.dispose();
});

test('the background translucency is one body variable the stylesheet reads', async () => {
  const runtime = loadClient({ stored: { translucency: 55 } });
  runtime.plugin.apply(runtime.ctx);
  // The lever is inverted on purpose: the variable is the weight of the surface colour,
  // so 55% see-through hands the stylesheet 45%.
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass'), '45%');
  // The rail and the tab strip get a steeper weight so their stacked grounds read like
  // the conversation: (0.45) ** 4 = 4.1%, rounded to 4%.
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-soft'), '4%');
  // Overlays keep almost all of their fill: 55% translucency removes only an eighth.
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-overlay'), '93%');
  // Component fills move a third as fast as the page: 55% -> 82% opacity.
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-mild'), '82%');
  const row = () => settingRows(runtime)[2];
  assert.equal(row().props.value, 55, 'the row reads the stored value');
  const element = runtime.render(row());
  const input = element.children[1].children[0];
  assert.equal(input.props.type, 'range');
  assert.equal(element.children[1].children[1].children[0], '55%', 'the number sits beside the track');
  await input.props.onChange({ target: { value: '80' } });
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass'), '20%');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-soft'), '0%');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-overlay'), '90%');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-mild'), '73%');
  assert.equal(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).translucency, 80);
  assert.equal(runtime.render(row()).children[1].children[1].children[0], '80%');
  // Disabling the skin takes the inline variable back off the host body, and enabling
  // it again restores the stored weight.
  await settingRows(runtime)[0].props.onChange(false);
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass'), '');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-soft'), '');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-overlay'), '');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-mild'), '');
  await settingRows(runtime)[0].props.onChange(true);
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass'), '20%');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-soft'), '0%');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-overlay'), '90%');
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass-mild'), '73%');
  runtime.dispose();
  assert.equal(runtime.bodyStyle.getPropertyValue('--smooth-glass'), '', 'uninstall leaves the body as it was');
});

test('the window material the patched shell publishes changes the slider copy', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  assert.ok(!runtime.attributes.has('data-smooth-window-glass'), 'the stock install has no window material');
  assert.match(settingRows(runtime)[2].props.hint, /柔和渐变/u, 'the slider describes the in-page gradient');
  // The patched shell marks the body after each load; the copy follows it while the
  // stylesheet keys its window-glass rules on the same attribute. The skin never sets or
  // clears the attribute itself: it belongs to the window.
  runtime.attributes.add('data-smooth-window-glass');
  assert.match(settingRows(runtime)[2].props.hint, /亚克力/u, 'the slider names the desktop material');
  runtime.dispose();
});

test('the settings page replays the index opening without touching the stored state', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const rowOf = () => settingRows(runtime)[4];
  const preview = rowOf().props.action;
  assert.equal(preview.children[0], '预览');
  assert.equal(preview.props.disabled, false, 'the preview is available while the skin is on');
  assert.equal(runtime.styles.size, 1, 'only the skin stylesheet is up so far');

  preview.props.onClick();
  const playing = rowOf().props.action;
  assert.equal(playing.children[0], '播放中…', 'the button reports that it is busy');
  assert.equal(playing.props.disabled, true);
  const layerOf = () => {
    const element = splashPart(runtime);
    return element ? runtime.render(element) : null;
  };
  const layer = layerOf();
  assert.ok(layer && layer.props.id === 'dsh-smooth-splash', 'the preview portals the same layer the index ships');
  assert.equal(layer.props['data-smooth-splash-live'], '');
  assert.equal(layer.props['data-smooth-splash-out'], undefined);
  assert.match(layer.props.dangerouslySetInnerHTML.__html, /class="smooth-splash-mark"/);
  assert.ok(!/<animate\b/.test(layer.props.dangerouslySetInnerHTML.__html), 'the preview carries the same static whale');
  assert.equal(layer.props['aria-hidden'], 'true');
  assert.equal(runtime.styles.size, 2, 'a page without the Host stylesheet gets a plugin copy');

  assert.equal(runtime.fireTimer(), 1500, 'the whale holds for the same extended minimum as the real opening');
  assert.equal(layerOf().props['data-smooth-splash-out'], '');
  assert.equal(runtime.fireTimer(), 1500 + 640, 'the layer leaves once the shell transition is over');
  assert.equal(layerOf(), null);
  assert.equal(rowOf().props.action.children[0], '预览');
  // The replay is decoration: it never writes settings.
  assert.equal(runtime.storage.has('dsh-smooth-skin:state'), false);
  runtime.dispose();
  assert.equal(runtime.styles.size, 0, 'disposing drops the preview stylesheet along with the skin sheet');
});

test('missing declared services degrade without an undeclared service access', () => {
  const runtime = loadClient({ unavailable: ['theme', 'slots', 'locale'] });
  runtime.plugin.apply(runtime.ctx);
  assert.ok(runtime.attributes.has('data-smooth-skin'));
  runtime.dispose();
  assert.equal(runtime.styles.size, 0);
});

test('manifest loads the providers before activating the client', () => {
  for (const name of ['slots', 'theme', 'locale']) {
    const provider = name === 'locale' ? '@deepseek-ai/dsh-client-locale' : `@deepseek-ai/dsh-client-ui-${name}`;
    assert.ok(manifest.dsh.client.inject.includes(provider), `missing provider ${provider}`);
  }
  for (const name of ['layout', 'workspace', 'session', 'settings-general']) {
    assert.ok(manifest.dsh.client.inject.includes(`@deepseek-ai/dsh-client-ui-${name}`));
  }
});

test('the client injects remote.session so the model directory resolves for a fresh session', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  // `ctx.modelDirectories.directoryFor(sessionId)` resolves the session's remote
  // binding; Cordis checks the property against the *calling* plugin's inject list.
  // A brand-new session (empty composer) has no model directory until that call
  // succeeds, so without `remote.session` the model panel host reported "not ready",
  // never attached its trigger listener, and clicking the model button fell through
  // to the native menu (or opened nothing until the first keystroke).
  assert.ok(runtime.plugin.inject.includes('remote.session'), 'remote.session must be declared: directoryFor guards it against the caller');
  assert.ok(runtime.plugin.inject.includes('modelDirectories'));
  runtime.dispose();
});

test('the tab and field-editor labels exist in both locales', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  for (const key of ['settings.tabsLabel', 'settings.tab.appearance', 'settings.tab.usage', 'settings.tab.startup', 'settings.usageFields', 'settings.usagePlacementHint']) {
    assert.equal(typeof runtime.dictionaries.zh[key], 'string', `missing zh ${key}`);
    assert.equal(typeof runtime.dictionaries.en[key], 'string', `missing en ${key}`);
  }
  runtime.dispose();
});

test('the mark colour labels exist in both locales', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  for (const key of ['settings.mark', 'settings.markHint', 'settings.mark.blue', 'settings.mark.cyan', 'settings.mark.violet', 'settings.mark.green', 'settings.mark.orange', 'settings.mark.rose']) {
    assert.equal(typeof runtime.dictionaries.zh[key], 'string', `missing zh ${key}`);
    assert.equal(typeof runtime.dictionaries.en[key], 'string', `missing en ${key}`);
  }
  runtime.dispose();
});
