window.__ModuleLoader__.load({id:'dsh-smooth-skin',factory:(require)=>{const exports={};
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
  'composer.stats.estimate': '按会话结算与当前时段单价估算',
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
  'settings.subtitle': '统一 Harness 的配色、圆角、标签栏、输入框与启动画面。',
  'settings.stateOn': '已启用',
  'settings.stateOff': '已关闭',
  'settings.tabsLabel': '皮肤设置分类',
  'settings.tab.appearance': '外观',
  'settings.tab.usage': '统计',
  'settings.tab.startup': '启动',
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
  'settings.usageFields': '显示的字段',
  'settings.usagePlacementHint': '按钮在输入框附近的显示方式。',
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
  'composer.stats.estimate': 'Estimated from settled calls and the current rate',
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
  'settings.tabsLabel': 'Skin settings',
  'settings.tab.appearance': 'Appearance',
  'settings.tab.usage': 'Stats',
  'settings.tab.startup': 'Startup',
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
  'settings.usageFields': 'Visible fields',
  'settings.usagePlacementHint': 'Where the button sits around the composer.',
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

/**
 * DeepSeek list prices and the two helpers that turn tokens into money, shared by both
 * halves.
 *
 * DeepSeek publishes its list prices in CNY per million tokens, with a peak tier on
 * weekday mornings and afternoons (UTC) and an off-peak tier outside those windows.
 * Cache writes bill at the cache-hit rate, as the official page lists no write price.
 * The Host prices each stored settlement at the tier in force when that settlement
 * happened; the browser prices only the still-running output tail at the current tier.
 * A model the table does not know gets no figure (the row writes a dash) rather than a
 * made-up one. The 2026 Chinese public holidays bill off-peak all day, matching the
 * official schedule.
 *
 * Rates are per million tokens, so `tokens × rate` lands directly in millionths of a
 * yuan; the formatter turns that micro amount into the short currency string.
 */
const USAGE_PRICES = {
  'deepseek-flash': {
    offPeak: { hit: 0.02, miss: 1, out: 4 },
    peak: { hit: 0.04, miss: 2, out: 8 },
  },
  'deepseek-v4-pro': {
    offPeak: { hit: 0.15, miss: 4.5, out: 13.5 },
    peak: { hit: 0.3, miss: 9, out: 27 },
  },
};

/** Provider-prefixed and dated ids bill as the base model. */
const USAGE_ALIASES = {
  'deepseek-v4-flash': 'deepseek-flash',
  'deepseek-v4.1-flash': 'deepseek-flash',
  'deepseek-v4p1-flash': 'deepseek-flash',
  'deepseek-chat': 'deepseek-flash',
  'deepseek-reasoner': 'deepseek-flash',
  'deepseek-v4-pro': 'deepseek-v4-pro',
  'deepseek-v4p1-pro': 'deepseek-v4-pro',
};

/** The catalogue id the price table prices, or null when the model is not listed. */
function usagePriceModel(modelId) {
  const raw = String(modelId ?? '').trim().toLowerCase();
  if (!raw) return null;
  const bare = raw.includes('/') ? raw.slice(raw.lastIndexOf('/') + 1) : raw;
  if (USAGE_PRICES[bare]) return bare;
  if (USAGE_ALIASES[bare]) return USAGE_ALIASES[bare];
  // Dated and variant suffixes (`-1017`, `-fast`, `:thinking`) still bill as the model
  // whose name they extend, so a prefix match covers the catalogue's long tail.
  for (const [alias, priced] of Object.entries(USAGE_ALIASES)) {
    if (bare.startsWith(alias)) return priced;
  }
  if (bare.includes('deepseek') && bare.includes('flash')) return 'deepseek-flash';
  if (bare.includes('deepseek') && bare.includes('pro')) return 'deepseek-v4-pro';
  return null;
}

/** Every prompt token the provider billed, cache reads and writes included. */
function usageInputTokens(usage) {
  const count = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);
  return count(usage?.uncachedInputTokens) + count(usage?.cacheReadTokens) + count(usage?.cacheWriteTokens);
}

/** Chinese public holidays in 2026, when the whole day bills at the off-peak rate.
 * Kept beside the price table so both halves use exactly the same calendar. */
const USAGE_HOLIDAYS = new Set([
  '2026-01-01', '2026-01-02', '2026-01-03',
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
  '2026-02-21', '2026-02-22', '2026-02-23',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-09-25', '2026-09-26', '2026-09-27',
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
]);
const USAGE_HOLIDAY_FORMAT = typeof Intl === 'object' && Intl.DateTimeFormat
  ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' })
  : null;

/** The peak windows are UTC weekdays 01:00–04:00 and 06:00–10:00, excluding Chinese
 * public holidays. The holiday key is the Asia/Shanghai calendar date. */
function usagePeakAt(atMs) {
  const at = new Date(atMs);
  const weekday = at.getUTCDay();
  if (weekday < 1 || weekday > 5) return false;
  const minutes = at.getUTCHours() * 60 + at.getUTCMinutes();
  if (!((minutes >= 60 && minutes < 240) || (minutes >= 360 && minutes < 600))) return false;
  if (!USAGE_HOLIDAY_FORMAT) return true;
  return !USAGE_HOLIDAYS.has(USAGE_HOLIDAY_FORMAT.format(at));
}

/** One session's cost in millionths of a yuan, or null when the model has no price. */
function usageCostMicro(usage, modelId, atMs = Date.now()) {
  const priced = usagePriceModel(modelId);
  if (priced === null) return null;
  const tier = usagePeakAt(atMs) ? USAGE_PRICES[priced].peak : USAGE_PRICES[priced].offPeak;
  const count = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);
  const cost = count(usage?.uncachedInputTokens) * tier.miss
    + count(usage?.cacheReadTokens) * tier.hit
    + count(usage?.cacheWriteTokens) * tier.hit
    + count(usage?.outputTokens) * tier.out;
  return Number.isFinite(cost) && cost > 0 ? cost : 0;
}

/** The output rate in micro-currency per token at `atMs`, or null for an unpriced
 * model. The live tail multiplies its estimated streaming output by this rate. */
function usageOutputRate(modelId, atMs = Date.now()) {
  const priced = usagePriceModel(modelId);
  if (priced === null) return null;
  return (usagePeakAt(atMs) ? USAGE_PRICES[priced].peak : USAGE_PRICES[priced].offPeak).out;
}

/** Four significant digits, without an exponent once integer digits run past four. */
function usageSignificant(amount) {
  const text = amount.toPrecision(4);
  if (!text.includes('e')) return text;
  const scale = 10 ** (Math.floor(Math.log10(amount)) - 3);
  return String(Math.round(amount / scale) * scale);
}

/** A micro amount as `1.844`: the shorter of four significant digits and four decimals.
 * The currency is the row's money icon, so the figure itself carries no symbol. */
function usageCostText(micro) {
  const amount = Number.isFinite(micro) && micro > 0 ? micro / 1_000_000 : 0;
  const decimals = amount.toFixed(4);
  const significant = usageSignificant(amount);
  return significant.length < decimals.length ? significant : decimals;
}

/**
 * Adapted from 样例图/{index,plugins,settings}.html, using native controls/icons.
 * Prefer public data attributes. CSS-module local names fill the remaining gaps;
 * match the semantic local name within its owning surface, never the generated hash.
 */
const hostPart = (name) => `:is([class$="_${name}"],[class*="_${name} "])`;
// Native primitives use _local_hash_line, while the shell uses hash_local.
const accountPart = (name) => `:is(${hostPart(name)},[class^="_${name}_"],[class*=" _${name}_"])`;
// The launcher observes its own trigger and marks the native body portal.
// No CSS build hash or translated menu text is used to identify the account UI.
const accountMenu = `body[data-smooth-skin]>[data-smooth-account-menu]`;
// MarkdownText is a native primitive; compact reasoning keeps its own density.
const chatMarkdown = `[data-conversation-scroll] [data-chat-flow-kind="assistant-step"]:not([data-chat-group-part="reasoning"]) ${accountPart('markdown')}:not([data-markdown-variant="compact"])`;
const questionPanel = '[data-question-key]>section[aria-labelledby]';

const SKIN_CSS = `
body[data-smooth-skin]{
  --smooth-radius-xl:26px;--smooth-radius-lg:16px;--smooth-radius-md:11px;--smooth-radius-sm:8px;--smooth-radius-xs:4px;
  --smooth-shadow-1:0 2px 4px #0002,0 6px 12px #0003;
  --smooth-shadow-2:0 2px 5px #0004,0 8px 24px #0003;
  --dsw-radius-panel:26px;--dsw-radius-xl:26px;--dsw-radius-lg:16px;--dsw-radius-md:11px;
  --dsw-focus-ring-color:var(--smooth-accent);
  /* The page's glass. Every painted page surface takes its palette colour at this
     weight instead of at 100%, so the backdrop below it shows through. The client half
     rewrites the percentage from the settings slider (100% = every surface solid), and
     each surface derives its own translucent colour once, here, so no selector has to
     repeat the mix. */
  --smooth-glass:100%;
  --smooth-app-glass:color-mix(in srgb,var(--smooth-app) var(--smooth-glass),transparent);
  --smooth-sidebar-glass:color-mix(in srgb,var(--smooth-sidebar) var(--smooth-glass),transparent);
  --smooth-surface-glass:color-mix(in srgb,var(--smooth-surface) var(--smooth-glass),transparent);
  --smooth-rail-glass:color-mix(in srgb,var(--smooth-rail) var(--smooth-glass),transparent);
  /* The icon rail sits on the sidebar glass and the tab strip on the caption strip, so the
     page weight would stack into an almost solid band. These two grounds use a steeper
     weight (set by the client half) instead; 0% still gives the old solid rail and strip. */
  --smooth-glass-soft:100%;
  --smooth-rail-soft:color-mix(in srgb,var(--smooth-rail) var(--smooth-glass-soft),transparent);
  --smooth-surface-soft:color-mix(in srgb,var(--smooth-surface) var(--smooth-glass-soft),transparent);
  /* Overlays (settings, menus) keep almost all of their fill: they float over the
     transcript, so the page weight would put the text underneath through them. The client
     half drives this weight eight times slower than the page and never below 85%. */
  --smooth-glass-overlay:100%;
  /* The session list's bottom fade is a 24px gradient over the sidebar. It takes the
     steeper stacked weight so it clears much sooner than the page and is fully
     transparent at 100% (30% gives ~24%, 50% ~6%, 70% ~1%). */
  --smooth-sidebar-fade:color-mix(in srgb,var(--smooth-sidebar) var(--smooth-glass-soft),transparent);
  --smooth-app-overlay:color-mix(in srgb,var(--smooth-app) var(--smooth-glass-overlay),transparent);
  --smooth-sidebar-overlay:color-mix(in srgb,var(--smooth-sidebar) var(--smooth-glass-overlay),transparent);
  /* Component fills move only slightly with the slider: a button/card keeps its own
     weight and still reads as solid, while the desktop shows a little more at the top
     of the range. 30% gives 90% opaque, 100% gives 67%. */
  --smooth-glass-mild:100%;
  --smooth-surface-mild:color-mix(in srgb,var(--smooth-surface) var(--smooth-glass-mild),transparent);
  --smooth-surface-2-mild:color-mix(in srgb,var(--smooth-surface-2) var(--smooth-glass-mild),transparent);
  --smooth-surface-3-mild:color-mix(in srgb,var(--smooth-surface-3) var(--smooth-glass-mild),transparent);
  --smooth-selected-mild:color-mix(in srgb,var(--smooth-selected) var(--smooth-glass-mild),transparent);
  --smooth-hover-mild:color-mix(in srgb,var(--smooth-hover) var(--smooth-glass-mild),transparent);
  --smooth-active-mild:color-mix(in srgb,var(--smooth-active) var(--smooth-glass-mild),transparent);
  --smooth-bubble-mild:color-mix(in srgb,var(--smooth-bubble) var(--smooth-glass-mild),transparent);
  font-family:var(--dsw-font-family,"Segoe UI","Microsoft YaHei","PingFang SC",system-ui,sans-serif);
  -webkit-font-smoothing:antialiased;
  position:fixed;inset:0;width:100%;height:100dvh;min-height:0;overflow:clip;overscroll-behavior:none;
  /* The backdrop below is a negative-z-index child; the body has to be a stacking
     context for it to stay above the body's own fill and below every child. */
  isolation:isolate;
}
/* The ground the glass reveals: one quiet palette wash across the window. It is always
   painted, so at 0% translucency the opaque surfaces cover it and the page is exactly
   the flat shell it was; the higher the setting, the more of this gradient comes
   through. Everything here uses palette tokens, so all six presets carry their own
   tint. */
body[data-smooth-skin]::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:
  radial-gradient(52% 44% at 46% 12%,color-mix(in srgb,var(--smooth-accent) 26%,transparent),transparent 72%),
  radial-gradient(44% 40% at 86% 74%,color-mix(in srgb,var(--smooth-warm) 20%,transparent),transparent 74%),
  radial-gradient(56% 46% at 14% 88%,color-mix(in srgb,var(--smooth-accent) 18%,transparent),transparent 72%),
  var(--smooth-app)}
/* A patched install creates the desktop window with the system acrylic backdrop, and the
   window marks the body after each load. The page then stops painting its own ground:
   html and body are the host's base fill, and the in-app backdrop above only stands in for
   exactly this material. What remains is the glass surfaces with the palette tint, over
   the acrylic — so the slider still decides how much of the desktop the skin covers. */
html:has(>body[data-smooth-window-glass]),
body[data-smooth-window-glass]{background:transparent}
body[data-smooth-window-glass]::before{content:none}
/* The desktop is one viewport. Fix the body as well as clipping root overflow:
   viewport overflow can still be scrolled programmatically even with clip.
   Focusing an answer must move its inner pane, never the entire shell. */
html:has(>body[data-smooth-skin]){overflow:clip;overscroll-behavior:none}
body[data-smooth-skin]>#root{height:100%;min-height:0;overflow:clip}
body[data-smooth-skin][data-ds-dark-theme]{color-scheme:dark}
body[data-smooth-skin]:not([data-ds-dark-theme]){
  color-scheme:light;
  --smooth-shadow-1:0 2px 4px #18202c0a,0 6px 12px #18202c0f;
  --smooth-shadow-2:0 2px 5px #18202c12,0 8px 24px #18202c14;
}
/* A palette switch is one paint: the View Transition API snapshots the page before the
   token write, and the new snapshot is unmasked by a circle growing out of the caption's
   top-left corner. Inside the circle the new theme has already replaced the old one;
   outside it, the old snapshot stays exactly as it was, so the two palettes never
   cross-fade. The root attribute is only present while the skin owns the transition. */
html[data-smooth-theme-switch]::view-transition-old(root),
html[data-smooth-theme-switch]::view-transition-new(root){animation:none;mix-blend-mode:normal}
html[data-smooth-theme-switch]::view-transition-group(root){animation:none}
html[data-smooth-theme-switch]::view-transition-new(root){clip-path:circle(0% at 0 0);animation:smooth-theme-reveal .52s cubic-bezier(.22,1,.36,1) both}
@keyframes smooth-theme-reveal{from{clip-path:circle(0% at 0 0)}to{clip-path:circle(150% at 0 0)}}
@media(prefers-reduced-motion:reduce){html[data-smooth-theme-switch]::view-transition-old(root),html[data-smooth-theme-switch]::view-transition-new(root){animation:none}}

/* Shell geometry continues to be owned by the host, including resize handles. */
/* ChatView also uses a CSS-module class named frame. Only the application frame
   owns a sidebar column; its own fill is gone so the glass backdrop can show through
   both columns. The centre column's bottom-left radius cuts a 26px notch out of the
   sidebar, so one radial tile, positioned at the sidebar's right edge on the content
   box, repaints that notch in the sidebar's glass colour: the seam is unchanged at 0%
   translucency and fades with the setting. */
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')}){height:100%;min-height:0;max-height:100%;background-color:transparent;background-origin:content-box;background-repeat:no-repeat;background-size:var(--smooth-radius-xl) var(--smooth-radius-xl);background-position:var(--smooth-left-width) 100%;background-image:radial-gradient(circle at 100% 0,transparent 0 var(--smooth-radius-xl),var(--smooth-sidebar-glass) var(--smooth-radius-xl));--dsh-windows-content-radius:var(--smooth-radius-xl)}
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')})>:is(${hostPart('sidebarCol')},${hostPart('centerCol')}){min-height:0}
/* The desktop preload measures this body-level probe to synchronize the native
   caption buttons. Change its token locally, without recoloring the sidebar.
   The measured colour is the Window Controls Overlay fill: leaving it fully
   transparent removes the button strip's own ground and lets the page show through;
   the button glyphs still come from the unchanged label-primary token. */
body[data-smooth-skin]>span[style*="--dsw-specific-sidebar-fill"][style*="--dsw-alias-label-primary"]{--dsw-specific-sidebar-fill:rgba(0,0,0,0)}
/* The caption strip paints only the sidebar half; the tab strip owns the surface from
   the sidebar edge to the right, so the strip's own background is one flat layer over the
   acrylic (not a second glass layer on top of the strip's surface). The native caption's
   window-button area is transparent and only its glyphs remain. */
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')})::before{background:linear-gradient(to right,var(--smooth-sidebar-glass) 0 var(--smooth-left-width),transparent var(--smooth-left-width) 100%)}
/* The centre surface is flat: no ambient shadow lifts it off the sidebar, so the page
   reads as one continuous ground instead of a lit panel floating above it. It is also
   the one page surface the translucency setting paints: the backdrop shows through this
   fill, and every surface inside it stays unpainted so the page is not stacked twice. */
body[data-smooth-skin] ${hostPart('frame')}>${hostPart('centerCol')}{position:relative;z-index:1;box-sizing:border-box;background:var(--smooth-app-glass);border-left:0;border-radius:var(--smooth-radius-xl) 0 0 var(--smooth-radius-xl)}
body[data-smooth-skin] ${hostPart('sidebarCol')}{background:var(--smooth-sidebar-glass);border-right:0}
/* Host workspace plugin: the session list fades out over its last 24px with a gradient
   to --dsw-specific-sidebar-fill. Give that element the steeper fade weight above, so
   the band clears faster and is gone at full translucency; the token override to the
   sidebar glass keeps the rest of the sidebar surfaces consistent. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('fade')}{background:linear-gradient(to bottom,transparent,var(--smooth-sidebar-fade))}
body[data-smooth-skin] [data-sidebar-collapsed]>${hostPart('centerCol')}{border-left:0;border-radius:0;box-shadow:none}
body[data-smooth-skin] ${hostPart('centerCol')}>${hostPart('root')}{background:transparent}

/* Rail made from the existing panel buttons and account trigger. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')}){position:relative;padding:8px 14px 10px 70px;background:transparent;--dsh-sidebar-inline-padding:14px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')})::after{content:"";position:absolute;top:0;bottom:0;left:0;width:var(--smooth-rail-width);border-radius:0 var(--smooth-radius-lg) 0 0;corner-shape:round;background:var(--smooth-rail-soft);box-shadow:none;pointer-events:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('logoRow')}{min-height:46px;margin-bottom:10px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}{min-height:40px;margin-bottom:18px;border:1px solid var(--smooth-line);border-radius:var(--smooth-radius-md);background:var(--smooth-surface-2-mild);font-weight:500}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}:hover{background:var(--smooth-surface-3-mild)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('panelList')}{position:absolute;top:68px;bottom:82px;left:var(--smooth-rail-inset);width:var(--smooth-rail-button-size);overflow:auto;margin:0;gap:var(--smooth-rail-gap);padding:0;scrollbar-width:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')}{box-sizing:border-box;display:flex;align-items:center;align-self:center;flex:none;width:var(--smooth-rail-button-size);min-width:0;min-height:var(--smooth-rail-button-size);margin:0;padding:0;justify-content:center;border:0;border-radius:var(--smooth-rail-button-radius);corner-shape:round}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} ${hostPart('panelTitle')}{position:absolute;width:1px;height:1px;padding:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelActive')}{background:var(--smooth-selected-mild)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('footArea')}{position:fixed;bottom:10px;left:0;box-sizing:border-box;width:var(--smooth-rail-width);display:flex;flex-direction:column;align-items:center;gap:6px;margin:0;padding:0;z-index:29}
/* The host stacks this footer as [account row] then [settings row: gear, connection,
   update pill], and that second row is itself a flex row, so the pill cannot reach the top
   of the column by ordering. It is lifted out of that row instead: the footer is the
   positioned ancestor, so bottom:100% puts the pill in its own line directly above the
   account button regardless of where the host nests it. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('triggerRow')}{width:var(--smooth-rail-button-size);margin:0 auto}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('trigger')}{width:var(--smooth-rail-button-size);min-width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);padding:0;justify-content:center;border-radius:var(--smooth-rail-button-radius);corner-shape:round}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('triggerLabel')}{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
/* The desktop update pill is a wide footer row (14px icon + the version label) and only
   renders while the sidebar still reports itself as wide; this skin narrows the footer to
   the rail, so the pill used to hang over the account button. It keeps the icon as one
   more square rail button and hides its label exactly like the settings trigger's, which
   leaves aria-label and the tooltip carrying the copy. The pill is the only footer node
   with aria-disabled: the connection indicator next to it carries data-phase instead.
   The host paints that pill as a brand-tinted call to action (blue border, blue wash and
   blue icon); in the rail it sits beside the plain icon buttons, so it drops the box and
   takes their transparent ground and hover fill, while the icon keeps the host's update
   blue: it marks a pending version, not a selected panel. The error dot stays red: it is
   status, not button chrome. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('indicator')}[aria-disabled]{position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);box-sizing:border-box;width:var(--smooth-rail-button-size);min-width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);padding:0;justify-content:center;grid-template-columns:auto;column-gap:0;border:0;background:transparent;color:var(--dsw-alias-brand-primary-new-colorprimary-new-color);border-radius:var(--smooth-rail-button-radius);corner-shape:round}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('indicator')}[aria-disabled]:hover:not([aria-disabled="true"]){background:var(--smooth-surface-3-mild);color:var(--dsw-alias-brand-primary-new-colorprimary-new-color)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('indicator')}[aria-disabled]>span:last-child{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('indicator')}[aria-disabled] ${hostPart('icon')}{width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('indicator')}[aria-disabled] ${hostPart('icon')}>svg{width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('indicator')}[aria-disabled] ${hostPart('errorDot')}{background:var(--dsw-alias-state-error-primary)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} button[data-signed-out]{box-sizing:border-box;display:flex;align-items:center;align-self:center;flex:none;width:var(--smooth-rail-button-size);min-width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);margin:0 auto;padding:0;gap:0;justify-content:center;border:0;border-radius:var(--smooth-rail-button-radius);corner-shape:round}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} button[data-signed-out]>${hostPart('label')}{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
/* The workspace list follows the reference list: rows one notch tighter, the
   session titles a size under the workspace names, the relative time sharing
   their colour instead of sitting a whole step dimmer, and the workspace row
   starting at the column's own padding because its folder glyph is not drawn.
   The leading cell carries the reference's hollow dot, drawn as a bordered
   circle rather than a gradient ring (a gradient's hard stops stair-step at
   this size on a 1.5x display). It is 8px rather than the reference's 6px:
   at 150% that is 12 device pixels, the smallest size whose edge still reads
   as an arc instead of a rounded square. A running session keeps the host's
   rotating spinner in that cell — the dot steps aside instead of turning
   solid, so the mark still reads as a circle, just turning. Sizes come from
   the reference column: 28/29px rows, 12.5/18 and 13.5/19 text, 11/16 times,
   an 8px dot and an 8px corner. */
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"]{border-radius:var(--smooth-radius-sm)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}{height:28px;border-radius:var(--smooth-radius-sm)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')} ${hostPart('title')}{font-size:12.5px;line-height:18px;color:var(--smooth-muted)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}[aria-selected="true"] ${hostPart('title')}{color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')} ${hostPart('time')}{font-size:11px;line-height:16px;color:var(--smooth-muted)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}>${hostPart('slot')}{position:relative}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}>${hostPart('slot')}::before{content:"";position:absolute;left:50%;top:50%;width:8.84px;height:8.84px;margin:-4.42px 0 0 -4.42px;background:color-mix(in srgb,var(--smooth-muted) 72%,transparent);-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9.5' fill='none' stroke='black' stroke-width='2.71'/%3E%3C/svg%3E") center/8.84px 8.84px no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9.5' fill='none' stroke='black' stroke-width='2.71'/%3E%3C/svg%3E") center/8.84px 8.84px no-repeat}
/* The dot and the host's running spinner are the same geometry: a circle of
   r=9.5 with a 2.71 stroke inside the spinner's own 24-unit viewBox, shown at
   8.84px. The idle dot is that circle as a mask so the two are drawn by the
   same vector path and read identically — a CSS border ring rounded a shade
   differently and the two states did not match. A running session keeps the
   spinner's rotation in this cell with the idle dot stepping aside, and its
   track is dropped to 40% (the host draws it at 25%) so the turning arc is what
   the eye picks out: the circle stays legible, the motion carries the state. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}>${hostPart('slot')}:has(svg)::before{opacity:0}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}>${hostPart('slot')} svg{width:8.84px;height:8.84px;color:color-mix(in srgb,var(--smooth-muted) 72%,transparent)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}>${hostPart('slot')} svg *{stroke-width:2.71}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}>${hostPart('slot')} svg g>circle:first-child{opacity:.4}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('projectRow')}{height:29px;border-radius:var(--smooth-radius-sm)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('projectRow')} :is(${hostPart('folder')},${hostPart('chevron')}){display:none}
/* Workspace group titles are the sidebar's section headers: they keep one host token —
   label-primary — so the tree reads as one list; only their size is tightened. The weight
   stays at the host's regular 400. It used to be 500, but the CJK fallback has no medium
   face: the Latin workspace names (free, …) picked up Segoe UI's medium over 500 while a
   Chinese group title (默认工作区 / 未分组) fell back to YaHei's regular, so the two read
   as different colours. 400 exists in both faces and renders every group title alike. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('projectRow')} ${hostPart('title')}{font-size:13.5px;line-height:19px;font-weight:400;color:var(--dsw-alias-label-primary)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sectionLabel')}{font-size:12px;line-height:18px}
/* Selection in the workspace list is named by the row's fill plus the title's own colour
   and weight. The inset bar that used to run down the selected row's leading edge read as
   a stripe pinned to one side of the row instead of as the row's own ground, so the row
   now keeps no shadow at all. */
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"][aria-selected="true"]{background:var(--smooth-selected-mild);border-color:transparent;box-shadow:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"]:not([aria-selected="true"]):hover{background:var(--smooth-surface-2-mild)}

/* Preserve the native plugin page; only let the page's own glass ground show through. */
body[data-smooth-skin] [data-plugin-panel]{background:transparent}

/* Native settings navigation, rows and form controls. The settings surface stays
   solid even when the page behind it is glass: this is a full-window ground, and at
   a high translucency the page underneath (or a stale compositor frame from the
   opening animation) shows through as a second, half-faded copy of the same rows.
   Menus keep their overlay weight; only the settings ground opts out. */
body[data-smooth-skin] [data-shortcut-modal="settings"]{width:min(1080px,calc(100vw - 48px));border:1px solid var(--smooth-line-strong);border-radius:0;background:var(--smooth-app);box-shadow:var(--smooth-shadow-2)}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{width:210px;min-width:180px;padding:22px 14px;background:var(--smooth-sidebar);box-shadow:none}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navTitle')}{font-size:22px;font-weight:600;padding:4px 12px 18px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}{gap:5px}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav button{min-height:42px;padding:10px 12px;border-radius:var(--smooth-radius-sm);gap:11px;font-size:14px}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav button[aria-current="true"]{background:var(--smooth-selected-mild);font-weight:600;color:var(--smooth-text)}
body[data-smooth-skin] [data-shortcut-modal="settings"]>${hostPart('content')}{background:var(--smooth-app)}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding:4px clamp(20px,3vw,44px) 36px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}>:is(section,div){max-width:1120px;margin-inline:auto}
body[data-smooth-skin] [data-shortcut-modal="settings"] h2{font-size:24px;line-height:1.5;font-weight:600}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')}{padding-block:20px;min-height:76px;border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] [data-shortcut-modal="settings"] :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select){background:var(--smooth-surface-mild);border-color:var(--smooth-line-strong);border-radius:var(--smooth-radius-md);color:var(--smooth-text)}
body[data-smooth-skin] [data-shortcut-modal="settings"] :is(input,textarea,select):focus-visible{outline:2px solid var(--smooth-line-strong);outline-offset:3px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [role="tab"]:not(.smooth-tab-label){border-radius:999px;padding:7px 15px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [role="tab"][aria-selected="true"]:not(.smooth-tab-label){background:var(--smooth-surface-3-mild)}

/* Conversation: rounded tabs, flat welcome ground and elevated composer. The page paint
   lives on the centre column alone; these three surfaces sit inside it, so they stay
   transparent and the glass fill is not stacked under every one of them. */
body[data-smooth-skin] [data-content-phase]{background:transparent}
/* The conversation shell paints the host base fill on its own root (data-phase), which
   hid the glass centre column behind the whole transcript. Clear it for the phases the
   conversation root uses (the connection indicator's data-phase values do not overlap). */
body[data-smooth-skin] :is([data-phase="active"],[data-phase="blank"],[data-phase="engaging"],[data-phase="hero"],[data-phase="settling"]){background:transparent}
body[data-smooth-skin] [data-conversation-scroll]{background:transparent}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')}{background:transparent;border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')}${hostPart('headerBlank')}{border-top:1px solid var(--smooth-line);border-bottom:0}
/* The view switch is the reference's segmented pill: one track with a thumb that slides
   between 对话 and 轨迹, centred on the title line. The host renders the switch and the
   launcher for the views that do not fit — the 更多 (…) menu — as the two children of one
   tab row; the skin lifts that row onto the title line and centres it, so the launcher
   rides beside the switch instead of standing alone at the row's left edge, and fades the
   row as one control: the same hover or keyboard focus reveals the switch and the
   launcher together, and they leave together. The two views stay plain buttons under
   data-conversation-tabs, so the thumb is the track's own ::before, moved by the selected
   button's index; two equal halves make that exact. */
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')}{position:absolute;left:0;right:0;top:6px;display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:6px;width:auto;margin:0;padding:0;z-index:3;opacity:0;pointer-events:none;transition:opacity .18s ease}
/* The lifted row spans the whole header, but only the switch and its 更多 launcher own
   clicks. Without this pass-through the invisible row swallowed the title row's right
   side — the 智能体团队 / 打开方式 split button and the utilities beside it could not be
   clicked while sitting under it (the row is transparent, so the buttons stayed visible). */
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')} :is([data-conversation-tabs],${hostPart('viewsMoreAnchor')}){pointer-events:auto}
/* The launcher follows the switch, so the group would lean right if the switch stayed
   centred. A same-size spacer leads the row only while the launcher is mounted: the
   switch keeps the exact centre it had, and 更多 fills the other side. */
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')}:has(${hostPart('viewsMoreAnchor')})::before{content:"";flex:none;width:26px;height:1px}
/* Reveal on the column hover or on *keyboard* focus. Keying this on :focus-within
   pinned the row open after a click: the clicked 对话/轨迹 tab keeps :focus when the
   pointer leaves, while a mouse click never matches :focus-visible. An open 更多 menu
   keeps the row visible too, so its trigger never fades from under the menu. */
body[data-smooth-skin] ${hostPart('centerCol')}:hover ${hostPart('header')} ${hostPart('tabs')},
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')}:has(:focus-visible),
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')}:has([aria-expanded="true"]){opacity:1}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs]{position:relative;display:inline-flex;box-sizing:border-box;gap:0;margin:0;padding:0;border:1px solid var(--smooth-line);border-radius:999px;background:transparent;overflow:hidden}
/* The launcher is a quiet 26px circle on the track's line, lit like the switch's own
   hover state; it opens the host's own view menu, so the skin only resizes it. */
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')} ${hostPart('viewsMoreAnchor')}{flex:none;display:inline-flex;align-items:center;margin:0}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')} ${hostPart('viewsMore')}{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:26px;height:26px;margin:0;padding:0;border:0;border-radius:999px;background:transparent;color:var(--smooth-muted);transition:background-color .16s ease,color .16s ease}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')} ${hostPart('viewsMore')}:hover{background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')} ${hostPart('viewsMore')}[aria-expanded="true"]{background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')} ${hostPart('viewsMore')}:focus-visible{outline:2px solid var(--smooth-line-strong);outline-offset:2px}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('tabs')} ${hostPart('viewsMore')} svg{display:block}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs]::before{content:"";position:absolute;top:0;bottom:0;left:0;width:50%;border-radius:999px;background:var(--smooth-surface-3-mild);transition:transform .26s cubic-bezier(.22,1,.36,1)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs]:has(>[role="tab"]:nth-child(2)[aria-selected="true"])::before{transform:translateX(100%)}
/* The host's tab is a 35px hit target with a -10px vertical margin and 10px/9px
   padding; the skin's switch is a 27px pill. Keep the host's hit area out of the
   layout and let flex centre the label inside the pill, otherwise the text sits
   5px high and the button overflows the rounded control. */
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs] [role="tab"]{position:relative;z-index:1;box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex:1 1 0;height:23px;min-height:0;margin:0 -10px;padding:0 18px;border:0;border-radius:0;background:transparent;color:var(--smooth-muted);font-size:13px;font-weight:500;line-height:1}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs] [role="tab"][aria-selected="true"]{color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs] [role="tab"]::after{content:none}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] ${hostPart('tabs')},body[data-smooth-skin] [data-conversation-tabs]::before,body[data-smooth-skin] ${hostPart('viewsMore')}{transition:none}}
/* The conversation header follows the supplied reference: the session title owns the
   first line and the header's chips — the agent team, the creation mode, whatever the
   utilities slot adds — sit on a second line under it. The 对话 / 轨迹 switch floats
   centred on that title line, with the 更多 launcher beside it. Only the ground stays
   this skin's own; the type, the pill shapes and the spacing are the reference's. The
   title cluster turns into two stacked rows — crumbs first, action chips second — while
   the title row keeps its utilities and corner at the right end, centred against the
   two-line block; the host's own tab row is lifted out of the grid so it adds no line. */
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')}:has([data-conversation-tabs]){position:relative;padding:4px 18px 6px 14px;min-height:0}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('titleRow')}{grid-column:2;grid-row:1;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:start;column-gap:6px;min-height:0}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} ${hostPart('titleCluster')}{display:grid;grid-template-columns:minmax(0,1fr);align-content:center;gap:1px}
body[data-smooth-skin] [data-content-phase="hero"] ${hostPart('headline')}{font-size:clamp(24px,2vw,30px);font-weight:600;letter-spacing:.01em}
body[data-smooth-skin] [data-content-phase="hero"] ${hostPart('stack')}{gap:14px}
body[data-smooth-skin] [data-content-phase="hero"] ${hostPart('workspaceRow')}{font-size:15px;color:var(--smooth-muted)}
/* One outer frame owns the surface; the editor and toolbar share its background.
   No stroke and no focus ring: the host's own card is borderless too, and the card is
   held apart from the page by its drop shadow and the inset top highlight alone. */
/* The composer is two pieces, not one card: a bordered input well on top and a quiet
   footer row underneath. The well is one continuous border drawn by the card's ::before,
   so the attached-image rail and the editor share it and no seam ever appears between
   them; the footer floats on the page ground below the well. The send button is lifted
   out of that footer into the well's top-right (bottom-right once previews take the top). */
body[data-smooth-skin] [data-composer-card]{--dsw-radius-panel:var(--smooth-radius-lg);--dsh-composer-text-max-height:min(300px,40vh);--smooth-composer-footer-h:38px;position:relative;isolation:isolate;border:0;border-radius:0;background:transparent;padding-top:0;gap:0;box-shadow:none}
body[data-smooth-skin] [data-composer-card]::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:0;bottom:var(--smooth-composer-footer-h);border:1px solid var(--smooth-line-strong);border-radius:var(--smooth-radius-lg);background:var(--dsw-specific-input-major);pointer-events:none}
body[data-smooth-skin] [data-composer-card]${hostPart('cardWorkspaceTrigger')}{border-style:dashed}
body[data-smooth-skin] [data-composer-card]${hostPart('cardWorkspaceTrigger')}::after{border:0}
body[data-smooth-skin] [data-composer-card] ${hostPart('scroll')}{box-sizing:border-box;padding:10px 54px 10px 14px;min-height:42px;max-height:var(--dsh-composer-text-max-height);margin:0;border:0;border-radius:0;background:transparent;flex:1 1 auto}
/* Attached previews sit inside the same well, above the placeholder; they carry no border
   of their own so there is no line beside the image. */
body[data-smooth-skin] [data-composer-card] ${hostPart('rail')}{box-sizing:border-box;min-width:0;margin:0;padding:10px 12px 0;border:0;border-radius:0;background:transparent;overflow:hidden;contain:layout paint;animation:smooth-composer-open .15s cubic-bezier(.2,0,0,1) both}
@keyframes smooth-composer-open{from{max-height:0;opacity:0}to{max-height:140px;opacity:1}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] [data-composer-card] ${hostPart('rail')}{animation:none}}
body[data-smooth-skin] [data-composer-card] :is(${hostPart('imageItem')},${hostPart('thumbnail')}){width:124px;height:124px;min-width:124px;min-height:124px;max-width:124px;max-height:124px;aspect-ratio:1/1;flex:none;display:block}
body[data-smooth-skin] [data-composer-card] ${hostPart('thumbnail')}{box-sizing:border-box;padding:0;overflow:hidden;border:0;border-radius:var(--smooth-radius-lg)}
body[data-smooth-skin] [data-composer-card] ${hostPart('thumbnail')} img{display:block;width:100%;height:100%;object-fit:cover}
/* The native rail is a 64px-tall strip: its item wrapper clips a taller preview, which
   made the square look like a wide letterbox. Let the wrapper grow with the square. */
body[data-smooth-skin] [data-composer-card] ${hostPart('rail')} ${hostPart('item')}:has(${hostPart('thumbnail')}){height:124px}
body[data-smooth-skin] [data-composer-input]{min-height:22px;padding:0;font-size:var(--dsh-content-font-size,14px);line-height:1.55;color:var(--smooth-text)}
body[data-smooth-skin] [data-composer-card] ${hostPart('placeholder')}{inset:0 0 auto;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-line-clamp:unset;font-size:var(--dsh-content-font-size,14px);line-height:1.55;color:var(--smooth-muted)}
body[data-smooth-skin] [data-composer-card] [data-composer-placeholder][data-smooth-placeholder]{--smooth-composer-placeholder:"";color:transparent}
body[data-smooth-skin] [data-composer-card] [data-composer-placeholder][data-smooth-placeholder]::after{position:absolute;inset:0;content:var(--smooth-composer-placeholder);font-size:var(--dsh-content-font-size,14px);line-height:1.55;color:var(--smooth-muted)}
/* Attachments make the host drop its own placeholder; this fallback keeps the hint in the
   editor line until the draft has text. */
body[data-smooth-skin] [data-composer-card] .smooth-composer-fallback{position:absolute;inset:0;pointer-events:none;color:var(--smooth-muted);font-size:var(--dsh-content-font-size,14px);line-height:1.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body[data-smooth-skin] [data-composer-card] .smooth-composer-fallback:not([hidden]){display:block}
/* The native caret blinks in hard steps and jumps between characters. The plugin draws
   the bar instead (src/composer.js) and hides the native one only while it is shown. */
body[data-smooth-skin] [data-composer-card][data-smooth-caret] [data-composer-input]{caret-color:transparent}
body[data-smooth-skin] [data-composer-card] .smooth-composer-caret{position:absolute;left:0;top:0;z-index:2;width:2px;border-radius:1px;background:var(--smooth-text);pointer-events:none;transition:transform .1s cubic-bezier(.2,0,0,1),height .1s ease;animation:smooth-caret-blink 1.06s ease-in-out infinite}
@keyframes smooth-caret-blink{0%,42%{opacity:1}50%,92%{opacity:.18}100%{opacity:1}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] [data-composer-card] .smooth-composer-caret{transition:none;animation:none}}
body[data-smooth-skin] [data-composer-card] ${hostPart('row')}{box-sizing:border-box;flex:none;justify-content:flex-start;min-height:36px;padding:6px 12px 0 4px;gap:8px;border:0;border-radius:0;background:transparent;font-size:13px;line-height:20px}
body[data-smooth-skin] [data-composer-card] :is(${hostPart('tools')},${hostPart('modes')},${hostPart('trailing')},${hostPart('standardControls')}){gap:8px}
body[data-smooth-skin] [data-composer-card] ${hostPart('accessory')}{border-bottom:1px solid var(--smooth-line);padding:9px 16px;color:var(--smooth-muted)}
/* The welcome page and a conversation show the same card on the same ground: the host
   fades the strip behind the in-conversation card to its own base colour, which is not
   this skin's ground, so the same card sat on two different greys. */
body[data-smooth-skin] [data-phase="active"] ${hostPart('composerSeat')},
body[data-smooth-skin] [data-content-phase="active"] ${hostPart('composerSeat')}{background:linear-gradient(180deg,color-mix(in srgb,var(--smooth-app) 0%,transparent) 0,var(--smooth-app-glass) 36px)}
body[data-smooth-skin] [data-composer-card] :is(${hostPart('primary')},${hostPart('add')}){box-sizing:border-box;flex:none;width:32px;height:32px;padding:0;border-radius:50%;transform:none}
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}{background:transparent;color:var(--smooth-muted)}
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}:hover:not(:disabled){background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}{background:var(--smooth-accent);color:var(--smooth-ink);transition:background-color .16s ease,transform .16s ease}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:hover:not(:disabled){background:color-mix(in srgb,var(--smooth-accent) 85%,var(--smooth-text))}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:active:not(:disabled){transform:scale(.94)}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:disabled{background:var(--smooth-surface-3-mild);color:var(--smooth-muted);opacity:.6;cursor:default}
/* The send key lives in the input well's top-right corner, not in the footer: the last
   primary button in the trailing group is the send/queue key, so it is lifted out of the
   row and pinned over the well. It keeps the skin's accent ball: a 32px round key. A stop
   key rendered while a turn runs sits before it and stays in the footer. */
body[data-smooth-skin] [data-composer-card] ${hostPart('trailing')}>${hostPart('primary')}:last-of-type{position:absolute;top:auto;bottom:calc(var(--smooth-composer-footer-h) + 5px);right:8px;z-index:3;width:32px;height:32px;border:0;border-radius:50%;background:var(--smooth-accent);color:var(--smooth-ink);box-shadow:none;transform:none}
body[data-smooth-skin] [data-composer-card] ${hostPart('trailing')}>${hostPart('primary')}:last-of-type:hover:not(:disabled){background:color-mix(in srgb,var(--smooth-accent) 85%,var(--smooth-text))}
body[data-smooth-skin] [data-composer-card] ${hostPart('trailing')}>${hostPart('primary')}:last-of-type:disabled{background:var(--smooth-surface-3-mild);color:var(--smooth-muted);opacity:.6}
/* The host's bottom dock keeps its place under the card, but its own context ring and
   its two stat pills are hidden: the skin's usage button (registered in the composer
   dock slot) carries every figure the pills showed, with its own context pie at the
   right end. */
body[data-smooth-skin] [data-composer-dock]>${hostPart('root')}{display:none}
body[data-smooth-skin] [data-composer-dock] [data-composer-stat]{display:none}
/* The capsule can leave the dock: folded into the context row or centred in the bottom
   bar. In those placements the dock row has nothing left to say and collapses. */
body[data-smooth-skin][data-smooth-usage-placement="context"] [data-composer-dock],
body[data-smooth-skin][data-smooth-usage-placement="bottom"] [data-composer-dock]{display:none}
/* The live usage line is the session meter's single compact button under the card: the
   figures followed by the context pie at its right end. The button keeps its original
   pill size; only the ink inside it grew. The direction, cache and meter icons stay
   quiet, the figures take the text ink, and the numbers share one tabular width so a
   streaming count never shifts the row. Hovering anywhere in the button enlarges only the
   pie's used wedge; focus and an open panel keep the pill lit. */
body[data-smooth-skin] .smooth-usage-line{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:4px 16px;max-width:min(100%,860px);margin:0 auto;box-sizing:border-box;min-height:28px;padding:0 4px 0 8px;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:var(--smooth-muted);font:inherit;font-size:13px;line-height:20px;font-variant-numeric:tabular-nums;cursor:pointer;transition:background-color .16s ease}
body[data-smooth-skin] .smooth-usage-line--bottom{margin:0;min-width:0;max-width:min(100%,620px)}
body[data-smooth-skin] .smooth-usage-line--left{margin-left:0;margin-right:auto}
body[data-smooth-skin] .smooth-usage-line--center{margin-left:auto;margin-right:auto}
body[data-smooth-skin] .smooth-usage-line--right{margin-left:auto;margin-right:0}
body[data-smooth-skin] .smooth-usage-bottom-fixed{position:fixed;z-index:8;display:flex;align-items:center;justify-content:center;pointer-events:none}
body[data-smooth-skin] .smooth-usage-bottom-fixed .smooth-usage-line{pointer-events:auto;max-width:100%;margin:0}
body[data-smooth-skin] .smooth-usage-line:hover,
body[data-smooth-skin] .smooth-usage-line:focus-visible,
body[data-smooth-skin] .smooth-usage-line[aria-expanded="true"]{background:var(--smooth-surface-3-mild)}
body[data-smooth-skin] .smooth-usage-line:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:2px}
body[data-smooth-skin] .smooth-usage-figures{display:flex;align-items:center;justify-content:flex-start;flex-wrap:wrap;gap:4px 16px;min-width:0}
body[data-smooth-skin] .smooth-usage-item{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
body[data-smooth-skin] .smooth-usage-value{color:var(--smooth-muted);font-weight:500;transition:color .16s ease}
body[data-smooth-skin] .smooth-usage-icon{display:block;flex:none;width:14px;height:14px;color:var(--smooth-muted)}
body[data-smooth-skin] .smooth-usage-icon-hit{opacity:.95}
body[data-smooth-skin] .smooth-usage-item:first-child .smooth-usage-value{font-weight:600}
/* The context pie sits at the button's right end, drawn like the supplied asset: a pale
   disc for the remaining share with an accent wedge for the used share, and the reading
   beside it. The stylesheet moves only the used wedge on hover/focus/open. */
body[data-smooth-skin] .smooth-context-reading{display:inline-flex;align-items:center;gap:4px;flex:none}
body[data-smooth-skin] .smooth-context-reading svg{display:block;flex:none;overflow:visible}
body[data-smooth-skin] .smooth-context-pie-rest{fill:color-mix(in srgb,var(--smooth-muted) 42%,transparent)}
body[data-smooth-skin] .smooth-context-pie-used{fill:var(--smooth-accent);transform-box:view-box;transform-origin:center;transform:scale(1);transition:transform .16s cubic-bezier(.22,1,.36,1)}
body[data-smooth-skin] .smooth-usage-line:hover .smooth-context-pie-used,
body[data-smooth-skin] .smooth-usage-line:focus-visible .smooth-context-pie-used,
body[data-smooth-skin] .smooth-usage-line[aria-expanded="true"] .smooth-context-pie-used{transform:scale(1.16)}
body[data-smooth-skin] .smooth-context-value{color:var(--smooth-muted);font-size:13px;font-weight:600;line-height:20px;letter-spacing:-.01em;font-variant-numeric:tabular-nums;transition:color .16s ease}
/* The figures are quiet at rest, at the same weight as the model trigger's text; the
   whole line brightens only while the pointer, keyboard focus or the open panel is on
   it. Icons keep their muted colour so the numbers carry the highlight. */
body[data-smooth-skin] :is(.smooth-usage-line,.smooth-usage-context):is(:hover,:focus-visible,[aria-expanded="true"]) :is(.smooth-usage-value,.smooth-context-value){color:var(--smooth-text)}
/* The context-row placement keeps only the pie and its reading, immediately before the
   model selector. It is a quiet button until hovered, focused or open. */
body[data-smooth-skin] .smooth-usage-context{display:inline-flex;align-items:center;box-sizing:border-box;gap:4px;min-height:28px;padding:0 4px 0 8px;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:var(--smooth-muted);font:inherit;font-size:13px;line-height:20px;font-variant-numeric:tabular-nums;cursor:pointer;transition:background-color .16s ease}
body[data-smooth-skin] .smooth-usage-context:hover,
body[data-smooth-skin] .smooth-usage-context:focus-visible,
body[data-smooth-skin] .smooth-usage-context[aria-expanded="true"]{background:var(--smooth-surface-3-mild)}
body[data-smooth-skin] .smooth-usage-context:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:2px}
body[data-smooth-skin] .smooth-usage-context:hover .smooth-context-pie-used,
body[data-smooth-skin] .smooth-usage-context:focus-visible .smooth-context-pie-used,
body[data-smooth-skin] .smooth-usage-context[aria-expanded="true"] .smooth-context-pie-used{transform:scale(1.16)}
/* Bottom-bar placement lives in the host's left footer slot, immediately after the
   permission/plan controls; the native flex row aligns it, so no extra positioning. */
body[data-smooth-skin] .smooth-context-menu{position:fixed;z-index:1200;box-sizing:border-box;padding:12px;border:1px solid var(--smooth-line-strong);border-radius:var(--smooth-radius-lg);background:color-mix(in srgb,var(--dsw-alias-bg-overlay,var(--smooth-surface-mild)) var(--smooth-glass-overlay),transparent);box-shadow:var(--smooth-shadow-2);color:var(--smooth-muted);font-size:12px;line-height:20px;animation:smooth-context-in .16s cubic-bezier(.2,0,0,1)}
@keyframes smooth-context-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
body[data-smooth-skin] .smooth-context-head{display:flex;align-items:baseline;gap:6px;min-width:0}
body[data-smooth-skin] .smooth-context-heading{color:var(--smooth-muted);white-space:nowrap}
body[data-smooth-skin] .smooth-context-head-value{color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] .smooth-context-figures{margin-left:auto;color:var(--smooth-text);font-weight:500;white-space:nowrap;font-variant-numeric:tabular-nums}
body[data-smooth-skin] .smooth-context-bar{display:flex;gap:1px;height:4px;margin:10px 0;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--smooth-text) 8%,transparent)}
body[data-smooth-skin] .smooth-context-segment{flex:none;min-width:2px;height:100%;border-radius:1px;background:var(--smooth-context-tint,var(--smooth-muted))}
body[data-smooth-skin] .smooth-context-system{--smooth-context-tint:var(--smooth-muted)}
body[data-smooth-skin] .smooth-context-tools{--smooth-context-tint:#a78bfa}
body[data-smooth-skin] .smooth-context-messages{--smooth-context-tint:var(--smooth-accent)}
body[data-smooth-skin] .smooth-context-legend{display:flex;flex-direction:column;gap:2px;margin:0;padding:0}
body[data-smooth-skin] .smooth-context-legend-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0}
body[data-smooth-skin] .smooth-context-legend-row dt{display:flex;align-items:center;gap:6px;margin:0;color:var(--smooth-muted)}
body[data-smooth-skin] .smooth-context-legend-row dd{margin:0;color:var(--smooth-text);font-variant-numeric:tabular-nums}
body[data-smooth-skin] .smooth-context-swatch{flex:none;width:8px;height:8px;border-radius:2px;background:var(--smooth-context-tint,var(--smooth-muted))}
body[data-smooth-skin] .smooth-context-rule{height:1px;margin:10px 0;border:0;background:var(--smooth-line)}
body[data-smooth-skin] .smooth-context-section{margin:0 0 6px;font-size:12px;font-weight:500;line-height:20px;color:var(--smooth-muted)}
body[data-smooth-skin] .smooth-context-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}
body[data-smooth-skin] .smooth-context-metric{display:flex;flex-direction:column;gap:1px;min-width:0}
body[data-smooth-skin] .smooth-context-metric-label{color:var(--smooth-muted);font-size:11.5px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body[data-smooth-skin] .smooth-context-metric-value{color:var(--smooth-text);font-size:13px;font-weight:600;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-context-menu{animation:none}body[data-smooth-skin] .smooth-context-pie-used{transition:none}}
body[data-smooth-skin] .smooth-composer-model{display:flex;align-items:center;min-width:0;max-width:100%;font-size:13px;line-height:20px}
body[data-smooth-skin] .smooth-composer-model button{height:32px;min-height:32px;font-size:inherit;line-height:20px;padding-block:0}
body[data-smooth-skin] .smooth-model-effort{display:flex;flex-direction:column;align-items:stretch;gap:0;width:100%;min-width:0;max-width:100%}
/* The slider has no tick labels: the level the thumb is on is named above the model
   selector, and re-enters with a small rise every time the level changes. */
body[data-smooth-skin] .smooth-model-level{display:flex;align-items:center;justify-content:center;gap:6px;min-height:18px;margin-bottom:1px;color:var(--smooth-muted);font-size:10.5px;line-height:16px;letter-spacing:.05em}
body[data-smooth-skin] .smooth-model-level::before{content:"";flex:none;width:4px;height:4px;border-radius:50%;background:var(--smooth-model-blue)}
/* The dot is the level row's only state mark, so it has to follow the level: while the
   provider owns it, the blue core would claim an explicit level that is not in force.
   The 3px halo is gone with it - at 16% blue over the panel ground it measured 1.19-1.33:1
   in every preset, well under the 3:1 a non-text indicator needs, so it was invisible
   decoration that only made the dot look blurry. */
body[data-smooth-skin] .smooth-model-effort:has(.smooth-model-slider[data-default="true"]) .smooth-model-level::before{background:var(--smooth-muted)}
/* The auto chip returns a provider-decided model to the host's "Default" effort. It sits
   left of the level dot; the active state uses the same blue as the dot, not a filled
   button, so the row still reads as one line of text. */
body[data-smooth-skin] .smooth-model-auto{order:-1;box-sizing:border-box;display:inline-flex;align-items:center;flex:none;height:15px;min-height:15px;padding:0 6px;border:1px solid var(--smooth-line-strong);border-radius:999px;background:transparent;color:var(--smooth-muted);font-family:inherit;font-size:9.5px;line-height:13px;letter-spacing:.04em;cursor:pointer;transition:background-color .16s ease,border-color .16s ease,color .16s ease}
body[data-smooth-skin] .smooth-model-auto:hover:not(:disabled){background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-auto[data-active="true"]{border-color:transparent;background:color-mix(in srgb,var(--smooth-model-blue) 20%,transparent);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-auto:focus-visible{outline:2px solid var(--smooth-model-blue);outline-offset:2px}
body[data-smooth-skin] .smooth-model-auto:disabled{opacity:.5;cursor:default}
body[data-smooth-skin] .smooth-model-level-name{color:var(--smooth-text);font-size:11px;font-weight:600;animation:smooth-model-level-in .26s cubic-bezier(.22,1,.36,1)}
@keyframes smooth-model-level-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-level-name{animation:none}}
body[data-smooth-skin] .smooth-model-effort .smooth-model-trigger{display:flex;align-items:center;justify-content:center;gap:5px;height:22px;min-height:22px;padding:0 4px;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:var(--smooth-muted);font-size:12px;line-height:18px;cursor:pointer}
body[data-smooth-skin] .smooth-model-effort .smooth-model-trigger:hover:not(:disabled){background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-trigger:disabled{opacity:.55;cursor:default}
body[data-smooth-skin] .smooth-model-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--smooth-text);font-weight:500}
body[data-smooth-skin] .smooth-model-trigger svg{flex:none;color:var(--smooth-muted)}
/* One animated number feeds both the blue fill edge and the ball's position, so a
   slide can never split them: whichever way the value changes, both read the same
   interpolated ratio on every frame. Holding a drag drops the transition, which
   makes the two follow the pointer together instead of the fill trailing behind. */
@property --smooth-model-ratio{syntax:"<number>";inherits:true;initial-value:0}
body[data-smooth-skin] .smooth-model-slider{--smooth-model-ratio:0;position:relative;isolation:isolate;padding:0;transition:--smooth-model-ratio .3s cubic-bezier(.22,1,.36,1)}
body[data-smooth-skin] .smooth-model-slider.is-dragging{transition:none}
body[data-smooth-skin] .smooth-model-track{position:absolute;left:0;right:0;top:0;box-sizing:border-box;height:26px;border:1px solid var(--smooth-line-strong);border-radius:999px;background:var(--smooth-model-track);overflow:hidden;pointer-events:none}
/* The track's border eats 1px per side, so the fill's box subtracts it: 26 = the
   28px thumb minus both borders, 13 = the 14px half thumb minus one border. */
body[data-smooth-skin] .smooth-model-fill{position:absolute;z-index:1;left:0;top:0;bottom:0;width:calc(13px + (100% - 26px) * var(--smooth-model-ratio));border-radius:999px;background:var(--smooth-model-blue)}
/* Stop dots ride on the bar: above the blue fill so a passed stop still shows, below
   the ball so the thumb covers the stop it is resting on. */
body[data-smooth-skin] .smooth-model-dot{position:absolute;z-index:2;top:50%;width:4px;height:4px;border-radius:50%;background:var(--smooth-model-dot);transform:translate(-50%,-50%)}
/* The top effort stop is the release: a field of particles drifts left across the filled
   track. The composer bakes each spark's start, travel, size, speed and opacity once
   (MODEL_SPARKS), so the field is dense and irregular instead of one ordered stream. */
/* Under the sparks the top stop keeps its original blue and only gathers a few small
   pale glints: each patch is a soft white spot a few bar-heights across, faint enough not
   to recolour the fill, wandering on its own path. The layer is clipped to the fill's own
   width, so the light only ever touches the blue bar, never the empty ground right of the
   thumb; every patch is centred on the strip with translate, so the bright core of its
   gradient really falls inside the 24px bar instead of far below it. */
body[data-smooth-skin] .smooth-model-glow{position:absolute;z-index:1;left:0;top:0;bottom:0;width:calc(13px + (100% - 26px) * var(--smooth-model-ratio));overflow:hidden;border-radius:999px;pointer-events:none}
body[data-smooth-skin] .smooth-model-glow-blob{position:absolute;top:50%;translate:-50% -50%;border-radius:50%;background:radial-gradient(closest-side,#ffffff 0%,color-mix(in srgb,#ffffff 72%,transparent) 34%,color-mix(in srgb,#ffffff 30%,transparent) 64%,transparent 86%);opacity:calc(var(--glow-opacity,.35) * .9);mix-blend-mode:screen;animation:smooth-model-glow var(--glow-duration,6s) ease-in-out infinite alternate;animation-delay:var(--glow-delay,0s)}
@keyframes smooth-model-glow{0%{transform:translate(0,0) scale(.9);opacity:calc(var(--glow-opacity,.35) * .5)}50%{transform:translate(calc(var(--glow-dx,120px) * .55),calc(var(--glow-dy,0) * .55)) scale(1.05);opacity:calc(var(--glow-opacity,.35) * 1)}100%{transform:translate(var(--glow-dx,120px),var(--glow-dy,0)) scale(1.15);opacity:calc(var(--glow-opacity,.35) * .65)}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-glow-blob{animation:none}}
body[data-smooth-skin] .smooth-model-sparks{position:absolute;z-index:2;inset:0;overflow:hidden;border-radius:999px;pointer-events:none}
body[data-smooth-skin] .smooth-model-spark{position:absolute;width:var(--spark-size,3px);height:var(--spark-size,3px);border-radius:50%;background:#f2f7ff;box-shadow:0 0 8px color-mix(in srgb,#f2f7ff 85%,transparent),0 0 2px #fff;opacity:0;animation:smooth-model-spark var(--spark-duration,1.4s) linear infinite;animation-delay:var(--spark-delay,0s)}
@keyframes smooth-model-spark{0%{opacity:0;transform:translate(0,0) scale(.45)}14%{opacity:var(--spark-opacity,.8)}78%{opacity:calc(var(--spark-opacity,.8) * .55)}100%{opacity:0;transform:translate(var(--spark-dx,-120px),var(--spark-dy,0)) scale(.3)}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-spark{animation:none}}
body[data-smooth-skin] .smooth-model-slider input[type="range"]{position:relative;z-index:2;appearance:none;-webkit-appearance:none;display:block;box-sizing:border-box;width:100%;height:26px;margin:0;padding:0;background:transparent;cursor:pointer}
body[data-smooth-skin] .smooth-model-slider input[type="range"]::-webkit-slider-runnable-track{height:26px;border:0;background:transparent}
/* The native thumb keeps its geometry and hit area but paints nothing: the visible
   ball is the glider below it, riding the same ratio as the fill. */
body[data-smooth-skin] .smooth-model-slider input[type="range"]::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:28px;height:28px;margin-top:-1px;border:0;border-radius:50%;background:transparent;box-shadow:none;opacity:0}
body[data-smooth-skin] .smooth-model-glider{position:absolute;z-index:3;top:-1px;left:calc(14px + (100% - 28px) * var(--smooth-model-ratio));box-sizing:border-box;width:28px;height:28px;border-radius:50%;border:1px solid color-mix(in srgb,var(--smooth-text) 28%,transparent);background:var(--smooth-model-thumb);box-shadow:0 3px 10px rgba(0,0,0,.3);transform:translateX(-50%);pointer-events:none;transition:transform .32s cubic-bezier(.16,1,.3,1),box-shadow .32s ease}
body[data-smooth-skin] .smooth-model-slider input[type="range"]:active + .smooth-model-glider{transform:translateX(-50%) scale(1.06);box-shadow:0 5px 16px rgba(0,0,0,.36)}
body[data-smooth-skin] .smooth-model-slider:has(input[type="range"]:focus-visible) .smooth-model-track{box-shadow:0 0 0 2px color-mix(in srgb,var(--smooth-accent) 65%,transparent)}
body[data-smooth-skin] .smooth-model-slider input[type="range"]:disabled{opacity:.55;cursor:default}
body[data-smooth-skin] .smooth-model-slider input[type="range"]:disabled + .smooth-model-glider{opacity:.55}
/* Default is not a stop on the explicit scale: while the provider owns the level the bar
   is drained of its blue instead of the whole control being faded. Opacity was the wrong
   channel twice over: this file already spends it on disabled, and a half-transparent
   white thumb on a light track measured 1.05-1.08:1, i.e. gone. Neutralising the fill and
   pushing the track toward muted leaves the one blue-free bar sitting on a visibly darker
   pill (1.54-1.62:1 against the panel in light, 1.92-1.96:1 in dark; it was 1.02-1.07:1),
   so it reads as "nothing chosen" rather than "nothing works" - and the thumb keeps full
   contrast, so it stays live and picking a stop immediately takes the level back. */
body[data-smooth-skin] .smooth-model-slider[data-default="true"] .smooth-model-fill{background:var(--smooth-muted)}
body[data-smooth-skin] .smooth-model-slider[data-default="true"] .smooth-model-track{background:color-mix(in srgb,var(--smooth-model-track) 70%,var(--smooth-muted))}
/* The shared error chip (see .smooth-session-delete-error for why the tint and the ink
   move together). The 1px/10.5px bare red line was the file's only error that did not read
   as a block, and the smallest error copy in the panel. margin-top keeps it off the 28px
   glider, which overlaps its box by 1px and would otherwise clip the chip's top. */
body[data-smooth-skin] .smooth-model-error{margin-top:6px;padding:6px 8px;border-radius:var(--smooth-radius-sm);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--smooth-surface-2-mild));color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 82%,var(--smooth-text));font-size:12px;line-height:17px;white-space:pre-wrap}
body[data-smooth-skin] .smooth-model-group{display:flex;flex-direction:column;gap:1px}
body[data-smooth-skin] .smooth-git-menu.smooth-model-panel{padding:0;gap:0;overflow:hidden;max-height:none;--smooth-model-fade:color-mix(in srgb,var(--smooth-surface-3-mild) 80%,var(--dsw-specific-input-major))}
/* The panel answers the click at its final size: the first frame already shows the
   full panel, and only a short fade plus a 6px rise settles it in. Closing plays the
   same motion out for .15s before the portal is removed, so both directions stay
   responsive instead of delaying the readable content. */
body[data-smooth-skin] .smooth-model-panel{transform-origin:bottom center}
body[data-smooth-skin] .smooth-model-panel[data-state="open"]{animation:smooth-model-panel-in .16s cubic-bezier(.2,.8,.3,1)}
body[data-smooth-skin] .smooth-model-panel[data-state="closing"]{animation:smooth-model-panel-out .15s cubic-bezier(.4,0,1,1) forwards;pointer-events:none}
@keyframes smooth-model-panel-in{from{opacity:0;transform:translateY(6px) scale(.99)}to{opacity:1;transform:none}}
@keyframes smooth-model-panel-out{from{opacity:1;transform:none}to{opacity:0;transform:translateY(6px) scale(.99)}}
/* Two pages share one slot: the active page fades in from the side the navigation
   comes from while the other leaves the opposite way, the same language as the account
   menu's help page. The viewport height follows the page on screen, so the
   bottom-anchored panel grows or shrinks while the pages move instead of jumping. */
body[data-smooth-skin] .smooth-model-panel-viewport{position:relative;overflow:hidden;transition:height .26s cubic-bezier(.2,0,0,1)}
body[data-smooth-skin] .smooth-model-panel-pane{position:absolute;top:0;left:0;width:100%;min-width:0;display:flex;flex-direction:column;opacity:0;pointer-events:none;transform:translateX(14px);transition:opacity .2s ease,transform .26s cubic-bezier(.2,0,0,1)}
body[data-smooth-skin] .smooth-model-panel-pane[data-pane="effort"]{transform:translateX(-14px)}
body[data-smooth-skin] .smooth-model-panel-pane[data-active="true"]{opacity:1;pointer-events:auto;transform:none}
body[data-smooth-skin] .smooth-model-list{display:flex;flex-direction:column;gap:6px;min-width:0;padding:10px 12px 12px}
body[data-smooth-skin] .smooth-model-list-head{display:flex;align-items:center;gap:4px;min-height:22px}
body[data-smooth-skin] .smooth-model-back{display:grid;place-items:center;width:22px;height:22px;padding:0;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:var(--smooth-muted);cursor:pointer}
body[data-smooth-skin] .smooth-model-back:hover{background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-list-title{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-list .smooth-git-list{max-height:min(42vh,320px);overflow-y:auto;overscroll-behavior:contain;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
body[data-smooth-skin] .smooth-model-list .smooth-git-heading{padding:4px 4px 2px}
/* The panel's backdrop: one cutout per thinking level, stacked and cross-faded as the
   thumb moves. The bottom fade lands on the panel's own colour, so the art melts into
   the controls instead of ending on a hard edge. */
body[data-smooth-skin] .smooth-model-media{position:relative;flex:none;height:168px;overflow:hidden;border-radius:calc(var(--smooth-radius-lg) - 1px) calc(var(--smooth-radius-lg) - 1px) 0 0;background:radial-gradient(130% 150% at 50% 6px,color-mix(in srgb,var(--smooth-model-blue) 14%,transparent),transparent 72%)}
/* The whole backdrop — artwork and the soft bottom fade — sits 6px lower than the
   panel's top edge. Moving them together keeps the picture and its blur in step. */
body[data-smooth-skin] .smooth-model-media::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent calc(68% + 6px),var(--smooth-model-fade) 100%);pointer-events:none}
body[data-smooth-skin] .smooth-model-art{position:absolute;left:0;top:6px;width:100%;height:100%;object-fit:cover;object-position:50% 38%;opacity:0;transition:opacity .28s ease;pointer-events:none;user-select:none}
body[data-smooth-skin] .smooth-model-art[data-active="true"]{opacity:1}
body[data-smooth-skin] .smooth-model-body{display:flex;flex-direction:column;align-items:stretch;gap:2px;min-width:0;padding:10px 12px 12px}
body[data-smooth-skin] .smooth-model-panel .smooth-model-trigger{height:24px;min-height:24px;font-size:13px}
body[data-smooth-skin] .smooth-model-panel .smooth-model-slider{margin-top:4px}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-art{transition:none}}
/* The glide was the panel's only unguarded motion: every other animation here already
   opts out, but the thumb and the fill still travelled on a .3s/.32s curve. Cutting the
   transition keeps the drag-instant rule above (which is what makes a held drag follow
   the pointer) and leaves a click landing on its stop immediately. */
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-slider,body[data-smooth-skin] .smooth-model-glider{transition:none}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-panel{animation:none}body[data-smooth-skin] .smooth-model-panel-viewport,body[data-smooth-skin] .smooth-model-panel-pane{transition:none}}
/* Keep TodoPanel's projection, native StateDot and conditional list rendering.
   Scope every local name to its public panel hook so chat headers stay untouched. */
body[data-smooth-skin] [data-testid="todo-panel"]{border:0;border-radius:var(--smooth-radius-lg);background:var(--smooth-surface-mild);box-shadow:var(--smooth-shadow-1);backdrop-filter:none}
body[data-smooth-skin] [data-testid="todo-panel"]>${hostPart('body')}{gap:0;padding:0}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('header')}[aria-expanded]{box-sizing:border-box;min-height:40px;height:auto;gap:8px;padding:8px 14px;border:0;border-radius:0;background:transparent;color:var(--smooth-text);transition:background-color .16s ease}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('header')}:hover{background:color-mix(in srgb,var(--smooth-text) 4%,transparent)}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('header')}:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-3px;border-radius:var(--smooth-radius-lg)}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('title')}{font-size:13px;line-height:20px;font-weight:600;color:var(--smooth-text)}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('progress')}{font-size:12px;line-height:20px;color:var(--smooth-muted);font-variant-numeric:tabular-nums}
body[data-smooth-skin] [data-testid="todo-panel"] :is(${hostPart('lead')},${hostPart('chevron')}){color:var(--smooth-muted);width:16px;height:20px}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('list')}{gap:2px;max-height:min(224px,30vh);margin:0;padding:2px 8px 10px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('item')}{box-sizing:border-box;flex:none;align-items:flex-start;gap:10px;min-height:34px;padding:7px 10px;border-radius:var(--smooth-radius-sm);font-size:13px;line-height:20px;color:var(--smooth-muted)}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('glyph')}{width:16px;height:20px}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('content')}{min-width:0;flex:1;white-space:normal;overflow:visible;overflow-wrap:anywhere;text-overflow:clip}
body[data-smooth-skin] [data-testid="todo-panel"] [data-smooth-status="in_progress"]{background:color-mix(in srgb,var(--smooth-accent) 8%,transparent);color:var(--smooth-text);font-weight:500}
body[data-smooth-skin] [data-testid="todo-panel"] [data-smooth-status="in_progress"] [data-smooth-state="ongoing"]{color:var(--smooth-accent)}
body[data-smooth-skin] [data-testid="todo-panel"] [data-smooth-status="completed"]{color:var(--dsw-alias-label-tertiary)}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('header')}{transition:none}}
/* Native question form: retain radio/checkbox semantics, draft mirrors, paging,
   countdowns and submission. Only the question seat owns these local classes. */
body[data-smooth-skin] [data-question-key]{container-type:inline-size;container-name:smooth-question}
body[data-smooth-skin] ${questionPanel}{max-height:min(68vh,620px);padding:0;border-radius:var(--smooth-radius-lg);background:var(--dsw-specific-input-major);box-shadow:var(--smooth-shadow-1)}
body[data-smooth-skin] ${questionPanel} ${hostPart('header')}{display:flex;gap:16px;min-height:0;max-height:min(24vh,180px);padding:16px 18px 12px;border:0;overflow-y:auto;overscroll-behavior:contain}
body[data-smooth-skin] ${questionPanel} ${hostPart('headingBlock')}{flex:1;overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('eyebrow')}{margin-bottom:6px;color:var(--smooth-muted);font-size:12px;line-height:18px}
body[data-smooth-skin] ${questionPanel} h2${hostPart('title')}{margin:0;font-size:var(--dsh-content-font-size,14px);line-height:1.65;font-weight:550;color:var(--smooth-text);overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('headerActions')}{position:sticky;top:0;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:190px}
body[data-smooth-skin] ${questionPanel} ${hostPart('waitStatus')}{font-size:12px;line-height:24px;color:var(--smooth-muted)}
body[data-smooth-skin] ${questionPanel} ${hostPart('iconButton')}{width:28px;height:28px;color:var(--smooth-muted);border-radius:var(--smooth-radius-sm)}
body[data-smooth-skin] ${questionPanel} ${hostPart('iconButton')}:disabled{color:var(--dsw-alias-label-tertiary);opacity:.4}
/* Focusing the free-text answer turns the block's border business-blue; the caret already
   shows focus, so the block keeps the same quiet border it has when idle. */
body[data-smooth-skin] ${questionPanel} ${hostPart('customBlock')}:focus-within{border-color:var(--smooth-line)}
body[data-smooth-skin] ${questionPanel} [data-question-scroll]{min-height:0;scrollbar-gutter:stable;overflow-x:hidden}
body[data-smooth-skin] ${questionPanel} ${hostPart('detail')}{margin:0;padding:4px 18px 8px;font-size:var(--dsh-content-font-size,14px);line-height:1.65}
body[data-smooth-skin] ${questionPanel} ${hostPart('options')}{margin:0;padding:8px 16px 12px;gap:6px}
body[data-smooth-skin] ${questionPanel} :is(${hostPart('option')},${hostPart('customRow')}){gap:10px;min-height:44px;padding:10px 12px;border:1px solid transparent;border-radius:var(--smooth-radius-sm);transition:background-color .16s ease,border-color .16s ease}
body[data-smooth-skin] ${questionPanel} ${hostPart('option')}:hover:not(:disabled){background:color-mix(in srgb,var(--smooth-accent) 4%,var(--dsw-specific-input-major))}
body[data-smooth-skin] ${questionPanel} ${hostPart('option')}[aria-checked="true"]{background:color-mix(in srgb,var(--smooth-accent) 8%,var(--dsw-specific-input-major));border-color:color-mix(in srgb,var(--smooth-accent) 45%,var(--smooth-line))}
body[data-smooth-skin] ${questionPanel} ${hostPart('number')}{margin-top:1px;width:22px;height:22px;flex-basis:22px;border-radius:var(--smooth-radius-sm);background:var(--smooth-app);color:var(--smooth-muted);font-size:12px;line-height:20px}
body[data-smooth-skin] ${questionPanel} ${hostPart('option')}[aria-checked="true"] ${hostPart('number')}{background:color-mix(in srgb,var(--smooth-accent) 14%,var(--dsw-specific-input-major));color:var(--smooth-text)}
body[data-smooth-skin] ${questionPanel} ${hostPart('checkboxChecked')}{color:var(--smooth-ink)}
body[data-smooth-skin] ${questionPanel} ${hostPart('checkboxChecked')}::before{background:var(--smooth-accent);border-color:var(--smooth-accent)}
body[data-smooth-skin] ${questionPanel} ${hostPart('optionLine')}{gap:4px 8px}
body[data-smooth-skin] ${questionPanel} ${hostPart('optionLabel')}{font-size:14px;line-height:22px;font-weight:550;color:var(--smooth-text);overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('description')}{display:block;flex-basis:100%;font-size:13px;line-height:1.65;color:var(--smooth-muted);overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('badge')}{padding:0 6px;border-radius:var(--smooth-radius-xs);background:color-mix(in srgb,var(--smooth-accent) 10%,var(--dsw-specific-input-major));color:var(--dsw-alias-link);font-size:11px;line-height:20px}
body[data-smooth-skin] ${questionPanel} :is(${hostPart('customRow')},${hostPart('customBlock')}){border:1px solid var(--smooth-line);background:var(--smooth-surface-2-mild);border-radius:var(--smooth-radius-md)}
body[data-smooth-skin] ${questionPanel} ${hostPart('customRow')}{margin-top:4px}
body[data-smooth-skin] ${questionPanel} ${hostPart('customRowActive')}{border-color:color-mix(in srgb,var(--smooth-accent) 45%,var(--smooth-line));background:color-mix(in srgb,var(--smooth-accent) 8%,var(--dsw-specific-input-major))}
body[data-smooth-skin] ${questionPanel} ${hostPart('customBlock')}{margin-inline:0;border-radius:var(--smooth-radius-md);--dsh-answer-field-padding:10px 12px}
body[data-smooth-skin] ${questionPanel} ${hostPart('customRow')}:focus-within{border-color:var(--smooth-accent);background:var(--dsw-specific-input-major)}
body[data-smooth-skin] ${questionPanel} ${hostPart('field')}>*{font-size:14px;line-height:22px}
body[data-smooth-skin] ${questionPanel} ${hostPart('fieldInput')}::placeholder{color:var(--smooth-muted)}
body[data-smooth-skin] ${questionPanel} ${hostPart('footer')}{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px 12px;align-items:center;flex-shrink:0;margin:0;padding:12px 16px;border-top:1px solid var(--smooth-line);background:var(--dsw-specific-input-major)}
body[data-smooth-skin] ${questionPanel} ${hostPart('footerActions')}{gap:8px}
body[data-smooth-skin] ${questionPanel} ${hostPart('footerActions')}>button{height:34px;min-height:34px;padding:0 14px;border-radius:var(--smooth-radius-md);font-size:13px;line-height:20px;font-weight:500}
body[data-smooth-skin] ${questionPanel} ${hostPart('footerActions')}>button${accountPart('primary')}{background:var(--smooth-accent);color:var(--smooth-ink)}
body[data-smooth-skin] ${questionPanel} ${hostPart('progress')}{font-size:12px;line-height:20px;word-spacing:normal;font-variant-numeric:tabular-nums;color:var(--smooth-muted)}
body[data-smooth-skin] ${questionPanel} ${hostPart('feedback')}{min-width:0;text-align:left;font-size:12px;line-height:18px;overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('feedback')}:empty{min-height:0}
body[data-smooth-skin] ${questionPanel} :is(button,textarea):focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
@container smooth-question (max-width:520px){
  body[data-smooth-skin] ${questionPanel} ${hostPart('header')}{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding:12px}
  body[data-smooth-skin] ${questionPanel} ${hostPart('headingBlock')}{grid-row:2}
  body[data-smooth-skin] ${questionPanel} ${hostPart('headerActions')}{grid-row:1;max-width:none;position:static}
  body[data-smooth-skin] ${questionPanel} ${hostPart('options')}{padding:6px 10px 10px}
  body[data-smooth-skin] ${questionPanel} ${hostPart('option')}{padding:9px 10px}
  body[data-smooth-skin] ${questionPanel} ${hostPart('footer')}{grid-template-columns:1fr auto;padding:10px;gap:6px}
  body[data-smooth-skin] ${questionPanel} ${hostPart('feedback')}{grid-row:2;grid-column:1/-1}
  body[data-smooth-skin] ${questionPanel} ${hostPart('footerActions')}{grid-row:1;grid-column:2}
}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] ${questionPanel} :is(${hostPart('option')},${hostPart('customRow')}){transition:none}}
body[data-smooth-skin] [data-chat-flow-kind="assistant-step"]{color:var(--smooth-text)}
body[data-smooth-skin] [data-chat-group-part="reasoning"]{color:var(--smooth-muted)}
/* Keep the native transcript column, width handles, flow routing and renderers.
   Only the native flow-gap hook separates turns; hidden/collapsed rows retain
   the host's visibility and spacing rules. Priority on this hook wins over the
   host's highly specific following-response selector without copying it. */
body[data-smooth-skin] [data-conversation-scroll] :is([data-chat-flow-kind="user"],[data-chat-flow-kind="steering"]){--dsh-chat-flow-gap:28px!important}
body[data-smooth-skin] [data-conversation-scroll] [data-chat-flow-kind="assistant-step"][data-chat-group-part="response"]{--dsh-chat-flow-gap:16px!important}
body[data-smooth-skin] ${chatMarkdown}{font-family:inherit;font-size:var(--dsh-content-font-size,14px);line-height:1.8;color:var(--smooth-text)}
body[data-smooth-skin] ${chatMarkdown} :is(p,ul,ol){margin-block:1em}
body[data-smooth-skin] ${chatMarkdown} li>p{margin-block:.5em}
body[data-smooth-skin] ${chatMarkdown} li>:is(ul,ol){margin-block:.25em 0}
body[data-smooth-skin] ${chatMarkdown} :is(h1,h2,h3,h4,h5,h6){font-family:inherit;font-weight:600;line-height:1.5;margin-block:1.5em .6em;color:var(--smooth-text)}
body[data-smooth-skin] ${chatMarkdown} h1{font-size:1.5em}
body[data-smooth-skin] ${chatMarkdown} h2{font-size:1.25em}
body[data-smooth-skin] ${chatMarkdown} h3{font-size:1.125em}
body[data-smooth-skin] ${chatMarkdown} :is(h4,h5,h6){font-size:1em}
body[data-smooth-skin] ${chatMarkdown}>:first-child{margin-top:0}
body[data-smooth-skin] ${chatMarkdown}>:last-child{margin-bottom:0}
body[data-smooth-skin] ${chatMarkdown} blockquote{border-left:1px solid var(--smooth-line-strong);padding-left:16px;color:var(--smooth-muted)}
body[data-smooth-skin] ${chatMarkdown} hr{height:1px;margin-block:24px;background:var(--smooth-line)}
body[data-smooth-skin] ${chatMarkdown} a{text-underline-offset:3px}
/* Inline code reads as a reference, not as body text: it takes the same link blue the
   native file mentions use, while fenced blocks keep their syntax colours. */
body[data-smooth-skin] [data-conversation-scroll] :not(pre)>code{color:var(--dsw-alias-link)}
body[data-smooth-skin] [data-conversation-scroll] ::selection{background:color-mix(in srgb,var(--smooth-accent) 28%,transparent);color:var(--smooth-text)}
/* Flow rows include attachments and actions and span the conversation column.
   Paint only the native bubble, retaining its content-sized, right-aligned stack. */
body[data-smooth-skin] :is([data-chat-flow-kind="user"],[data-chat-flow-kind="steering"]) ${hostPart('bubble')}{border-radius:var(--smooth-radius-lg);background:var(--dsw-specific-bubble);padding:12px 16px;font-size:var(--dsh-content-font-size,14px);line-height:1.7;color:var(--smooth-text)}

/* State styling only; no glyph/font/image replacement. Switches are left entirely to
   the surface that owns them: plugin pages and the host ship their own switch geometry,
   and the skin's earlier global width/thumb overrides broke plugin toggles. The only
   switch the skin sizes is the host's own general-settings row (below), whose default
   geometry it re-asserts. */
body[data-smooth-skin] [role="menu"]{border:1px solid var(--smooth-line-strong);border-radius:var(--smooth-radius-lg);background:color-mix(in srgb,var(--dsw-alias-bg-overlay) var(--smooth-glass-overlay),transparent);box-shadow:var(--smooth-shadow-2)}
body[data-smooth-skin] [role="menuitem"]{border-radius:var(--smooth-radius-sm)}
/* Account popup follows the reference's .75px scale for spacing and width; its
   corners use the shared radius scale. Keep the native menu, focus handling,
   shortcuts, login state and action confirmations intact. */
${accountMenu}{
  --smooth-account-unit:.75px;
  --dsw-menu-surface-fill:color-mix(in srgb,var(--dsw-alias-bg-overlay) var(--smooth-glass-overlay),transparent);
  /* The surface above is 96% opaque, so the host's backdrop blur adds almost nothing
     visible. It does force every scale step of the entrance to re-filter the backdrop
     (and keeps the transform off the compositor), which is what made the popup stall
     mid-open; this one popup drops the blur and keeps the same look. */
  --dsw-menu-backdrop-filter:none;
  /* Nudge the popup a few pixels clear of the rail's silhouette: the avatar stays the
     anchor, the menu just stops crowding the column edge. */
  inset:auto auto calc(8 * var(--smooth-account-unit)) max(12px,calc(var(--smooth-rail-width) - 10 * var(--smooth-account-unit) + 6px))!important;
  width:min(calc(304 * var(--smooth-account-unit)),calc(100vw - var(--smooth-rail-width) - 8px));
  min-width:0;max-width:none;max-height:calc(100dvh - var(--smooth-caption) - 16px);overflow-x:clip;
  padding:calc(8 * var(--smooth-account-unit)) calc(6 * var(--smooth-account-unit));
  border:1px solid var(--smooth-line);border-radius:var(--smooth-radius-lg);corner-shape:round;
  background:transparent;box-shadow:var(--smooth-shadow-2);font-family:inherit;font-size:var(--dsh-content-font-size,14px);
  /* The avatar sits under the popup's bottom-left corner, so the entrance grows out of
     that corner instead of fading in place: the menu reads as opening from the avatar.
     The host mounts its rows, and the skin's own profile portal, in the frames right after
     the menu appears; mounting that content in the middle of the scale is what made the
     popup hitch. The portal arms the entrance (data-smooth-account-open) once it has laid
     out, so the visible scale starts on finished content; the delayed animation below is
     only the fallback for a client half that never arms it. will-change keeps the
     transform composited. */
  transform-origin:left bottom;
  will-change:transform,opacity;
  animation:smooth-account-pop .2s cubic-bezier(.2,0,0,1) .12s both;
}
@keyframes smooth-account-pop{from{opacity:0;transform:scale(.82) translateY(4px)}to{opacity:1;transform:none}}
@keyframes smooth-account-pop-armed{from{opacity:0;transform:scale(.82) translateY(4px)}to{opacity:1;transform:none}}
${accountMenu}[data-smooth-account-open]{animation:smooth-account-pop-armed .2s cubic-bezier(.2,0,0,1) both}
/* The host drops the real menu as soon as it closes, so account.js keeps a clone and runs
   the closing keyframes on it: the same bottom-left corner, played in reverse. */
@keyframes smooth-account-leave{from{opacity:1;transform:none}to{opacity:0;transform:scale(.82) translateY(4px)}}
${accountMenu}[data-smooth-account-leave]{animation:smooth-account-leave .16s cubic-bezier(.4,0,1,1) both;pointer-events:none}
@media(prefers-reduced-motion:reduce){${accountMenu},${accountMenu}[data-smooth-account-open],${accountMenu}[data-smooth-account-leave]{animation:none}}
${accountMenu} ${accountPart('viewport')}{display:grid;grid-template-columns:minmax(0,1fr);min-width:0;overflow-x:hidden}
${accountMenu} [role="menuitem"]{
  display:flex;align-items:center;width:100%;border:0;background:transparent;text-align:left;cursor:pointer;
  box-sizing:border-box;min-height:calc(43 * var(--smooth-account-unit));
  gap:calc(10 * var(--smooth-account-unit));padding:calc(6 * var(--smooth-account-unit)) calc(12 * var(--smooth-account-unit));
  border-radius:var(--smooth-radius-sm);corner-shape:round;
  color:color-mix(in srgb,var(--smooth-text) 40%,var(--dsw-alias-button-primary-fill));
  font-family:inherit;font-size:inherit;line-height:1.4;
}
${accountMenu} ${accountPart('itemIcon')}{width:calc(22 * var(--smooth-account-unit));height:calc(22 * var(--smooth-account-unit));color:var(--smooth-text)}
${accountMenu} ${accountPart('itemIcon')}>svg{width:100%;height:100%}
${accountMenu} ${accountPart('shortcutKeys')}{color:var(--smooth-muted);font-size:inherit;line-height:1.4}
${accountMenu} [role="menuitem"]:is(:hover,:focus-visible):not(:disabled){background:color-mix(in srgb,var(--smooth-surface-3-mild) 85%,var(--smooth-muted));outline:none}
body[data-smooth-skin] .smooth-account-launcher{flex:1;min-width:0;width:100%}
body[data-smooth-skin] .smooth-account-extras{display:contents}
${accountMenu} ${accountPart('viewport')}>${accountPart('itemWrap')}{grid-column:1;grid-row:7}
${accountMenu} ${accountPart('viewport')}>${accountPart('itemWrap')}:nth-child(1){grid-row:5}
${accountMenu} ${accountPart('viewport')}>${accountPart('itemWrap')}:nth-child(2){grid-row:4}
body[data-smooth-skin] .smooth-account-profile{grid-column:1;grid-row:1;display:flex;align-items:center;gap:8px;margin:0 9px 4px;padding:7px 0 10px;border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] .smooth-account-avatar{display:flex;align-items:center;justify-content:center;flex:none;width:23px;height:23px;border-radius:50%;corner-shape:round;overflow:hidden;background:var(--smooth-surface-3-mild)}
body[data-smooth-skin] .smooth-account-avatar img{display:block;width:100%;height:100%;object-fit:cover}
body[data-smooth-skin] .smooth-account-identity{display:flex;flex-direction:column;gap:2px;min-width:0}
body[data-smooth-skin] .smooth-account-identity strong{font-size:inherit;font-weight:650;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-button-primary-fill)}
body[data-smooth-skin] .smooth-account-identity>span{font-size:inherit;line-height:1.3;color:var(--smooth-muted)}
body[data-smooth-skin] .smooth-account-usage{grid-column:1;grid-row:2}
body[data-smooth-skin] .smooth-account-help{grid-column:1;grid-row:6;margin-top:7px;position:relative}
body[data-smooth-skin] .smooth-account-help::before{content:"";position:absolute;top:-5px;left:9px;right:9px;height:1px;background:var(--smooth-line);pointer-events:none}
body[data-smooth-skin] :is(.smooth-account-usage,.smooth-account-help)>span{flex:1;min-width:0}
body[data-smooth-skin] :is(.smooth-account-usage,.smooth-account-help)>svg{flex:none;width:16.5px;height:16.5px;color:var(--smooth-text)}
body[data-smooth-skin] .smooth-account-chevron{margin-left:auto;transform:rotate(0deg);transition:transform .22s cubic-bezier(.2,0,0,1)}
body[data-smooth-skin] [aria-expanded="true"]>.smooth-account-chevron{transform:rotate(90deg)}
body[data-smooth-skin] .smooth-account-balance{grid-column:1;grid-row:3;display:grid;grid-template-rows:0fr;opacity:0;visibility:hidden;transition:grid-template-rows .22s cubic-bezier(.2,0,0,1),opacity .22s ease,visibility 0s linear .22s}
body[data-smooth-skin] .smooth-account-balance[data-expanded="true"]{grid-template-rows:1fr;opacity:1;visibility:visible;transition-delay:0s}
body[data-smooth-skin] .smooth-account-balance-clip{min-height:0;overflow:hidden}
body[data-smooth-skin] .smooth-account-balance-inner{min-height:0;max-height:200px;overflow:auto;margin:4px 6px 6px;padding:10px;border:1px solid var(--smooth-line);border-radius:var(--smooth-radius-md);corner-shape:round;background:var(--smooth-surface-mild);font-size:inherit;line-height:1.5}
body[data-smooth-skin] .smooth-account-balance-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}
body[data-smooth-skin] .smooth-account-refresh{display:flex;align-items:center;justify-content:center;flex:none;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:var(--smooth-muted);cursor:pointer}
body[data-smooth-skin] .smooth-account-refresh:hover{background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-account-refresh:disabled{opacity:.5;cursor:default}
body[data-smooth-skin] .smooth-account-wallet{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:7px 0;color:var(--smooth-muted)}
body[data-smooth-skin] .smooth-account-wallet>span:last-child{display:flex;flex-direction:column;align-items:flex-end;min-width:0}
body[data-smooth-skin] .smooth-account-amount{color:var(--smooth-text);font-size:inherit;font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
body[data-smooth-skin] .smooth-account-balance p{margin:6px 0;color:var(--smooth-muted);font-size:inherit}
/* Both pages share the rows below the profile; switch without remounting the
   native controls or changing their authentication/action closures. */
${accountMenu} ${accountPart('viewport')}>${accountPart('itemWrap')},
${accountMenu} :is(.smooth-account-usage,.smooth-account-help){transition:opacity .22s ease,transform .22s cubic-bezier(.2,0,0,1)}
${accountMenu}[data-smooth-help-open] ${accountPart('viewport')}>${accountPart('itemWrap')},
${accountMenu}[data-smooth-help-open] :is(.smooth-account-usage,.smooth-account-help){opacity:0;transform:translateX(-10px);pointer-events:none}
body[data-smooth-skin] .smooth-account-help-page{grid-column:1;grid-row:2 / 8;z-index:1;min-width:0;display:grid;grid-template-rows:repeat(5,minmax(32.25px,auto));opacity:0;transform:translateX(10px);pointer-events:none;transition:opacity .22s ease,transform .22s cubic-bezier(.2,0,0,1)}
body[data-smooth-skin] .smooth-account-help-page[data-active="true"]{opacity:1;transform:translateX(0);pointer-events:auto}
body[data-smooth-skin] .smooth-account-help-page [role="menuitem"]{min-width:0}
body[data-smooth-skin] .smooth-account-help-page [role="menuitem"]>span{flex:1;min-width:0}
body[data-smooth-skin] .smooth-account-help-page svg{flex:none;color:var(--smooth-muted)}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] :is(.smooth-account-balance,.smooth-account-chevron,.smooth-account-usage,.smooth-account-help,.smooth-account-help-page),${accountMenu} ${accountPart('viewport')}>${accountPart('itemWrap')}{transition:none}}
body[data-smooth-skin] ${hostPart('footArea')} button[data-signed-out][aria-expanded="true"]{border-radius:var(--smooth-rail-button-radius);corner-shape:round;background:var(--smooth-surface-3-mild)}
body[data-smooth-skin] :is(button,[role="menuitem"],a):focus-visible{outline-color:var(--smooth-accent)}
@property --smooth-scrollbar-inset{syntax:"<length>";inherits:true;initial-value:3px}
body[data-smooth-skin] *{scrollbar-width:auto;scrollbar-color:auto}
/* The host declares no global scrollbar rule, so a scroller keeps the platform's
   overlay scrollbars and reserves no space until a ::-webkit-scrollbar rule claims
   it. Claiming one switches that scroller to the classic, space-taking kind, which
   turned every sideways scroller inside a transcript into an 8px blank strip. The
   transcript's nested scrollers therefore keep the overlay kind; the app's own
   surfaces keep the styled one. */
body[data-smooth-skin] :not([data-conversation-scroll] *)::-webkit-scrollbar{width:8px;height:8px}
body[data-smooth-skin] :not([data-conversation-scroll] *)::-webkit-scrollbar-track{background:transparent}
body[data-smooth-skin] :not([data-conversation-scroll] *)::-webkit-scrollbar-thumb{border:var(--smooth-scrollbar-inset,3px) solid transparent;border-radius:999px;background:var(--dsw-alias-scrollbar-bg-l1);background-clip:content-box;transition:background-color .18s ease}
body[data-smooth-skin] :not([data-conversation-scroll] *)::-webkit-scrollbar-thumb:hover{background-color:var(--dsw-alias-scrollbar-hover-l1)}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] :not([data-conversation-scroll] *)::-webkit-scrollbar-thumb{transition:none}}
@supports not selector(::-webkit-scrollbar){body[data-smooth-skin] *{scrollbar-width:thin;scrollbar-color:var(--dsw-alias-scrollbar-bg-l1) transparent}}

@media(max-width:760px){
  body[data-smooth-skin] [data-shortcut-modal="settings"]{width:calc(100vw - 24px);max-width:calc(100vw - 24px)}
  body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{min-width:130px;width:150px;padding-inline:8px}
  body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding-inline:18px}
}
@media(prefers-reduced-motion:reduce){
  body[data-smooth-skin] :is([data-composer-card],[role="switch"]){transition:none}
  body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}{transition:none}
}
@media(forced-colors:active){
  body[data-smooth-skin] :is([data-composer-card],[role="switch"]){border:1px solid CanvasText}
}

/* The shell arrives behind the launch animation: the splash script injected into
   the index sets body[data-smooth-boot="reveal"] as the app mounts, and removes it
   once the longest entrance is over. Every part of it is an opacity fade, and the
   stagger lives in the delays: a move would re-anchor the fixed rail and sidebar
   chrome to its column, and transforms on the big columns are exactly the kind of
   work the opening must not add while the app is still mounting. */
body[data-smooth-skin][data-smooth-boot="reveal"] ${hostPart('sidebarCol')}{animation:smooth-boot-fade .5s cubic-bezier(.2,0,0,1) backwards}
body[data-smooth-skin][data-smooth-boot="reveal"] ${hostPart('centerCol')}{animation:smooth-boot-fade .56s cubic-bezier(.2,0,0,1) .03s backwards}
body[data-smooth-skin][data-smooth-boot="reveal"] .smooth-workspace-bar{animation:smooth-boot-fade .5s cubic-bezier(.2,0,0,1) .05s backwards}
/* A collapsed sidebar hides the rail buttons; animating their opacity there would
   flash them in and out again as the fill releases. */
body[data-smooth-skin][data-smooth-boot="reveal"]:not(:has([data-sidebar-collapsed])) :is(.smooth-rail-home,.smooth-rail-plugins){animation:smooth-boot-fade .5s cubic-bezier(.2,0,0,1) .08s backwards}
body[data-smooth-skin][data-smooth-boot="reveal"] [data-composer-card]{animation:smooth-boot-fade .52s cubic-bezier(.2,0,0,1) .1s backwards}
@keyframes smooth-boot-fade{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){
  body[data-smooth-skin][data-smooth-boot="reveal"] :is(${hostPart('sidebarCol')},${hostPart('centerCol')},.smooth-workspace-bar,.smooth-rail-home,.smooth-rail-plugins,[data-composer-card]){animation:none}
  body[data-smooth-skin] ${hostPart('composerHero')}{animation:none}
}

/* Reference geometry. Units intentionally follow the supplied HTML rather than
   giving the existing host layout a second set of approximate dimensions, and the
   reference draws for a 1950px canvas. The whole left column is fixed chrome: the
   reference pins its side rail at .91px, and the rail, the sidebar header and the
   session tree all share that unit, so the column keeps one size at every window
   width. --smooth-u drives the welcome and shell geometry and stops at the
   reference width. */
body[data-smooth-skin]{
  --smooth-u:min(1px,calc(100vw / 1950));--smooth-l:.91px;
  /* The workspace tabs are fixed chrome, not layout geometry: the reference pins
     its sidebar rail and account menu to a fixed unit for the same reason, while
     the caption that hosts the tabs keeps scaling (48-64px). Tab geometry never
     follows the window; the welcome and shell geometry does, up to the reference
     width. The bar's own padding stays on --smooth-u so it meets the shell curve;
     that shell corner is the fixed 26px full-panel radius. */
  --smooth-tab-u:.65px;
  --smooth-left-width:352px;--smooth-rail-width:calc(44 * var(--smooth-l));
  --smooth-rail-button-size:calc(38 * var(--smooth-l));--smooth-rail-icon-size:calc(24 * var(--smooth-l));--smooth-rail-button-radius:var(--smooth-radius-md);
  --smooth-rail-inset:calc((var(--smooth-rail-width) - var(--smooth-rail-button-size)) / 2);
  --smooth-rail-gap:calc(9 * var(--smooth-l));
  /* The tab strip takes the host's own caption height (40px in the desktop app) instead
     of a taller fixed caption: the tabs keep their size, the strip's extra whitespace
     disappears, and the rail keeps the same 4-unit gap under the strip. */
  --smooth-caption:var(--dsh-windows-titlebar-height,40px);
  --smooth-rail-top:calc(var(--smooth-caption) + 4 * var(--smooth-l));
  --smooth-rail-panels-top:calc(var(--smooth-rail-top) + var(--smooth-rail-button-size) + var(--smooth-rail-gap));
}
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')})>${hostPart('centerCol')}{border-radius:0 0 0 var(--smooth-radius-xl);overflow:clip;corner-shape:round}
body[data-smooth-skin] .smooth-workspace-bar{
  position:fixed;top:0;left:var(--smooth-left-width);right:0;height:var(--smooth-caption);
  display:flex;align-items:center;gap:4px;padding:0 35px 0 5px;background:var(--smooth-surface-glass);
  border-radius:18px 0 0 0;corner-shape:round;pointer-events:auto;z-index:50;-webkit-app-region:drag;
}
/* The caption strip's sidebar colour now stops at the sidebar edge, so the strip's
   rounded top-left corner had nothing behind it and read as a square corner. This tile
   repaints only the wedge outside the 18px radius in the sidebar's glass colour, leaving
   the strip's own background one flat colour. */
/* Host components inside the shell take their fills from the host's layer/input/bubble
   tokens; point those at the same mild variants so the conversation's cards, composer
   well and bubbles move with the slider too (portaled overlays stay outside #root).
   --dsw-specific-sidebar-fill is the colour behind the native sidebar column: the host's
   session-list bottom fade paints with it, so it has to be the glass value too — otherwise
   the fade stays an opaque sidebar-coloured band while the column around it is see-through. */
body[data-smooth-skin]>#root{--dsw-specific-sidebar-fill:var(--smooth-sidebar-glass);--dsw-alias-bg-layer-1:var(--smooth-surface-mild);--dsw-alias-bg-layer-2:var(--smooth-surface-2-mild);--dsw-alias-bg-layer-3:var(--smooth-surface-3-mild);--dsw-alias-interactive-bg-hover:var(--smooth-hover-mild);--dsw-alias-interactive-bg-active:var(--smooth-active-mild);--dsw-specific-input-major:var(--smooth-surface-mild);--dsw-specific-bubble:var(--smooth-bubble-mild)}
body[data-smooth-skin] .smooth-workspace-bar::before{
  content:"";position:absolute;top:0;left:0;width:18px;height:18px;pointer-events:none;
  background:radial-gradient(circle at 100% 100%,transparent 0 17.5px,var(--smooth-sidebar-glass) 18px);
}
/* A collapsed sidebar parks the expand toggle (12px), the new-conversation button (48px)
   and the native caption menu in the caption's left corner. The chrome measures where the
   menu ends and publishes --smooth-caption-leading, so the strip starts to the right of
   "编辑" instead of guessing a pixel offset; its own 92px narrow-window padding is dropped. */
body[data-smooth-skin]:has([data-sidebar-collapsed]) .smooth-workspace-bar{left:var(--smooth-caption-leading,100px);padding-left:5px}
body[data-smooth-skin] .smooth-workspace-tabs{position:relative;display:flex;align-items:center;gap:calc(12 * var(--smooth-tab-u));min-width:0;overflow-x:auto;scrollbar-width:none;flex:1;-webkit-app-region:drag}
/* Electron's native caption drag region excludes every interactive tab/control. */
body[data-smooth-skin] .smooth-workspace-bar :is(.smooth-workspace-tab,button){-webkit-app-region:no-drag}
body[data-smooth-skin] .smooth-workspace-tab{
  position:relative;display:flex;align-items:center;justify-content:center;flex:none;max-width:calc(300 * var(--smooth-tab-u));min-width:0;
  height:calc(43 * var(--smooth-tab-u));padding:0;border:1px solid var(--smooth-line);border-radius:999px;
  background:transparent;color:var(--smooth-text);font-family:inherit;font-weight:500;font-size:max(12px,calc(20 * var(--smooth-tab-u)));line-height:1.4;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:grab;
}
body[data-smooth-skin] .smooth-tab-label{display:flex;align-items:center;justify-content:center;align-self:stretch;min-width:0;flex:1;padding:0 24px;border:0;background:transparent;color:inherit;font:inherit;cursor:grab;border-radius:999px}
/* Leave room inside the clipping box for italic glyphs extending past their advance. */
body[data-smooth-skin] .smooth-tab-label>span{min-width:0;padding:.08em .2em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-workspace-tab[data-preview="true"] .smooth-tab-label{font-style:italic}
/* Selection in this caption bar is the same fact as selection in the sidebar, so it wears
   the same fill token in both tones. The rim stays a whisper of the selection hue: the
   ring is mixed mostly into the fill it borders, so it only softens the chip's edge
   instead of outlining it at full strength across the caption bar. The label keeps the
   others' weight — the strip is laid out by the labels' own width, so a weight step would
   shift every tab when the active one changes. */
body[data-smooth-skin] .smooth-workspace-tab[data-selected="true"]{background:var(--smooth-selected-mild);border-color:transparent;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--smooth-indicator) 22%,transparent)}
body[data-smooth-skin] .smooth-workspace-tab:hover{background:var(--smooth-surface-3-mild)}
/* The caption ground is near-white in the light tones, so the shared selection fill lands
   on it as a heavy chip: 1.31:1 against the bar, while the very same token on the sidebar's
   own grey ground is a 1.12:1 whisper. At the top of a light window that read as a dark
   block, not as the same selection the sidebar shows. The light tones mix the fill back
   toward the caption surface until the chip carries the sidebar's weight, scale the hover
   step to the same curve (so the chip never jumps dark under the pointer), and give the
   unselected hover a whisper of ink instead of a grey layer, which otherwise sat closer to
   the chip than to the bar. Dark tones keep the plain token: there the bar ground already
   matches the token's tone. */
body[data-smooth-skin]:not([data-ds-dark-theme]) .smooth-workspace-tab[data-selected="true"]{background:color-mix(in srgb,var(--smooth-selected-mild) 46%,var(--smooth-surface-mild))}
body[data-smooth-skin]:not([data-ds-dark-theme]) .smooth-workspace-tab:not([data-selected="true"]):hover{background-color:color-mix(in srgb,var(--smooth-text) 4%,var(--smooth-surface-mild))}
body[data-smooth-skin]:not([data-ds-dark-theme]) .smooth-workspace-tab[data-selected="true"]:hover{background-color:color-mix(in srgb,var(--smooth-selected-mild) 64%,var(--smooth-surface-mild))}
body[data-smooth-skin] .smooth-tab-close{position:absolute;right:4px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--smooth-muted);cursor:pointer}
/* Pointer reorder: a short | floats in the gap, not on a tab border. Tabs clip
   their own overflow for the ellipsis, so the indicator is a nav child instead. */
body[data-smooth-skin] .smooth-workspace-tabs[data-dragging="true"]{cursor:grabbing;user-select:none}
body[data-smooth-skin] .smooth-workspace-tabs[data-dragging="true"] .smooth-tab-label{cursor:grabbing}
body[data-smooth-skin] .smooth-workspace-tab.smooth-tab-dragging{opacity:.45}
body[data-smooth-skin] .smooth-tab-drop{position:absolute;top:8px;bottom:8px;width:2px;margin-left:-1px;border-radius:999px;background:var(--smooth-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--smooth-accent) 16%,transparent);z-index:2;pointer-events:none}
@media(hover:hover){
  body[data-smooth-skin] .smooth-tab-close{opacity:0;pointer-events:none;transition:opacity .12s ease}
  /* Same rule as the conversation switch: a mouse click must not pin the close button
     on a tab after the pointer leaves; keyboard focus (including the close button's own)
     still reveals it. */
  body[data-smooth-skin] .smooth-workspace-tab:hover .smooth-tab-close,
  body[data-smooth-skin] .smooth-workspace-tab:has(:focus-visible) .smooth-tab-close{opacity:1;pointer-events:auto}
}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-tab-close{transition:none}}
body[data-smooth-skin] .smooth-tab-close:hover{background:var(--smooth-line-strong);color:var(--smooth-text)}
/* Scroll arrows float over the strip. As flex items they removed 22px + gap from the
   nav whenever an edge overflowed, so every arrow toggle reflowed the tabs and could
   bounce the overflow state; absolute positioning keeps the nav width stable. The
   bar's own right padding reserves the right arrow's slot, so the strip ends a gap
   before it and a tab's close button is never underneath the button being aimed at. */
body[data-smooth-skin] .smooth-tab-scroll{position:absolute;top:50%;transform:translateY(-50%);z-index:3;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:24px;height:24px;border:1px solid var(--smooth-line);background:var(--smooth-surface-mild);color:var(--smooth-muted);border-radius:50%;box-shadow:var(--smooth-shadow-1);cursor:pointer}
body[data-smooth-skin] .smooth-tab-scroll[data-side="left"]{left:calc(10 * var(--smooth-u))}
body[data-smooth-skin] .smooth-tab-scroll[data-side="right"]{right:calc(10 * var(--smooth-u))}
/* An arrow exists only while its direction can still be scrolled, so the strip never
   shows one over the end of the list. */
body[data-smooth-skin] .smooth-tab-scroll:hover{background:var(--smooth-surface-2-mild);color:var(--smooth-text)}
body[data-smooth-skin] :is(.smooth-tab-label,.smooth-tab-close,.smooth-tab-scroll,.smooth-rail-home,.smooth-rail-plugins):focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
/* The ring is drawn inside the element, so on a selected tab it lands on the selection
   fill — where the accent only reaches ~1.9-2.3:1. The indicator hue is the one that was
   deepened to clear 3:1 against that fill. */
body[data-smooth-skin] .smooth-workspace-tab[data-selected="true"] .smooth-tab-label:focus-visible{outline-color:var(--smooth-indicator)}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins){
  position:fixed;left:var(--smooth-rail-inset);top:var(--smooth-rail-top);
  display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);padding:0;
  border:0;border-radius:var(--smooth-rail-button-radius);corner-shape:round;background:transparent;color:var(--smooth-muted);pointer-events:auto;z-index:30;cursor:pointer;
}
body[data-smooth-skin] .smooth-rail-home[aria-pressed="true"]{background:var(--smooth-selected-mild);color:var(--dsw-alias-button-primary-fill)}
body[data-smooth-skin] .smooth-rail-plugins{top:var(--smooth-rail-panels-top);background:transparent}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins)>svg,
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} svg{width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} ${hostPart('panelIcon')}{width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);display:flex;align-items:center;justify-content:center;flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} :is(${hostPart('trigger')},button[data-signed-out]) ${accountPart('avatar')}{display:flex;align-items:center;justify-content:center;width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);border-radius:50%;overflow:hidden;flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} :is(${hostPart('trigger')},button[data-signed-out]) img{width:100%;height:100%;object-fit:cover}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins):hover,
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('panelRow')},${hostPart('footArea')} button[data-signed-out]):hover{background:var(--smooth-surface-3-mild);color:var(--dsw-alias-button-primary-fill)}
body[data-smooth-skin]:has([data-sidebar-collapsed]) :is(.smooth-rail-home,.smooth-rail-plugins){opacity:0;pointer-events:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')}){padding:0 calc(18 * var(--smooth-l)) 10px calc(var(--smooth-rail-width) + 18 * var(--smooth-l))}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('logoRow')}{height:calc(32 * var(--smooth-l));min-height:calc(32 * var(--smooth-l));margin:0;padding:0}
/* The collapsed rail has no room for the brand row; the host removes it, so the skin's
   fixed logo-row height must not leave an empty band above the fixed caption buttons. */
body[data-smooth-skin]:has([data-sidebar-collapsed]) ${hostPart('sidebarCol')} ${hostPart('logoRow')}{height:0;min-height:0;margin:0;padding:0;overflow:hidden}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}{height:calc(30 * var(--smooth-l));min-height:calc(30 * var(--smooth-l));margin-top:calc(2 * var(--smooth-l));margin-bottom:calc(3 * var(--smooth-l) + 1px);border-radius:var(--smooth-radius-md);font-size:calc(14 * var(--smooth-l))}
/* Collapsed, the host turns the new-conversation row into a 28px icon button next to the
   expand toggle. Keep its box on the host's fixed 28px geometry so the two stay aligned. */
body[data-smooth-skin]:has([data-sidebar-collapsed]) ${hostPart('sidebarCol')} ${hostPart('newSession')}{
  box-sizing:border-box;position:fixed;left:48px;top:calc((var(--smooth-caption) - 28px) / 2);
  width:28px;height:28px;min-height:28px;margin:0;padding:0;border:0;
  border-radius:var(--smooth-radius-sm);background:transparent;color:var(--smooth-muted);
}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('panelList')}{position:fixed;top:var(--smooth-rail-panels-top);bottom:calc(24px + var(--smooth-rail-button-size));left:0;box-sizing:border-box;width:var(--smooth-rail-width);display:flex;flex-direction:column;align-items:center;gap:var(--smooth-rail-gap);margin:0;padding:0;overflow-x:hidden;overflow-y:auto;z-index:29}
/* The panel list's "more" launcher is the icon column's lowest entry by definition. A
   third-party panel row (the memory library does this) appends itself to the host's
   panelList after the host's own children, so DOM order alone would leave 更多 above it
   — the flex order property keeps it last however many entries later plugins insert. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('panelList')}>:is(${hostPart('moreAnchor')},*:has(${hostPart('moreAnchor')})){order:1}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')}{width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);min-height:0}
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="tree"]{font-size:calc(19 * var(--smooth-l))}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('regionArea')}{border-top:1px solid var(--smooth-line);padding-top:10px;margin-inline:0;padding-inline:0}
/* The left column's archive switch: hovering anywhere in the column layers a
   two-segment filter over the region title, so running sessions and the archive flip
   without opening the host's view-options menu. The chrome measures the section header
   and publishes its fixed coordinates; this sheet only draws the control. Colours are
   mixed from the skin tokens, which gives the reference's #262626 track with a #454545
   selected pill on the dark presets and the same relationship in light presets. */
body[data-smooth-skin] .smooth-workspace-filter{
  position:fixed;left:0;top:0;z-index:40;display:inline-flex;align-items:center;box-sizing:border-box;
  height:24px;padding:2px;border:0;border-radius:var(--smooth-radius-sm);corner-shape:round;
  background:color-mix(in srgb,var(--smooth-text) 6%,var(--smooth-sidebar));
  opacity:0;pointer-events:none;user-select:none;-webkit-app-region:no-drag;
  transition:opacity .16s cubic-bezier(.2,0,0,1);
}
/* The control is frame-fixed, so hovering it is not hovering the sidebar underneath it;
   both are named here or the reveal would flicker off the moment the pointer lands.
   The icon rail is addressed by the pointer attribute the chrome publishes: its top
   button lives in the shell overlay, outside the sidebar column, so the column's own
   :hover never fires while the pointer rests on the rail.
   :where() keeps the hover's specificity below the collapse/search suppression below.
   The keyboard reveal keys on :focus-visible, never :focus-within: a clicked option
   keeps :focus after the pointer leaves, so :focus-within left the overlay pinned open
   until focus moved somewhere else. A mouse click is not :focus-visible, so the control
   follows the pointer again, while Tab still reveals it. */
body[data-smooth-skin]:where(:has(${hostPart('sidebarCol')}:hover, .smooth-workspace-filter:hover), [data-smooth-rail-hover]) .smooth-workspace-filter,
body[data-smooth-skin] .smooth-workspace-filter:has(:focus-visible){opacity:1;pointer-events:auto}
body[data-smooth-skin] .smooth-filter-option{
  appearance:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;
  height:20px;min-width:0;margin:0;padding:0 9px;border:0;border-radius:calc(var(--smooth-radius-sm) - 2px);background:transparent;
  color:color-mix(in srgb,var(--smooth-muted) 62%,var(--smooth-sidebar));
  font-family:inherit;font-size:12px;font-weight:500;line-height:20px;letter-spacing:.01em;white-space:nowrap;cursor:pointer;
  transition:background-color .14s ease,color .14s ease;
}
body[data-smooth-skin] .smooth-filter-option:hover{color:var(--smooth-text)}
body[data-smooth-skin] .smooth-filter-option[data-selected="true"]{background:color-mix(in srgb,var(--smooth-text) 18%,var(--smooth-sidebar));color:var(--smooth-text)}
body[data-smooth-skin] .smooth-filter-option:active{transform:translateY(1px)}
body[data-smooth-skin] .smooth-filter-option:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:1px}
/* The collapsed rail has no title row, and an expanded search owns the same strip: the
   filter yields to it instead of covering the input. The skin hides nothing of the
   host's here, only its own overlay, which is why this is an opacity rule. */
body[data-smooth-skin]:has([data-sidebar-collapsed]) .smooth-workspace-filter,
body[data-smooth-skin]:has(${hostPart('sectionLabelHidden')}) .smooth-workspace-filter{opacity:0;pointer-events:none}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-workspace-filter,body[data-smooth-skin] .smooth-filter-option{transition:none}}
/* The archived row's trailing delete action: the host's own 16px row-action icon
   button (4px radius, tertiary label, 14px glyph); only the hover colour turns
   destructive, so an archived row stays quiet at rest. */
body[data-smooth-skin] .smooth-session-delete{
  appearance:none;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;
  width:16px;height:16px;margin:0;padding:0;border:0;border-radius:var(--smooth-radius-xs);background:transparent;
  color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none;
}
body[data-smooth-skin] .smooth-session-delete svg{width:14px;height:14px}
body[data-smooth-skin] .smooth-session-delete:hover{color:var(--dsw-alias-state-error-primary)}
body[data-smooth-skin] .smooth-session-delete:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
/* The skin's one error chip, shared by all three call sites. The tint sits on the surface
   rather than on transparent, so the chip's ground does not depend on whatever happens to
   sit behind it, and the ink steps toward label colour: a red wash under red text closes
   the gap the text is read against, which is what put the transparent form below AA on the
   two host bases. Tinting ground and ink together holds 4.9:1 or better on every palette. */
body[data-smooth-skin] .smooth-session-delete-error{margin-top:8px;padding:6px 8px;border-radius:var(--smooth-radius-sm);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--smooth-surface-2-mild));color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 82%,var(--smooth-text));font-size:12px;line-height:18px;white-space:pre-wrap}

/* Blank-session welcome. The host keeps its own stacking and proportions — headline,
   workspace chip, input card — and this skin centers that stack in the workspace instead
   of placing each part by hand. The product name still joins the slogan. */
body[data-smooth-skin] [data-content-phase="hero"] [data-conversation-scroll]{justify-content:center;position:relative}
body[data-smooth-skin] [data-content-phase="hero"] [data-composer-seat]{flex:1;min-height:540px;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center}
/* The native headline carries the slogan alone, so the product name joins it as a
   flexible sibling of the slogan span. */
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('titleGroup')}{gap:.35em}
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('titleGroup')}::before{content:"DeepSeek"}
/* The welcome row — the skin's "工作区" label, the native workspace picker and the branch
   it carries — and the line printed under it are not drawn: the input card's own info row
   already names the workspace and the branch, so the row only repeated them. Hiding the
   row takes its ::after with it; the label and the line stay defined below, so bringing
   the row back is a one-line change. */
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('heroWorkspaceRow')}{position:relative;gap:9px;display:none}
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('heroWorkspaceRow')}::before{content:"工作区";color:var(--smooth-muted)}
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('heroWorkspaceRow')}::after{content:"在这里开始新的对话。";position:absolute;left:0;right:0;top:calc(100% + 3px);text-align:center;color:var(--smooth-muted);font-size:13px;line-height:18px;pointer-events:none}
/* The host's home surface — no session, panel or settings is showing — has nothing to
   type into yet: the headline stays and the card goes. The browser half publishes the flag
   from the host's current view (the data-smooth-home attribute, src/layout.js), so it also
   covers Home clearing the conversation while the strip keeps its remaining tabs; the
   moment a session, panel or settings surface exists the card comes back. It is addressed
   by its own data-composer-card attribute rather than by a child combinator, because the
   host mounts it through a slot wrapper of its own. The way back is a short fade on the
   hero, so the card keeps the launch animation's own fade (an animation on the card here
   would have replaced it). */
body[data-smooth-skin][data-smooth-home] ${hostPart('composerHero')} [data-composer-card]{display:none}
body[data-smooth-skin]:not([data-smooth-home]) ${hostPart('composerHero')}{animation:smooth-welcome-in .26s cubic-bezier(.2,0,0,1) both}
@keyframes smooth-welcome-in{from{opacity:0}to{opacity:1}}
/* The workspace/branch line rides just above the input well, aligned with its left edge;
   the footer row keeps only the native controls, with the model selector on the right. */
body[data-smooth-skin] .smooth-composer-meta{position:absolute;left:0;right:0;top:-28px;display:flex;align-items:center;gap:6px;min-width:0;color:var(--smooth-muted);font-size:12px;line-height:18px;pointer-events:none}
body[data-smooth-skin] [data-composer-card]:has(.smooth-composer-meta){margin-top:34px}
body[data-smooth-skin] .smooth-composer-meta .smooth-meta-button{pointer-events:auto}
body[data-smooth-skin] .smooth-composer-meta svg{width:13px;height:13px;flex:none}
body[data-smooth-skin] .smooth-composer-meta :is(.smooth-meta-workspace,.smooth-meta-branch){max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-composer-meta .smooth-meta-button{max-width:170px;height:20px;margin:0;padding:0 5px;border-radius:var(--smooth-radius-sm)}
body[data-smooth-skin] .smooth-composer-meta .smooth-meta-preset{display:inline-flex;align-items:center;min-width:0;max-width:170px}
body[data-smooth-skin] .smooth-composer-meta .smooth-composer-preset button{height:20px;min-height:20px;padding:0 5px;border-radius:var(--smooth-radius-sm);gap:4px;font-size:12px;line-height:18px;font-weight:400;color:inherit;pointer-events:auto}
body[data-smooth-skin] .smooth-composer-meta .smooth-composer-preset button>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] :is(.smooth-meta-workspace,.smooth-meta-branch){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-meta-branch{display:inline-flex;align-items:center;gap:5px}
body[data-smooth-skin] .smooth-meta-host{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
body[data-smooth-skin] .smooth-meta-button{display:inline-flex;align-items:center;gap:5px;min-width:0;max-width:170px;margin:0;padding:2px 5px;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:inherit;font:inherit;line-height:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
body[data-smooth-skin] .smooth-meta-button>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-meta-button:hover{background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-meta-button:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
body[data-smooth-skin] .smooth-meta-divider{flex:none;height:12px;width:1px;background:var(--smooth-line)}
/* The access mode and plan live natively in the row's modes group, right beside the add
   button: keep them as one quiet line of text, not as card furniture. The plus leads and
   the mode follows, so the attach/command action sits before the access-mode chip. */
body[data-smooth-skin] [data-composer-card] ${hostPart('tools')} ${hostPart('modes')}{order:0}
body[data-smooth-skin] [data-composer-card] ${hostPart('modes')} :is(button,[role="button"]){height:28px;min-height:28px;padding:0 6px;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:var(--smooth-text);font-size:13px;line-height:18px;gap:5px;cursor:pointer}
body[data-smooth-skin] [data-composer-card] ${hostPart('modes')} :is(button,[role="button"]):hover:not(:disabled){background:var(--smooth-surface-3-mild);color:var(--smooth-text)}
body[data-smooth-skin] [data-composer-card] ${hostPart('modes')} svg{width:14px;height:14px}
body[data-smooth-skin] .smooth-git-menu{position:fixed;z-index:1200;box-sizing:border-box;display:flex;flex-direction:column;gap:4px;max-height:min(420px,calc(100vh - 24px));padding:8px;border:1px solid var(--smooth-line);border-radius:var(--smooth-radius-lg);background:color-mix(in srgb,color-mix(in srgb,var(--smooth-surface-3-mild) 80%,var(--dsw-specific-input-major)) var(--smooth-glass-overlay),transparent);box-shadow:0 18px 48px rgba(0,0,0,.38);color:var(--smooth-text);font-size:13px;line-height:20px;overflow:auto}
body[data-smooth-skin] .smooth-git-heading{padding:4px 8px 2px;color:var(--smooth-muted);font-size:12px}
body[data-smooth-skin] .smooth-git-search{box-sizing:border-box;width:100%;height:32px;margin:2px 0 4px;padding:0 10px;border:1px solid var(--smooth-line);border-radius:var(--smooth-radius-md);background:var(--dsw-specific-input-major);color:var(--smooth-text);font:inherit;outline:none}
body[data-smooth-skin] .smooth-git-search:focus{border-color:var(--smooth-accent)}
body[data-smooth-skin] .smooth-git-list{display:flex;flex-direction:column;gap:1px;min-height:0;overflow:auto}
body[data-smooth-skin] .smooth-git-row{display:flex;align-items:center;gap:9px;width:100%;min-height:34px;padding:5px 8px;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
body[data-smooth-skin] .smooth-git-row:hover:not(:disabled){background:var(--smooth-surface-3-mild)}
body[data-smooth-skin] .smooth-git-row[data-current="true"]{background:var(--smooth-selected-mild)}
/* Selection and hover must stay apart in every dark palette. The host's own dark base is
   the one that collapses them onto a single hex (#393a3e for both selected and layer3, so
   the current row would vanish under the cursor); iron's pair is merely tight at 1.07:1.
   Lifting the selected fill is the same trick the light workspace tab uses: mix a little
   label ink in so the fill separates from the hover underneath it. Scoped to the dark tone,
   which also covers the fixed dark presets, since the tokens carry both tones. */
body[data-smooth-skin][data-ds-dark-theme] .smooth-git-row[data-current="true"]{background:color-mix(in srgb,var(--smooth-selected-mild) 86%,var(--smooth-text))}
body[data-smooth-skin] .smooth-git-row:disabled{opacity:.5;cursor:default}
body[data-smooth-skin] .smooth-git-row-main{display:flex;flex-direction:column;min-width:0;flex:1}
body[data-smooth-skin] .smooth-git-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-git-note{padding:0 8px;color:var(--smooth-muted);font-size:11.5px;line-height:17px}
body[data-smooth-skin] .smooth-git-check{margin-left:auto;flex:none;width:14px;height:14px;color:var(--smooth-text)}
body[data-smooth-skin] .smooth-git-footer{display:flex;align-items:center;gap:7px;margin-top:4px;padding:8px;border:0;border-top:1px solid var(--smooth-line);border-radius:0 0 var(--smooth-radius-sm) var(--smooth-radius-sm);background:transparent;color:var(--smooth-text);font:inherit;text-align:left;cursor:pointer}
body[data-smooth-skin] .smooth-git-footer:hover{background:var(--smooth-surface-3-mild)}
body[data-smooth-skin] .smooth-git-footer:disabled{opacity:.5;cursor:default}
body[data-smooth-skin] .smooth-git-create{display:flex;gap:6px;padding-top:6px;border-top:1px solid var(--smooth-line)}
body[data-smooth-skin] .smooth-git-create .smooth-git-search{flex:1;margin:0}
body[data-smooth-skin] .smooth-git-create-action{height:32px;padding:0 9px;border:1px solid var(--smooth-line);border-radius:var(--smooth-radius-md);background:var(--smooth-surface-3-mild);color:inherit;font:inherit;cursor:pointer}
body[data-smooth-skin] .smooth-git-create-action:disabled{opacity:.5;cursor:default}
body[data-smooth-skin] .smooth-git-error{padding:6px 8px;border-radius:var(--smooth-radius-sm);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,var(--smooth-surface-2-mild));color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 82%,var(--smooth-text));font-size:12px;line-height:17px;white-space:pre-wrap}
body[data-smooth-skin] .smooth-git-empty{padding:10px 8px;color:var(--smooth-muted)}
/* The new-session workspace menu reuses the branch popover. Its list gets a bounded
   scrollport of its own: the stock menu grew with the workspace count and either ran
   past the viewport or clipped at the window edge. The search row and the add row stay
   put; only the workspace rows scroll, so the filter is always reachable. */
body[data-smooth-skin] .smooth-workspace-menu{overflow:hidden}
body[data-smooth-skin] .smooth-workspace-menu .smooth-git-list{flex:1 1 auto;max-height:min(38vh,300px);padding-bottom:2px;overscroll-behavior:contain}
body[data-smooth-skin] .smooth-workspace-menu .smooth-git-footer{flex:none}
body[data-smooth-skin] .smooth-workspace-menu .smooth-git-row:hover:not(:disabled):not([data-current="true"]){background:color-mix(in srgb,var(--smooth-surface-3-mild) 82%,var(--smooth-text))}
/* Keyboard position. The menu surface is a mix of surface-3 and the input fill, so the
   stock hover fill is one RGB step away from it and invisible here. The row carries a
   stronger lift plus the accent ring the skin already uses for focus, which clears the
   3:1 non-text contrast requirement for a state indicator in both tones. */
body[data-smooth-skin] .smooth-workspace-menu .smooth-git-row[data-active="true"]{background:color-mix(in srgb,var(--smooth-surface-3-mild) 72%,var(--smooth-text));box-shadow:inset 0 0 0 1px var(--smooth-accent)}
body[data-smooth-skin] .smooth-workspace-menu .smooth-git-row:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
body[data-smooth-skin] .smooth-workspace-clear{display:block;margin-top:6px;padding:0;border:0;background:transparent;color:var(--smooth-accent);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
body[data-smooth-skin] .smooth-workspace-clear:hover{text-decoration:underline}
body[data-smooth-skin] .smooth-workspace-clear:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:2px}
body[data-smooth-skin] .smooth-hero-branch{display:inline-flex;align-items:center;gap:calc(16 * var(--smooth-u));min-width:0}
body[data-smooth-skin] .smooth-hero-branch .smooth-meta-branch{max-width:240px;color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] .smooth-composer-preset{display:inline-flex;align-items:center;min-width:0}
body[data-smooth-skin] .smooth-composer-preset button{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 8px;border-radius:var(--smooth-radius-sm);background:transparent;font-size:13px;line-height:20px;font-weight:500;color:var(--smooth-text)}
body[data-smooth-skin] .smooth-composer-preset button:hover:not(:disabled){background:var(--smooth-surface-3-mild)}

/* Landing-page usage panel. The panel is portalled into the host hero's own stack
   (src/usage.js) and follows the reference card's construction: a 12px-padded well,
   a tab/period header, six figures, then a 26-week grid whose shade is the day's
   share of the busiest day in the window. Widths are capped so the figures keep
   their proportions and the grid cells stay square at any window size. */
body[data-smooth-skin] .smooth-usage-mount{display:flex;justify-content:center;width:100%;min-width:0;margin-top:2px}
body[data-smooth-skin] .smooth-usage-panel{box-sizing:border-box;display:flex;flex-direction:column;gap:12px;width:min(560px,100%);padding:12px;border-radius:var(--smooth-radius-lg);background:color-mix(in srgb,var(--smooth-text) 4%,var(--smooth-surface-2-mild));color:var(--smooth-muted);font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
body[data-smooth-skin] .smooth-usage-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
body[data-smooth-skin] :is(.smooth-usage-tabs,.smooth-usage-ranges){display:flex;align-items:center;gap:2px}
body[data-smooth-skin] :is(.smooth-usage-tab,.smooth-usage-range,.smooth-usage-more){appearance:none;box-sizing:border-box;margin:0;padding:1px 8px;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:var(--smooth-muted);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
body[data-smooth-skin] :is(.smooth-usage-tab,.smooth-usage-range):hover:not([data-active]){background:color-mix(in srgb,var(--smooth-text) 6%,transparent);color:var(--smooth-text)}
body[data-smooth-skin] :is(.smooth-usage-tab,.smooth-usage-range)[data-active]{background:color-mix(in srgb,var(--smooth-text) 11%,var(--smooth-surface-2-mild));color:var(--smooth-text)}
body[data-smooth-skin] :is(.smooth-usage-tab,:is(.smooth-usage-range,.smooth-usage-more)):focus-visible{outline:2px solid var(--smooth-accent);outline-offset:1px}
body[data-smooth-skin] .smooth-usage-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
body[data-smooth-skin] .smooth-usage-stat{display:flex;flex-direction:column;gap:2px;box-sizing:border-box;min-width:0;padding:5px 8px;border-radius:var(--smooth-radius-sm);background:color-mix(in srgb,var(--smooth-text) 9%,var(--smooth-surface-2-mild))}
body[data-smooth-skin] .smooth-usage-stat-label{color:var(--smooth-muted);font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body[data-smooth-skin] .smooth-usage-stat-value{color:var(--smooth-text);font-size:13px;font-weight:600;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body[data-smooth-skin] .smooth-usage-stat[data-smooth-stat="model"] .smooth-usage-stat-value{font-weight:400}
body[data-smooth-skin] .smooth-usage-heat{display:grid;grid-auto-flow:column;grid-template-rows:repeat(7,1fr);grid-auto-columns:1fr;gap:3px;align-content:start}
body[data-smooth-skin] .smooth-usage-heat-cell{position:relative;aspect-ratio:1;border-radius:3px;background:color-mix(in srgb,var(--smooth-text) 11%,transparent)}
body[data-smooth-skin] .smooth-usage-heat-cell[data-smooth-level="1"]{background:color-mix(in srgb,var(--smooth-heat) 20%,transparent)}
body[data-smooth-skin] .smooth-usage-heat-cell[data-smooth-level="2"]{background:color-mix(in srgb,var(--smooth-heat) 40%,transparent)}
body[data-smooth-skin] .smooth-usage-heat-cell[data-smooth-level="3"]{background:color-mix(in srgb,var(--smooth-heat) 65%,transparent)}
body[data-smooth-skin] .smooth-usage-heat-cell[data-smooth-level="4"]{background:var(--smooth-heat)}
body[data-smooth-skin] .smooth-usage-heat[data-smooth-skeleton] .smooth-usage-heat-cell{background:color-mix(in srgb,var(--smooth-text) 5%,transparent);animation:smooth-usage-pulse 1.6s ease-in-out infinite}
@keyframes smooth-usage-pulse{0%,100%{opacity:1}50%{opacity:.55}}
body[data-smooth-skin] .smooth-usage-heat-cell[data-smooth-tip]:hover:after{content:attr(data-smooth-tip);position:absolute;bottom:calc(100% + 6px);left:50%;z-index:6;transform:translate(-50%);padding:5px 10px;border-radius:var(--smooth-radius-sm);background:var(--smooth-text);color:var(--smooth-app);font-size:13px;font-weight:500;line-height:18px;white-space:nowrap;font-variant-numeric:tabular-nums;pointer-events:none}
body[data-smooth-skin] .smooth-usage-heat-cell[data-smooth-tip][data-smooth-edge="start"]:hover:after{left:0;transform:none}
body[data-smooth-skin] .smooth-usage-heat-cell[data-smooth-tip][data-smooth-edge="end"]:hover:after{left:auto;right:0;transform:none}
body[data-smooth-skin] .smooth-usage-fun{color:var(--smooth-muted);font-size:12px;line-height:16px}
body[data-smooth-skin] .smooth-usage-models{display:flex;flex-direction:column;gap:2px}
body[data-smooth-skin] .smooth-usage-model{display:flex;align-items:center;gap:8px;min-width:0;padding:2px 0}
body[data-smooth-skin] .smooth-usage-model-swatch{flex:none;width:8px;height:8px;border-radius:2px;background:var(--smooth-heat)}
body[data-smooth-skin] .smooth-usage-model-swatch[data-smooth-rank="1"]{background:color-mix(in srgb,var(--smooth-heat) 82%,var(--smooth-app))}
body[data-smooth-skin] .smooth-usage-model-swatch[data-smooth-rank="2"]{background:color-mix(in srgb,var(--smooth-heat) 64%,var(--smooth-app))}
body[data-smooth-skin] .smooth-usage-model-swatch[data-smooth-rank="3"]{background:color-mix(in srgb,var(--smooth-heat) 46%,var(--smooth-app))}
body[data-smooth-skin] .smooth-usage-model-swatch[data-smooth-rank="4"]{background:color-mix(in srgb,var(--smooth-heat) 28%,var(--smooth-app))}
body[data-smooth-skin] .smooth-usage-model-swatch[data-smooth-rank="5"]{background:color-mix(in srgb,var(--smooth-heat) 12%,var(--smooth-app))}
body[data-smooth-skin] .smooth-usage-model-name{flex:0 1 auto;min-width:0;overflow:hidden;color:var(--smooth-text);font-size:13px;line-height:18px;white-space:nowrap;text-overflow:ellipsis}
body[data-smooth-skin] .smooth-usage-model-split{margin-left:auto;color:var(--smooth-muted);font-size:12px;line-height:18px;white-space:nowrap}
body[data-smooth-skin] .smooth-usage-model-share{flex:none;width:48px;color:var(--smooth-text);font-size:12px;line-height:18px;text-align:right;white-space:nowrap}
body[data-smooth-skin] .smooth-usage-more{align-self:flex-start;margin-top:2px;padding:2px 8px}
body[data-smooth-skin] .smooth-usage-more:hover{background:color-mix(in srgb,var(--smooth-text) 6%,transparent);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-usage-models-empty{padding:6px 2px;color:var(--smooth-muted)}
@media(max-width:760px){body[data-smooth-skin] .smooth-usage-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-usage-heat[data-smooth-skeleton] .smooth-usage-heat-cell{animation:none}}


/* Full-workspace settings retain the native store, rows, focus and controls, but
   take the app's own scale. The reference mock-up sized this panel for a 1950px
   canvas (51px nav cells, 20px labels); Harness chrome runs at 13-14px, so the
   panel follows the rest of the window instead. The panel is pinned to the
   workspace (right of the rail, under the caption), so the modal shell around it
   must stop blocking the shell behind it: the fixed overlay and its transparent
   mask pass clicks through, and only the panel itself takes them. The rail, the
   tab strip and the home button stay usable while settings is open — clicking the
   rail switches pages instead of closing settings, and Escape / a tab / Home
   remain the exits. */
body[data-smooth-skin] [data-shortcut-modal="settings"]{position:fixed;inset:var(--smooth-caption) 0 0 var(--smooth-rail-width);width:auto;height:auto;max-width:none;max-height:none;border:0;border-radius:0;box-shadow:none;grid-template-columns:calc(var(--smooth-left-width) - var(--smooth-rail-width)) minmax(0,1fr);pointer-events:auto}
body[data-smooth-skin] [role="presentation"]:has(>[data-shortcut-modal="settings"]){pointer-events:none}
body[data-smooth-skin] [role="presentation"]:has(>[data-shortcut-modal="settings"])>[aria-hidden="true"]{background:transparent;backdrop-filter:none;pointer-events:none}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{box-sizing:border-box;width:calc(var(--smooth-left-width) - var(--smooth-rail-width));min-width:0;min-height:0;padding:16px 10px 10px;gap:8px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navTitle')}{padding:0 10px;font-size:20px;line-height:28px;font-weight:700;letter-spacing:-.01em}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}{flex:1;min-height:0;gap:2px;padding-top:34px;overflow-x:hidden;overflow-y:auto}
/* Native icons and labels stay in separate cells, including plugin sections.
   Keep each row's height; a short window scrolls the list instead of crushing it.
   The cells run at the size of the screenshot this panel follows — 15px labels on a
   34px row with an 18px icon — so the column reads as text rather than as a list of
   small print; the icon column is sized to the icon so the labels share one edge. */
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button{position:relative;box-sizing:border-box;display:grid;grid-template-columns:18px minmax(0,1fr);align-items:center;flex:none;width:100%;height:34px;min-height:34px;border-radius:var(--smooth-radius-sm);padding:0 10px;gap:13px;font-size:15px;line-height:22px;text-align:left;white-space:nowrap}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button>:is(svg,${hostPart('navIcon')}){grid-column:1;grid-row:1;justify-self:center;width:18px;height:18px;min-width:18px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button::before{grid-column:1;grid-row:1;justify-self:center;align-self:center}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button>${hostPart('navLabel')}{grid-column:2;grid-row:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button[aria-current="true"]{background:var(--smooth-selected-mild);color:var(--smooth-text);font-weight:600}
/* The host builds one flat list out of the settings.section entries and puts no id
   or grouping attribute on a cell, so the groups are anchored on position:
   account | application | extensions. 应用 owns the app-level entries plus the two
   extension surfaces users treat as part of the app — built-in plugins and agent
   presets. 扩展 then gathers prompt optimisation, the plugin market, the Smooth skin
   and the sidebar-cards entry (the old 外观 heading folded in here, because the market,
   the skin and the cards are all plugin-provided). Adding or removing a settings
   section moves the boundaries with it. The label floats in the gap above the first
   cell of its group, inside navList's padding-top so the scroller cannot clip it. It
   runs at the size of the cells (15px/500) and sits in a 34px gap: 4px under the
   previous group, the label's own 20px line box, then 10px of air before its first
   cell — the rhythm the reference settings panel uses, where a group is separated by
   its heading rather than by empty rows.
   Keep ::before available for plugins that replace the native gear with a mask. */
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button::after{position:absolute;left:10px;top:-30px;font-size:15px;line-height:20px;font-weight:500;color:var(--smooth-muted);pointer-events:none}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(1)::after{content:"账户"}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(2)::after{content:"应用"}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(6)::after{content:"扩展"}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(2),
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(6){margin-top:34px}
body[data-smooth-skin] [data-shortcut-modal="settings"]>${hostPart('content')}{position:relative;z-index:1;border-left:0;border-radius:0 0 0 var(--smooth-radius-xl);corner-shape:round;background:var(--smooth-app);overflow:clip}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('header')}{height:52px;padding:14px 16px 8px}
/* The native close button would sit immediately right of whatever action the page itself
   puts in this header (通用设置 puts its "打开配置文件" there), which reads as one button
   with a stray ✕ stuck to it. In this full-workspace layout the tab bar already carries
   every way out — a tab, the home button, Escape — so the ✕ is a second door drawn on
   top of the first. The reference mock has none. */
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('header')}>${accountPart('close')}{display:none}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding:0 28px 28px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}>:is(section,div){max-width:860px;margin-inline:auto}
body[data-smooth-skin] [data-shortcut-modal="settings"] h2{font-size:17px;line-height:26px;font-weight:600}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')}{box-sizing:border-box;min-height:52px;padding-block:12px}
body[data-smooth-skin] .smooth-general-title{margin:4px 0 14px;font-size:20px;line-height:30px;font-weight:600}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')} ${hostPart('title')}{font-size:14px;line-height:22px;font-weight:600}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')} :is(${hostPart('desc')},${hostPart('description')}){font-size:13px;line-height:20px}

/* Each item has its own slot wrapper, so :last-child on a native row matches
   many rows. Style the actual item roots, including Shortcuts' setting root. */
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('row')},${hostPart('setting')}){box-sizing:border-box;min-height:52px;padding-block:12px;border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('settingTitle')},${hostPart('title')}){font-size:14px;line-height:22px;font-weight:600}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('settingDescription')},${hostPart('desc')},${hostPart('description')}){font-size:13px;line-height:20px;color:var(--smooth-muted)}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('selector')},${hostPart('stepper')}){box-sizing:border-box;min-height:30px;border:1px solid var(--smooth-line-strong);border-radius:var(--smooth-radius-sm);background:var(--smooth-surface-mild);font-size:13px;line-height:20px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] ${hostPart('selector')}{min-width:110px;justify-content:space-between;padding-inline:10px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] ${hostPart('stepper')}{min-width:84px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] ${hostPart('value')}{font-size:13px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] ${hostPart('button')}{min-height:28px;padding-inline:12px;border:1px solid var(--smooth-line-strong);border-radius:999px;background:transparent;font-size:12px}
/* Keep the native settings close action in its content header. The workspace
   strip uses exactly the same caption geometry on settings and main surfaces. */
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] button[role="switch"]{width:36px;height:20px;padding:2px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] button[role="switch"]>span{width:16px;height:16px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] button[role="switch"][aria-checked="true"]>span{transform:translateX(16px)}
body[data-smooth-skin] :is(.smooth-workspace-tab,[data-composer-card]){corner-shape:round}
body[data-smooth-skin] .smooth-workspace-tab[data-selected="true"]:hover{background-color:color-mix(in srgb,var(--smooth-selected-mild) 94%,var(--smooth-text))}
body[data-smooth-skin] :is(.smooth-workspace-tab,.smooth-rail-home,.smooth-rail-plugins),
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('newSession')},${hostPart('panelRow')}),
body[data-smooth-skin] [data-composer-card] ${hostPart('add')},
body[data-smooth-skin] :is(.smooth-composer-preset,.smooth-composer-model) button{transition:background-color .16s cubic-bezier(.22,1,.36,1),box-shadow .16s cubic-bezier(.22,1,.36,1),color .16s cubic-bezier(.22,1,.36,1)}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins):hover:not(:disabled),
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('newSession')},${hostPart('panelRow')}):hover:not(:disabled),
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}:hover:not(:disabled),
body[data-smooth-skin] :is(.smooth-composer-preset,.smooth-composer-model) button:hover:not(:disabled){background-color:color-mix(in srgb,var(--smooth-surface-3-mild) 95%,var(--smooth-text))}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins):active:not(:disabled),
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('newSession')},${hostPart('panelRow')}):active:not(:disabled),
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}:active:not(:disabled),
body[data-smooth-skin] :is(.smooth-composer-preset,.smooth-composer-model) button:active:not(:disabled){background-color:var(--smooth-surface-2-mild);box-shadow:none}
@media(prefers-reduced-motion:reduce){
  body[data-smooth-skin] :is([data-composer-card],.smooth-workspace-tab,.smooth-rail-home,.smooth-rail-plugins),
  body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('newSession')},${hostPart('panelRow')}),
  body[data-smooth-skin] [data-composer-card] ${hostPart('add')},
  body[data-smooth-skin] :is(.smooth-composer-preset,.smooth-composer-model) button{transition:none}
}
@media(max-width:800px){
  body[data-smooth-skin] .smooth-workspace-bar{left:0;right:0;padding-left:92px}
  body[data-smooth-skin] [data-shortcut-modal="settings"]{left:0}
  body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{width:160px}
  body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding-inline:20px}
  body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('headline')}{font-size:26px}
  body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('heroWorkspaceRow')}{font-size:13px}
  body[data-smooth-skin] .smooth-composer-meta{gap:8px}
  body[data-smooth-skin] .smooth-meta-host{font-size:12px}
}
`;

/**
 * Launch animation, host side.
 *
 * The opening is part of the served index, not a layer the browser plugin adds
 * afterwards: three structured rows (`style`, `html`, `script`) go into the boot
 * table before any bundle runs, so the very first paint is already the splash.
 * The paired inline script retires it once the app has mounted; nothing here
 * touches a file, a service or the client's React tree.
 *
 * The rows are also shipped to the static deployment payload, so they must stay
 * plain JSON data: strings and numbers only.
 */

const SPLASH_ID = 'dsh-smooth-splash';
/** Minimum time the opening stays up, so it reads as an animation. */
const SPLASH_HOLD_MS = 1500;
/** Layer fade, matched to `#dsh-smooth-splash` in the stylesheet below. */
const SPLASH_FADE_MS = 340;
/** After the reveal, when the splash node and the body attribute are dropped. */
const SPLASH_SETTLE_MS = 640;
/** A boot that never mounts may not keep the opening up beyond this grace. */
const SPLASH_CAP_MS = 8000;
/** The launch size is a start-of-session concern. sessionStorage survives F5/Ctrl+R
 * but is empty in a new app window, which is exactly the first-load/reload split. */
const WINDOW_SIZED_KEY = 'dsh-smooth-skin:session-window-sized';
/** Native FishLogo silhouette from dsh-client-ui-primitives (23.16 × 17.04).
 * Inline geometry keeps the very first paint independent of the app bundle.
 * Coordinates are rounded to two decimals: this row ships in every served index, and
 * the rounding costs 32% of the bytes for a worst-case shift of 0.005 user units,
 * which is 0.04px at the 176px the opening renders the mark at. */
const SPLASH_WHALE_PATH = "M22.92 1.43C22.67 1.31 22.57 1.54 22.42 1.66C22.37 1.69 22.33 1.74 22.29 1.79C21.93 2.17 21.51 2.42 20.97 2.39C20.17 2.35 19.48 2.6 18.88 3.21C18.75 2.46 18.32 2 17.67 1.72C17.34 1.57 16.99 1.42 16.75 1.09C16.59 0.86 16.54 0.6 16.46 0.34C16.41 0.19 16.35 0.03 16.18 0C15.98 -0.03 15.91 0.14 15.83 0.27C15.53 0.82 15.41 1.43 15.43 2.05C15.45 3.43 16.04 4.54 17.2 5.32C17.33 5.41 17.37 5.5 17.32 5.63C17.24 5.9 17.15 6.16 17.07 6.44C17.01 6.61 16.94 6.65 16.75 6.57C16.11 6.3 15.56 5.91 15.07 5.43C14.25 4.63 13.5 3.75 12.57 3.06C12.35 2.9 12.13 2.75 11.9 2.61C10.95 1.68 12.03 0.92 12.28 0.83C12.54 0.74 12.37 0.42 11.53 0.42C10.68 0.42 9.91 0.71 8.93 1.08C8.79 1.14 8.64 1.18 8.48 1.21C7.59 1.04 6.67 1.01 5.7 1.12C3.88 1.32 2.43 2.18 1.36 3.65C0.08 5.41 -0.22 7.42 0.15 9.51C0.54 11.71 1.66 13.54 3.39 14.96C5.18 16.44 7.25 17.17 9.6 17.03C11.03 16.94 12.62 16.75 14.42 15.23C14.87 15.46 15.35 15.55 16.14 15.62C16.75 15.67 17.33 15.59 17.78 15.49C18.49 15.34 18.44 14.68 18.19 14.56C16.11 13.6 16.56 13.99 16.15 13.67C17.21 12.42 18.82 10.2 19.32 7.17C19.37 6.84 19.43 6.37 19.42 6.1C19.42 5.93 19.46 5.87 19.64 5.85C20.17 5.79 20.67 5.65 21.14 5.39C22.48 4.66 23.03 3.45 23.15 2C23.17 1.78 23.15 1.55 22.92 1.43ZM11.17 14.47C9.16 12.89 8.18 12.37 7.78 12.39C7.4 12.41 7.47 12.84 7.55 13.13C7.64 13.4 7.75 13.6 7.91 13.84C8.02 14 8.1 14.24 7.8 14.42C7.15 14.82 6.02 14.29 5.97 14.26C4.66 13.49 3.56 12.47 2.78 11.07C2.04 9.72 1.6 8.28 1.53 6.74C1.51 6.37 1.62 6.24 1.99 6.17C2.48 6.08 2.98 6.06 3.47 6.14C5.52 6.44 7.28 7.36 8.74 8.81C9.58 9.64 10.22 10.63 10.87 11.6C11.56 12.63 12.31 13.61 13.26 14.41C13.6 14.7 13.87 14.91 14.12 15.07C13.35 15.15 12.06 15.17 11.17 14.47L11.17 14.47ZM12.14 8.26C12.14 8.09 12.27 7.96 12.44 7.96C12.48 7.96 12.51 7.97 12.54 7.98C12.58 8 12.62 8.02 12.65 8.05C12.7 8.11 12.73 8.18 12.73 8.26C12.73 8.42 12.6 8.56 12.44 8.56C12.27 8.56 12.14 8.42 12.14 8.26ZM15.14 9.8C14.95 9.88 14.76 9.95 14.57 9.95C14.28 9.97 13.97 9.85 13.8 9.71C13.54 9.49 13.35 9.36 13.27 8.98C13.24 8.81 13.25 8.56 13.28 8.41C13.35 8.09 13.28 7.89 13.05 7.71C12.87 7.56 12.64 7.52 12.39 7.52C12.3 7.52 12.21 7.47 12.14 7.44C12.04 7.39 11.95 7.26 12.04 7.1C12.06 7.04 12.19 6.92 12.22 6.89C12.56 6.7 12.96 6.76 13.33 6.91C13.67 7.05 13.92 7.3 14.29 7.66C14.67 8.1 14.74 8.22 14.95 8.55C15.12 8.8 15.28 9.06 15.38 9.36C15.45 9.55 15.36 9.7 15.14 9.8Z";
/** The compositor-driven sway, slowed and shrunk from the hero's hover values. */
const SPLASH_SWAY_DURATION = '2.4s';
/**
 * Splash stylesheet. It lands in the head before the body parses, so it carries
 * its own light/dark values: the skin's tokens only exist once the browser half
 * has run, and `--dsh-boot-bg` is the host canvas colour the theme already set.
 * Every skin token is read with a fallback to the matching literal.
 */
const SPLASH_CSS = `
#${SPLASH_ID}{
  --smooth-splash-ink:#000000;
  position:fixed;inset:0;z-index:2147483000;box-sizing:border-box;overflow:hidden;
  display:grid;place-items:center;pointer-events:none;opacity:0;
  background:var(--dsh-boot-bg,#f4f5f7);color:var(--smooth-splash-ink);
}
body[data-ds-dark-theme] #${SPLASH_ID}{--smooth-splash-ink:#ffffff;background:var(--dsh-boot-bg,#151517)}
/* The opening appears on its first frame and only ever fades out: a fade-in would put
   another full-screen animation on the main thread exactly while the app boots. */
#${SPLASH_ID}[data-smooth-splash-live]{opacity:1}
#${SPLASH_ID}[data-smooth-splash-out]{opacity:0;transition:opacity ${SPLASH_FADE_MS}ms cubic-bezier(.4,0,.2,1)}
/* One sway, hung on the HTML box rather than on the svg inside it. A transform
   animation on an HTML element is the path Chromium composites: the whale is rasterized
   once and the compositor keeps moving that texture at 60fps even while the app's first
   mount owns the main thread. It is deliberately slower and smaller than the hero's
   hover sway — fewer pixels move per frame, so a dropped frame is not visible. */
#${SPLASH_ID} .smooth-splash-mark{
  display:block;width:clamp(112px,12vw,176px);aspect-ratio:23.16 / 17.04;
  border:0;border-radius:0;background:transparent;box-shadow:none;line-height:0;
  transform-origin:50% 60%;will-change:transform;
  animation:${SPLASH_SWAY_DURATION} ease-in-out infinite smooth-splash-swim;
}
/* The whale itself never animates: no transform of its own, no geometry. */
#${SPLASH_ID} .smooth-splash-mark>svg{display:block;width:100%;height:auto;overflow:visible}
@keyframes smooth-splash-swim{0%,to{transform:none}35%{transform:rotate(-2.4deg) translate(-.3px,-.5px)}70%{transform:rotate(1deg) translate(.2px,.15px)}}
/* Reduced motion skips the opening, including a preference changed at first paint. */
@media(prefers-reduced-motion:reduce){#${SPLASH_ID}{display:none}}
`;

/** The opening contains only the monochrome whale, with no visible copy and no animated
 * geometry: morphing a path is main-thread work, and the opening is on screen exactly
 * while the app's first mount owns that thread. The whole motion is the composited CSS
 * sway declared above, which the compositor keeps running through the boot. The skin's
 * settings page replays exactly this markup, so both openings share one whale. */
function splashInnerHtml() {
  return '<span class="smooth-splash-mark">'
    + `<svg viewBox="0 0 23.16 17.04" aria-hidden="true"><path d="${SPLASH_WHALE_PATH}" fill="currentColor"/></svg>`
    + '</span>';
}

function splashHtml() {
  return `<div id="${SPLASH_ID}" aria-hidden="true">${splashInnerHtml()}</div>`;
}

/**
 * The script that owns the opening's lifetime. It runs while the body is still
 * parsing, so it waits for `#root` itself and holds the opening until the shell has
 * mounted. The browser half stores its setting in localStorage, which is the only state
 * this needs.
 *
 * The wait watches `#root`'s own children when the mount point is already in the
 * document, and only falls back to the whole document when it is not. A subtree
 * observer on `documentElement` hands this script every mutation the mounting shell
 * makes, for a condition that only ever depends on one container.
 *
 * It also applies the launch window size, before anything has painted: see `sizeWindow`
 * below for why the earliest possible moment is the one that matters.
 */
function splashScript() {
  return `(function(){
var layer=document.getElementById(${JSON.stringify(SPLASH_ID)});
if(!layer)return;
var HOLD=${SPLASH_HOLD_MS},CAP=${SPLASH_CAP_MS},SETTLE=${SPLASH_SETTLE_MS};
var started=Date.now(),done=false,capTimer=0;
function remove(){if(layer.parentNode)layer.parentNode.removeChild(layer);}
function read(){try{
  var raw=window.localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
  return raw?JSON.parse(raw):null;
}catch(error){return null;}}
function still(){var stored=read();return !stored||(stored.enabled!==false&&stored.boot!==false);}
// The launch window size rides in the same stored state, and this script runs while the
// document is still parsing. The desktop app creates its window hidden and only shows it
// once the page has loaded, so sizing it here is what makes the first visible frame the
// configured size — the module loader's own activation can be later than that. A state
// saved before this setting existed carries no windowSize field; it takes the same default
// the browser half normalizes to, so the later activation never has to move a visible
// window. In a browser tab resizeTo is a no-op, so this needs no platform check.
function sizeWindow(){try{
  // A reload keeps the browsing session, so the launch size is already in effect and
  // the window must stay where the user put it. A new app window gets fresh
  // sessionStorage and applies the setting again. If storage is unavailable, fall
  // through to the old every-load behaviour rather than silently dropping the size.
  var session=null,seen=false;
  try{session=window.sessionStorage;seen=!!session&&session.getItem(${JSON.stringify(WINDOW_SIZED_KEY)})!==null;}catch(error){}
  if(seen)return;
  var stored=read();
  if(stored&&stored.enabled===false)return;
  var size=(stored&&stored.windowSize)||null;
  if(size&&size.enabled===false)return;
  if(typeof window.resizeTo!=='function')return;
  if(window.top!==window.self)return;
  var screen=window.screen||{};
  var areaWidth=Number(screen.availWidth)||0;
  var areaHeight=Number(screen.availHeight)||0;
  var maxWidth=areaWidth||${WINDOW_SIZE.maxWidth};
  var maxHeight=areaHeight||${WINDOW_SIZE.maxHeight};
  var width=Math.max(${WINDOW_SIZE.minWidth},Math.min(Number(size&&size.width)||${DEFAULT_WINDOW_SIZE.width},maxWidth));
  var height=Math.max(${WINDOW_SIZE.minHeight},Math.min(Number(size&&size.height)||${DEFAULT_WINDOW_SIZE.height},maxHeight));
  if(window.outerWidth!==width||window.outerHeight!==height)window.resizeTo(width,height);
  // Centre it in the work area rather than the full screen: that rectangle is what the
  // app's own frame and caption buttons are drawn in, so it is the one "centred" means.
  // moveTo travels the same renderer-to-main channel as resizeTo; when the work area is
  // unknown it is skipped, since an invented origin is worse than the platform default.
  if(areaWidth&&areaHeight&&typeof window.moveTo==='function'){
    window.moveTo(Math.round((Number(screen.availLeft)||0)+(areaWidth-width)/2),Math.round((Number(screen.availTop)||0)+(areaHeight-height)/2));
  }
  try{if(session)session.setItem(${JSON.stringify(WINDOW_SIZED_KEY)},'1');}catch(error){}
}catch(error){}}
sizeWindow();
if(!still()||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)){remove();return;}
layer.setAttribute('data-smooth-splash-live','');
function out(){
  if(done)return;done=true;
  layer.setAttribute('data-smooth-splash-out','');
  document.body.setAttribute(${JSON.stringify(BOOT_ATTRIBUTE)},'reveal');
  setTimeout(function(){
    remove();
    document.body.removeAttribute(${JSON.stringify(BOOT_ATTRIBUTE)});
  },SETTLE);}
function go(){var wait=HOLD-(Date.now()-started);setTimeout(out,wait>0?wait:0);}
var root=document.getElementById('root');
function target(){return (root&&root.isConnected)?root:(root=document.getElementById('root'));}
function mounted(){var node=target();return !!node&&node.childElementCount>0;}
function begin(){clearTimeout(capTimer);go();}
if(mounted()){begin();}
else if(window.MutationObserver){
  var watch=target();
  var observer=new window.MutationObserver(function(){if(mounted()){observer.disconnect();begin();}});
  observer.observe(watch||document.documentElement,watch?{childList:true}:{childList:true,subtree:true});
  capTimer=setTimeout(function(){observer.disconnect();out();},HOLD+CAP);}
else{setTimeout(out,HOLD);}
})();`;
}

/**
 * The stylesheet travels in every served index, so the row carries it without the
 * comments and indentation that make it readable here. Dropping them is safe because
 * this stylesheet holds no strings: every declaration is a keyword, a length or a
 * token reference, so whitespace only ever separates syntax.
 */
function squashCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/**
 * The three rows the web server renders into the index. Order matters: the style
 * row must precede the markup it styles, and the script row must follow the
 * markup it retires.
 */
function bootInjections() {
  return [
    { kind: 'style', text: squashCss(SPLASH_CSS) },
    { kind: 'html', placement: 'body', html: splashHtml() },
    { kind: 'script', placement: 'body', text: splashScript() },
  ];
}

/**
 * Startup-time DOM watching.
 *
 * The skin decorates host surfaces it does not own, so it has to wait for them. The
 * naive shape of that wait is expensive exactly when it matters most: a
 * `MutationObserver` on `document.body` with `{childList, subtree}` calls back once per
 * mutation batch, and the callback runs a whole-document `querySelector`. During the
 * shell's own mount — the busiest stretch of the application's startup — React commits
 * repeatedly, so N watchers each paying one document lookup per commit multiplies out to
 * O(document) × commits.
 *
 * This module keeps one observer for all of them and coalesces its checks into a single
 * animation frame, so a burst of commits costs one pass instead of one pass per commit.
 * The first check of every watcher stays synchronous: the surface it decorates is found
 * in its first render, not one frame later.
 */

/** Coalesce repeated calls into one per animation frame.
 * Engines without `requestAnimationFrame` (test sandboxes, very old runtimes) keep the
 * caller's original timing by running immediately; the returned function is idempotent
 * within a frame either way. */
function coalesceFrame(callback) {
  let pending = false;
  const run = () => { pending = false; callback(); };
  return () => {
    if (pending) return;
    pending = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else run();
  };
}

/** A set of selector watchers sharing one body observer. */
function createSurfaceWatcher() {
  const watchers = new Set();
  let observer;
  const check = () => {
    for (const watcher of [...watchers]) watcher();
  };
  const schedule = coalesceFrame(check);
  return {
    /** Call `callback(match)` now and on every later frame in which the document changed.
     * Returns the disposer that drops this watcher. */
    watch(selector, callback) {
      const watcher = () => { callback(document.querySelector(selector)); };
      watcher();
      watchers.add(watcher);
      if (!observer) {
        observer = new MutationObserver(schedule);
        observer.observe(document.body, { childList: true, subtree: true });
      }
      return () => {
        watchers.delete(watcher);
        if (watchers.size === 0 && observer) {
          observer.disconnect();
          observer = undefined;
        }
      };
    },
    dispose() {
      watchers.clear();
      observer?.disconnect();
      observer = undefined;
    },
  };
}


/**
 * The browser half's one door to the Host half.
 *
 * The Host injects its private loopback origin and a per-activation capability token
 * into the served index (`window.__SMOOTH_GIT__`, kept for the pages this plugin
 * already ships), and every bridge action rides that pair: the composer's Git menu
 * and the welcome page's token table. A page served without it — a browser preview,
 * an install whose Host half is older — has no bridge, and its callers fall back to
 * their own read-only path rather than inventing a result.
 */

function smoothBridge() {
  const bridge = globalThis.__SMOOTH_GIT__;
  if (!bridge || typeof bridge.base !== 'string' || !bridge.base || typeof bridge.token !== 'string' || !bridge.token) return undefined;
  return bridge;
}

async function bridgeRequest(action, payload) {
  const bridge = smoothBridge();
  if (!bridge) throw new Error('smooth-bridge-unavailable');
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
      lastError = new Error(`Smooth bridge HTTP ${response.status}`);
      continue;
    }
    let data;
    try {
      data = await response.json();
    } catch (error) {
      lastError = error;
      continue;
    }
    if (!data?.ok) throw new Error(data?.error?.message || 'Smooth bridge request failed');
    return data.value;
  }
  throw lastError ?? new Error('Smooth bridge connection failed');
}

/**
 * The bottom line's money reading: the Host's settled session cost plus the output
 * tokens the assistant is writing right now.
 *
 * The Host half folds the Session's stored settlements with the official DeepSeek
 * price table, so its figure is exact at the tier each settlement happened in. The
 * browser adds the only piece the Host cannot know yet — the stream that has not
 * produced its settlement event. It estimates that tail from the words and tool calls
 * already on screen, calibrates the estimate against each Host settlement, and the
 * caller adds the two. A missing bridge keeps the old projection estimate.
 */

/** At most one Host cost request per 1.5s; a retried step usually lands within that. */
const SESSION_COST_POLL_MS = 1_500;
/** The streaming estimate is refreshed on a quarter-second cadence while text runs. */
const STREAM_TICK_MS = 250;
/** The same per-tool output weights the Claude-style meter uses, so a tool call is not
 * charged as one flat guess. The default is the cost of an unknown tool. */
const STREAM_TOOL_WEIGHTS = new Map([
  ['Bash', 370], ['Edit', 460], ['Read', 125], ['Write', 1200], ['bash', 105],
  ['bsk_inspect', 60], ['bsk_interact', 75], ['bsk_page', 75], ['desktop_eval', 240],
  ['edit', 325], ['glob', 55], ['grep', 75], ['job_output', 70], ['ops_bash', 125],
  ['ops_edit_file', 390], ['ops_glob', 60], ['ops_grep', 115], ['ops_read_files', 90],
  ['ops_stat', 45], ['ops_write_file', 495], ['present', 105], ['pwsh', 135],
  ['powershell', 135], ['read', 85], ['read_image', 55], ['run_code', 190],
  ['send_message', 1500], ['todo_write', 230], ['web_fetch', 55], ['write', 605],
]);
const STREAM_TOOL_DEFAULT = 120;
/** Word-length cost for Latin letters, CJK / symbol weights, digit triples, and
 * whitespace runs — the same character heuristic as the Claude-style meter. */
const STREAM_LATIN = [0, 0.496, 0.496, 0.62, 0.62, 0.62, 0.636, 0.636, 0.776, 0.776, 1.593];
const STREAM_CJK = 0.5235;
const STREAM_CJK_PUNCT = 2.6312;
const STREAM_NEWLINE = 1.5161;
const STREAM_SPACE = 0.3398;
const STREAM_SPACES = 1.421;
const STREAM_OTHER = 0.8153;
const STREAM_OTHER_PER = 0.1941;
const STREAM_PUNCT = /[\p{P}\p{S}]/u;

/** The Host's settled cost for one Session, fetched through the private bridge. */
function createSessionCostFeed(sessionId, request = bridgeRequest) {
  let id = typeof sessionId === 'string' ? sessionId : '';
  let value = null;
  let askedAt = 0;
  let loading = false;
  let queued = false;
  let retry = 0;
  let sequence = 0;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  function clearRetry() {
    if (retry && typeof clearTimeout === 'function') clearTimeout(retry);
    retry = 0;
  }
  function follow(next) {
    const wanted = typeof next === 'string' ? next : '';
    if (wanted === id) return;
    id = wanted;
    value = null;
    askedAt = 0;
    loading = false;
    queued = false;
    clearRetry();
    sequence += 1;
    notify();
  }
  function ask(now = Date.now(), force = false) {
    if (!id) return undefined;
    if (loading) { queued = true; return undefined; }
    if (!force && askedAt !== 0 && now - askedAt < SESSION_COST_POLL_MS) {
      // A settlement that lands inside the cooldown must still be fetched; otherwise the
      // line keeps the previous Host amount while its live tail has already been reset.
      if (!retry && typeof setTimeout === 'function') {
        const wait = Math.max(0, SESSION_COST_POLL_MS - (now - askedAt));
        retry = setTimeout(() => { retry = 0; ask(Date.now(), true); }, wait);
        retry?.unref?.();
      }
      return undefined;
    }
    askedAt = now;
    loading = true;
    queued = false;
    const ticket = ++sequence;
    return Promise.resolve()
      .then(() => request('session-cost', { sessionId: id }))
      .then((next) => {
        if (ticket !== sequence || !next || typeof next !== 'object') return;
        value = next;
        notify();
      })
      .catch(() => { /* keep the previous reading; the caller has a projection fallback */ })
      .finally(() => {
        if (ticket !== sequence) return;
        loading = false;
        if (queued) { queued = false; ask(Date.now(), true); }
      });
  }
  return {
    follow,
    ask,
    value() { return value; },
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    stop() {
      id = '';
      value = null;
      askedAt = 0;
      loading = false;
      queued = false;
      clearRetry();
      sequence += 1;
      listeners.clear();
    },
  };
}

/** The character classes of the Claude-style meter: CJK, CJK punctuation, Latin word,
 * digit run, whitespace and everything else. */
function streamClass(code, character) {
  if (code >= 0x2e80) return STREAM_PUNCT.test(character) ? 2 : 1;
  if (code >= 48 && code <= 57) return 4;
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return 3;
  if (code === 32 || (code >= 9 && code <= 13)) return 5;
  return 6;
}

/** The same word/character heuristic as the Claude-style streaming meter. The caller
 * then calibrates the result against the Host's real output delta, so one multiplier
 * per model absorbs the remaining tokenizer difference. */
function estimateStreamTokens(text) {
  let total = 0;
  let kind = 0;
  let length = 0;
  let newline = false;
  const flush = () => {
    if (kind === 1) total += length * STREAM_CJK;
    else if (kind === 2) total += length * STREAM_CJK_PUNCT;
    else if (kind === 3) total += STREAM_LATIN[Math.min(length, 10)];
    else if (kind === 4) total += Math.ceil(length / 3);
    else if (kind === 5) total += newline ? STREAM_NEWLINE : length === 1 ? STREAM_SPACE : STREAM_SPACES;
    else if (kind === 6) total += STREAM_OTHER + length * STREAM_OTHER_PER;
    kind = 0;
    length = 0;
    newline = false;
  };
  for (const character of String(text ?? '')) {
    const code = character.codePointAt(0);
    const next = streamClass(code, character);
    if (next !== kind) {
      flush();
      kind = next;
    }
    length += 1;
    if (next === 5 && (code === 10 || code === 13)) newline = true;
  }
  flush();
  return total;
}

/** A tool call's output weight, keyed by the host's `data-tool` name. */
function streamToolTokens(node) {
  const name = typeof node?.getAttribute === 'function' ? node.getAttribute('data-tool') : '';
  return STREAM_TOOL_WEIGHTS.get(name) ?? STREAM_TOOL_DEFAULT;
}

function streamMedian(values) {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** The live output tail, measured from the conversation DOM. */
function createStreamingMeter() {
  const doc = typeof document !== 'undefined' ? document : null;
  const listeners = new Set();
  let observer = null;
  let timer = 0;
  let counted = 0;
  let lastOutput = null;
  let model = null;
  const textSeen = new Map();
  const callsSeen = new Set();
  const factors = new Map();
  const ratios = new Map();
  const notify = () => { for (const listener of listeners) listener(); };

  /** Add only the growth since the last look: a message leaving the DOM must not reset
   * the estimate, and a settlement mid-stream must not recount the text already paid. */
  function measure() {
    if (!doc || typeof doc.querySelector !== 'function') return counted;
    const scroller = doc.querySelector('[data-conversation-scroll]');
    if (!scroller) return counted;
    for (const node of scroller.querySelectorAll('[data-streaming]')) {
      // A nested streaming box is part of its parent's text; count the outer one once.
      if (node.parentElement && node.parentElement.closest('[data-streaming]')) continue;
      const tokens = estimateStreamTokens(node.textContent);
      const previous = textSeen.get(node) || 0;
      if (tokens > previous) counted += tokens - previous;
      textSeen.set(node, tokens);
    }
    for (const node of textSeen.keys()) {
      if (!node.isConnected) textSeen.delete(node);
    }
    const streaming = hasStreaming();
    for (const call of scroller.querySelectorAll('[data-chat-call-id]')) {
      if (callsSeen.has(call)) continue;
      callsSeen.add(call);
      // History can mount later (a longer row, a fold opening); it is already settled.
      if (streaming) counted += streamToolTokens(call);
    }
    return counted;
  }

  function hasStreaming() {
    return Boolean(doc && typeof doc.querySelector === 'function' && doc.querySelector('[data-streaming]'));
  }

  function tick() {
    const before = counted;
    measure();
    if (!hasStreaming() && timer) stopTimer();
    // Re-render only when the estimate moved; a composer or cost label mutation must
    // not start a render/mutation loop of its own.
    if (counted !== before) notify();
  }

  function refresh() {
    return measure();
  }

  function stopTimer() {
    if (timer && typeof clearInterval === 'function') clearInterval(timer);
    timer = 0;
  }

  function ensureTimer() {
    if (timer || !hasStreaming() || typeof setInterval !== 'function') return;
    timer = setInterval(tick, STREAM_TICK_MS);
    timer?.unref?.();
  }

  function watch() {
    if (!doc || !doc.body || typeof MutationObserver !== 'function') return;
    // Calls already on screen belong to settled turns; mark them without charging.
    const scroller = typeof doc.querySelector === 'function' ? doc.querySelector('[data-conversation-scroll]') : null;
    if (scroller) for (const call of scroller.querySelectorAll('[data-chat-call-id]')) callsSeen.add(call);
    let watched = null;
    const attach = () => {
      const target = (typeof doc.querySelector === 'function' ? doc.querySelector('[data-conversation-scroll]') : null) || doc.body;
      if (target === watched) return;
      watched = target;
      observer.disconnect();
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    };
    observer = new MutationObserver(() => { attach(); tick(); ensureTimer(); });
    attach();
    tick();
    ensureTimer();
  }

  return {
    watch,
    /** Land a Host settlement: the counted text and tool calls up to this point are
     * already paid for, and their ratio to the real output delta calibrates the model. */
    settle(outputTokens, modelId) {
      const output = Number.isFinite(Number(outputTokens)) ? Number(outputTokens) : 0;
      const named = modelId || null;
      if (model === null) {
        // First reading of this mount: keep whatever the meter already counted from a
        // stream that was on screen before the effect ran.
        model = named;
        lastOutput = output;
        return;
      }
      if (named !== model) {
        model = named;
        counted = 0;
        lastOutput = output;
        ratios.delete(named);
        factors.delete(named);
        return;
      }
      if (lastOutput === null) {
        lastOutput = output;
        return;
      }
      const delta = output - lastOutput;
      if (delta <= 0) {
        lastOutput = output;
        counted = 0;
        return;
      }
      const estimate = counted;
      if (estimate > 0 && delta >= 20) {
        const list = ratios.get(named) || [];
        list.push(estimate / delta);
        if (list.length > 20) list.shift();
        ratios.set(named, list);
        factors.set(named, Math.min(1.1, Math.max(0.9, 1 / streamMedian(list))));
      }
      lastOutput = output;
      counted = 0;
    },
    /** Estimated output tokens written since the last Host settlement. */
    tokens(modelId) {
      refresh();
      return Math.max(0, counted) * (factors.get(modelId ?? model) ?? 1);
    },
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    stop() {
      observer?.disconnect();
      observer = null;
      stopTimer();
      listeners.clear();
    },
  };
}

/** The figure the button shows: the Host's settled amount plus the live output tail.
 * `fallback` is the old projection-based estimate, used without a Host reading or when
 * some settlement has no price. */
function combineSessionCost(host, liveTokens, outputRate, fallback) {
  if (host && host.partial !== true && Number.isFinite(host.costMicro)) {
    const settled = host.costMicro;
    // The log is written slightly after the projection. A zero Host reading next to a
    // positive projection is that lag, not a free turn; prefer the projection until the
    // first settlement lands.
    if (settled > 0 || fallback === null || fallback === 0) {
      const live = Math.max(0, Number(liveTokens) || 0) * Math.max(0, Number(outputRate) || 0);
      return settled + live;
    }
  }
  return fallback;
}

/** Generated by tools/export-think.mjs from assets/think/cutout — do not edit.
 *
 * One cutout per reasoning level, inlined because the client bundle cannot read the
 * plugin's files at runtime. Regenerate with `python tools/prepare-think.py` and
 * `node tools/export-think.mjs` after replacing the artwork. */
const THINK_ART = Object.freeze({
  off: 'data:image/webp;base64,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',
  low: 'data:image/webp;base64,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',
  high: 'data:image/webp;base64,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',
  max: 'data:image/webp;base64,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',
});

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
    const [startedFor, setStartedFor] = React.useState(null);
    const conversationStarted = startedFor === props.sessionId;
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
    // The new-session hero has no chat rows yet; once the first user message (or its
    // optimistic echo) appears, the line must show even while every figure is still 0.
    // The observer also clears the flag when the conversation goes away (Home), and the
    // session id in the state keeps a previous conversation from showing on a new one.
    React.useEffect(() => {
      if (!active) return undefined;
      if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return undefined;
      let alive = true;
      const checked = () => Boolean(document.querySelector('[data-conversation-scroll] [data-chat-flow-kind], [data-submission-echo]'));
      const check = () => { if (alive) setStartedFor(checked() ? props.sessionId : null); };
      check();
      const target = document.querySelector('[data-conversation-scroll]') || document.body;
      const observer = typeof MutationObserver === 'function' && target
        ? new MutationObserver(check) : null;
      observer?.observe(target, { childList: true, subtree: true });
      return () => { alive = false; observer?.disconnect(); };
    }, [active, props.sessionId]);
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
    const contextOnly = variant === 'context';
    // The new-session hero has no reading and no conversation to report on. Once the
    // first user message exists the line appears immediately, even with zeros; the
    // context-only seat still waits for its first context reading instead of drawing an
    // empty pie.
    if (!conversationStarted && !(input + output) && !turns && !steps) return null;
    if (contextOnly && !context) return null;
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

/**
 * The welcome page's usage panel.
 *
 * The page this decorates is the host's home surface: the Host still mounts the
 * welcome hero — the headline the skin already joins with the product name — and
 * nothing else. The panel is portalled into that hero's own stack, so it lands
 * directly under the headline, inside the column the composer card occupies on a
 * session page, and disappears with the hero. The gate is the chrome's
 * data-smooth-home flag, which follows the host's current view: closing every tab
 * lands here, and so does Home, which clears the conversation while the strip keeps
 * whatever tabs it still has.
 *
 * Layout follows the claude-style usage card: tabs (概览 / 模型) and a period switch
 * (全部 / 30 天 / 7 天) in one header, six figures, then a 26-week heatmap whose cell
 * shade is the day's share of the busiest day in the window. The numbers come from the
 * Host half's `usage` bridge action, which folds the stored Session logs into per-day
 * records (src/host.js). One request serves every mount for a minute; a page whose Host
 * half predates the action shows no panel at all rather than an empty frame.
 */

/** The window the reference card draws: 26 weeks ending with the current one. */
const USAGE_WEEKS = 26;
/** The reference card's four lit shades. */
const USAGE_LEVELS = 4;
/** How many models the 模型 tab lists before asking to expand. */
const USAGE_MODEL_ROWS = 6;
const USAGE_TTL_MS = 60_000;
const USAGE_RANGES = [
  { id: 'all', days: 0, key: 'usage.rangeAll', fallback: '全部' },
  { id: '30d', days: 30, key: 'usage.range30d', fallback: '30 天' },
  { id: '7d', days: 7, key: 'usage.range7d', fallback: '7 天' },
];

/** The reading ladder behind the closing line: tokens in one copy of each book. The
 * counts are the reference card's own approximations, so the same total lands on the
 * same book; the list only has to stay sorted by length. Names are locale entries so
 * both languages read naturally. */
const USAGE_BOOKS = [
  { tokens: 7607, key: 'usage.book.taoTeChing', zh: '道德经' },
  { tokens: 27557, key: 'usage.book.metamorphosis', zh: '变形记' },
  { tokens: 37248, key: 'usage.book.alice', zh: '爱丽丝梦游仙境' },
  { tokens: 39000, key: 'usage.book.animalFarm', zh: '动物农场' },
  { tokens: 65763, key: 'usage.book.gatsby', zh: '了不起的盖茨比' },
  { tokens: 100000, key: 'usage.book.philosophersStone', zh: '哈利·波特与魔法石' },
  { tokens: 136278, key: 'usage.book.nineteenEightyFour', zh: '一九八四' },
  { tokens: 138725, key: 'usage.book.sherlock', zh: '福尔摩斯探案集' },
  { tokens: 152659, key: 'usage.book.walden', zh: '瓦尔登湖' },
  { tokens: 159575, key: 'usage.book.madameBovary', zh: '包法利夫人' },
  { tokens: 171701, key: 'usage.book.pride', zh: '傲慢与偏见' },
  { tokens: 173150, key: 'usage.book.odyssey', zh: '奥德赛' },
  { tokens: 187333, key: 'usage.book.taleOfTwoCities', zh: '双城记' },
  { tokens: 202000, key: 'usage.book.threeBody', zh: '三体' },
  { tokens: 285009, key: 'usage.book.crimeAndPunishment', zh: '罪与罚' },
  { tokens: 481659, key: 'usage.book.annaKarenina', zh: '安娜·卡列尼娜' },
  { tokens: 574243, key: 'usage.book.donQuixote', zh: '堂吉诃德' },
  { tokens: 625000, key: 'usage.book.lordOfTheRings', zh: '魔戒' },
  { tokens: 638009, key: 'usage.book.threeKingdoms', zh: '三国演义' },
  { tokens: 769001, key: 'usage.book.warAndPeace', zh: '战争与和平' },
  { tokens: 783200, key: 'usage.book.journeyWest', zh: '西游记' },
  { tokens: 801791, key: 'usage.book.lesMiserables', zh: '悲惨世界' },
  { tokens: 903956, key: 'usage.book.redChamber', zh: '红楼梦' },
  { tokens: 958242, key: 'usage.book.waterMargin', zh: '水浒传' },
  { tokens: 998000, key: 'usage.book.ordinaryWorld', zh: '平凡的世界' },
  { tokens: 1409000, key: 'usage.book.harryPotter', zh: '哈利·波特全集' },
  { tokens: 1647000, key: 'usage.book.lostTime', zh: '追忆似水年华' },
];

/** One remembered response, shared by every remount of the landing page. */
let usageCache;

async function usageSnapshot() {
  if (usageCache && Date.now() - usageCache.at < USAGE_TTL_MS) return usageCache.value;
  const value = await bridgeRequest('usage');
  usageCache = { at: Date.now(), value };
  return value;
}

/** `%s` substitution for the counters that carry a number: the shared locale table has
 * no formatter, and a whole ICU layer for five strings would outweigh the panel. */
function usageFill(template, ...values) {
  let index = 0;
  return template.replace(/%s/g, () => String(values[index++] ?? ''));
}

/** 916 -> 916, 45 612 -> 45.6k, 3 683 260 964 -> 3.7B. One decimal at most, which is
 * what the reference card prints and what the Host's own status bar does. */
function usageTokens(value) {
  const total = Number(value) || 0;
  for (const [size, suffix] of [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']]) {
    const scaled = Math.round(total / size * 10) / 10;
    if (scaled >= 1) return `${scaled}${suffix}`;
  }
  return String(Math.round(total));
}

/** Whole counts keep their groups: 13,262 messages reads better than 13.3k. */
function usageCount(value) {
  return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function usageDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const usageDateFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
})();

function usageDateLabel(key) {
  const [year, month, day] = key.split('-').map(Number);
  if (!usageDateFormatter) return key;
  try {
    return usageDateFormatter.format(new Date(year, month - 1, day));
  } catch {
    return key;
  }
}

/** 05:00 -> "上午 5 点", 17:00 -> "下午 5 点", 0 -> "上午 12 点". */
function usageHourLabel(hour, text) {
  const clock = hour % 12 === 0 ? 12 : hour % 12;
  return usageFill(
    text(hour < 12 ? 'usage.hourAm' : 'usage.hourPm', hour < 12 ? '上午 %s 点' : '下午 %s 点'),
    clock,
  );
}

/** The closing line: the largest book the total has out-read, and how many copies. */
function usageBookLine(tokens, text) {
  let chosen;
  for (const book of USAGE_BOOKS) if (tokens >= book.tokens) chosen = book;
  if (!chosen) return null;
  return usageFill(
    text('usage.fun', '你的 Token 用量相当于 %s 本《%s》。'),
    usageCount(Math.round(tokens / chosen.tokens)),
    text(chosen.key, chosen.zh),
  );
}

/** The 26-week grid: Sunday-first columns of seven days, shades relative to the busiest
 * day in the window — the reference card's own scale, which keeps a busy month distinct
 * from a quiet one instead of splitting quantiles of a handful of days. */
function usageCells(days) {
  const byDay = new Map(days.map((entry) => [entry.day, Number(entry.tokens) || 0]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (USAGE_WEEKS * 7 - 1));
  start.setDate(start.getDate() - start.getDay());
  const cells = [];
  let peak = 0;
  for (const cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const key = usageDateKey(cursor);
    const tokens = byDay.get(key) || 0;
    if (tokens > peak) peak = tokens;
    cells.push({ key, tokens, level: 0 });
  }
  for (const cell of cells) {
    cell.level = cell.tokens > 0 && peak > 0
      ? Math.max(1, Math.min(USAGE_LEVELS, Math.ceil(cell.tokens / peak * USAGE_LEVELS)))
      : 0;
  }
  return { cells, peak };
}

/** One period's figures: the six tiles and the model ranking. The heatmap always shows
 * the whole window (the reference card does the same — the switch filters the figures,
 * not the calendar). */
function usageSummary(days, rangeId, text) {
  const range = USAGE_RANGES.find((entry) => entry.id === rangeId) || USAGE_RANGES[0];
  let cutoff;
  if (range.days > 0) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (range.days - 1));
    cutoff = usageDateKey(from);
  }
  let tokens = 0;
  let calls = 0;
  let activeDays = 0;
  const sessions = new Set();
  const hours = new Array(24).fill(0);
  const models = {};
  for (const entry of days) {
    if (cutoff && entry.day < cutoff) continue;
    const dayTokens = Number(entry.tokens) || 0;
    tokens += dayTokens;
    calls += Number(entry.calls) || 0;
    if (dayTokens > 0) activeDays += 1;
    for (const id of entry.sessions || []) sessions.add(id);
    for (let hour = 0; hour < 24; hour++) hours[hour] += Number(entry.hours?.[hour]) || 0;
    for (const [model, value] of Object.entries(entry.models || {})) models[model] = (models[model] || 0) + Number(value || 0);
  }
  let peakHour = null;
  if (hours.some((value) => value > 0)) {
    peakHour = 0;
    for (let hour = 1; hour < 24; hour++) if (hours[hour] > hours[peakHour]) peakHour = hour;
  }
  const ranking = Object.entries(models)
    .filter(([, value]) => Number(value) > 0)
    .map(([id, value]) => ({ id, tokens: value }))
    .sort((left, right) => right.tokens - left.tokens || (left.id < right.id ? -1 : 1));
  return {
    tokens,
    calls,
    sessions: sessions.size,
    activeDays,
    peakHour,
    model: ranking.length ? ranking[0].id : null,
    models: ranking,
    cells: usageCells(days).cells,
    fun: usageBookLine(tokens, text),
  };
}

function UsagePanel({ text, days, pending }) {
  const [tab, setTab] = React.useState('overview');
  const [range, setRange] = React.useState('all');
  const [expanded, setExpanded] = React.useState(false);
  const summary = React.useMemo(() => usageSummary(days, range, text), [days, range]);
  const columns = Math.ceil(summary.cells.length / 7);
  const edge = 3;
  const known = !pending;
  const stat = (id, label, value) => h('div', { className: 'smooth-usage-stat', 'data-smooth-stat': id },
    h('span', { className: 'smooth-usage-stat-label' }, label),
    h('span', { className: 'smooth-usage-stat-value' }, known ? value : '—'));
  const tabButton = (id, label) => h('button', {
    key: id,
    type: 'button',
    role: 'tab',
    className: 'smooth-usage-tab',
    'aria-selected': tab === id,
    'data-active': tab === id ? '' : undefined,
    onClick: () => setTab(id),
  }, label);
  const rangeButton = (entry) => h('button', {
    key: entry.id,
    type: 'button',
    className: 'smooth-usage-range',
    'aria-pressed': range === entry.id,
    'data-active': range === entry.id ? '' : undefined,
    onClick: () => setRange(entry.id),
  }, text(entry.key, entry.fallback));
  return h('section', {
    className: 'smooth-usage-panel',
    role: 'region',
    'aria-label': text('usage.title', '每日 token 使用'),
    'aria-busy': pending ? 'true' : 'false',
  },
  h('div', { className: 'smooth-usage-head' },
    h('div', { className: 'smooth-usage-tabs', role: 'tablist', 'aria-label': text('usage.title', '每日 token 使用') },
      tabButton('overview', text('usage.tabOverview', '概览')),
      tabButton('models', text('usage.tabModels', '模型'))),
    h('div', { className: 'smooth-usage-ranges', role: 'group' }, USAGE_RANGES.map(rangeButton))),
  tab === 'models'
    ? h(UsageModels, { text, summary, expanded, onToggle: () => setExpanded((value) => !value) })
    : h(React.Fragment, null,
      h('div', { className: 'smooth-usage-stats' },
        stat('sessions', text('usage.sessions', '会话数'), usageCount(summary.sessions)),
        stat('calls', text('usage.calls', '消息数'), usageCount(summary.calls)),
        stat('tokens', text('usage.tokens', 'Token 总量'), usageTokens(summary.tokens)),
        stat('days', text('usage.activeDays', '活跃天数'), usageCount(summary.activeDays)),
        stat('peak', text('usage.peak', '高峰时段'), summary.peakHour === null ? '—' : usageHourLabel(summary.peakHour, text)),
        stat('model', text('usage.topModel', '最常用模型'), summary.model || '—')),
      h('div', { className: 'smooth-usage-heat', 'data-smooth-skeleton': pending ? '' : undefined },
        summary.cells.map((cell, index) => {
          const column = Math.floor(index / 7);
          const tip = pending ? undefined : usageFill(text('usage.heatTip', '%s — %s Token'), usageDateLabel(cell.key), usageTokens(cell.tokens));
          return h('span', {
            key: cell.key,
            className: 'smooth-usage-heat-cell',
            'data-smooth-level': String(cell.level),
            'data-smooth-tip': tip,
            'data-smooth-edge': column < edge ? 'start' : column >= columns - edge ? 'end' : undefined,
            'aria-label': tip,
          });
        })),
      summary.fun ? h('span', { className: 'smooth-usage-fun' }, summary.fun) : null));
}

function UsageModels({ text, summary, expanded, onToggle }) {
  if (!summary.models.length) return h('div', { className: 'smooth-usage-models-empty' }, text('usage.modelsEmpty', '暂无模型数据'));
  const total = summary.models.reduce((sum, model) => sum + model.tokens, 0);
  const rows = expanded ? summary.models : summary.models.slice(0, USAGE_MODEL_ROWS);
  const hidden = summary.models.length - rows.length;
  return h('div', { className: 'smooth-usage-models' },
    rows.map((model, index) => h('div', { key: model.id, className: 'smooth-usage-model' },
      h('span', { className: 'smooth-usage-model-swatch', 'data-smooth-rank': String(Math.min(index, 5)) }),
      h('span', { className: 'smooth-usage-model-name' }, model.id),
      h('span', { className: 'smooth-usage-model-split' }, usageTokens(model.tokens)),
      h('span', { className: 'smooth-usage-model-share' }, total > 0 ? `${Math.round(model.tokens / total * 1000) / 10}%` : '—'))),
    hidden > 0 || expanded
      ? h('button', {
        type: 'button',
        className: 'smooth-usage-more',
        'aria-expanded': expanded,
        onClick: onToggle,
      }, expanded ? text('usage.modelsLess', '收起') : usageFill(text('usage.modelsMore', '再显示 %s 个'), hidden))
      : null);
}

function installUsage({ slots, useSmoothState, text }) {
  if (!slots || typeof slots.inject !== 'function') return () => {};
  const { createPortal } = require('react-dom');
  const surfaces = createSurfaceWatcher();
  function useTarget(selector) {
    const [target, setTarget] = React.useState(null);
    React.useEffect(() => surfaces.watch(selector, setTarget), [selector]);
    return target;
  }
  /** The welcome page is the host's home surface: the chrome publishes that state on the
   * body (src/layout.js) and the stylesheet already drops the composer card there. The
   * panel belongs to that page alone — a new Session keeps its hero to itself. */
  function useHomeSurface() {
    const [homeSurface, setHomeSurface] = React.useState(() => document.body.hasAttribute(HOME_ATTRIBUTE));
    React.useEffect(() => {
      const publish = () => setHomeSurface(document.body.hasAttribute(HOME_ATTRIBUTE));
      publish();
      const observer = new MutationObserver(publish);
      observer.observe(document.body, { attributes: true, attributeFilter: [HOME_ATTRIBUTE] });
      return () => observer.disconnect();
    }, []);
    return homeSurface;
  }
  function WelcomeUsage() {
    const skin = useSmoothState();
    const homeSurface = useHomeSurface();
    // The hero stack is the centered column holding the headline; the panel belongs at
    // its end, directly under the headline.
    const title = useTarget(`[data-content-phase="hero"] ${hostPart('composerHero')} ${hostPart('titleGroup')}`);
    const stack = title?.parentElement?.parentElement || null;
    const [mount, setMount] = React.useState(null);
    const [snapshot, setSnapshot] = React.useState(() => usageCache && Date.now() - usageCache.at < USAGE_TTL_MS
      ? { status: 'ready', value: usageCache.value }
      : { status: 'loading' });
    React.useEffect(() => {
      if (!stack || !homeSurface) { setMount(null); return undefined; }
      const node = document.createElement('div');
      node.className = 'smooth-usage-mount';
      stack.append(node);
      setMount(node);
      return () => { node.remove(); };
    }, [stack, homeSurface]);
    React.useEffect(() => {
      if (snapshot.status !== 'loading') return undefined;
      let alive = true;
      usageSnapshot().then((value) => { if (alive) setSnapshot({ status: 'ready', value }); })
        .catch(() => { if (alive) setSnapshot({ status: 'unavailable' }); });
      return () => { alive = false; };
    }, [snapshot.status]);
    if (!skin.state.enabled || !homeSurface || !mount || snapshot.status === 'unavailable') return null;
    return createPortal(h(UsagePanel, {
      text,
      days: snapshot.status === 'ready' ? snapshot.value.days : [],
      pending: snapshot.status === 'loading',
    }), mount);
  }
  const dispose = slots.inject('shell.overlay', () => slots.register({
    name: 'shell.overlay',
    id: `${PLUGIN_ID}.usage`,
    order: 20,
  }, WelcomeUsage));
  return () => { dispose?.(); surfaces.dispose(); };
}

/** Decimal strings stay exact; top-ups round to cents without Number conversion. */
function formatAccountAmount(amount, currency, twoDecimals = false) {
  const match = typeof amount === 'string' && amount.match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match || !/^[A-Z]{3}$/.test(currency || '')) return undefined;
  let whole = match[2];
  let fraction = (match[3] || '').padEnd(2, '0');
  let sign = match[1];
  if (twoDecimals) {
    let cents = BigInt(whole) * 100n + BigInt(fraction.slice(0, 2));
    if ((fraction[2] || '0') >= '5') cents += 1n;
    whole = (cents / 100n).toString();
    fraction = (cents % 100n).toString().padStart(2, '0');
    if (cents === 0n) sign = '';
  }
  const integer = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = { CNY: '¥', USD: '$', EUR: '€' }[currency] || `${currency} `;
  return `${sign}${symbol}${integer}.${fraction}`;
}

function accountWallets(wallets, { twoDecimals = false, hideZero = false } = {}) {
  return (Array.isArray(wallets) ? wallets : []).flatMap((wallet) => {
    const amount = formatAccountAmount(wallet?.balance, wallet?.currency, twoDecimals);
    return amount === undefined || (hideZero && /^-?0+(?:\.0+)?$/.test(wallet.balance))
      ? [] : [{ currency: wallet.currency, amount }];
  });
}

const ACCOUNT_HELP_LINKS = [
  ['account.github', '查看 Github', 'https://github.com/deepseek-ai/deepseek-harness'],
  ['account.docs', '开发者文档', 'https://deepseek-harness.github.io/deepseek-harness/guide/quickstart'],
  ['account.plugins', '社区插件', 'https://github.com/topics/dsh-plugin'],
  ['account.paper', 'cordis 论文', 'https://arxiv.org/abs/2608.25512'],
];

function accountGlyph(kind) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true, ...stroke }, kind === 'usage'
    ? [h('path', { key: 'rim', d: 'M4.2 18a9 9 0 1 1 15.6 0M5 12h2m10 0h2M12 5v2M6.4 6.4l1.4 1.4m8.4 0 1.4-1.4M12 12l3-3' }), h('circle', { key: 'hub', cx: 12, cy: 12, r: 1.5 })]
    : [h('circle', { key: 'outer', cx: 12, cy: 12, r: 9 }), h('circle', { key: 'inner', cx: 12, cy: 12, r: 4.5 }), h('path', { key: 'spokes', d: 'm5.6 5.6 3.2 3.2m6.4 6.4 3.2 3.2m-12.8 0 3.2-3.2m6.4-6.4 3.2-3.2' })]);
}

/** Portal extras share the native menu's focus lifecycle. Walk screen order,
 * which differs from registration order after the reference layout is applied. */
function navigateAccountMenu(event, menu) {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  const buttons = [...menu.querySelectorAll('button:not(:disabled)')]
    .filter((button) => !button.closest?.('[inert]'))
    .map((button) => ({ button, rect: button.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left).map(({ button }) => button);
  if (!buttons.length) return;
  const index = buttons.indexOf(event.target.closest('button'));
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : index < 0 ? (event.key === 'ArrowDown' ? 0 : buttons.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
  event.preventDefault(); event.stopPropagation();
  buttons[next].focus(); buttons[next].scrollIntoView({ block: 'nearest' });
}

function createAccountExtras(ui, text) {
  return function AccountExtras(props) {
    const account = props.useAccount((value) => value);
    const signedIn = account.view?.status === 'credential-stored';
    const profile = signedIn && account.details?.profile?.status === 'ready' ? account.details.profile.value : undefined;
    const balance = signedIn ? account.details?.balance : undefined;
    const [expanded, setExpanded] = React.useState(false);
    const [help, setHelp] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const [failedAvatar, setFailedAvatar] = React.useState(undefined);
    const alive = React.useRef(true);
    const root = React.useRef(null);
    const helpButton = React.useRef(null);
    const backButton = React.useRef(null);
    const previousHelp = React.useRef(false);
    const balanceId = React.useId();
    const helpId = React.useId();
    React.useLayoutEffect(() => {
      const menu = root.current?.closest('[data-smooth-account-menu]');
      // Arm the popup's entrance only now that this portal is laid out: the visible scale
      // then starts on finished content instead of racing the rows this component mounts.
      menu?.setAttribute('data-smooth-account-open', '');
      const nativeRows = [...(menu?.querySelectorAll(`${accountPart('viewport')}>${accountPart('itemWrap')}`) || [])];
      menu?.toggleAttribute('data-smooth-help-open', help);
      for (const row of nativeRows) {
        row.toggleAttribute('inert', help);
        if (help) row.setAttribute('aria-hidden', 'true');
        else row.removeAttribute('aria-hidden');
      }
      if (help) backButton.current?.focus();
      else if (previousHelp.current) helpButton.current?.focus();
      previousHelp.current = help;
      return () => {
        menu?.removeAttribute('data-smooth-account-open');
        menu?.removeAttribute('data-smooth-help-open');
        for (const row of nativeRows) { row.removeAttribute('inert'); row.removeAttribute('aria-hidden'); }
      };
    }, [help]);
    const refresh = async () => {
      if (!signedIn || !props.refreshAccount) return;
      setBusy(true); setFailed(false);
      try { await props.refreshAccount(); }
      catch { if (alive.current) setFailed(true); }
      finally { if (alive.current) setBusy(false); }
    };
    React.useEffect(() => {
      alive.current = true;
      refresh();
      return () => { alive.current = false; };
    }, [props.refreshAccount, signedIn]);
    const icon = (component) => h(component, { size: 18, 'aria-hidden': true });
    const chevron = () => h(ui.IconChevronRightOutlineRegular, { size: 14, className: 'smooth-account-chevron', 'aria-hidden': true });
    const wallets = accountWallets(balance?.status === 'ready' ? balance.value : [], { twoDecimals: true });
    const bonus = accountWallets(balance?.status === 'ready' ? balance.bonusWallets : [], { hideZero: true });
    const walletRow = (label, values) => h('div', { className: 'smooth-account-wallet' },
      h('span', null, label), h('span', null, values.length ? values.map((wallet, index) => h('span', { key: `${wallet.currency}/${index}`, className: 'smooth-account-amount' }, wallet.amount)) : '—'));
    return h('div', { className: 'smooth-account-extras', ref: root },
      h('div', { className: 'smooth-account-profile', role: 'presentation' },
        h('span', { className: 'smooth-account-avatar' }, profile?.avatarUrl && profile.avatarUrl !== failedAvatar
          ? h('img', { src: profile.avatarUrl, alt: '', referrerPolicy: 'no-referrer', onError: () => setFailedAvatar(profile.avatarUrl) })
          : icon(ui.IconUserOutlineMedium)),
        h('div', { className: 'smooth-account-identity' },
          h('strong', null, profile?.name || profile?.contact || props.t(signedIn ? 'signedIn' : 'signedOut')),
          h('span', null, props.t(signedIn ? 'signedIn' : 'signedOut')))),
      h('button', { type: 'button', role: 'menuitem', className: 'smooth-account-usage', disabled: !signedIn, inert: help, 'aria-hidden': help, 'aria-expanded': signedIn && expanded, 'aria-controls': signedIn ? balanceId : undefined,
        onClick: () => { setExpanded((value) => !value); if (!expanded) refresh(); } },
        accountGlyph('usage'), h('span', null, text('account.usage', '剩余用量')), chevron()),
      // Keep the panel mounted so a closing transition can finish and rapid
      // toggles reverse smoothly. Hidden content cannot receive keyboard focus.
      signedIn && h('div', { className: 'smooth-account-balance', id: balanceId, role: 'region', 'aria-label': text('account.balance', '账户余额'), 'data-expanded': expanded && !help, 'aria-hidden': !expanded || help, inert: !expanded || help },
        h('div', { className: 'smooth-account-balance-clip' }, h('div', { className: 'smooth-account-balance-inner' },
          h('div', { className: 'smooth-account-balance-title' },
            h('strong', null, text('account.balance', '账户余额')),
            h('button', { type: 'button', className: 'smooth-account-refresh', disabled: busy || !expanded, 'aria-label': text('account.refresh', '刷新余额'), onClick: refresh }, icon(ui.IconRefreshOutlineRegular))),
          h('div', { role: 'status', 'aria-live': 'polite' },
            balance?.status === 'ready' ? h(React.Fragment, null,
              walletRow(props.t('balance'), wallets), bonus.length > 0 && walletRow(props.t('bonusBalance'), bonus),
              wallets.length === 0 && bonus.length === 0 && h('p', null, text('account.empty', '暂无可用余额')))
              : h('p', null, !busy && (failed || balance !== undefined || account.failed) ? text('account.failed', '余额读取失败，请点击刷新重试') : text('account.loading', '正在读取余额…')),
            balance?.status === 'ready' && failed && h('p', null, text('account.refreshFailed', '刷新失败，当前显示上次读取的余额')))))),
      h('button', { type: 'button', role: 'menuitem', className: 'smooth-account-help', ref: helpButton, inert: help, 'aria-hidden': help, 'aria-expanded': help, 'aria-controls': helpId,
        onClick: () => { setExpanded(false); setHelp(true); } },
        accountGlyph('help'), h('span', null, text('account.help', '帮助')), chevron()),
      h('div', { className: 'smooth-account-help-page', id: helpId, role: 'group', 'aria-label': text('account.help', '帮助'), 'data-active': help, 'aria-hidden': !help, inert: !help },
        h('button', { type: 'button', role: 'menuitem', ref: backButton, className: 'smooth-account-help-back', onClick: () => setHelp(false) },
          icon(ui.IconChevronLeftOutlineRegular), h('span', null, text('account.back', '返回'))),
        ...ACCOUNT_HELP_LINKS.map(([key, fallback, url]) => h('button', { key, type: 'button', role: 'menuitem', className: 'smooth-account-help-link',
          onClick: () => window.open(url, '_blank', 'noopener,noreferrer') }, h('span', null, text(key, fallback)),
          h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true }, h('path', { d: 'M7 17 17 7M7 7h10v10' }))))));
  };
}

/** The host unmounts the menu in the same commit that closes it, so a closing animation
 * needs its own copy: strip the entrance state from a clone and let the closing keyframes
 * run on that copy while the real menu is removed underneath it. The clone must not carry
 * the marker the observer looks for, so it is tagged `data-smooth-account-leave` instead
 * and the menu query skips it. A menu that is already a leaving copy returns undefined. */
function cloneClosingAccountMenu(menu) {
  if (!menu || menu.hasAttribute('data-smooth-account-leave')) return undefined;
  const clone = menu.cloneNode(true);
  clone.removeAttribute('data-smooth-account-open');
  clone.setAttribute('data-smooth-account-leave', '');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('inert', '');
  clone.style.pointerEvents = 'none';
  for (const node of clone.querySelectorAll('[id]')) node.removeAttribute('id');
  return clone;
}

/** Extend the native launcher with portals; retain its authentication dialogs,
 * sign-out confirmation, menu keyboard handling and action closures unchanged. */
function installAccountMenu({ slots, text }) {
  const { createPortal } = require('react-dom');
  const ui = require('@deepseek-ai/dsh-client-ui-primitives');
  const Extras = createAccountExtras(ui, text);
  return slots.inject('settings.launcher', () => {
    let original;
    let unregister;
    const update = () => {
      const next = slots.entries('settings.launcher').find((entry) => entry.registrant !== PLUGIN_ID && entry.locale === 'settings.account');
      if (next === original) return;
      unregister?.(); original = next;
      if (!original) return;
      const native = original;
      function Launcher(props) {
        const root = React.useRef(null);
        const [target, setTarget] = React.useState(null);
        React.useEffect(() => {
          let marked;
          let leaving;
          const onKey = (event) => { if (marked) navigateAccountMenu(event, marked); };
          const clearLeaving = () => { if (leaving) { leaving.remove(); leaving = undefined; } };
          const observe = () => {
            const open = root.current?.querySelector('button[data-signed-out][aria-expanded="true"]');
            const menu = open ? document.querySelector('body > [role="menu"]:not([data-smooth-account-leave])') : null;
            if (marked !== menu) {
              marked?.removeAttribute('data-smooth-account-menu');
              marked?.removeEventListener('keydown', onKey, true);
              marked = menu;
              marked?.addEventListener('keydown', onKey, true);
              // A fresh menu replaces any copy still playing the closing animation.
              if (menu) clearLeaving();
            }
            menu?.setAttribute('data-smooth-account-menu', '');
            setTarget(menu?.querySelector(accountPart('viewport')) || null);
          };
          // Close the menu with the same bottom-left motion it opens with. The host removes
          // the real menu immediately, so a clone takes over the closing keyframes; it is
          // appended in the capture phase of the very event that closes the menu, before
          // the host's commit removes the original.
          const leave = () => {
            if (!marked?.isConnected || leaving) return;
            if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const clone = cloneClosingAccountMenu(marked);
            if (!clone) return;
            document.body.append(clone);
            leaving = clone;
            const done = () => { if (leaving === clone) clearLeaving(); };
            clone.addEventListener('animationend', done, { once: true });
            setTimeout(done, 260);
          };
          const onPointerDown = (event) => {
            if (marked && !marked.contains(event.target)) leave();
          };
          const onClick = (event) => {
            const item = event.target instanceof Element ? event.target.closest('button[role="menuitem"]') : null;
            if (item && marked?.contains(item) && !item.closest('.smooth-account-extras')) leave();
          };
          const onKeyDown = (event) => { if (event.key === 'Escape') leave(); };
          const onBlur = () => leave();
          observe();
          // This one needs `aria-expanded` as well, so it keeps its own observer; the
          // callback is coalesced to one pass per frame, which is what keeps the mount
          // storm from turning into one document lookup per commit.
          const observer = new MutationObserver(coalesceFrame(observe));
          observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
          document.addEventListener('pointerdown', onPointerDown, true);
          document.addEventListener('click', onClick, true);
          document.addEventListener('keydown', onKeyDown, true);
          window.addEventListener('blur', onBlur);
          return () => {
            observer.disconnect();
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('click', onClick, true);
            document.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('blur', onBlur);
            marked?.removeEventListener('keydown', onKey, true);
            marked?.removeAttribute('data-smooth-account-menu');
            clearLeaving();
          };
        }, []);
        return h('div', { className: 'smooth-account-launcher', ref: root },
          h(native.component, props), target && createPortal(h(Extras, props), target));
      }
      unregister = slots.register({ name: 'settings.launcher', priority: (native.options.priority || 0) - 10,
        registrant: PLUGIN_ID, locale: native.locale, inject: native.inject, store: native.store }, Launcher);
    };
    update();
    const unsubscribe = slots.subscribe?.('settings.launcher', update);
    return () => { unsubscribe?.(); unregister?.(); };
  });
}

/** The installed root/settings registrations publish shared store instances.
 * Navigation uses native actions; tabs never retain, delete or rename sessions. */
function sharedSurfaceStore(slots, name, action) {
  if (typeof slots?.entries !== 'function') return undefined;
  for (const entry of slots.entries(name)) {
    const store = entry.store?.create?.();
    if (typeof store?.actions?.[action] === 'function') return store;
  }
}

/** The workspace browser publishes its persisted viewing store on the
 * `sidebar.workspaces` entry: `archivedFilter` is `default` (running sessions),
 * `show` (both) or `only` (archived sessions). The hover filter reads that same
 * store, so the quick switch and the host's own view-options menu never disagree.
 * It is resolved per render rather than cached: a replaced region must hand the
 * filter the new handle, not a stale one. */
function workspaceFilterStore(slots) {
  return sharedSurfaceStore(slots, 'sidebar.workspaces', 'setArchivedFilter');
}

/** The browser's section header, the row that carries the region's 工作区 title.
 * Scoped to the sidebar so the same class suffix in another surface is ignored. */
function workspaceHeaderNode() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return undefined;
  return document.querySelector(`[data-slot="sidebar"] ${hostPart('sectionHeader')}`) || undefined;
}

/** The segmented control's height: its centre is matched to the header's. */
const WORKSPACE_FILTER_HEIGHT = 24;

/** Cover the header's title text with the fixed filter. The header sits in the
 * sidebar's normal flow at a stable offset, so it is measured on mount and again on
 * a window resize or a host relayout instead of being polled every frame. */
function placeWorkspaceFilter(node) {
  if (!node || !node.style) return false;
  const header = workspaceHeaderNode();
  const rect = header && header.getBoundingClientRect?.();
  if (!rect) return false;
  const label = header.querySelector?.(hostPart('sectionLabel'));
  const labelRect = label && label.getBoundingClientRect?.();
  const left = labelRect ? labelRect.left - 2 : rect.left + 2;
  node.style.left = `${Math.round(left)}px`;
  node.style.top = `${Math.round(rect.top + (rect.height - WORKSPACE_FILTER_HEIGHT) / 2)}px`;
  return true;
}

/** The sidebar width the skin opens with. This is the 352px layout the user
 * resized to and asked to keep: deriving 28.5vw on every enable overwrote that
 * choice whenever the window width changed. The bounds still guard the native
 * 264-420px clamp and the skin's 320-560px rail window. */
const DEFAULT_SIDEBAR_WIDTH = 352;

/** The host lets a conversation body be widened by dragging a side handle and keeps that
 * preference in localStorage (`dsh.conversation.contentWidth`). The skin saves the width
 * the user is running with as its own default (`dsh.smooth.conversationWidth`): every drag
 * is remembered, and the value is written back to the host at activation so a reload or a
 * cleared host preference still opens at that width instead of the computed fallback. */
const CONVERSATION_WIDTH_KEY = 'dsh.smooth.conversationWidth';
const HOST_CONVERSATION_WIDTH_KEY = 'dsh.conversation.contentWidth';

function storedConversationWidth(key) {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

/** The width the conversation body is showing right now: the host's published variable
 * first, then the content width it computed for the column. */
function measuredConversationWidth() {
  try {
    for (const node of document.querySelectorAll?.('[style*="--dsh-chat-user-width"]') || []) {
      const value = Number.parseFloat(node.style.getPropertyValue('--dsh-chat-user-width'));
      if (Number.isFinite(value) && value > 0) return value;
    }
    const body = document.querySelector?.('[data-conversation-scroll]')?.parentElement;
    if (body) {
      const value = Number.parseFloat(getComputedStyle(body).getPropertyValue('--dsh-chat-content-width'));
      if (Number.isFinite(value) && value > 0) return value;
    }
  } catch { /* measurement unavailable in this environment */ }
  return undefined;
}

function applyConversationWidth() {
  const explicit = storedConversationWidth(HOST_CONVERSATION_WIDTH_KEY);
  const saved = storedConversationWidth(CONVERSATION_WIDTH_KEY);
  // A dragged width wins and becomes the default; with nothing stored yet, the width the
  // body is showing is adopted so the current layout is what later loads open with.
  let target = saved;
  if (explicit !== undefined && explicit !== saved) target = explicit;
  else if (saved === undefined) target = measuredConversationWidth();
  if (target === undefined) return;
  try {
    localStorage.setItem(CONVERSATION_WIDTH_KEY, `${target}`);
    localStorage.setItem(HOST_CONVERSATION_WIDTH_KEY, `${target}`);
  } catch { /* storage unavailable */ }
  const nodes = document.querySelectorAll?.('[style*="--dsh-chat-user-width"]') || [];
  for (const node of nodes) node.style.setProperty('--dsh-chat-user-width', `${target}px`);
  if (nodes.length === 0) {
    // The host has not published the size yet; write it on the element it publishes to
    // (the parent of the conversation body) so the mounted view already uses it.
    const body = document.querySelector?.('[data-conversation-scroll]')?.parentElement;
    body?.parentElement?.style.setProperty('--dsh-chat-user-width', `${target}px`);
  }
}

function currentWorkspaceTab(snapshot, panel, settingsOpen, panelTitle, text) {
  if (settingsOpen) return { key: 'settings', kind: 'settings', title: text('shell.settings', '设置') };
  if (panel) return { key: `panel:${panel}`, kind: 'panel', id: panel, title: panelTitle || (panel === 'plugins' ? text('shell.plugins', '插件') : panel) };
  const byId = snapshot?.byId || {};
  const currentId = snapshot?.current || Object.keys(byId).find((id) => byId[id]?.retainedBy?.mainView > 0);
  const current = byId[currentId];
  return currentId && current
    ? { key: `session:${currentId}`, kind: 'session', id: currentId, blank: !!current.blank, title: current.blank ? text('shell.new', '新会话') : current.title || text('shell.untitled', '未命名会话') }
    : { key: 'home', kind: 'home', title: text('shell.home', '首页') };
}

/** A conversation created right now owns a permanent tab from the moment it opens; the
 * replaceable preview slot is kept for sessions merely opened from the tree. */
function isCreatedSession(view) {
  return view?.kind === 'session' && view.blank === true;
}

/** UI-only ledger: one replaceable preview and an ordered list of operated tabs.
 * New tabs open at the front of the strip: the preview owns the leading slot while it
 * exists, and pinning it keeps it there. Closing an entry only changes this ledger;
 * session lifetime belongs to DSH. Archived Sessions cannot be opened again, so a tab
 * standing for one is dropped as soon as the host archives it. */
function createWorkspaceTabs() {
  let state = { pinned: [], preview: null, activeKey: null };
  let archived = new Set();
  const listeners = new Set();
  const publish = (next) => { state = next; for (const listener of listeners) listener(); };
  const items = () => [...(state.preview ? [state.preview] : []), ...state.pinned];
  const isArchived = (tab) => tab?.kind === 'session' && archived.has(tab.id);
  return {
    getSnapshot: () => state,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    isArchived,
    /** Adopt the host's archived Session ids and drop the tabs they cover. The host
     * clears the main view when the current Session is archived, so a removed active
     * tab leaves nothing current behind: the strip simply has no selected tab. */
    setArchived(ids) {
      const next = new Set(ids || []);
      if (next.size === archived.size && [...next].every((id) => archived.has(id))) return;
      archived = next;
      const pinned = state.pinned.filter((tab) => !isArchived(tab));
      const preview = isArchived(state.preview) ? null : state.preview;
      const active = state.preview?.key === state.activeKey
        ? state.preview
        : state.pinned.find((tab) => tab.key === state.activeKey);
      const activeKey = active && isArchived(active) ? null : state.activeKey;
      if (pinned.length === state.pinned.length && preview === state.preview && activeKey === state.activeKey) return;
      publish({ pinned, preview, activeKey });
    },
    show(tab) {
      if (!tab || isArchived(tab)) return;
      const existing = state.pinned.find(item => item.key === tab.key);
      if (state.activeKey === tab.key && (existing || state.preview)?.title === tab.title) return;
      publish({ activeKey: tab.key,
        pinned: existing ? state.pinned.map(item => item.key === tab.key ? tab : item) : state.pinned,
        preview: existing ? state.preview : tab });
    },
    pin(tab) {
      if (!tab || isArchived(tab)) return;
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

function installReferenceShell({ slots, layout, uiWorkspace, sessions, modelDirectories, theme, remote, useSmoothState, text }) {
  if (!slots || !layout || !uiWorkspace) return { dispose() {} };
  const ui = require('@deepseek-ai/dsh-client-ui-primitives');
  const layoutStore = sharedSurfaceStore(slots, 'root', 'setSidebar');
  const settingsStore = sharedSurfaceStore(slots, 'sidebar.settings', 'open');
  let previousWidth;
  let appliedWidth;
  let active = false;
  const workspaceTabs = createWorkspaceTabs();
  let currentView;
  let headingDispose;
  let composerDispose;
  let accountDispose;
  let usageDispose;
  let placeWorkspaceFilterNode;
  const disposers = [];
  /* One pending "delete this archived conversation" confirmation. The row action only
   * raises the request; the dialog in `shell.overlay` owns the irreversible call so the
   * list row itself never becomes a destructive click target. */
  let deleteTarget;
  const deleteListeners = new Set();
  const setDeleteTarget = (next) => { deleteTarget = next; for (const listener of deleteListeners) listener(); };
  const subscribeDeleteTarget = (listener) => { deleteListeners.add(listener); return () => deleteListeners.delete(listener); };
  // The home view is the page itself, not a tab, so it never becomes a pin target.
  // A conversation opened from the tree pins on any real interaction; a newly created
  // one only pins when a message is actually sent (see recordSend below).
  const recordOperation = (event) => { if (active && currentView && !isCreatedSession(currentView) && !workspaceTabs.isArchived(currentView) && isWorkspaceOperation(event)) workspaceTabs.pin(currentView); };
  for (const type of ['input', 'change', 'click']) {
    document.addEventListener(type, recordOperation, true);
    disposers.push(() => document.removeEventListener(type, recordOperation, true));
  }
  const recordSend = (event) => {
    if (!active || !isCreatedSession(currentView)) return;
    const target = event.target;
    if (!target?.closest || !target.closest('[data-composer-card]')) return;
    const sent = event.type === 'keydown'
      ? event.key === 'Enter' && !event.shiftKey && !event.isComposing
        && String(target.textContent || '').trim() !== ''
        && !!target.closest('[data-composer-input]')
      : !!target.closest(`${hostPart('primary')}`);
    if (sent && !workspaceTabs.isArchived(currentView)) workspaceTabs.pin(currentView);
  };
  for (const type of ['click', 'keydown']) {
    document.addEventListener(type, recordSend, true);
    disposers.push(() => document.removeEventListener(type, recordSend, true));
  }
  const setLeftWidth = () => {
    const info = layoutStore?.getSnapshot().layoutInfo;
    if (info) document.body.style.setProperty('--smooth-left-width', `${info.sidebar || 0}px`);
  };
  // The host's toggle collapses to 0 and reopens at its own 280px, which silently replaces
  // the width this skin (or the user) had set before collapsing. Remember the last wide
  // width and restore it when that exact 0 -> 280 hop happens; a real drag to 280 is kept.
  let lastWideSidebar;
  let sidebarWidth;
  let restoringSidebar = false;
  const syncSidebarWidth = () => {
    if (!layoutStore) return;
    let width = layoutStore.getSnapshot().layoutInfo.sidebar || 0;
    if (active && sidebarWidth === 0 && width === 280
      && lastWideSidebar !== undefined && lastWideSidebar !== 280 && !restoringSidebar) {
      restoringSidebar = true;
      try { layoutStore.actions.setSidebar(lastWideSidebar); } finally { restoringSidebar = false; }
      width = layoutStore.getSnapshot().layoutInfo.sidebar || 0;
    }
    if (!restoringSidebar && width > 0) lastWideSidebar = width;
    sidebarWidth = width;
    setLeftWidth();
    scheduleCaptionLeading();
  };
  // A collapsed sidebar puts the native "应用 / 编辑" caption menu beside the toggle and
  // the new-conversation button. Its width follows the locale and font, so the tab strip
  // is told where the menu actually ends instead of guessing a pixel offset.
  let captionFrame = 0;
  let captionMenu;
  const captionResize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => scheduleCaptionLeading()) : undefined;
  const syncCaptionLeading = () => {
    captionFrame = 0;
    if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;
    const menu = document.querySelector('[data-windows-menu]');
    if (captionResize && menu !== captionMenu) {
      captionResize.disconnect();
      if (menu) captionResize.observe(menu);
      captionMenu = menu;
    }
    const collapsed = active && !!document.querySelector('[data-sidebar-collapsed]');
    const rect = collapsed && menu ? menu.getBoundingClientRect?.() : undefined;
    const right = rect && rect.width > 0 ? Math.round(rect.right + 8) : 0;
    if (right > 0) document.body.style.setProperty('--smooth-caption-leading', `${right}px`);
    else document.body.style.removeProperty('--smooth-caption-leading');
    // The same relayout that moves the caption moves the sidebar's section header; the
    // hover filter is fixed over that header and follows it without its own listener.
    placeWorkspaceFilterNode?.();
  };
  const scheduleCaptionLeading = () => {
    if (captionFrame) return;
    if (typeof requestAnimationFrame === 'function') captionFrame = requestAnimationFrame(syncCaptionLeading);
    else syncCaptionLeading();
  };
  window.addEventListener?.('resize', scheduleCaptionLeading);
  const menuObserver = typeof MutationObserver === 'function' ? new MutationObserver(scheduleCaptionLeading) : undefined;
  if (menuObserver && document.body) menuObserver.observe(document.body, { childList: true });
  document.fonts?.ready?.then?.(scheduleCaptionLeading);
  // The hover filter's column trigger cannot see the icon rail: the rail's top button is
  // portalled into the shell overlay, outside the sidebar column, so the pointer can rest
  // on the rail without the column ever being hovered. Publish that presence as a body
  // attribute, measured from the button itself (its inset is symmetric, so left + right
  // is the rail's full width). The stylesheet treats it exactly like the column hover.
  let railEdge = 0;
  const measureRail = () => {
    const home = document.querySelector?.('.smooth-rail-home');
    const rect = home?.getBoundingClientRect?.();
    railEdge = rect && rect.width > 0 ? rect.left + rect.right : 0;
  };
  const clearRail = () => document.body?.removeAttribute('data-smooth-rail-hover');
  const trackRail = event => {
    if (!active) { clearRail(); return; }
    if (!railEdge) measureRail();
    document.body?.toggleAttribute('data-smooth-rail-hover', railEdge > 0 && event.clientX <= railEdge);
  };
  window.addEventListener?.('pointermove', trackRail, { passive: true });
  window.addEventListener?.('blur', clearRail);
  document.addEventListener?.('pointerleave', clearRail);
  disposers.push(() => {
    window.removeEventListener?.('pointermove', trackRail);
    window.removeEventListener?.('blur', clearRail);
    document.removeEventListener?.('pointerleave', clearRail);
    clearRail();
  });
  disposers.push(() => {
    window.removeEventListener?.('resize', scheduleCaptionLeading);
    menuObserver?.disconnect();
    captionResize?.disconnect();
    if (captionFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(captionFrame);
    document.body?.style.removeProperty('--smooth-caption-leading');
  });
  function setEnabled(enabled) {
    if (enabled === active) return;
    active = enabled;
    if (!enabled) clearRail();
    // The conversation column opens at the plugin default: the last width the user used.
    if (enabled) applyConversationWidth();
    if (enabled) {
      composerDispose = installComposerLayout({ slots, modelDirectories, remote, useSmoothState, text });
      accountDispose = installAccountMenu({ slots, text });
      usageDispose = installUsage({ slots, useSmoothState, text });
    } else {
      composerDispose?.(); composerDispose = undefined;
      accountDispose?.(); accountDispose = undefined;
      usageDispose?.(); usageDispose = undefined;
    }
    if (enabled) {
      // The theme presets live in the skin's own settings page; the host's General page
      // only gets the heading, so no second day/night control appears there.
      headingDispose = slots.inject('settings.general.item', () => slots.register({ name: 'settings.general.item', id: `${PLUGIN_ID}.heading`, order: -100 }, () => h('h1', { className: 'smooth-general-title' }, text('shell.general', '通用设置'))));
    } else {
      headingDispose?.();
      headingDispose = undefined;
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
    syncSidebarWidth();
  }
  if (layoutStore) {
    disposers.push(layoutStore.subscribe(syncSidebarWidth));
    syncSidebarWidth();
  }
  /* The strip's settings tab stands for the settings page the user leaves, not for the
   * module's General landing page. The host clears its active section when the dialog
   * closes, so remember the section actually on screen from the store's own snapshots:
   * a freshly opened dialog without an activeId is showing the first registered section. */
  let lastSettingsSection;
  const firstSettingsSection = () => {
    let first;
    for (const entry of slots.entries?.('settings.section') || []) {
      const id = entry.options?.id;
      if (!id) continue;
      const order = entry.options?.order ?? 0;
      if (!first || order < first.order) first = { id, order };
    }
    return first?.id;
  };
  if (settingsStore) {
    const rememberSettingsSection = () => {
      const snapshot = settingsStore.getSnapshot();
      if (!snapshot?.open) return;
      lastSettingsSection = snapshot.activeId || firstSettingsSection() || lastSettingsSection;
    };
    rememberSettingsSection();
    disposers.push(settingsStore.subscribe(rememberSettingsSection));
  }
  function closeSettings() { settingsStore?.actions.close(); }
  /* The settings page fills the workspace, so the rail beside it is live navigation.
   * The host's panel buttons sit behind the modal overlay; the stylesheet lets pointer
   * events through, and a rail click must close the settings store first or the page
   * it selects stays hidden behind the settings surface. The skin's home / plugins
   * buttons close in their own handlers, and the account menu opens above the overlay,
   * so neither is intercepted here. */
  const railSelection = `${hostPart('panelList')} button, ${hostPart('panelRow')}, ${hostPart('newSession')}`;
  const closeSettingsFromRail = (event) => {
    if (!settingsStore?.getSnapshot?.()?.open) return;
    if (!event.target?.closest?.(railSelection)) return;
    closeSettings();
  };
  document.addEventListener('click', closeSettingsFromRail, true);
  disposers.push(() => document.removeEventListener('click', closeSettingsFromRail, true));
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
    // Restore the settings page the user left; General is only the landing page for a
    // dialog that was never navigated past it.
    if (settingsStore?.actions.openSection) settingsStore.actions.openSection(lastSettingsSection || 'general');
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
  /* Hovering the left column layers a two-state archive filter over the browser's
   * 工作区 title. The host keeps the list state (`archivedFilter`) in its workspace
   * view store; the buttons only publish that choice, so the quick switch and the
   * native view-options menu stay one filter. The control is fixed over the measured
   * header instead of inside the host tree: the host may re-render or remount the
   * region, while the overlay keeps its own React state and pointer events. */
  function WorkspaceFilter() {
    const node = React.useRef(null);
    const store = workspaceFilterStore(slots);
    const filter = React.useSyncExternalStore(
      store?.subscribe || (() => () => {}),
      store ? () => store.getSnapshot().archivedFilter || 'default' : () => 'default',
    );
    React.useEffect(() => {
      if (!store) return undefined;
      let frame = 0;
      let tries = 0;
      const place = () => {
        if (placeWorkspaceFilter(node.current)) return;
        // The region may mount a frame after the chrome; retry briefly instead of
        // listening for it. The caption relayout hook below covers later moves.
        if (tries++ < 40) frame = window.requestAnimationFrame?.(place);
      };
      // Re-measure on every caption/sidebar relayout: expanding the sidebar or resizing
      // the window moves the header, and the fixed control has to move with it.
      placeWorkspaceFilterNode = place;
      place();
      return () => {
        if (frame && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(frame);
        if (placeWorkspaceFilterNode === place) placeWorkspaceFilterNode = undefined;
      };
    }, [store]);
    if (!store) return null;
    const archived = filter === 'only';
    const pick = (only) => (event) => {
      // A pointer click focuses the option. Release that focus: the control is a
      // transient overlay, and a focused button would keep Space/Enter bound to a
      // switch that has already faded out with the pointer.
      if (event?.detail > 0) event.currentTarget?.blur?.();
      const next = only ? 'only' : 'default';
      if ((store.getSnapshot().archivedFilter || 'default') === next) return;
      store.actions.setArchivedFilter(next);
    };
    return h('div', {
      ref: node,
      className: 'smooth-workspace-filter',
      role: 'group',
      'aria-label': text('shell.workspaceFilter', '工作区筛选'),
      'data-smooth-workspace-filter': '',
    },
    h('button', { type: 'button', className: 'smooth-filter-option', 'data-selected': !archived, 'aria-pressed': !archived, onClick: pick(false) }, text('shell.inProgress', '进行中')),
    h('button', { type: 'button', className: 'smooth-filter-option', 'data-selected': archived, 'aria-pressed': archived, onClick: pick(true) }, text('shell.archived', '已归档')));
  }
  /* The archived list's trailing delete button. The host's row action area is a list
   * slot (archive 100, pin 200), so this entry rides the same layout and appears after
   * the host's buttons for archived rows only. Clicking it only raises the confirmation
   * request; the dialog below performs the deletion. */
  function DeleteArchivedSessionButton(props) {
    const skin = useSmoothState();
    const archived = props.useWorkspaces((state) => !!state?.archivedSessionIds?.includes(props.sessionId));
    if (!skin.state.enabled || !archived) return null;
    const label = text('shell.deleteSession', '删除归档对话');
    return h(ui.Tooltip, { label, side: 'bottom', align: 'end', delayMs: 500, portal: true },
      h('button', {
        type: 'button',
        className: 'smooth-session-delete',
        'aria-label': `${label}：${props.displayTitle || props.sessionId}`,
        onClick: (event) => {
          event.stopPropagation();
          setDeleteTarget({ sessionId: props.sessionId, title: props.displayTitle });
        },
      }, h(ui.IconTrashOutlineRegular, { size: 14 })));
  }
  /* The irreversible step lives in one dialog and only runs after a second click. The
   * Host half removes the Session's stored log; the session catalog is then re-pulled so
   * the archived row leaves the tree without a page reload. */
  function SessionDeleteConfirm() {
    const skin = useSmoothState();
    const target = React.useSyncExternalStore(subscribeDeleteTarget, () => deleteTarget);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState('');
    if (!skin.state.enabled || !target) return null;
    const close = () => { if (!busy) setDeleteTarget(undefined); };
    const remove = () => {
      if (busy) return;
      setBusy(true);
      setError('');
      bridgeRequest('session-delete', { sessionId: target.sessionId }).then(async () => {
        setDeleteTarget(undefined);
        // The Host's list baseline reconciles the query index against the persistence
        // root; re-reading it is what drops the deleted row from the workspace tree.
        await sessions?.refresh?.();
      }).catch((reason) => {
        setError(reason instanceof Error && reason.message ? reason.message : String(reason));
      }).finally(() => { setBusy(false); });
    };
    return h(ui.Modal, {
      open: true,
      onClose: close,
      closeLabel: text('shell.close', '关闭'),
      title: text('shell.deleteSessionTitle', '删除归档对话'),
      description: text('shell.deleteSessionDesc', '将永久删除「%s」的本地会话记录，无法恢复。').replace('%s', target.title || target.sessionId),
      footer: h(React.Fragment, null,
        h(ui.Button, { variant: 'outline', disabled: busy, onClick: close }, text('composer.cancel', '取消')),
        h(ui.Button, { variant: 'outline', disabled: busy, onClick: remove }, text('shell.deleteSessionConfirm', '删除'))),
    },
    busy ? h('div', { role: 'status' }, text('shell.deleteSessionPending', '正在删除…')) : null,
    error ? h('div', { role: 'alert', className: 'smooth-session-delete-error' }, error) : null);
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
    // The host publishes the archived Session ids on the workspace snapshot; their tabs
    // are dead entries because an archived conversation cannot be opened again.
    const archivedSessionIds = props.useWorkspaces((value) => value && value.archivedSessionIds);
    const archivedSignature = (archivedSessionIds || []).join('\n');
    const ownsSurface = skin.state.enabled && !!props.inSettings === settingsOpen;
    React.useEffect(() => {
      if (!ownsSurface) return;
      // Adopt the archive set before showing the current view, so a Session the host
      // just archived is never re-added by the same render.
      workspaceTabs.setArchived(archivedSessionIds);
      currentView = view.kind === 'home' ? undefined : view;
      if (currentView) workspaceTabs.show(view);
      // Adopt the width of the view that just mounted (once), then keep applying it.
      applyConversationWidth();
    }, [ownsSurface, view.key, view.title, archivedSignature]);
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
      ),
      h(WorkspaceFilter));
  }
  disposers.push(slots.inject('shell.overlay', () => slots.register({ name: 'shell.overlay', id: `${PLUGIN_ID}.chrome`, order: 10 }, Chrome)));
  // The archived row's trailing delete button (after the host's archive/pin entries)
  // and the confirmation dialog that owns the irreversible call.
  disposers.push(slots.inject('sidebar.workspaces.session.row.action', () => slots.register({ name: 'sidebar.workspaces.session.row.action', id: `${PLUGIN_ID}.delete`, order: 300 }, DeleteArchivedSessionButton)));
  disposers.push(slots.inject('shell.overlay', () => slots.register({ name: 'shell.overlay', id: `${PLUGIN_ID}.session-delete`, order: 30 }, SessionDeleteConfirm)));
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

/** Animate only the scroller that moved. The native gutter stays 8px wide,
 * so changing thumb thickness cannot reflow the page or move the drag target. */
function installScrollbarMotion() {
  const property = '--smooth-scrollbar-inset';
  const scrollers = new Map();
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let enabled = false;
  let hovered;

  function stateFor(element) {
    let state = scrollers.get(element);
    if (!state) {
      state = { element, original: element.style.getPropertyValue(property), priority: element.style.getPropertyPriority(property), scrolling: false };
      scrollers.set(element, state);
    }
    return state;
  }

  function restore(state) {
    window.clearTimeout(state.timer);
    state.animation?.cancel();
    if (state.original) state.element.style.setProperty(property, state.original, state.priority);
    else state.element.style.removeProperty(property);
    scrollers.delete(state.element);
    if (hovered === state) hovered = undefined;
  }

  function transition(state, value, duration, complete) {
    // Read the current animated value before cancelling, allowing an immediate
    // reversal if scrolling resumes while the thumb is becoming thin.
    const current = window.getComputedStyle(state.element).getPropertyValue(property).trim() || '3px';
    state.animation?.cancel();
    state.animation = undefined;
    state.element.style.setProperty(property, value);
    if (reducedMotion?.matches || !state.element.animate || current === value) { complete?.(); return; }
    try {
      const animation = state.element.animate([{ [property]: current }, { [property]: value }], {
        duration, easing: 'cubic-bezier(.2,0,0,1)',
      });
      state.animation = animation;
      animation.onfinish = () => {
        if (state.animation !== animation) return;
        state.animation = undefined;
        complete?.();
      };
    } catch {
      // Keep usable native scrollbars on engines without custom-property animation.
      complete?.();
    }
  }

  function shrink(state) {
    transition(state, '3px', 280, () => restore(state));
  }

  function hover(element) {
    if (hovered?.element === element) return;
    const previous = hovered;
    hovered = element ? stateFor(element) : undefined;
    if (previous && !previous.scrolling) shrink(previous);
    if (hovered && !hovered.scrolling) transition(hovered, '1px', 160);
  }

  function onPointerMove(event) {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    // Native scrollbar parts are not DOM nodes. Locate their fixed gutter in
    // the event path; never activate merely because the content is hovered.
    for (const element of event.composedPath()) {
      if (!element?.style || !element.getBoundingClientRect || !element.offsetWidth || !element.offsetHeight) continue;
      const vertical = element.scrollHeight > element.clientHeight;
      const horizontal = element.scrollWidth > element.clientWidth;
      if (!vertical && !horizontal) continue;
      const style = window.getComputedStyle(element);
      if (style.scrollbarWidth === 'none') continue;
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) * element.offsetWidth / rect.width;
      const y = (event.clientY - rect.top) * element.offsetHeight / rect.height;
      const left = element.clientLeft;
      const top = element.clientTop;
      const right = left + element.clientWidth;
      const bottom = top + element.clientHeight;
      const verticalGutter = vertical && /^(auto|scroll)$/.test(style.overflowY) && y >= top && y < bottom &&
        (style.direction === 'rtl' ? x >= left - 8 && x < left : x >= right && x < right + 8);
      const horizontalGutter = horizontal && /^(auto|scroll)$/.test(style.overflowX) && x >= left && x < right && y >= bottom && y < bottom + 8;
      if (verticalGutter || horizontalGutter) { hover(element); return; }
    }
    hover(undefined);
  }

  function onPointerOut(event) {
    if (!event.relatedTarget) hover(undefined);
  }

  function onScroll(event) {
    const element = event.target === document || event.target === window ? document.scrollingElement : event.target;
    if (!element?.style) return;
    const state = stateFor(element);
    window.clearTimeout(state.timer);
    if (!state.scrolling) {
      state.scrolling = true;
      if (hovered !== state) transition(state, '1px', 160);
    }
    state.timer = window.setTimeout(() => {
      state.scrolling = false;
      if (hovered !== state) shrink(state);
    }, 650);
  }

  function setEnabled(value) {
    if (enabled === value) return;
    enabled = value;
    if (enabled) {
      document.addEventListener('scroll', onScroll, { capture: true, passive: true });
      document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
      document.addEventListener('pointerout', onPointerOut, { capture: true, passive: true });
    }
    else {
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      for (const state of scrollers.values()) restore(state);
    }
  }
  return { setEnabled, dispose: () => setEnabled(false) };
}

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
.smooth-settings{width:100%;max-width:760px;margin:0 auto;padding:2px 0 36px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6;box-sizing:border-box}
.smooth-settings h2{font-size:17px;font-weight:600;line-height:24px;margin:0;letter-spacing:-.2px}
.smooth-settings h3{font-size:14px;font-weight:500;line-height:21px;margin:0;letter-spacing:0}
.smooth-settings-head{display:flex;flex-direction:column;gap:5px;padding:2px 0 18px}
.smooth-settings-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}
.smooth-settings-subtitle{margin:0;max-width:580px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px}
.smooth-badge{display:inline-flex;align-items:center;gap:5px;height:19px;padding:0 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:500;letter-spacing:.02em}
.smooth-badge::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-label-tertiary,rgba(128,128,128,.6))}
.smooth-badge[data-on="true"]::before{background:var(--dsw-alias-state-success-primary,#4ea36b);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-success-primary,#4ea36b) 24%,transparent)}
/* A recessed track plus a raised pill, so the three pages read as one control even on a
   near-white settings ground: the palette tint alone sat within 1.1:1 of the track. The
   pill keeps the palette's accent in a hairline ring instead of a wash. */
.smooth-tabs{position:relative;isolation:isolate;display:flex;gap:2px;box-sizing:border-box;width:100%;margin:0;padding:3px;border:1px solid var(--smooth-line,var(--dsw-alias-border-l2));border-radius:var(--smooth-radius-md);background:color-mix(in srgb,var(--smooth-text,var(--dsw-alias-label-primary)) 8%,var(--smooth-surface-2,var(--dsw-alias-bg-layer-2)));touch-action:pan-y;user-select:none}
.smooth-tabs-thumb{position:absolute;top:3px;bottom:3px;left:3px;z-index:0;width:calc((100% - 10px) / 3);border-radius:var(--smooth-radius-sm);background:var(--smooth-surface,var(--dsw-alias-bg-layer-1));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--smooth-accent,var(--dsw-alias-brand-primary)) 60%,var(--smooth-surface,var(--dsw-alias-bg-layer-1))),0 1px 2px rgba(0,0,0,.08);transform:translateX(calc(var(--smooth-tab-index, 0) * (100% + 2px)));transition:transform .26s cubic-bezier(.22,1,.36,1);pointer-events:none}
.smooth-tab{position:relative;z-index:1;flex:1 1 0;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:7px;box-sizing:border-box;height:32px;margin:0;padding:0 10px;border:0;border-radius:var(--smooth-radius-sm);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;font-weight:500;line-height:18px;white-space:nowrap;cursor:pointer;transition:background-color .16s ease,color .16s ease}
.smooth-tab:hover:not([aria-selected="true"]){background:color-mix(in srgb,var(--smooth-text,var(--dsw-alias-label-primary)) 6%,transparent);color:var(--dsw-alias-label-primary)}
.smooth-settings .smooth-tabs .smooth-tab[aria-selected="true"]{background:transparent;box-shadow:none;font-weight:600}
body[data-smooth-skin] .smooth-settings .smooth-tabs .smooth-tab[aria-selected="true"]{background:transparent;box-shadow:none;font-weight:600}
.smooth-tab svg{display:block;flex:none;width:15px;height:15px}
.smooth-tab[aria-selected="true"] svg{color:var(--smooth-accent,var(--dsw-alias-brand-primary))}
.smooth-tab:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.smooth-tab:disabled{opacity:.5;cursor:default}
.smooth-pages{margin-top:16px}
.smooth-page{display:flex;flex-direction:column;min-width:0}
.smooth-page[hidden]{display:none}
.smooth-page:not([hidden]){animation:smooth-page-in .18s cubic-bezier(.22,1,.36,1)}
.smooth-page[data-smooth-enter="forward"]:not([hidden]){animation-name:smooth-page-in-forward}
.smooth-page[data-smooth-enter="back"]:not([hidden]){animation-name:smooth-page-in-back}
@keyframes smooth-page-in{0%{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes smooth-page-in-forward{0%{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
@keyframes smooth-page-in-back{0%{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
.smooth-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px;padding:17px 0;border-top:.5px solid var(--dsw-alias-border-l1)}
.smooth-page>.smooth-row:first-child{border-top:0;padding-top:2px}
.smooth-row--appearance{align-items:stretch;flex-direction:column;gap:11px}
.smooth-row--appearance>.smooth-row-copy{padding-right:0}
.smooth-row-copy{min-width:0;flex:1;padding-right:24px}
.smooth-row-action{display:flex;align-items:center;flex:none}
.smooth-button--compact{font-size:12px;line-height:17px;padding:5px 10px;border-radius:var(--smooth-radius-sm);white-space:nowrap}
.smooth-row-copy small{display:block;margin-top:2px;max-width:520px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.smooth-switch{appearance:none;flex:none;width:36px;height:20px;margin:0;padding:0;border:0;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 16%,transparent);position:relative;cursor:pointer;transition:background-color .18s ease}
.smooth-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-bg-overlay,#fff);box-shadow:0 1px 2px rgba(0,0,0,.18);transition:transform .18s ease}
.smooth-switch:checked{background:var(--smooth-accent,var(--dsw-alias-brand-primary))}
.smooth-switch:checked::after{transform:translateX(16px)}
.smooth-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.smooth-switch:disabled{opacity:.5;cursor:default}
.smooth-themes{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;width:100%;flex:none}
.smooth-theme{display:flex;flex-direction:column;align-items:center;gap:8px;padding:11px 4px;border:1px solid var(--smooth-line,var(--dsw-alias-border-l2));border-radius:var(--smooth-radius-md);background:var(--smooth-surface,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:17px;cursor:pointer;transition:background-color .16s ease,border-color .16s ease,color .16s ease}
.smooth-theme:hover:not(:disabled){border-color:var(--smooth-line-strong,var(--dsw-alias-border-l3));background:var(--smooth-hover,var(--dsw-alias-interactive-bg-hover))}
.smooth-theme[aria-checked="true"]{border-color:var(--smooth-accent,var(--dsw-alias-brand-primary));background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16));color:var(--dsw-alias-label-primary);font-weight:600;box-shadow:0 0 0 .5px var(--smooth-accent,var(--dsw-alias-brand-primary))}
.smooth-theme:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.smooth-theme:disabled{opacity:.5;cursor:default}
.smooth-theme-swatch{display:flex;align-items:center;gap:4px}
.smooth-theme-swatch i{display:block;width:13px;height:13px;border-radius:50%;border:1px solid rgba(128,128,128,.28)}
.smooth-marks{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;width:100%;flex:none}
.smooth-mark{display:flex;flex-direction:column;align-items:center;gap:6px;padding:7px 4px;border:1px solid var(--smooth-line,var(--dsw-alias-border-l2));border-radius:var(--smooth-radius-sm);background:var(--smooth-surface,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px;cursor:pointer;font-family:inherit;transition:background-color .16s ease,border-color .16s ease,color .16s ease}
.smooth-mark:hover:not(:disabled){border-color:var(--smooth-line-strong,var(--dsw-alias-border-l3));background:var(--smooth-hover,var(--dsw-alias-interactive-bg-hover))}
.smooth-mark[aria-checked="true"]{border-color:var(--dsw-alias-border-l3);background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16));color:var(--dsw-alias-label-primary);font-weight:600}
.smooth-mark:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.smooth-mark:disabled{opacity:.5;cursor:default}
.smooth-mark i{display:block;width:14px;height:14px;border-radius:50%;border:1px solid rgba(128,128,128,.28)}
.smooth-footer{display:flex;align-items:center;justify-content:space-between;gap:10px 20px;flex-wrap:wrap;margin-top:10px;padding:18px 0 0;border-top:.5px solid var(--dsw-alias-border-l1)}
.smooth-footer-copy{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.smooth-note{font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.smooth-size{display:flex;align-items:center;gap:10px;flex:none;flex-wrap:wrap;justify-content:flex-end}
.smooth-size label{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.smooth-size input{font:inherit;font-size:13px;width:70px;padding:6px 9px;border-radius:var(--smooth-radius-md);border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;text-align:right}
.smooth-size input:focus-visible{outline:2px solid var(--dsw-alias-border-l3);outline-offset:2px}
.smooth-size input:disabled{opacity:.5}
.smooth-size-times{color:var(--dsw-alias-label-secondary);font-size:12.5px}
.smooth-size-meta{display:flex;align-items:center;flex-wrap:wrap;gap:4px 12px;margin-top:7px;font-size:12px;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.smooth-range{display:flex;align-items:center;gap:12px;flex:none;width:min(250px,44vw)}
.smooth-range input[type="range"]{flex:1;min-width:0;height:20px;margin:0;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer;accent-color:var(--dsw-alias-brand-primary,#3f6fd8)}
.smooth-range input[type="range"]::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}
.smooth-range input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;box-sizing:border-box;width:16px;height:16px;margin-top:-6px;border:0;border-radius:50%;background:var(--smooth-accent,var(--dsw-alias-brand-primary,#3f6fd8));box-shadow:0 1px 2px rgba(0,0,0,.18)}
.smooth-range input[type="range"]::-moz-range-track{height:4px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}
.smooth-range input[type="range"]::-moz-range-thumb{box-sizing:border-box;width:16px;height:16px;border:0;border-radius:50%;background:var(--smooth-accent,var(--dsw-alias-brand-primary,#3f6fd8))}
.smooth-range input[type="range"]:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:4px;border-radius:999px}
.smooth-range input[type="range"]:disabled{opacity:.5;cursor:default}
.smooth-range-value{flex:none;min-width:42px;text-align:right;font-size:12.5px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary)}
.smooth-link{font:inherit;font-size:12px;padding:0;border:0;background:none;color:var(--dsw-alias-label-secondary);cursor:pointer;text-decoration:underline;text-underline-offset:2px;text-decoration-color:color-mix(in srgb,currentColor 35%,transparent)}
.smooth-link:hover:not(:disabled){color:var(--dsw-alias-label-primary)}
.smooth-link:disabled{opacity:.45;cursor:default;text-decoration:none}
.smooth-link:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px;border-radius:var(--smooth-radius-xs,4px)}
.smooth-button{font:inherit;font-size:13px;line-height:18px;padding:7px 14px;border-radius:var(--smooth-radius-sm);border:1px solid var(--smooth-line-strong,var(--dsw-alias-border-l3));background:var(--smooth-surface,var(--dsw-alias-bg-layer-1));color:inherit;cursor:pointer;transition:background-color .16s ease,border-color .16s ease}
.smooth-button:hover:not(:disabled){background:var(--smooth-hover,var(--dsw-alias-interactive-bg-hover))}
.smooth-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.smooth-button:disabled{opacity:.5;cursor:default}
.smooth-status{font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.smooth-status[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
/* Settings preview of the composer usage capsule. It mirrors the real button's field
   order and look with host tokens, so it is readable even while the skin itself is off. */
.smooth-usage-settings{display:flex;flex-direction:column;gap:11px;padding:17px 0 6px;border-top:.5px solid var(--dsw-alias-border-l1)}
.smooth-usage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:17px 0;border-top:.5px solid var(--dsw-alias-border-l1)}
.smooth-page>.smooth-usage-head:first-child{border-top:0;padding-top:2px}
.smooth-usage-controls{display:flex;flex-direction:column;align-items:flex-end;gap:9px;flex:none}
.smooth-usage-placement,.smooth-usage-align-options{position:relative;isolation:isolate;display:inline-flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--smooth-line,var(--dsw-alias-border-l2));border-radius:var(--smooth-radius-sm);background:color-mix(in srgb,var(--smooth-text,var(--dsw-alias-label-primary)) 8%,var(--smooth-surface-2,var(--dsw-alias-bg-layer-2)));touch-action:pan-y;user-select:none}
.smooth-segment-thumb{position:absolute;top:2px;bottom:2px;left:var(--smooth-segment-left,2px);z-index:0;width:var(--smooth-segment-width,calc((100% - 8px) / 3));border-radius:var(--smooth-radius-xs);background:var(--smooth-surface,var(--dsw-alias-bg-layer-1));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--smooth-accent,var(--dsw-alias-brand-primary)) 60%,var(--smooth-surface,var(--dsw-alias-bg-layer-1))),0 1px 2px rgba(0,0,0,.08);transition:left .24s cubic-bezier(.22,1,.36,1),width .24s cubic-bezier(.22,1,.36,1);pointer-events:none}
.smooth-usage-placement-button,.smooth-usage-align-button{position:relative;z-index:1;font:inherit;line-height:18px;border:0;border-radius:var(--smooth-radius-xs);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;transition:background-color .16s ease,color .16s ease}
.smooth-usage-placement-button{font-size:12.5px;padding:5px 11px}
.smooth-usage-align-button{font-size:12px;padding:4px 9px}
.smooth-usage-placement-button:hover:not([aria-pressed="true"]),.smooth-usage-align-button:hover:not([aria-pressed="true"]){background:color-mix(in srgb,var(--smooth-text,var(--dsw-alias-label-primary)) 6%,transparent);color:var(--dsw-alias-label-primary)}
.smooth-usage-placement-button[aria-pressed="true"],.smooth-usage-align-button[aria-pressed="true"]{background:transparent;color:var(--smooth-text,var(--dsw-alias-label-primary));font-weight:500}
.smooth-usage-placement-button:focus-visible,.smooth-usage-align-button:focus-visible{outline:2px solid var(--smooth-accent,var(--dsw-alias-brand-primary));outline-offset:2px}
.smooth-usage-placement-button:disabled,.smooth-usage-align-button:disabled{opacity:.5;cursor:default}
/* Dark themes invert the relationship: a near-black pill would sink into the track, so the
   track takes the darkest surface and the pill carries the accent tint instead. */
body[data-ds-dark-theme] .smooth-tabs,body[data-ds-dark-theme] .smooth-usage-placement,body[data-ds-dark-theme] .smooth-usage-align-options{background:var(--smooth-surface,var(--dsw-alias-bg-layer-1))}
body[data-ds-dark-theme] :is(.smooth-tabs-thumb,.smooth-segment-thumb){background:color-mix(in srgb,var(--smooth-accent,var(--dsw-alias-brand-primary)) 26%,var(--smooth-surface,var(--dsw-alias-bg-layer-1)));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--smooth-accent,var(--dsw-alias-brand-primary)) 60%,var(--smooth-surface,var(--dsw-alias-bg-layer-1))),0 1px 2px rgba(0,0,0,.35)}
.smooth-usage-align{display:flex;align-items:center;justify-content:flex-end;gap:9px;margin:0}
.smooth-usage-align-label{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:nowrap}
.smooth-usage-fields-head{display:flex;flex-direction:column;gap:2px}
.smooth-usage-fields-head small{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.smooth-usage-preview{display:flex;flex-direction:column;gap:9px;margin:2px 0 0;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--smooth-radius-md);background:var(--dsw-alias-bg-layer-1,var(--dsw-alias-bg-layer-2,transparent))}
.smooth-usage-preview-caption{font-size:10.5px;line-height:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary))}
.smooth-usage-preview-line{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:16px;padding:3px 10px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12));color:var(--smooth-text,var(--dsw-alias-label-primary));font-size:13px;line-height:20px;font-variant-numeric:tabular-nums}
.smooth-usage-preview-item,.smooth-usage-preview-context{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.smooth-usage-preview-value{font-weight:500}
.smooth-usage-preview-item:first-child .smooth-usage-preview-value{font-weight:600}
.smooth-usage-preview-icon{display:block;flex:none;width:14px;height:14px;color:var(--smooth-muted,var(--dsw-alias-label-secondary))}
.smooth-usage-preview-pie-rest{fill:color-mix(in srgb,var(--smooth-muted,var(--dsw-alias-label-secondary)) 42%,transparent)}
.smooth-usage-preview-pie-used{fill:var(--smooth-accent,var(--dsw-alias-brand-primary))}
.smooth-usage-preview-context-row{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:16px;min-height:32px;color:var(--smooth-text,var(--dsw-alias-label-primary));font-size:13px;line-height:20px;font-variant-numeric:tabular-nums}
.smooth-usage-preview-context-seat{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.smooth-usage-preview-model{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:13px}
.smooth-usage-preview-model-badge{font-size:11px;line-height:16px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-1,transparent);color:var(--dsw-alias-label-primary)}
.smooth-usage-preview-empty{padding:4px 0;color:var(--dsw-alias-label-secondary);font-size:13px}
.smooth-usage-editor{display:flex;align-items:flex-start;justify-content:center;gap:14px;min-width:0;padding:2px 0;overflow-x:auto}
.smooth-usage-field{display:flex;flex:0 0 auto;flex-direction:column;align-items:center;gap:5px;min-width:max-content;padding:6px 4px;border-radius:var(--smooth-radius-sm);transition:background-color .16s ease}
.smooth-usage-field:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 4%,transparent)}
.smooth-usage-field[data-visible="false"] .smooth-usage-field-value{opacity:.4}
.smooth-usage-field-label{color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:16px;white-space:nowrap}
.smooth-usage-field-value{display:flex;align-items:center;gap:5px;min-height:24px;white-space:nowrap;color:var(--smooth-text,var(--dsw-alias-label-primary));font-size:13px;line-height:20px;font-variant-numeric:tabular-nums;cursor:grab;user-select:none}
.smooth-usage-field-value:active{cursor:grabbing}
.smooth-usage-field-read{display:inline-flex;align-items:center;gap:5px}
.smooth-usage-field-check{appearance:none;-webkit-appearance:none;position:relative;flex:none;width:16px;height:16px;margin:0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--smooth-radius-xs);background:transparent;cursor:pointer;transition:background-color .16s ease,border-color .16s ease}
.smooth-usage-field-check:checked{background:var(--smooth-accent,var(--dsw-alias-brand-primary));border-color:transparent}
.smooth-usage-field-check:checked::after{content:"";position:absolute;left:4px;top:1px;width:5px;height:9px;border:solid var(--smooth-ink,var(--dsw-alias-label-primary-foreground,#181a1e));border-width:0 2px 2px 0;transform:rotate(45deg)}
.smooth-usage-field-check:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
.smooth-usage-field-check:disabled{opacity:.5;cursor:default}
@media(max-width:640px){.smooth-settings{padding-bottom:24px}.smooth-themes,.smooth-marks{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.smooth-theme{padding:9px 4px}.smooth-tab{gap:5px;padding:0 6px}.smooth-row{gap:14px}.smooth-row-copy{padding-right:12px}.smooth-row--size{flex-direction:column;align-items:stretch;gap:12px}.smooth-size{justify-content:flex-start}.smooth-size input{width:64px}.smooth-range{width:100%}.smooth-usage-head{flex-direction:column;align-items:stretch;gap:12px}.smooth-usage-controls{align-items:flex-start}.smooth-usage-editor{flex-wrap:wrap;justify-content:center;gap:10px 8px;overflow:visible}}
@media(prefers-reduced-motion:reduce){.smooth-switch,.smooth-switch::after,.smooth-theme,.smooth-tab{transition:none}.smooth-tabs-thumb,.smooth-segment-thumb{transition:none}.smooth-page:not([hidden]),.smooth-page[data-smooth-enter="forward"]:not([hidden]),.smooth-page[data-smooth-enter="back"]:not([hidden]){animation:none}}
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
    if (state.enabled) document.body.setAttribute(USAGE_PLACEMENT_ATTRIBUTE, state.usagePlacement || DEFAULT_USAGE_PLACEMENT);
    else document.body.removeAttribute(USAGE_PLACEMENT_ATTRIBUTE);
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

  /** A small, non-interactive copy of the composer usage capsule for the settings page.
   * It reuses the same field order and sample figures, so turning a checkbox off removes
   * the same segment the real button would drop. */
  function PreviewGlyph(kind) {
    const icon = (viewBox, ...children) => h('svg', {
      className: 'smooth-usage-preview-icon', viewBox, width: 14, height: 14, 'aria-hidden': true,
    }, ...children);
    if (kind === 'cost') {
      return icon('0 0 12 12', h('g', {
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round',
      },
        h('path', { d: 'M3.1 2.5 6 5.6l2.9-3.1' }),
        h('path', { d: 'M6 5.6v4' }),
        h('path', { d: 'M3.5 6.7h5' }),
        h('path', { d: 'M3.5 8.4h5' })));
    }
    if (kind === 'input' || kind === 'output') {
      return icon('0 0 12 12', h('path', {
        d: kind === 'input' ? 'M6 2.2v7.6M2.9 6.9 6 10l3.1-3.1' : 'M6 9.8V2.2M2.9 5.1 6 2l3.1 3.1',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round',
      }));
    }
    if (kind === 'cache') {
      return icon('0 0 1024 1024',
        h('path', {
          d: 'M544 876.8a332.8 332.8 0 1 0 0-665.6 332.8 332.8 0 0 0 0 665.6z m0 83.2a416 416 0 1 1 0-832 416 416 0 0 1 0 832z',
          fill: 'currentColor', fillOpacity: .65,
        }),
        h('path', { d: 'M544 627.2a83.2 83.2 0 1 1 0-166.4 83.2 83.2 0 0 1 0 166.4z', fill: 'currentColor' }));
    }
    if (kind === 'counts') {
      return icon('0 0 24 24', h('path', {
        d: 'M3 19 L9 19 L9 13 L15 13 L15 7 L21 7',
        fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round',
      }));
    }
    if (kind === 'speed') {
      return icon('0 0 24 24',
        h('path', {
          d: 'M4.5 17.5a7.5 7.5 0 1 1 15 0', fill: 'none', stroke: 'currentColor',
          strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M12 14.6 15.6 9.4', fill: 'none', stroke: 'currentColor',
          strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        }),
        h('circle', { cx: 12, cy: 15.4, r: 1.15, fill: 'currentColor' }));
    }
    return null;
  }
  function PreviewPie() {
    const center = 12;
    const radius = 9.7;
    const percent = 88;
    const angle = (percent * 3.6 - 90) * Math.PI / 180;
    const edgeX = center + radius * Math.cos(angle);
    const edgeY = center + radius * Math.sin(angle);
    return h('svg', { viewBox: '0 0 24 24', width: 24, height: 24, 'aria-hidden': true },
      h('circle', { className: 'smooth-usage-preview-pie-rest', cx: center, cy: center, r: radius }),
      h('path', {
        className: 'smooth-usage-preview-pie-used',
        d: `M${center} ${center} L${center} ${center - radius} A${radius} ${radius} 0 ${percent > 50 ? 1 : 0} 1 ${edgeX} ${edgeY} Z`,
      }));
  }
  function UsageFieldValue({ field }) {
    if (field === 'context') {
      return h('span', { className: 'smooth-usage-field-read' },
        PreviewPie(), h('span', { className: 'smooth-usage-preview-value' }, '88%'));
    }
    const values = {
      cost: '8.888',
      input: '888,888,888 tok',
      output: '888,888 tok',
      cache: '88%',
      counts: text('settings.usage.sampleCounts', '8 轮 8 步'),
      speed: '8 tok/s',
    };
    return h('span', { className: 'smooth-usage-field-read' },
      PreviewGlyph(field), h('span', { className: 'smooth-usage-preview-value' }, values[field]));
  }
  /** One segmented choice with a pill that slides between its options. Both the
   * placement and the alignment control use it, so the gesture and the pill cannot
   * drift apart. The options size to their labels, so the pill is measured from the
   * pressed button by the ref below (which React calls after every render, before the
   * next paint); the no-DOM fallback splits the track into equal thirds. */
  const segmentSwipe = {};
  function SegmentGroup({ id, className, buttonClassName, dataKey, ariaLabel, value, options, disabled, onChange }) {
    const index = Math.max(0, options.findIndex((option) => option.value === value));
    const state = segmentSwipe[id] || (segmentSwipe[id] = { pointer: null, suppress: false, wheel: { total: 0, at: 0 } });
    const selectByOffset = (offset) => {
      if (disabled) return;
      const next = index + offset;
      if (next < 0 || next >= options.length) return;
      onChange(options[next].value);
    };
    const finish = () => {
      if (state.pointer && state.pointer.handled) {
        state.suppress = true;
        window.setTimeout(() => { state.suppress = false; }, 0);
      }
      state.pointer = null;
    };
    const onPointerDown = (event) => {
      if (disabled) return;
      if (event.button !== undefined && event.button !== 0) return;
      state.pointer = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, handled: false };
    };
    const onPointerMove = (event) => {
      const pointer = state.pointer;
      if (!pointer || disabled) return;
      if (event.pointerId !== undefined && pointer.pointerId !== undefined && event.pointerId !== pointer.pointerId) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      if (!pointer.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) pointer.moved = true;
      if (!pointer.moved || pointer.handled || Math.abs(dx) < 24) return;
      pointer.handled = true;
      selectByOffset(dx < 0 ? 1 : -1);
    };
    const onWheel = (event) => {
      if (disabled || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      const now = Date.now();
      if (now - state.wheel.at < 450) return;
      state.wheel.total += event.deltaX;
      if (Math.abs(state.wheel.total) < 24) return;
      const direction = state.wheel.total > 0 ? 1 : -1;
      state.wheel.total = 0;
      state.wheel.at = now;
      selectByOffset(direction);
    };
    const measure = (node) => {
      if (!node || typeof node.querySelectorAll !== 'function') return;
      const active = [...node.querySelectorAll('button')]
        .find((button) => button.getAttribute('aria-pressed') === 'true');
      if (!active || !active.offsetWidth) return;
      node.style.setProperty('--smooth-segment-left', `${active.offsetLeft}px`);
      node.style.setProperty('--smooth-segment-width', `${active.offsetWidth}px`);
    };
    return h('div', {
      className, role: 'group', 'aria-label': ariaLabel,
      style: { '--smooth-segment-index': String(index) },
      ref: measure,
      onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onWheel,
    },
      h('span', { className: 'smooth-segment-thumb', 'aria-hidden': 'true' }),
      ...options.map((option) => h('button', {
        key: option.value, type: 'button', className: buttonClassName,
        [dataKey]: option.value,
        'aria-pressed': value === option.value,
        disabled,
        onClick: () => {
          if (state.suppress) { state.suppress = false; return; }
          onChange(option.value);
        },
      }, option.label)));
  }

  function UsagePlacementRow({ value, disabled, onChange }) {
    const options = [
      { value: 'context', label: text('settings.usagePlacement.context', 'In context') },
      { value: 'bottom', label: text('settings.usagePlacement.bottom', 'Bottom bar') },
      { value: 'row', label: text('settings.usagePlacement.row', 'Own row') },
    ];
    return SegmentGroup({
      id: 'usagePlacement',
      className: 'smooth-usage-placement',
      buttonClassName: 'smooth-usage-placement-button',
      dataKey: 'data-placement',
      ariaLabel: text('settings.usagePlacement', 'Placement'),
      value, options, disabled, onChange,
    });
  }
  function UsageFieldsRow({ fields, order, disabled, onChange, onReorder }) {
    const labels = [
      ['cost', 'Used cost'],
      ['input', 'Input tokens'],
      ['output', 'Output tokens'],
      ['cache', 'Cache hit rate'],
      ['counts', 'Turns and steps'],
      ['speed', 'Output speed'],
      ['context', 'Context share'],
    ];
    const labelOf = (key) => labels.find(([name]) => name === key)?.[1] ?? key;
    const stored = Array.isArray(order) ? order : [];
    const ordered = [
      ...stored.filter((key) => labels.some(([name]) => name === key)),
      ...labels.map(([key]) => key).filter((key) => !stored.includes(key)),
    ];
    const dragKey = { current: null };
    return h('div', { className: 'smooth-usage-settings' },
      h('div', { className: 'smooth-usage-fields-head' },
        h('h3', null, text('settings.usageFields', 'Visible fields')),
        h('small', null, text('settings.usageOrderHint', 'Drag to change the order'))),
      h('div', { className: 'smooth-usage-preview' },
        h('span', { className: 'smooth-usage-preview-caption' }, text('settings.usagePreview', 'Preview')),
        h('div', {
          className: 'smooth-usage-editor', role: 'group',
          'aria-label': text('settings.groupUsage', 'Conversation stats'),
        },
          ...ordered.map((key) => h('div', {
            key, className: 'smooth-usage-field',
            'data-visible': fields?.[key] !== false ? 'true' : 'false',
          },
            h('span', { className: 'smooth-usage-field-label' }, text(`settings.usage.${key}`, labelOf(key))),
            h('span', {
              className: 'smooth-usage-field-value',
              draggable: !disabled,
              title: text('settings.usageDrag', 'Drag to reorder'),
              onDragStart: (event) => {
                dragKey.current = key;
                event.dataTransfer?.setData('text/plain', key);
                if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
              },
              onDragOver: (event) => {
                if (!disabled && dragKey.current && dragKey.current !== key) event.preventDefault();
              },
              onDrop: (event) => {
                event.preventDefault();
                const from = dragKey.current || event.dataTransfer?.getData('text/plain');
                dragKey.current = null;
                if (from && from !== key) onReorder(from, key);
              },
              onDragEnd: () => { dragKey.current = null; },
            }, UsageFieldValue({ field: key })),
            h('input', {
              type: 'checkbox',
              className: 'smooth-usage-field-check',
              name: key,
              'aria-label': text(`settings.usage.${key}`, labelOf(key)),
              checked: fields?.[key] !== false,
              disabled,
              onChange: (event) => onChange(key, event.target.checked),
            }))))));
  }

  /** The bottom-bar alignment choice. It belongs to the placement row, so it only
   * exists for that one seat; own-row always centres and context has no seat to align. */
  function UsageAlignRow({ value, disabled, onChange }) {
    const options = [
      { value: 'left', label: text('settings.usageAlign.left', 'Left') },
      { value: 'center', label: text('settings.usageAlign.center', 'Center') },
      { value: 'right', label: text('settings.usageAlign.right', 'Right') },
    ];
    return h('div', { className: 'smooth-usage-align' },
      h('span', { className: 'smooth-usage-align-label' }, text('settings.usageAlign', 'Button position')),
      SegmentGroup({
        id: 'usageAlign',
        className: 'smooth-usage-align-options',
        buttonClassName: 'smooth-usage-align-button',
        dataKey: 'data-align',
        ariaLabel: text('settings.usageAlign', 'Button position'),
        value: value || 'left', options, disabled, onChange,
      }));
  }

  /** Three line icons for the settings tabs. They are drawn here rather than borrowed
   * from the host so the tab row keeps one stroke weight at every palette. */
  function SettingsTabIcon({ id }) {
    const common = {
      className: 'smooth-tab-icon', viewBox: '0 0 24 24', width: 15, height: 15,
      fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
      strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
    };
    if (id === 'appearance') {
      return h('svg', common,
        h('path', { d: 'M12 3a9 9 0 100 18h1.6a1.4 1.4 0 001.4-1.4 1.4 1.4 0 011.4-1.4H18a3 3 0 003-3 9 9 0 00-9-9z' }),
        h('circle', { cx: 7.4, cy: 11.6, r: 1.15, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 9.8, cy: 7.6, r: 1.15, fill: 'currentColor', stroke: 'none' }),
        h('circle', { cx: 14.4, cy: 7.6, r: 1.15, fill: 'currentColor', stroke: 'none' }));
    }
    if (id === 'usage') {
      return h('svg', common,
        h('path', { d: 'M5 19v-7' }),
        h('path', { d: 'M12 19V5' }),
        h('path', { d: 'M19 19v-9' }));
    }
    return h('svg', common,
      h('circle', { cx: 12, cy: 12, r: 9 }),
      h('path', { d: 'M10.2 8.6l5.4 3.4-5.4 3.4z', fill: 'currentColor', stroke: 'none' }));
  }

  function SmoothSettings() {
    const view = useSmoothState();
    const current = view.state;
    const disabled = !view.ready;
    // The patched desktop shell marks the body after each load; the stylesheet keys its
    // window-glass rules on the same attribute, and the copy follows it here.
    const windowGlass = document.body.hasAttribute(WINDOW_GLASS_ATTRIBUTE);
    const [playing, setPlaying] = React.useState(false);
    const [tab, setTab] = React.useState('appearance');
    const [enter, setEnter] = React.useState('none');
    const swipe = React.useRef(null);
    const suppressClick = React.useRef(false);
    const wheel = React.useRef({ total: 0, at: 0 });
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
    const placement = current.usagePlacement || DEFAULT_USAGE_PLACEMENT;
    const align = current.usageAlign || DEFAULT_USAGE_ALIGN;
    const tabs = [
      { id: 'appearance', label: text('settings.tab.appearance', 'Appearance') },
      { id: 'usage', label: text('settings.tab.usage', 'Stats') },
      { id: 'startup', label: text('settings.tab.startup', 'Startup') },
    ];
    const tabIndex = (id) => tabs.findIndex((entry) => entry.id === id);
    const selectTab = (id, direction) => {
      if (id === tab) return;
      setEnter(direction || 'none');
      setTab(id);
    };
    const selectByOffset = (offset) => {
      const index = tabIndex(tab);
      const next = index + offset;
      if (index < 0 || next < 0 || next >= tabs.length) return;
      selectTab(tabs[next].id, offset > 0 ? 'forward' : 'back');
    };
    /** One gesture switches one page; the click that follows a drag is swallowed so a
     * swipe ending over a button does not also jump to that button's page. */
    const endSwipe = () => {
      if (swipe.current && swipe.current.handled) {
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 0);
      }
      swipe.current = null;
    };
    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      swipe.current = { x: event.clientX, y: event.clientY, moved: false, handled: false };
    };
    const onPointerMove = (event) => {
      const state = swipe.current;
      if (!state) return;
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (!state.moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) state.moved = true;
      if (!state.moved || state.handled || Math.abs(dx) < 40) return;
      state.handled = true;
      selectByOffset(dx < 0 ? 1 : -1);
    };
    const onWheel = (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      const now = Date.now();
      if (now - wheel.current.at < 500) return;
      wheel.current.total += event.deltaX;
      if (Math.abs(wheel.current.total) < 32) return;
      const direction = wheel.current.total > 0 ? 1 : -1;
      wheel.current.total = 0;
      wheel.current.at = now;
      selectByOffset(direction);
    };
    const onTabClick = (id) => {
      if (suppressClick.current) { suppressClick.current = false; return; }
      selectTab(id, tabIndex(id) > tabIndex(tab) ? 'forward' : 'back');
    };
    const onTabKeyDown = (event, id) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const index = tabIndex(id);
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + step + tabs.length) % tabs.length];
      selectTab(next.id, step > 0 ? 'forward' : 'back');
      const node = document.getElementById?.(`smooth-tab-${next.id}`);
      if (node && typeof node.focus === 'function') node.focus();
    };
    const appearancePage = [
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
      }),
    ];
    const usagePage = [
      h('div', { className: 'smooth-usage-head' },
        h('div', { className: 'smooth-row-copy' },
          h('h3', null, text('settings.usagePlacement', 'Placement')),
          h('small', null, text('settings.usagePlacementHint', 'Where the button sits around the composer.'))),
        h('div', { className: 'smooth-usage-controls' },
          h(UsagePlacementRow, {
            value: placement,
            disabled: disabled || !current.enabled,
            onChange: (value) => view.update({ ...current, usagePlacement: value }),
          }),
          placement === 'bottom' ? h(UsageAlignRow, {
            value: align,
            disabled: disabled || !current.enabled,
            onChange: (value) => view.update({ ...current, usageAlign: value }),
          }) : null)),
      h(UsageFieldsRow, {
        fields: current.usageFields || DEFAULT_USAGE_FIELDS,
        order: current.usageOrder || DEFAULT_USAGE_ORDER,
        disabled: disabled || !current.enabled,
        onChange: (key, value) => view.update({
          ...current,
          usageFields: { ...(current.usageFields || DEFAULT_USAGE_FIELDS), [key]: value },
        }),
        onReorder: (from, to) => {
          const order = [...(current.usageOrder || DEFAULT_USAGE_ORDER)];
          const fromIndex = order.indexOf(from);
          const toIndex = order.indexOf(to);
          if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
          order.splice(fromIndex, 1);
          order.splice(toIndex, 0, from);
          view.update({ ...current, usageOrder: order });
        },
      }),
    ];
    const startupPage = [
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
      // The preview layer portals itself to the body; keeping it inside the startup page
      // leaves the page order where the layout expects it.
      playing ? h(SplashPreview, { onDone: () => setPlaying(false) }) : null,
      h(SizeRow, {
        title: text('settings.windowSize', 'Window size at launch'),
        hint: text('settings.windowSizeHint', 'Sizes the desktop window while the application loads.'),
        value: current.windowSize,
        disabled: disabled || !current.enabled,
        onChange: (value) => view.update({ ...current, windowSize: value }),
      }),
    ];
    const pages = [
      { id: 'appearance', children: appearancePage },
      { id: 'usage', children: usagePage },
      { id: 'startup', children: startupPage },
    ];
    return h('div', { className: 'smooth-settings' },
      h('header', { className: 'smooth-settings-head' },
        h('div', { className: 'smooth-settings-title' },
          h('h2', null, text('settings.title', 'Smooth')),
          h('span', {
            className: 'smooth-badge',
            'data-on': current.enabled ? 'true' : 'false',
          }, text(current.enabled ? 'settings.stateOn' : 'settings.stateOff', current.enabled ? 'Enabled' : 'Disabled'))),
        h('p', { className: 'smooth-settings-subtitle' }, text('settings.subtitle', 'One skin for the whole Harness: palette, radii, tabs and the composer.'))),
      h('div', {
        className: 'smooth-tabs', role: 'tablist',
        'aria-label': text('settings.tabsLabel', 'Skin settings'),
        'aria-orientation': 'horizontal',
        style: { '--smooth-tab-index': String(Math.max(0, tabIndex(tab))) },
        onPointerDown,
        onPointerMove,
        onPointerUp: endSwipe,
        onPointerCancel: endSwipe,
        onWheel,
      },
        h('span', { className: 'smooth-tabs-thumb', 'aria-hidden': 'true' }),
        ...tabs.map((entry) => h('button', {
          key: entry.id,
          type: 'button',
          role: 'tab',
          id: `smooth-tab-${entry.id}`,
          className: 'smooth-tab',
          'aria-selected': tab === entry.id,
          'aria-controls': `smooth-panel-${entry.id}`,
          tabIndex: tab === entry.id ? 0 : -1,
          onClick: () => onTabClick(entry.id),
          onKeyDown: (event) => onTabKeyDown(event, entry.id),
        }, h(SettingsTabIcon, { id: entry.id }), h('span', null, entry.label)))),
      h('div', { className: 'smooth-pages' },
        ...pages.map((page) => h('div', {
          key: page.id,
          className: 'smooth-page',
          role: 'tabpanel',
          id: `smooth-panel-${page.id}`,
          'aria-labelledby': `smooth-tab-${page.id}`,
          hidden: tab !== page.id,
          'data-active': tab === page.id ? 'true' : undefined,
          'data-smooth-enter': tab === page.id && enter !== 'none' ? enter : undefined,
        }, ...page.children))),
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
        }, view.failure || (!view.ready ? text('settings.loading', 'Reading settings…') : ''))));
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
    document.body.removeAttribute(USAGE_PLACEMENT_ATTRIBUTE);
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


return exports;}});
