/**
 * Shared half of the Smooth bundle: the design palette, the theme-token map and
 * the persisted-state normalizer. Both halves read this file (build.mjs folds it
 * into lib/index.js and lib/client.js).
 */

/** Must stay identical to package.json `name`: the client module table keys on it. */
const PLUGIN_ID = 'dsh-smooth-skin';
const SKIN_ATTRIBUTE = 'data-smooth-skin';
/** Set while the launch animation owns the screen, and removed with its layer. */
const BOOT_ATTRIBUTE = 'data-smooth-boot';
/** Set on the document root only for the lifetime of a palette switch's View Transition.
 * The stylesheet keys the circle reveal on it, so an unrelated view transition elsewhere
 * in the host page cannot inherit the skin's animation. */
const THEME_SWITCH_ATTRIBUTE = 'data-smooth-theme-switch';
/** Set while the main surface is the welcome page — no session, panel or settings is
 * showing — so the hero draws the usage panel and drops the input card: there is nothing
 * to type into yet. Published by the chrome (src/layout.js) from the host's current view,
 * read by the stylesheet (src/skin.js) and the usage panel (src/usage.js), cleared with
 * the skin (src/client.js). The tab ledger's own count is not the switch: Home clears the
 * conversation without closing the strip, and the page it lands on is still the welcome
 * page. */
const HOME_ATTRIBUTE = 'data-smooth-home';
/** The body flag the stylesheet uses to hide the host dock when the capsule sits elsewhere. */
const USAGE_PLACEMENT_ATTRIBUTE = 'data-smooth-usage-placement';
/** Set on the body by the patched desktop shell after each page load, while the window
 * carries the system acrylic backdrop (`tools/patch-window-glass.mjs`). The skin never
 * writes it: without the mark the page keeps painting its own backdrop, and with it the
 * page hands its ground to the material. */
const WINDOW_GLASS_ATTRIBUTE = 'data-smooth-window-glass';
/** The Client half's durable store. Reaching no host service is what keeps activation safe. */
const STORAGE_KEY = 'dsh-smooth-skin:state';

/** The size the desktop window is put into while the application loads. The bounds are
 * the ones the renderer can ask for: the app itself is created at 1280 x 820 with a
 * 520 x 600 minimum, and anything larger than the screen's work area is clamped when the
 * request is made (see `applyWindowSize` in the browser half). */
const WINDOW_SIZE = { minWidth: 520, minHeight: 600, maxWidth: 10000, maxHeight: 10000 };
const DEFAULT_WINDOW_SIZE = { width: 1440, height: 900 };

/** Which figures the composer usage capsule can show, and the plugin default. Counts and
 * speed start hidden; the cost/token/cache/context readings are the default line. */
const USAGE_FIELD_KEYS = ['cost', 'input', 'output', 'cache', 'counts', 'speed', 'context'];
const DEFAULT_USAGE_FIELDS = {
  cost: true, input: true, output: true, cache: true, counts: false, speed: false, context: true,
};
const DEFAULT_USAGE_ORDER = [...USAGE_FIELD_KEYS];
/** Where the usage capsule sits: the context row, the composer's bottom bar, or its own row. */
const USAGE_PLACEMENTS = ['context', 'bottom', 'row'];
const DEFAULT_USAGE_PLACEMENT = 'bottom';
/** Horizontal alignment of the capsule in the bottom bar and its own row. */
const USAGE_ALIGNS = ['left', 'center', 'right'];
const DEFAULT_USAGE_ALIGN = 'left';

const DEFAULTS = {
  enabled: true,
  theme: 'auto',
  boot: true,
  // The desktop window opens at 1440 x 900 unless the user changes it in settings.
  windowSize: { enabled: true, ...DEFAULT_WINDOW_SIZE },
  // One colour ties the conversation's referenced files/key hints to the sidebar's
  // workspace names; see MARK_CHOICES below.
  mark: 'blue',
  // How much of the page background shows the skin's own backdrop, in percent. 0 keeps
  // every surface solid; 100 leaves only the painted gradient. The value is client-only:
  // it rides a CSS variable on the body, never a host channel.
  translucency: 5,
  // Which figures the composer's usage capsule shows. Counts and speed start hidden; the
  // value is client-only and rides the same durable store.
  usageFields: { ...DEFAULT_USAGE_FIELDS },
  // The order of those figures in the capsule, edited by dragging in the settings page.
  usageOrder: [...DEFAULT_USAGE_ORDER],
  // Where the capsule sits: beside the model selector, in the composer's bottom bar, or
  // on its own row below the card.
  usagePlacement: DEFAULT_USAGE_PLACEMENT,
  // Left/centre/right inside the bottom bar or its own row.
  usageAlign: DEFAULT_USAGE_ALIGN,
};

/** The colours the settings page offers for the mark colour. Both ends are hand-picked
 * to stay readable on their own theme (deep on light, bright on dark), the same way the
 * rest of the palette is paired. */
const MARK_CHOICES = {
  blue: { light: '#2f62c9', dark: '#85b2ff' },
  cyan: { light: '#0f7483', dark: '#63cfd8' },
  violet: { light: '#6647b5', dark: '#b39dff' },
  green: { light: '#2c7748', dark: '#74cf98' },
  orange: { light: '#a85a12', dark: '#ffb26b' },
  rose: { light: '#a63a63', dark: '#ff9ec0' },
};
const MARK_KEYS = Object.keys(MARK_CHOICES);

/** Literal colours live here only: everything else references --dsw-alias-* tokens. */
const PALETTE = {
  dark: {
    app: '#292c2e',
    rail: '#191b1d',
    sidebar: '#202123',
    layer1: '#303335',
    layer2: '#323537',
    layer3: '#393a3e',
    selected: '#393a3e',
    input: '#323537',
    overlay: '#2b2b2b',
    text: '#f1f2f4',
    muted: '#c3c5ca',
    faint: '#b4b7bf',
    solid: '#f7f7f8',
    solidText: '#181a1e',
    brand: '#8fb7ff',
    accent: '#ffcd96',
    link: '#85b2ff',
    indicator: '#8fb7ff',
    line1: '#3b3e40',
    line2: '#505356',
    line3: '#62666a',
    hover: '#34373a',
    active: '#393a3e',
    bubble: '#323537',
    bubbleHighlight: '#363b40',
    code: '#242729',
    scrollbar: 'rgba(255,255,255,.14)',
    scrollbarHover: 'rgba(255,255,255,.24)',
    error: '#ff8085',
    warn: '#e0a94a',
    success: '#7fb069',
    business: '#85b2ff',
    heat: '#3b6ecf',
    idle: '#666b70',
    modelTrack: '#2a2d30',
    modelBlue: '#4aa8ff',
    modelThumb: '#f2f5f9',
    modelDot: 'rgba(255,255,255,.32)',
  },
  light: {
    app: '#f4f5f7',
    rail: '#e2e5e9',
    sidebar: '#eceef1',
    layer1: '#ffffff',
    layer2: '#f5f6f8',
    layer3: '#f0f1f4',
    selected: '#dce3ee',
    input: '#ffffff',
    overlay: '#ffffff',
    text: '#31343a',
    muted: '#535b65',
    faint: '#5f656e',
    solid: '#26292e',
    solidText: '#f7f7f8',
    brand: '#3f6fd8',
    accent: '#c8763e',
    link: '#2f62c9',
    indicator: '#3f6fd8',
    line1: 'rgba(24,26,30,.10)',
    line2: 'rgba(24,26,30,.16)',
    line3: 'rgba(24,26,30,.24)',
    hover: 'rgba(24,26,30,.05)',
    active: 'rgba(24,26,30,.09)',
    bubble: '#e5eaf1',
    bubbleHighlight: '#e4e8ee',
    code: '#f4f5f7',
    scrollbar: 'rgba(24,26,30,.18)',
    scrollbarHover: 'rgba(24,26,30,.30)',
    error: '#c62b2e',
    warn: '#9a6c12',
    success: '#3f7a34',
    business: '#3f6fd8',
    heat: '#2f5fc4',
    idle: '#9aa0a8',
    modelTrack: '#edf0f4',
    modelBlue: '#0f9bff',
    modelThumb: '#ffffff',
    modelDot: 'rgba(24,26,30,.22)',
  },
};

/**
 * Named theme presets. Each one is a complete palette built on the tone it reads as, so a
 * preset only overrides the colours that carry its mood; `follow` has no entry of its own
 * and keeps the host's light and dark bases. The preset's tone is what the skin asks the
 * host theme preference to be while it is selected.
 */
PALETTE.snow = {
  ...PALETTE.light,
  app: '#f1f3f6', rail: '#e5eaee', sidebar: '#e8edf1',
  layer1: '#fdfeff', layer2: '#f3f5f8', layer3: '#e8edf2', selected: '#d8e1ea',
  input: '#ffffff', overlay: '#fdfeff',
  text: '#2f3540', muted: '#505865', faint: '#59626c',
  solid: '#2a3038', solidText: '#fdfeff', brand: '#6d93b8', accent: '#a9c3d8', link: '#3f6f9e', indicator: '#466c91',
  line1: 'rgba(40,55,70,.10)', line2: 'rgba(40,55,70,.16)', line3: 'rgba(40,55,70,.24)',
  hover: 'rgba(40,55,70,.05)', active: 'rgba(40,55,70,.09)',
  bubble: '#e3eaf2', bubbleHighlight: '#e0e8f1', code: '#dde5ed',
  scrollbar: 'rgba(40,55,70,.18)', scrollbarHover: 'rgba(40,55,70,.30)',
  error: '#b3372f', warn: '#8a6415', success: '#4f7a3a', business: '#5b7fa6', heat: '#5b87c4', idle: '#9aa4b0',
  modelTrack: '#eef2f6', modelBlue: '#4f86c6', modelThumb: '#ffffff', modelDot: 'rgba(40,55,70,.22)',
};
PALETTE.iron = {
  ...PALETTE.dark,
  app: '#1c1d20', rail: '#101012', sidebar: '#121416',
  layer1: '#24272b', layer2: '#2b2e32', layer3: '#31343a', selected: '#282c30',
  input: '#26282c', overlay: '#24272b',
  text: '#f1f3f5', muted: '#c5c9cf', faint: '#b6bbc2',
  solid: '#f5f7f9', solidText: '#121417', brand: '#b9c6d4', accent: '#d9b072', link: '#94b8e0', indicator: '#b9c6d4',
  line1: '#35393e', line2: '#42484f', line3: '#515961',
  hover: 'rgba(255,255,255,.06)', active: '#30353b',
  bubble: '#25282b', bubbleHighlight: '#292d32', code: '#101113',
  error: '#ff8085', warn: '#e0a94a', success: '#7fb069', business: '#b9c6d4', heat: '#89a9d6', idle: '#6c7178',
  modelTrack: '#2a2d31', modelBlue: '#6aa8f0', modelThumb: '#f4f6f9', modelDot: 'rgba(255,255,255,.32)',
};
PALETTE.moss = {
  ...PALETTE.light,
  app: '#eff2ec', rail: '#e4e8e1', sidebar: '#e7ece3',
  layer1: '#fbfcf9', layer2: '#f0f5ec', layer3: '#e7eddf', selected: '#d6e2ce',
  input: '#fcfdfa', overlay: '#fbfcf9',
  text: '#303731', muted: '#515950', faint: '#59635a',
  solid: '#2a322c', solidText: '#fbfcf9', brand: '#5f8a63', accent: '#a8834d', link: '#3f6f4f', indicator: '#4d7050',
  line1: 'rgba(42,60,45,.10)', line2: 'rgba(42,60,45,.16)', line3: 'rgba(42,60,45,.24)',
  hover: 'rgba(42,60,45,.05)', active: 'rgba(42,60,45,.09)',
  bubble: '#e3ece1', bubbleHighlight: '#e0e8dc', code: '#dce5d2',
  scrollbar: 'rgba(42,60,45,.18)', scrollbarHover: 'rgba(42,60,45,.30)',
  error: '#b3372f', warn: '#8a6b1f', success: '#3f7a3f', business: '#4e7a5e', heat: '#4d7f63', idle: '#98a099',
  modelTrack: '#e9eee3', modelBlue: '#4f8a5e', modelThumb: '#ffffff', modelDot: 'rgba(42,60,45,.22)',
};
PALETTE.sunset = {
  ...PALETTE.light,
  app: '#f7ede3', rail: '#eee3d6', sidebar: '#f2e6d8',
  layer1: '#fef9f2', layer2: '#f9f0e2', layer3: '#f4e7d4', selected: '#edd9bf',
  input: '#fffaf3', overlay: '#fef9f2',
  text: '#3a2f24', muted: '#635241', faint: '#6c5c49',
  solid: '#33291e', solidText: '#fef9f2', brand: '#c26a1f', accent: '#d08a3e', link: '#a75a12', indicator: '#9a5419',
  line1: 'rgba(80,50,25,.10)', line2: 'rgba(80,50,25,.16)', line3: 'rgba(80,50,25,.24)',
  hover: 'rgba(80,50,25,.05)', active: 'rgba(80,50,25,.09)',
  bubble: '#f3dec3', bubbleHighlight: '#f1dcca', code: '#f0debf',
  scrollbar: 'rgba(80,50,25,.18)', scrollbarHover: 'rgba(80,50,25,.30)',
  error: '#b3352f', warn: '#8a6415', success: '#4e7a3a', business: '#c26a1f', heat: '#c26a1f', idle: '#9d9484',
  modelTrack: '#f3e6d0', modelBlue: '#c26a1f', modelThumb: '#fffdf8', modelDot: 'rgba(80,50,25,.22)',
};
PALETTE.deepsea = {
  ...PALETTE.dark,
  app: '#121c24', rail: '#080d11', sidebar: '#0b1216',
  layer1: '#1a2630', layer2: '#1f2d39', layer3: '#243540', selected: '#1e2b34',
  input: '#1b2731', overlay: '#1a2630',
  text: '#eaf2f8', muted: '#b7c6d4', faint: '#a6b7c7',
  solid: '#f0f6fb', solidText: '#0e161d', brand: '#5aa0c8', accent: '#d9a45e', link: '#6fb3dc', indicator: '#5aa0c8',
  line1: '#243845', line2: '#304856', line3: '#3d5a68',
  hover: 'rgba(255,255,255,.06)', active: '#263641',
  bubble: '#1d2a34', bubbleHighlight: '#21303b', code: '#090d11',
  error: '#ff8a8f', warn: '#e3b05a', success: '#82b878', business: '#5aa0c8', heat: '#4f96c4', idle: '#697b88',
  modelTrack: '#22313d', modelBlue: '#4f9fd0', modelThumb: '#f2f8fc', modelDot: 'rgba(255,255,255,.30)',
};

/** The theme ids in settings order, and which host tone each preset reads as. */
const THEME_PRESETS = ['auto', 'snow', 'iron', 'moss', 'sunset', 'deepsea'];
const THEME_TONES = { snow: 'light', iron: 'dark', moss: 'light', sunset: 'light', deepsea: 'dark' };
function themeTone(theme) {
  return THEME_TONES[theme];
}

/**
 * Theme-token overrides. Every value carries both tones because the theme service
 * requires light and dark together; a token the host does not define is inert.
 */
function buildTokens(state) {
  // A named preset paints both tones with its own palette, so the skin reads the same
  // whichever host tone is current. Following the theme pairs the two presets that name
  // the tones: first-snow white in light, iron black in dark.
  const preset = PALETTE[state?.theme];
  const dark = preset || PALETTE.iron;
  const light = preset || PALETTE.snow;
  const pair = (key) => ({ light: light[key], dark: dark[key] });
  const tokens = {};
  const put = (name, key) => { tokens[name] = pair(key); };

  put('--dsw-alias-bg-base', 'app');
  put('--dsw-alias-bg-layer-1', 'layer1');
  put('--dsw-alias-bg-layer-2', 'layer2');
  put('--dsw-alias-bg-layer-3', 'layer3');
  put('--dsw-alias-bg-overlay', 'overlay');

  put('--dsw-alias-label-primary', 'text');
  put('--dsw-alias-label-secondary', 'muted');
  put('--dsw-alias-label-tertiary', 'faint');
  put('--dsw-alias-label-primary-foreground', 'solidText');

  put('--dsw-alias-border-l1', 'line1');
  put('--dsw-alias-border-l2', 'line2');
  put('--dsw-alias-border-l3', 'line3');
  put('--dsw-alias-border-l4', 'line3');

  put('--dsw-alias-brand-primary', 'brand');
  put('--dsw-alias-state-business-primary', 'business');
  put('--dsw-alias-state-error-primary', 'error');
  put('--dsw-alias-state-warn-primary', 'warn');
  put('--dsw-alias-state-success-primary', 'success');
  put('--dsw-alias-state-idle-primary', 'idle');
  put('--dsw-alias-link', 'link');
  // The mark colour is one explicit choice instead of the theme's link colour: it paints
  // the link-family text in the conversation (referenced files, inline code/key hints).
  const mark = MARK_CHOICES[state.mark] || MARK_CHOICES[DEFAULTS.mark];
  tokens['--dsw-alias-link'] = { light: mark.light, dark: mark.dark };

  put('--dsw-specific-sidebar-fill', 'sidebar');
  put('--dsw-specific-input-major', 'input');
  put('--dsw-specific-bubble', 'bubble');
  put('--dsw-specific-bubble-highlight', 'bubbleHighlight');

  put('--dsw-alias-interactive-bg-hover', 'hover');
  put('--dsw-alias-interactive-bg-active', 'active');
  put('--dsw-specific-sidebar-nav-item-hover', 'hover');
  put('--dsw-specific-sidebar-nav-item-active', 'active');

  put('--dsw-alias-button-primary-fill', 'solid');
  put('--dsw-alias-button-primary-hover', 'solid');
  put('--dsw-alias-button-elevated-fill', 'layer2');
  put('--dsw-alias-button-floating-fill', 'layer2');
  put('--dsw-alias-button-floating-hover', 'layer3');
  put('--dsw-alias-button-tool-bar-fill', 'layer2');
  put('--dsw-alias-button-tool-bar-hover', 'layer3');
  put('--dsw-alias-switch-thumb', 'solid');

  put('--dsw-alias-settings-card-fill', 'layer1');
  put('--dsw-alias-settings-card-stroke', 'line1');

  put('--dsw-alias-markdown-code-block', 'code');
  put('--dsw-alias-markdown-code-block-banner', 'layer2');
  put('--dsw-alias-markdown-inline-code', 'layer3');

  put('--dsw-alias-scrollbar-bg-l1', 'scrollbar');
  put('--dsw-alias-scrollbar-hover-l1', 'scrollbarHover');

  // Plugin-local tokens consumed by the skin stylesheet. Plugin UI may carry its
  // own artwork colours, so these are literals and not host aliases.
  tokens['--smooth-app'] = pair('app');
  tokens['--smooth-rail'] = pair('rail');
  tokens['--smooth-sidebar'] = pair('sidebar');
  tokens['--smooth-surface'] = pair('layer1');
  tokens['--smooth-surface-2'] = pair('layer2');
  tokens['--smooth-surface-3'] = pair('layer3');
  tokens['--smooth-selected'] = pair('selected');
  // The mild component weight needs hover/active tints and the bubble as palette
  // colours: a translucent variant cannot reference the host token it overrides.
  tokens['--smooth-hover'] = pair('hover');
  tokens['--smooth-active'] = pair('active');
  tokens['--smooth-bubble'] = pair('bubble');
  tokens['--smooth-line'] = pair('line1');
  tokens['--smooth-line-strong'] = pair('line2');
  tokens['--smooth-text'] = pair('text');
  tokens['--smooth-muted'] = pair('muted');
  tokens['--smooth-ink'] = pair('solidText');
  tokens['--smooth-accent'] = pair('brand');
  tokens['--smooth-warm'] = pair('accent');
  // The selection indicator: the brand hue, deepened on light presets until it clears
  // 3:1 against the selected fill, where it inks the selected tab's keyboard focus ring.
  // The accent alone does not (1.9-2.3:1 on the light presets), so "where is the keyboard"
  // cannot ride on the accent colour.
  tokens['--smooth-indicator'] = pair('indicator');
  // The landing page's usage heatmap ink: the reference card's cobalt, which reads as
  // one scale on the dark well and on the light one.
  tokens['--smooth-heat'] = pair('heat');
  // The model/effort slider follows the palette: a deep accent on light tracks and a
  // lighter one on dark tracks; presets carry both ends in their own palette.
  tokens['--smooth-model-track'] = pair('modelTrack');
  tokens['--smooth-model-blue'] = pair('modelBlue');
  tokens['--smooth-model-thumb'] = pair('modelThumb');
  tokens['--smooth-model-dot'] = pair('modelDot');

  return tokens;
}

/** Keep a persisted size inside the range the renderer may ask for, falling back to the
 * default per field rather than rejecting the whole record. */
function normalizeSize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const size = {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULTS.windowSize.enabled,
    width: DEFAULTS.windowSize.width,
    height: DEFAULTS.windowSize.height,
  };
  for (const [key, min, max] of [['width', WINDOW_SIZE.minWidth, WINDOW_SIZE.maxWidth], ['height', WINDOW_SIZE.minHeight, WINDOW_SIZE.maxHeight]]) {
    const value = Math.round(Number(source[key]));
    if (Number.isFinite(value) && value >= min && value <= max) size[key] = value;
  }
  return size;
}

/** Legacy "day/night" values map onto the presets they used to mean; anything else falls
 * back to following the host theme. */
/** Legacy "day/night" values and the previous preset ids map onto the new presets;
 * anything else falls back to following the host theme. */
const LEGACY_THEMES = { light: 'snow', dark: 'iron', paper: 'snow', obsidian: 'iron', celadon: 'moss', mist: 'moss', amber: 'sunset', azure: 'deepsea' };
function normalizeTheme(value) {
  const theme = LEGACY_THEMES[value] || value;
  return THEME_PRESETS.includes(theme) ? theme : undefined;
}

/** The background translucency is a whole percentage. A record that is not a number
 * keeps the default instead of turning the page fully transparent. */
function normalizeTranslucency(value) {
  if (value === null || value === undefined || value === '') return DEFAULTS.translucency;
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return DEFAULTS.translucency;
  return Math.min(100, Math.max(0, number));
}

/** A stored field record keeps its booleans and fills anything missing from the plugin
 * defaults (counts and speed off, the rest on). */
function normalizeUsageFields(value) {
  const source = value && typeof value === 'object' ? value : {};
  const fields = {};
  for (const key of USAGE_FIELD_KEYS) {
    fields[key] = typeof source[key] === 'boolean' ? source[key] : DEFAULT_USAGE_FIELDS[key];
  }
  return fields;
}

/** Keep the stored order's known keys once, then append any field it left out. */
function normalizeUsageOrder(value) {
  const source = Array.isArray(value) ? value : [];
  const order = [];
  for (const key of source) {
    if (USAGE_FIELD_KEYS.includes(key) && !order.includes(key)) order.push(key);
  }
  for (const key of USAGE_FIELD_KEYS) if (!order.includes(key)) order.push(key);
  return order;
}

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const state = { ...DEFAULTS };
  if (typeof source.enabled === 'boolean') state.enabled = source.enabled;
  const theme = normalizeTheme(source.theme);
  if (theme !== undefined) state.theme = theme;
  if (typeof source.boot === 'boolean') state.boot = source.boot;
  if (MARK_KEYS.includes(source.mark)) state.mark = source.mark;
  state.translucency = normalizeTranslucency(source.translucency);
  state.windowSize = normalizeSize(source.windowSize);
  state.usageFields = normalizeUsageFields(source.usageFields);
  state.usageOrder = normalizeUsageOrder(source.usageOrder);
  state.usagePlacement = USAGE_PLACEMENTS.includes(source.usagePlacement) ? source.usagePlacement : DEFAULTS.usagePlacement;
  state.usageAlign = USAGE_ALIGNS.includes(source.usageAlign) ? source.usageAlign : DEFAULTS.usageAlign;
  return state;
}

function configFromState(state) {
  return { enabled: state.enabled, theme: state.theme, boot: state.boot, windowSize: state.windowSize };
}

function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const config = {};
  if (typeof source.enabled === 'boolean') config.enabled = source.enabled;
  const theme = normalizeTheme(source.theme);
  if (theme !== undefined) config.theme = theme;
  if (typeof source.boot === 'boolean') config.boot = source.boot;
  config.windowSize = normalizeSize(source.windowSize);
  return config;
}

const LocaleNS = 'smooth';
const zhCN = {
  'composer.placeholder': '描述任务，/ 调用指令，@ 引用文件或对话',
  'composer.copied': '已复制',
  'composer.switchWorkspace': '切换工作区',
  'composer.chooseWorkspace': '选择工作区',
  'composer.workspaceList': '工作区列表',
  'composer.searchWorkspace': '搜索工作区名',
  'composer.workspaceLoading': '正在加载工作区…',
  'composer.workspaceNoMatch': '没有匹配的工作区',
  'composer.workspaceEmpty': '还没有工作区',
  'composer.clearSearch': '清除搜索',
  'composer.defaultWorkspace': '默认工作区',
  'composer.addWorkspace': '添加工作区…',
  'composer.workspaceErrorTitle': '无法添加工作区',
  'composer.workspaceRetry': '重新选择',
  'composer.workspaceMissing': '没有可用的工作区',
  'composer.copyBranch': '复制分支名',
  'composer.branchMenu': '分支',
  'composer.modelMenu': '模型',
  'composer.back': '返回',
  'composer.searchModel': '搜索模型',
  'composer.modelLoading': '正在读取…',
  'composer.noModels': '没有模型',
  'composer.reasoningEffort': '思考强度',
  'composer.effortAuto': '使用 Default 思考强度',
  'composer.effortDefault': 'Default',
  'composer.modelFailed': '模型切换失败',
  'composer.searchBranch': '搜索分支',
  'composer.createBranch': '创建并检出新分支…',
  'composer.newBranch': '新分支名称',
  'composer.create': '创建',
  'composer.cancel': '取消',
  'composer.uncommitted': '未提交',
  'composer.files': '个文件',
  'composer.clean': '工作区干净',
  'composer.noBranches': '没有分支',
  'composer.loading': '正在读取…',
  'composer.gitUnavailable': 'Git 服务未加载，请重启 DSH 后再试',
  'composer.gitConnectionFailed': 'Git 服务连接失败，请重启 DSH 后再试',
  'composer.gitFailed': 'Git 操作失败',
  'composer.context.aria': '上下文已用 %s',
  'composer.context.title': '上下文占用与用量',
  'composer.context.used': '上下文已用',
  'composer.context.system': '系统提示词',
  'composer.context.tools': '工具定义',
  'composer.context.messages': '对话消息',
  'composer.context.stats': '会话统计',
  'composer.context.llmTime': '模型用时',
  'composer.context.toolTime': '工具调用用时',
  'composer.context.ttft': '首 token 平均（TTFT）',
  'composer.context.tps': '输出速度（TPS）',
  'composer.context.tokens': 'Token 用量',
  'composer.context.cacheHit': '缓存命中',
  'composer.context.uncachedInput': '未缓存输入',
  'composer.context.cacheRead': '缓存读取',
  'composer.context.output': '输出',
  'composer.context.thousand': '%sK',
  'composer.context.million': '%sM',
  'composer.context.group': ',',
  'composer.context.durationSeconds': '%s秒',
  'composer.context.durationMinutes': '%s分%s秒',
  'composer.context.tpsValue': '%s tok/s',
  'composer.context.tok': '%s tok',
  'composer.stats.aria': '本次对话用量',
  'composer.stats.used': '已用',
  'composer.stats.currency': '元',
  'composer.stats.estimate': '按当前时段单价估算',
  'composer.stats.input': '输入',
  'composer.stats.output': '输出',
  'composer.stats.cache': '缓存命中',
  'composer.stats.counts': '%s 轮 %s 步',
  'composer.stats.countsTitle': '轮次与步数',
  'composer.stats.speed': '%s tok/s',
  'composer.stats.speedTitle': '输出速度',
  'shell.main': '主页面',
  'shell.home': '首页',
  'shell.new': '新会话',
  'shell.plugins': '插件',
  'shell.settings': '设置',
  'shell.general': '通用设置',
  'shell.workspaceFilter': '工作区筛选',
  'shell.inProgress': '进行中',
  'shell.archived': '已归档',
  'shell.close': '关闭',
  'shell.deleteSession': '删除归档对话',
  'shell.deleteSessionTitle': '删除归档对话',
  'shell.deleteSessionDesc': '将永久删除「%s」的本地会话记录，无法恢复。',
  'shell.deleteSessionConfirm': '删除',
  'shell.deleteSessionPending': '正在删除…',
  'usage.title': '每日 token 使用',
  'usage.tabOverview': '概览',
  'usage.tabModels': '模型',
  'usage.rangeAll': '全部',
  'usage.range30d': '30 天',
  'usage.range7d': '7 天',
  'usage.sessions': '会话数',
  'usage.calls': '消息数',
  'usage.tokens': 'Token 总量',
  'usage.activeDays': '活跃天数',
  'usage.peak': '高峰时段',
  'usage.topModel': '最常用模型',
  'usage.hourAm': '上午 %s 点',
  'usage.hourPm': '下午 %s 点',
  'usage.heatTip': '%s — %s Token',
  'usage.fun': '你的 Token 用量相当于 %s 本《%s》。',
  'usage.modelsEmpty': '暂无模型数据',
  'usage.modelsMore': '再显示 %s 个',
  'usage.modelsLess': '收起',
  'usage.book.taoTeChing': '道德经',
  'usage.book.metamorphosis': '变形记',
  'usage.book.alice': '爱丽丝梦游仙境',
  'usage.book.animalFarm': '动物农场',
  'usage.book.gatsby': '了不起的盖茨比',
  'usage.book.philosophersStone': '哈利·波特与魔法石',
  'usage.book.nineteenEightyFour': '一九八四',
  'usage.book.sherlock': '福尔摩斯探案集',
  'usage.book.walden': '瓦尔登湖',
  'usage.book.madameBovary': '包法利夫人',
  'usage.book.pride': '傲慢与偏见',
  'usage.book.odyssey': '奥德赛',
  'usage.book.taleOfTwoCities': '双城记',
  'usage.book.threeBody': '三体',
  'usage.book.crimeAndPunishment': '罪与罚',
  'usage.book.annaKarenina': '安娜·卡列尼娜',
  'usage.book.donQuixote': '堂吉诃德',
  'usage.book.lordOfTheRings': '魔戒',
  'usage.book.threeKingdoms': '三国演义',
  'usage.book.warAndPeace': '战争与和平',
  'usage.book.journeyWest': '西游记',
  'usage.book.lesMiserables': '悲惨世界',
  'usage.book.redChamber': '红楼梦',
  'usage.book.waterMargin': '水浒传',
  'usage.book.ordinaryWorld': '平凡的世界',
  'usage.book.harryPotter': '哈利·波特全集',
  'usage.book.lostTime': '追忆似水年华',
  'account.balance': '账户余额',
  'account.usage': '剩余用量',
  'account.refresh': '刷新余额',
  'account.empty': '暂无可用余额',
  'account.loading': '正在读取余额…',
  'account.failed': '余额读取失败，请点击刷新重试',
  'account.refreshFailed': '刷新失败，当前显示上次读取的余额',
  'account.help': '帮助',
  'account.back': '返回',
  'shell.closeTab': '关闭标签页',
  'shell.untitled': '未命名会话',
  'account.github': '查看 Github',
  'account.docs': '开发者文档',
  'account.plugins': '社区插件',
  'account.paper': 'cordis 论文',
  'section.title': 'Smooth 皮肤',
  'settings.title': 'Smooth',
  'settings.subtitle': '统一 Harness 的配色、圆角、标签栏、输入框与启动画面，全部集中在皮肤里。',
  'settings.stateOn': '已启用',
  'settings.stateOff': '已关闭',
  'settings.groupAppearance': '外观',
  'settings.groupStartup': '启动',
  'settings.enable': '启用 Smooth 皮肤',
  'settings.enableHint': '关闭后恢复 Harness 原生外观。',
  'settings.theme': '主题',
  'settings.theme.auto': '跟随主题',
  'settings.theme.snow': '初雪白',
  'settings.theme.iron': '玄铁黑',
  'settings.theme.moss': '苔痕绿',
  'settings.theme.sunset': '落日橙',
  'settings.theme.deepsea': '深海蓝',
  'settings.themeHint': '跟随主题时，浅色用初雪白、深色用玄铁黑；选固定预设会暂时把宿主明暗切到对应色调。',
  'settings.translucency': '背景透明度',
  'settings.translucencyHint': '0% 时页面背景完全不透明；数值越高，背景越透出皮肤自己的柔和渐变。',
  'settings.translucencyHintWindow': '0% 时页面完全不透明；数值越高，页面越透出系统亚克力——桌面的磨砂视图会从背景里透出来。',
  'settings.mark': '标记颜色',
  'settings.markHint': '统一改变对话区的引用文件与重点提示的颜色。',
  'settings.groupUsage': '对话统计信息',
  'settings.usageOrderHint': '拖动可改变排列顺序',
  'settings.usageAlign': '按钮位置',
  'settings.usageAlign.left': '左侧',
  'settings.usageAlign.center': '居中',
  'settings.usageAlign.right': '右侧',
  'settings.usagePlacement': '显示位置',
  'settings.usagePlacement.context': '收进上下文',
  'settings.usagePlacement.bottom': '紧贴底栏',
  'settings.usagePlacement.row': '独立成行',
  'settings.usagePreview': '预览',
  'settings.usagePreviewLabel': '用量按钮预览',
  'settings.usageEmpty': '没有选择任何数据，按钮会隐藏。',
  'settings.usage.sampleCounts': '8 轮 8 步',
  'settings.usage.cost': '金额',
  'settings.usage.input': '输入 tok',
  'settings.usage.output': '输出 tok',
  'settings.usage.cache': '缓存命中',
  'settings.usage.counts': '轮次/步数',
  'settings.usage.speed': 'tok/s',
  'settings.usage.context': '上下文占比',
  'settings.mark.blue': '蓝',
  'settings.mark.cyan': '青',
  'settings.mark.violet': '紫',
  'settings.mark.green': '绿',
  'settings.mark.orange': '橙',
  'settings.mark.rose': '玫红',
  'settings.boot': '启动动画',
  'settings.bootHint': '页面加载时播放黑白鲸鱼开场，随后侧栏、标签与输入框依次淡入；下次加载生效，系统开启“减少动态效果”时自动跳过。',
  'settings.bootPreview': '预览',
  'settings.bootPreviewLabel': '预览启动动画',
  'settings.bootPlaying': '播放中…',
  'settings.bootReduced': '（当前系统开启了“减少动态效果”，启动时不会播放，预览不可用。）',
  'settings.windowSize': '启动窗口尺寸',
  'settings.windowSizeHint': '启动时把窗口设为这个尺寸并居中，超出屏幕可用区域会自动收窄（最小 520 × 600）。改宽高立即生效；开关只决定下次启动用不用这个尺寸，不会移动当前窗口。',
  'settings.windowSizeWidth': '宽',
  'settings.windowSizeHeight': '高',
  'settings.windowSizeCurrent': '当前窗口',
  'settings.windowSizeDefault': '恢复 1440 × 900',
  'settings.autosave': '更改会自动保存。',
  'settings.reset': '恢复默认设置',
  'settings.loading': '正在读取设置…',
  'settings.saved': '已保存',
};

const enUS = {
  'composer.placeholder': 'Describe a task, / commands, @ files or chats',
  'composer.copied': 'Copied',
  'composer.switchWorkspace': 'Switch workspace',
  'composer.chooseWorkspace': 'Choose workspace',
  'composer.workspaceList': 'Workspaces',
  'composer.searchWorkspace': 'Search workspaces',
  'composer.workspaceLoading': 'Loading workspaces…',
  'composer.workspaceNoMatch': 'No matching workspaces',
  'composer.workspaceEmpty': 'No workspaces yet',
  'composer.clearSearch': 'Clear search',
  'composer.defaultWorkspace': 'Default workspace',
  'composer.addWorkspace': 'Add workspace…',
  'composer.workspaceErrorTitle': 'Couldn’t add workspace',
  'composer.workspaceRetry': 'Choose again',
  'composer.workspaceMissing': 'No workspace returned',
  'composer.copyBranch': 'Copy branch name',
  'composer.branchMenu': 'Branch',
  'composer.modelMenu': 'Model',
  'composer.back': 'Back',
  'composer.searchModel': 'Search models',
  'composer.modelLoading': 'Loading…',
  'composer.noModels': 'No models',
  'composer.reasoningEffort': 'Reasoning effort',
  'composer.effortAuto': 'Use the provider default effort',
  'composer.effortDefault': 'Default',
  'composer.modelFailed': 'Could not switch model',
  'composer.searchBranch': 'Search branches',
  'composer.createBranch': 'Create and checkout new branch…',
  'composer.newBranch': 'New branch name',
  'composer.create': 'Create',
  'composer.cancel': 'Cancel',
  'composer.uncommitted': 'Uncommitted',
  'composer.files': 'files',
  'composer.clean': 'Clean working tree',
  'composer.noBranches': 'No branches',
  'composer.loading': 'Loading…',
  'composer.gitUnavailable': 'Git service is not loaded. Restart DSH and try again.',
  'composer.gitConnectionFailed': 'Could not reach the Git service. Restart DSH and try again.',
  'composer.gitFailed': 'Git operation failed',
  'composer.context.aria': 'Context used: %s',
  'composer.context.title': 'Context occupancy and usage',
  'composer.context.used': 'Context used',
  'composer.context.system': 'System prompt',
  'composer.context.tools': 'Tool definitions',
  'composer.context.messages': 'Conversation messages',
  'composer.context.stats': 'Session stats',
  'composer.context.llmTime': 'Model time',
  'composer.context.toolTime': 'Tool time',
  'composer.context.ttft': 'First token avg (TTFT)',
  'composer.context.tps': 'Output speed (TPS)',
  'composer.context.tokens': 'Token usage',
  'composer.context.cacheHit': 'Cache hit',
  'composer.context.uncachedInput': 'Uncached input',
  'composer.context.cacheRead': 'Cache read',
  'composer.context.output': 'Output',
  'composer.context.thousand': '%sK',
  'composer.context.million': '%sM',
  'composer.context.group': ',',
  'composer.context.durationSeconds': '%ss',
  'composer.context.durationMinutes': '%sm %ss',
  'composer.context.tpsValue': '%s tok/s',
  'composer.context.tok': '%s tok',
  'composer.stats.aria': 'Session usage',
  'composer.stats.used': 'Used',
  'composer.stats.currency': 'CNY',
  'composer.stats.estimate': 'Estimated at the current time-of-day rate',
  'composer.stats.input': 'Input',
  'composer.stats.output': 'Output',
  'composer.stats.cache': 'Cache hit',
  'composer.stats.counts': '%s turns %s steps',
  'composer.stats.countsTitle': 'Turns and steps',
  'composer.stats.speed': '%s tok/s',
  'composer.stats.speedTitle': 'Output speed',
  'shell.main': 'Main page',
  'shell.home': 'Home',
  'shell.new': 'New chat',
  'shell.plugins': 'Plugins',
  'shell.settings': 'Settings',
  'shell.general': 'General',
  'shell.workspaceFilter': 'Filter workspaces',
  'shell.inProgress': 'In progress',
  'shell.archived': 'Archived',
  'shell.close': 'Close',
  'shell.deleteSession': 'Delete archived conversation',
  'shell.deleteSessionTitle': 'Delete archived conversation',
  'shell.deleteSessionDesc': 'This permanently deletes the local record of “%s”. It cannot be undone.',
  'shell.deleteSessionConfirm': 'Delete',
  'shell.deleteSessionPending': 'Deleting…',
  'usage.title': 'Daily token usage',
  'usage.tabOverview': 'Overview',
  'usage.tabModels': 'Models',
  'usage.rangeAll': 'All',
  'usage.range30d': '30d',
  'usage.range7d': '7d',
  'usage.sessions': 'Sessions',
  'usage.calls': 'Messages',
  'usage.tokens': 'Total tokens',
  'usage.activeDays': 'Active days',
  'usage.peak': 'Peak hour',
  'usage.topModel': 'Favorite model',
  'usage.hourAm': '%s AM',
  'usage.hourPm': '%s PM',
  'usage.heatTip': '%s — %s tokens',
  'usage.fun': "You've used ~%s× the tokens in %s.",
  'usage.modelsEmpty': 'No model data yet',
  'usage.modelsMore': 'Show %s more',
  'usage.modelsLess': 'Show less',
  'usage.book.taoTeChing': 'Tao Te Ching',
  'usage.book.metamorphosis': 'The Metamorphosis',
  'usage.book.alice': "Alice's Adventures in Wonderland",
  'usage.book.animalFarm': 'Animal Farm',
  'usage.book.gatsby': 'The Great Gatsby',
  'usage.book.philosophersStone': "Harry Potter and the Philosopher's Stone",
  'usage.book.nineteenEightyFour': 'Nineteen Eighty-Four',
  'usage.book.sherlock': 'The Adventures of Sherlock Holmes',
  'usage.book.walden': 'Walden',
  'usage.book.madameBovary': 'Madame Bovary',
  'usage.book.pride': 'Pride and Prejudice',
  'usage.book.odyssey': 'The Odyssey',
  'usage.book.taleOfTwoCities': 'A Tale of Two Cities',
  'usage.book.threeBody': 'The Three-Body Problem',
  'usage.book.crimeAndPunishment': 'Crime and Punishment',
  'usage.book.annaKarenina': 'Anna Karenina',
  'usage.book.donQuixote': 'Don Quixote',
  'usage.book.lordOfTheRings': 'The Lord of the Rings',
  'usage.book.threeKingdoms': 'Romance of the Three Kingdoms',
  'usage.book.warAndPeace': 'War and Peace',
  'usage.book.journeyWest': 'Journey to the West',
  'usage.book.lesMiserables': 'Les Misérables',
  'usage.book.redChamber': 'Dream of the Red Chamber',
  'usage.book.waterMargin': 'Water Margin',
  'usage.book.ordinaryWorld': 'Ordinary World',
  'usage.book.harryPotter': 'the whole Harry Potter series',
  'usage.book.lostTime': 'In Search of Lost Time',
  'account.balance': 'Account balance',
  'account.usage': 'Remaining usage',
  'account.refresh': 'Refresh balance',
  'account.empty': 'No available balance',
  'account.loading': 'Reading balance…',
  'account.failed': 'Could not read the balance. Use Refresh to try again.',
  'account.refreshFailed': 'Refresh failed. Showing the previously loaded balance.',
  'account.help': 'Help',
  'account.back': 'Back',
  'shell.closeTab': 'Close tab',
  'shell.untitled': 'Untitled conversation',
  'account.github': 'View Github',
  'account.docs': 'Developer documentation',
  'account.plugins': 'Community plugins',
  'account.paper': 'cordis paper',
  'section.title': 'Smooth skin',
  'settings.title': 'Smooth',
  'settings.subtitle': 'One skin for the whole Harness: palette, radii, tabs, composer and launch screen.',
  'settings.stateOn': 'Enabled',
  'settings.stateOff': 'Disabled',
  'settings.groupAppearance': 'Appearance',
  'settings.groupStartup': 'Startup',
  'settings.enable': 'Enable the Smooth skin',
  'settings.enableHint': 'Turning this off restores the stock Harness appearance.',
  'settings.theme': 'Theme',
  'settings.theme.auto': 'Follow theme',
  'settings.theme.snow': 'First snow',
  'settings.theme.iron': 'Iron black',
  'settings.theme.moss': 'Moss green',
  'settings.theme.sunset': 'Sunset orange',
  'settings.theme.deepsea': 'Deep sea blue',
  'settings.themeHint': 'Following the theme uses First snow in light and Iron black in dark; a fixed preset also switches the host tone while it is selected.',
  'settings.translucency': 'Background transparency',
  'settings.translucencyHint': '0% keeps the page background solid; higher values let the skin\u2019s own soft gradient show through.',
  'settings.translucencyHintWindow': '0% keeps the page solid; higher values let the window\u2019s system acrylic — a frosted view of the desktop — show through the background.',
  'settings.mark': 'Mark colour',
  'settings.markHint': 'One colour for the referenced files and key hints in the conversation.',
  'settings.groupUsage': 'Conversation stats',
  'settings.usageOrderHint': 'Drag to change the order',
  'settings.usageAlign': 'Button position',
  'settings.usageAlign.left': 'Left',
  'settings.usageAlign.center': 'Center',
  'settings.usageAlign.right': 'Right',
  'settings.usagePlacement': 'Placement',
  'settings.usagePlacement.context': 'In context',
  'settings.usagePlacement.bottom': 'Bottom bar',
  'settings.usagePlacement.row': 'Own row',
  'settings.usagePreview': 'Preview',
  'settings.usagePreviewLabel': 'Usage button preview',
  'settings.usageEmpty': 'No figures selected — the button will be hidden.',
  'settings.usage.sampleCounts': '8 turns 8 steps',
  'settings.usage.cost': 'Cost',
  'settings.usage.input': 'Input tokens',
  'settings.usage.output': 'Output tokens',
  'settings.usage.cache': 'Cache hit',
  'settings.usage.counts': 'Turns / steps',
  'settings.usage.speed': 'tok/s',
  'settings.usage.context': 'Context share',
  'settings.mark.blue': 'Blue',
  'settings.mark.cyan': 'Cyan',
  'settings.mark.violet': 'Violet',
  'settings.mark.green': 'Green',
  'settings.mark.orange': 'Orange',
  'settings.mark.rose': 'Rose',
  'settings.boot': 'Launch animation',
  'settings.bootHint': 'Plays the monochrome whale opening on page load, then fades the sidebar, tabs and input card in. It applies on the next load and is skipped when the system asks for reduced motion.',
  'settings.bootPreview': 'Preview',
  'settings.bootPreviewLabel': 'Preview the launch animation',
  'settings.bootPlaying': 'Playing…',
  'settings.bootReduced': '(Reduced motion is on, so the opening is skipped at startup and cannot be previewed.)',
  'settings.windowSize': 'Window size at launch',
  'settings.windowSizeHint': 'Sizes and centres the desktop window while the application loads; requests beyond the screen work area are clamped (520 × 600 minimum). Editing the width or height applies immediately; the switch only controls the next launch and never moves the current window.',
  'settings.windowSizeWidth': 'Width',
  'settings.windowSizeHeight': 'Height',
  'settings.windowSizeCurrent': 'Current window',
  'settings.windowSizeDefault': 'Reset to 1440 × 900',
  'settings.autosave': 'Changes are saved automatically.',
  'settings.reset': 'Reset to defaults',
  'settings.loading': 'Reading settings…',
  'settings.saved': 'Saved',
};
