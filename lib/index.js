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
/** The Client half's durable store. Reaching no host service is what keeps activation safe. */
const STORAGE_KEY = 'dsh-smooth-skin:state';

/** The size the desktop window is put into while the application loads. The bounds are
 * the ones the renderer can ask for: the app itself is created at 1280 x 820 with a
 * 520 x 600 minimum, and anything larger than the screen's work area is clamped when the
 * request is made (see `applyWindowSize` in the browser half). */
const WINDOW_SIZE = { minWidth: 520, minHeight: 600, maxWidth: 10000, maxHeight: 10000 };
const DEFAULT_WINDOW_SIZE = { width: 1440, height: 900 };

const DEFAULTS = {
  enabled: true,
  theme: 'auto',
  boot: true,
  // The desktop window opens at 1440 x 900 unless the user changes it in settings.
  windowSize: { enabled: true, ...DEFAULT_WINDOW_SIZE },
  // One colour ties the conversation's referenced files/key hints to the sidebar's
  // workspace names; see MARK_CHOICES below.
  mark: 'blue',
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

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const state = { ...DEFAULTS };
  if (typeof source.enabled === 'boolean') state.enabled = source.enabled;
  const theme = normalizeTheme(source.theme);
  if (theme !== undefined) state.theme = theme;
  if (typeof source.boot === 'boolean') state.boot = source.boot;
  if (MARK_KEYS.includes(source.mark)) state.mark = source.mark;
  state.windowSize = normalizeSize(source.windowSize);
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
  'settings.mark': '标记颜色',
  'settings.markHint': '统一改变对话区的引用文件与重点提示的颜色。',
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
  'settings.mark': 'Mark colour',
  'settings.markHint': 'One colour for the referenced files and key hints in the conversation.',
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
 * Host half of the Smooth bundle.
 *
 * Besides the launch animation's rows for the served index, this half owns the
 * small local bridge the browser half calls over loopback. The bridge is deliberately
 * narrow and capability-gated:
 *   - `status` / `checkout`: the composer's Git branch menu. It never runs a shell
 *     (fixed `git` argv, `execFile`).
 *   - `usage`: the welcome page's daily token table. It reads the stored Session logs
 *     (read-only) and returns per-day totals; nothing else leaves the process.
 *   - `session-delete`: the archived Session list's trailing delete action. DSH has no
 *     session-delete service, so the bridge removes the Session's stored log directory
 *     (and its projection cache) for an archived Session with no running work; DSH keeps
 *     an archived Session's Agent in memory after archiving, so liveness alone is not a
 *     refusal. The browser half then re-pulls the Session list; the query index prunes
 *     the missing row.
 * The bridge requires a per-activation capability token and owns one exact route.
 * When it is absent the rows still render and the client menus fall back to their
 * read-only path.
 *
 * Cordis decides a plugin's shape in `registry.resolve()`:
 *   1. a function is used as the callback directly — `name`, `inject` and `Config`
 *      then have to be own properties of that function, and `Function.prototype.name`
 *      is read-only, so a mirror cannot be attached reliably; or
 *   2. an object with an `apply` method contributes its `apply` as the callback
 *      while `name`, `inject` and `Config` are read off the object.
 * Shape 2 is the one that keeps all three readable, so this module exports a single
 * plugin object as its default export. `unwrapExports` collapses the namespace to
 * that default, which is what makes the metadata visible.
 */
export function apply(ctx) {
  const bridge = ensureGitServer(ctx);
  ctx.on('webserver/index-inject', (table) => {
    table.push(...bootInjections());
    if (bridge) table.push(bridge.injection());
  });
}

/** No `Config`: cordis reads `Config["~standard"].validate`, which a plain object lacks.
 * The Git bridge owns a private loopback listener, so the Host declares no service. */
const plugin = { name: PLUGIN_ID, inject: [], apply };

export default plugin;
export { plugin };
export {
  gitStatus as gitStatusForTest,
  checkoutBranch as checkoutBranchForTest,
  ensureGitServer as ensureGitServerForTest,
  deleteArchivedSession as deleteArchivedSessionForTest,
  foldSessionLog as foldSessionLogForTest,
  scanSessions as scanSessionsForTest,
  dailyUsage as dailyUsageForTest,
};

const GIT_ROUTE = '/smooth-skin/git';
const GIT_TIMEOUT = 20_000;
const CHECKOUT_TIMEOUT = 60_000;
const BODY_LIMIT = 64 * 1024;

let bridgeModules;
async function bridgeNode() {
  if (!bridgeModules) {
    bridgeModules = Promise.all([
      import('node:child_process'),
      import('node:fs/promises'),
      import('node:path'),
      import('node:os'),
      import('node:zlib'),
    ]).then(([child, fs, path, os, zlib]) => ({ child, fs, path, os, zlib }));
  }
  return bridgeModules;
}

class GitBridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** A fixed argv array, no shell. The Host already owns this machine; the bridge
 * still keeps every argument out of shell parsing and bounds runtime and output. */
async function runGit(cwd, args, timeout = GIT_TIMEOUT) {
  const { child } = await bridgeNode();
  return await new Promise((resolve) => {
    child.execFile('git', args, {
      cwd,
      timeout,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      encoding: 'utf8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat', GIT_OPTIONAL_LOCKS: '0' },
    }, (error, stdout, stderr) => resolve({
      ok: !error,
      killed: Boolean(error?.killed),
      stdout: stdout || '',
      stderr: stderr || '',
    }));
  });
}

function gitMessage(result) {
  const text = `${result.stderr || ''}\n${result.stdout || ''}`.trim();
  return text.split(/\r?\n/).filter(Boolean).slice(-3).join('\n') || 'Git 命令执行失败';
}

async function repository(cwd) {
  const { fs, path } = await bridgeNode();
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) throw new GitBridgeError('cwd', '工作目录无效');
  const stat = await fs.stat(cwd).catch(() => undefined);
  if (!stat?.isDirectory()) throw new GitBridgeError('cwd', '工作目录不存在');
  const top = await runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (!top.ok) throw new GitBridgeError('not-git', '当前目录不是 Git 仓库');
  const root = path.resolve(top.stdout.trim());
  return { root, cwd: path.resolve(cwd) };
}

/** Branch list and working-tree state. `dirty` is the number of porcelain rows,
 * so untracked files count too, matching the "未提交: N 个文件" wording. */
async function gitStatus(cwd) {
  const { root } = await repository(cwd);
  const [head, status, refs] = await Promise.all([
    runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    runGit(root, ['status', '--porcelain']),
    runGit(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']),
  ]);
  if (!head.ok) throw new GitBridgeError('git', gitMessage(head));
  const current = head.stdout.trim();
  const detached = current === 'HEAD';
  const dirty = status.ok ? status.stdout.split(/\r?\n/).filter(Boolean).length : 0;
  const branches = refs.ok ? refs.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
  if (!detached && current && !branches.includes(current)) branches.unshift(current);
  branches.sort((a, b) => {
    if (a === current) return -1;
    if (b === current) return 1;
    return a.localeCompare(b);
  });
  return { root, current, detached, dirty, branches };
}

async function checkoutBranch(cwd, branch, create) {
  if (typeof branch !== 'string' || !branch.trim()) throw new GitBridgeError('branch', '分支名不能为空');
  const name = branch.trim();
  if (/[\s~^:?*[\\]/.test(name) || name.startsWith('-') || name.includes('..') || name.includes('\\')) {
    throw new GitBridgeError('branch', '分支名无效');
  }
  const { root } = await repository(cwd);
  const valid = await runGit(root, ['check-ref-format', '--branch', name]);
  if (!valid.ok) throw new GitBridgeError('branch', '分支名无效');
  const result = await runGit(root, create ? ['checkout', '-b', name] : ['checkout', name], CHECKOUT_TIMEOUT);
  if (!result.ok) throw new GitBridgeError('checkout', gitMessage(result));
  return await gitStatus(root);
}

const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/;

/** Permanently remove one archived Session's stored log. DSH exposes no session-delete
 * service: the persistence seam only creates/opens/lists logs, and the query index
 * reconciles its rows against that list — removing the Session's directory is therefore
 * what makes the Session disappear for good (the index prunes it on the next list).
 * Archiving stops a Session's work but does not evict its Agent, so a Session can stay
 * live in the Session store indefinitely; the bridge therefore asks the same
 * `workspace/session-activity` admission the archive flow uses and refuses only when
 * something still runs. The projection-cache file, the workspace accounting slot, and the
 * stale archive marker are cleaned up around the removal so nothing references the gone
 * identity. */
async function deleteArchivedSession(ctx, sessionId) {
  const { fs, path } = await bridgeNode();
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new GitBridgeError('session', '会话 ID 无效');
  }
  const registry = ctx?.get?.('workspaceRegistry');
  let archived;
  try { archived = registry?.archivedSessionIds; } catch { archived = undefined; }
  // Fail closed: a destructive delete must not proceed on the guess that the Session
  // happened to be archived, so an unreadable archive state refuses just like a
  // non-archived id does.
  if (!Array.isArray(archived) || !archived.includes(sessionId)) {
    throw new GitBridgeError('session-not-archived', '只能删除已归档的会话');
  }
  const sessions = ctx?.get?.('sessions');
  if (sessions?.get?.(sessionId) !== undefined) {
    // The archived-session gate already blocks every model step, but a turn, job,
    // subagent, or schedule can still be settling. Ask the providers the same question
    // archive admission asks; an unreadable answer refuses rather than deleting blind.
    let activity;
    try {
      if (typeof ctx?.waterfall === 'function') {
        activity = await ctx.waterfall('workspace/session-activity', { sessionId }, () => Promise.resolve([]));
      }
    } catch {
      activity = undefined;
    }
    if (!Array.isArray(activity)) throw new GitBridgeError('session-live', '会话正在使用，无法删除');
    if (activity.length > 0) throw new GitBridgeError('session-live', '会话仍在运行，无法删除');
    try { await ctx.parallel?.('workspace/session-stop', { sessionId }); } catch { /* nothing left to stop */ }
  }
  const persistence = ctx?.get?.('sessionPersistence');
  const root = typeof persistence?.root === 'string' ? persistence.root : undefined;
  if (!root || typeof persistence?.stat !== 'function') throw new GitBridgeError('session-root', '无法定位会话存储目录');
  const snapshot = await persistence.stat(sessionId).catch(() => undefined);
  if (snapshot === undefined) throw new GitBridgeError('session-missing', '会话记录不存在');
  // `<root>/<projectKey(cwd)>/<sessionId>`: the per-session directory is the encoded id
  // under the project directory. Session ids are path-safe, so the segment is the id.
  const projects = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  let directory;
  for (const project of projects) {
    if (!project.isDirectory()) continue;
    const candidate = path.join(root, project.name, sessionId);
    const info = await fs.stat(candidate).catch(() => undefined);
    if (info?.isDirectory()) { directory = candidate; break; }
  }
  if (!directory) throw new GitBridgeError('session-missing', '会话目录不存在');
  // A live Session's log writer only holds a handle for the duration of an append, but a
  // just-settled batch can still be closing. `maxRetries` absorbs that transient sharing
  // violation instead of failing the delete on Windows.
  await fs.rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 120 });
  const cache = path.join(path.dirname(root), 'storages', 'session_projcache', 'sessions', `${sessionId}.json`);
  await fs.rm(cache, { force: true }).catch(() => {});
  // Drop the accounting slot too: while the live Session remains in the Host's in-memory
  // catalog, the workspace's `candidateMatches` index can keep the id visible until a
  // restart. Detaching here is what makes the archived row leave on the client refresh.
  try {
    for (const entity of registry?.list?.() ?? []) {
      if (Array.isArray(entity?.record?.sessionIds) && entity.record.sessionIds.includes(sessionId)) {
        await entity.detachSession?.(sessionId);
        break;
      }
    }
  } catch { /* accounting cleanup only */ }
  try { await registry?.unarchiveSession?.(sessionId); } catch { /* marker cleanup only */ }
  // An opened Session's Agent stays in memory for the whole app run, so the deleted id
  // would otherwise remain in the in-memory catalog and come back on the next list.
  // Detach the store entry only after the log is gone: the controller turns the paired
  // disposal into `api-session/removed`, and the client refresh drops the archived row.
  if (sessions?.get?.(sessionId) !== undefined) {
    try {
      const entry = sessions?.store?.get?.(sessionId);
      if (entry !== undefined && typeof sessions.detachEntered === 'function') sessions.detachEntered(entry);
    } catch { /* the removed log still disappears from the list after a restart */ }
  }
  return { deleted: true, sessionId };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-smooth-token');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new GitBridgeError('body', '请求体过大');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new GitBridgeError('body', '请求体不是有效 JSON');
  }
}

async function handleBridgeRequest(req, res, tokenOf, ctx) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-smooth-token');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.headers['x-smooth-token'] !== tokenOf()) {
    sendJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'Smooth bridge denied the request' } });
    return;
  }
  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    sendJson(res, 200, { ok: false, error: { code: error.code || 'body', message: error.message } });
    return;
  }
  const cwd = typeof body.cwd === 'string' ? body.cwd : '';
  try {
    let value;
    if (body.action === 'status') {
      value = await gitStatus(cwd);
    } else if (body.action === 'checkout') {
      value = await checkoutBranch(cwd, body.branch, Boolean(body.create));
    } else if (body.action === 'usage') {
      value = await dailyUsage();
    } else if (body.action === 'session-delete') {
      value = await deleteArchivedSession(ctx, body.sessionId);
    } else {
      throw new GitBridgeError('action', '未知的桥接操作');
    }
    sendJson(res, 200, { ok: true, value });
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      error: {
        code: error.code || 'bridge',
        message: error.message || '桥接操作失败',
      },
    });
  }
}

/** The capability token is minted once per Host activation and injected into the
 * index beside this bridge's own loopback origin. A page without the token gets a
 * 403, so a random local page cannot drive Git through the listener. The listener
 * is deliberately private to the plugin: the profile's web carrier may activate
 * after this bundle, and a fixed proxy port avoids relying on its route table.
 *
 * `preferredPort` exists for the tests: a test process shares the machine with the
 * running application, whose own listener already owns the default port and would
 * answer in its place. */
let gitServer;
function ensureGitServer(ctx, preferredPort = 39517) {
  if (gitServer) return gitServer;
  let token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  // Keep the token across activations. A page holds the copy it was served with, so a
  // fresh activation (a rebuilt bundle, a plugin reload) that minted a new token would
  // answer that page's requests with 403 until the window reloaded — the usage panel
  // and the branch menu both go quiet with no visible reason. The persisted value is
  // per profile home, not per process, which also covers a page loaded from a cached
  // index after a restart.
  adoptBridgeToken(token).then((value) => { token = value; }).catch(() => {});
  let port = preferredPort;
  let base = '';
  let server;
  // `node:http` arrives asynchronously. A plugin that is disposed before that import
  // resolves must not leave a listener behind that nothing can close, so the flag is
  // checked once it lands: a disposed bridge closes the server instead of listening.
  let disposed = false;
  const listen = () => {
    import('node:http').then(({ createServer }) => {
      if (disposed) return;
      server = createServer((req, res) => handleBridgeRequest(req, res, () => token, ctx));
      server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE' && port < preferredPort + 10) {
          port += 1;
          server.listen(port, '127.0.0.1');
          return;
        }
        console.error('smooth git bridge:', error);
      });
      server.on('listening', () => {
        base = `http://127.0.0.1:${port}`;
      });
      if (disposed) { try { server.close(); } catch {} return; }
      server.listen(port, '127.0.0.1');
    }).catch((error) => {
      console.error('smooth git bridge:', error);
    });
  };
  listen();
  const api = {
    injection() {
      const current = base || `http://127.0.0.1:${port}`;
      return {
        kind: 'script',
        placement: 'head',
        text: `window.__SMOOTH_GIT__=${JSON.stringify({ base: current, token })};`,
      };
    },
    dispose() {
      disposed = true;
      try { server?.close(); } catch {}
      if (gitServer === api) gitServer = undefined;
    },
  };
  gitServer = api;
  if (typeof ctx.effect === 'function') ctx.effect(() => () => api.dispose());
  return api;
}

/* ------------------------------------------------------------- token usage ---
 *
 * The welcome page's daily table is fed from the stored Session logs rather than
 * from a live projection: a projection reports one Session's totals, and the table
 * needs per-day buckets across every Session the user has ever had. The logs are
 * append-only JSONL (optionally one Zstandard frame per batch), so the read is a
 * fold over `assistant/message` settlements — no Host service is required and the
 * archive is read-only.
 */

/** The table draws a quarter of a year; the archive scan keeps the same window and
 * stops decoding logs whose last write predates it. */
const USAGE_WINDOW_DAYS = 371;
/** A cold fold decodes the whole archive, so one result answers every mount of the
 * welcome page for a minute. */
const USAGE_TTL_MS = 60_000;
/** The bridge's capability token is persisted here so it survives an activation. */
const BRIDGE_TOKEN_FILE = 'smooth-bridge-token';

/** Read the token a previous activation left, or claim this one's for the next.
 *
 * The guard only needs to keep a page that the plugin itself did not serve from
 * driving the listener, and a local file is outside a random web page's reach; the
 * trade for that is a token that stays valid across restarts, which is what keeps an
 * already-loaded window talking to a re-activated bridge. */
async function adoptBridgeToken(fallback) {
  const { fs, path, os } = await bridgeNode();
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const file = path.join(home, 'cache', BRIDGE_TOKEN_FILE);
  try {
    const existing = (await fs.readFile(file, 'utf8')).trim();
    if (/^[A-Za-z0-9-]{16,}$/.test(existing)) return existing;
  } catch {}
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, fallback, { mode: 0o600 });
  } catch {}
  return fallback;
}
const USAGE_CACHE_VERSION = 2;
const USAGE_CACHE_FILE = `smooth-usage-v${USAGE_CACHE_VERSION}.json`;
const USAGE_LOG_NAME = /^session\.v\d+\.jsonl(\.zstd)?$/;
/** The envelope of a settlement: its own sequence and the wall clock of the event. */
const USAGE_LOG_EVENT = /^\{"type":"assistant\/(?:message|attempt)","seq":\d+,"time":(\d+)/;
const USAGE_LOG_STEP = /"turn":(\d+),"step":(\d+)/;
const USAGE_LOG_KEY = '"usage":{';
const USAGE_LOG_MODEL = /"model":"([^"]+)"/;
const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

function usageDayKey(time) {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Byte offsets of every Zstandard frame start, plus the end of the buffer.
 *
 * A Session log appends one frame per batch and Node's one-shot decoder refuses
 * everything after the first frame, so the frames are split before decoding. The
 * four-byte magic makes a false positive inside compressed data practically
 * impossible, and a frame that still fails to decode is a torn tail — the write path
 * truncates it before its next append, so it is simply not an event yet. */
function zstdFrameStarts(buffer) {
  const starts = [];
  for (let index = 0; index + 3 < buffer.length; index++) {
    if (buffer[index] === ZSTD_MAGIC[0] && buffer[index + 1] === ZSTD_MAGIC[1]
      && buffer[index + 2] === ZSTD_MAGIC[2] && buffer[index + 3] === ZSTD_MAGIC[3]) starts.push(index);
  }
  starts.push(buffer.length);
  return starts;
}

/** The usage sample of one settlement line.
 *
 * `assistant/message` carries it in `data.usage`, written after the stream; an
 * `assistant/attempt` carries the same sample as the last `usage` stream chunk.
 * Message text is JSON-escaped, so an unescaped `"usage"` key can only belong to the
 * settlement itself — the last one on the line is the one the projection folds. */
function lastUsageSample(line) {
  const at = line.lastIndexOf(USAGE_LOG_KEY);
  if (at < 0) return undefined;
  const end = line.indexOf('}', at);
  if (end < 0) return undefined;
  try {
    const usage = JSON.parse(line.slice(at + USAGE_LOG_KEY.length - 1, end + 1));
    return typeof usage?.inputTokens === 'number' ? usage : undefined;
  } catch {
    return undefined;
  }
}

/** One log's day records.
 *
 * `YYYY-MM-DD -> { input, output, cacheRead, cacheWrite, calls, hours, models }`: the
 * token buckets the usage panel totals, the settlement count that becomes 消息数, the
 * 24-slot token histogram that names 高峰时段, and the per-model split behind 最常用
 * 模型. The fold repeats the Session projection's own rule — a later settlement for the
 * same (turn, step) replaces the earlier one — so a retried step is counted once and the
 * panel agrees with the Session's own token meter. */
function foldSessionLog(buffer, zlib) {
  const settled = new Map();
  const record = (text) => {
    for (const line of text.split('\n')) {
      const head = USAGE_LOG_EVENT.exec(line);
      if (!head) continue;
      const usage = lastUsageSample(line);
      if (!usage) continue;
      const step = USAGE_LOG_STEP.exec(line);
      settled.set(step ? `${step[1]}/${step[2]}` : `time/${head[1]}`, {
        time: Number(head[1]),
        // Message text is JSON-escaped, so the only unescaped `"model"` on the line is
        // the settlement's own source.
        model: USAGE_LOG_MODEL.exec(line)?.[1] || 'unknown',
        buckets: [
          usage.inputTokens || 0,
          usage.outputTokens || 0,
          usage.cacheReadTokens || 0,
          usage.cacheWriteTokens || 0,
        ],
      });
    }
  };
  if (zlib) {
    const starts = zstdFrameStarts(buffer);
    for (let index = 0; index < starts.length - 1; index++) {
      let text;
      try {
        text = zlib.zstdDecompressSync(buffer.subarray(starts[index], starts[index + 1])).toString('utf8');
      } catch {
        continue;
      }
      record(text);
    }
  } else {
    record(buffer.toString('utf8'));
  }
  const days = new Map();
  for (const { time, model, buckets } of settled.values()) {
    const day = usageDayKey(time);
    const value = days.get(day) || {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0,
      hours: new Array(24).fill(0), models: {},
    };
    value.input += buckets[0];
    value.output += buckets[1];
    value.cacheRead += buckets[2];
    value.cacheWrite += buckets[3];
    value.calls += 1;
    const tokens = buckets[0] + buckets[1] + buckets[2] + buckets[3];
    value.hours[new Date(time).getHours()] += tokens;
    value.models[model] = (value.models[model] || 0) + tokens;
    days.set(day, value);
  }
  return days;
}

/** Per-day usage across the stored Sessions under `sessionsRoot`.
 *
 * `cache` is the last persisted result: a log whose size and modification time still
 * match is not decoded again, which is what makes a restart cost one pass over the
 * files the user actually touched. Returns the aggregate days and the record to
 * persist (one entry per log, so a deleted Session drops out of the archive view). */
async function scanSessions({ sessionsRoot, cache, now = Date.now() }) {
  const { fs, path, zlib } = await bridgeNode();
  const cutoff = now - USAGE_WINDOW_DAYS * 86_400_000;
  const sessions = {};
  const days = new Map();
  const walk = async (directory) => {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) { await walk(target); continue; }
      const log = USAGE_LOG_NAME.exec(entry.name);
      if (!log) continue;
      let stat;
      try {
        stat = await fs.stat(target);
      } catch {
        continue;
      }
      // Every event a log holds was written before its last modification.
      if (stat.mtimeMs < cutoff) continue;
      const key = path.relative(sessionsRoot, target);
      const previous = cache?.sessions?.[key];
      let record = previous && previous.size === stat.size && previous.mtimeMs === stat.mtimeMs ? previous : undefined;
      if (!record) {
        let buffer;
        try {
          buffer = await fs.readFile(target);
        } catch {
          continue;
        }
        record = {
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          days: Object.fromEntries(foldSessionLog(buffer, log[1] ? zlib : undefined)),
        };
        // The Agent loop runs on this thread: yield between logs so a cold scan can
        // never hold a model step for the whole archive.
        await new Promise((resolve) => setImmediate(resolve));
      }
      sessions[key] = record;
    }
  };
  await walk(sessionsRoot);
  for (const [key, record] of Object.entries(sessions)) {
    // The session id is the directory the log lives in; one log is one session.
    const session = path.basename(path.dirname(key));
    for (const [day, value] of Object.entries(record.days)) {
      if (Date.parse(`${day}T00:00:00`) < cutoff) continue;
      const total = days.get(day) || {
        input: 0, output: 0, cached: 0, calls: 0,
        hours: new Array(24).fill(0), models: {}, sessions: [],
      };
      total.input += value.input;
      total.output += value.output;
      total.cached += value.cacheRead + value.cacheWrite;
      total.calls += value.calls;
      for (let hour = 0; hour < 24; hour++) total.hours[hour] += value.hours[hour] || 0;
      for (const [model, tokens] of Object.entries(value.models || {})) {
        total.models[model] = (total.models[model] || 0) + tokens;
      }
      if (!total.sessions.includes(session)) total.sessions.push(session);
      days.set(day, total);
    }
  }
  return { days, sessions };
}

let usageResult;
let usageScan;

/** The bridge action's answer:
 * `{ today, days: [{ day, tokens, input, output, cached, calls, hours, models, sessions }] }`.
 * `tokens` is everything the model processed that day — uncached input, cache traffic
 * and output — which is the number a token meter reports. */
async function dailyUsage() {
  if (usageResult && Date.now() - usageResult.at < USAGE_TTL_MS) return usageResult.value;
  if (!usageScan) {
    usageScan = scanUsageArchive().then((value) => {
      usageResult = { at: Date.now(), value };
      return value;
    }).finally(() => { usageScan = undefined; });
  }
  return usageScan;
}

async function scanUsageArchive() {
  const { fs, path, os } = await bridgeNode();
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const sessionsRoot = path.join(home, 'sessions');
  const cachePath = path.join(home, 'cache', USAGE_CACHE_FILE);
  let cache;
  try {
    cache = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  } catch {
    cache = undefined;
  }
  if (cache?.version !== USAGE_CACHE_VERSION) cache = undefined;
  const { days, sessions } = await scanSessions({ sessionsRoot, cache });
  const value = {
    today: usageDayKey(Date.now()),
    days: [...days.entries()]
      .map(([day, record]) => ({ day, tokens: record.input + record.output + record.cached, ...record }))
      .sort((left, right) => (left.day < right.day ? -1 : 1)),
  };
  // Persist after the answer is built: a failed write only costs the next scan.
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(`${cachePath}.tmp`, JSON.stringify({ version: USAGE_CACHE_VERSION, sessions }));
    await fs.rename(`${cachePath}.tmp`, cachePath);
  } catch {}
  return value;
}
