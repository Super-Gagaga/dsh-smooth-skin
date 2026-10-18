import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const built = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

function loadClient({ stored, unavailable = [], screen, outer, origin = [240, 66], framed = false } = {}) {
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
  };
  const modules = { react, 'react-dom': { createPortal: (node) => ({ portal: node, props: node.props }) } };
  const services = {
    theme: {
      getTheme: () => ({ preference }),
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
    matchMedia: () => ({ matches: false }),
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
      addEventListener() {}, removeEventListener() {},
      createElement: () => { const style = { dataset: {}, remove: () => styles.delete(style) }; return style; },
      head: { append: (style) => styles.add(style) },
      styleSheets: [],
      // The skin watches host surfaces through one body observer; nothing here matches
      // during startup, which is the state the first frame is in.
      querySelector: () => null,
      getElementById: (id) => (id === 'dsh-smooth-splash' ? { querySelector: (selector) => (selector === 'animate' ? swim : null) } : null),
      body: {
        toggleAttribute: (name, enabled) => enabled ? attributes.add(name) : attributes.delete(name),
        removeAttribute: (name) => attributes.delete(name),
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
    plugin, ctx, styles, attributes, storage, timers, swim, resizes, moves,
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

/** Every child the Smooth page renders below its header, across its sections. */
const pageChildren = (runtime) => runtime.settings.component().children
  .slice(1)
  .flatMap((section) => (section && section.children) || []);

/** The page's settings rows, in order: the group headings carry no `title` prop. */
const settingRows = (runtime) => pageChildren(runtime)
  .filter((child) => child && typeof child.type === 'function' && child.props && 'title' in child.props);

/** The splash preview element, present only while it plays. */
const splashPart = (runtime) => pageChildren(runtime)
  .find((child) => child && child.props && 'onDone' in child.props);

/** The footer's one reset button. */
const resetButton = (runtime) => runtime.settings.component().children.at(-1)
  .children[0].children[0].children[0];

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
  for (const key of ['composer.copied', 'composer.switchWorkspace', 'composer.chooseWorkspace', 'composer.copyBranch', 'composer.branchMenu', 'composer.modelMenu', 'composer.searchModel', 'composer.modelLoading', 'composer.noModels', 'composer.reasoningEffort', 'composer.modelFailed', 'composer.searchBranch', 'composer.createBranch', 'composer.newBranch', 'composer.create', 'composer.cancel', 'composer.uncommitted', 'composer.files', 'composer.clean', 'composer.noBranches', 'composer.loading', 'composer.gitUnavailable', 'composer.gitConnectionFailed', 'composer.gitFailed']) {
    assert.equal(typeof runtime.dictionaries.zh[key], 'string', `missing zh ${key}`);
    assert.equal(typeof runtime.dictionaries.en[key], 'string', `missing en ${key}`);
  }
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
  await rows()[1].props.onChange('light');
  assert.equal(runtime.preference, 'light');
  assert.deepEqual(runtime.resizes, [], 'switching the theme must not resize or reposition the window');
  await rows()[2].props.onChange(false);
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

test('the settings page carries the enable switch, the mode choice and the launch animation', async () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const rows = settingRows(runtime);
  assert.equal(rows[0].props.checked, true, 'the enable switch stays the first row');
  assert.equal(rows[1].props.value, 'auto');
  assert.equal(rows[2].props.checked, true, 'the launch animation is on by default');
  assert.equal(rows[2].props.disabled, false);
  await rows[2].props.onChange(false);
  assert.deepEqual(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')),
    { enabled: true, theme: 'auto', boot: false, windowSize: { enabled: true, width: 1440, height: 900 } });
  assert.equal(settingRows(runtime)[2].props.checked, false);
  await resetButton(runtime).props.onClick();
  assert.deepEqual(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')),
    { enabled: true, theme: 'auto', boot: true, windowSize: { enabled: true, width: 1440, height: 900 } });
  runtime.dispose();
});

test('the settings page replays the index opening without touching the stored state', () => {
  const runtime = loadClient();
  runtime.plugin.apply(runtime.ctx);
  const rowOf = () => settingRows(runtime)[2];
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
