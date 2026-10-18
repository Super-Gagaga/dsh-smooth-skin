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
};

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
  app: '#f5f7f9', rail: '#e9edf1', sidebar: '#eff2f5',
  layer1: '#fdfeff', layer2: '#f6f8fa', layer3: '#eff3f6', selected: '#dfe7ee',
  input: '#ffffff', overlay: '#ffffff',
  text: '#2f3540', muted: '#5a6472', faint: '#6a7480',
  solid: '#2a3038', solidText: '#fdfeff', brand: '#6d93b8', accent: '#a9c3d8', link: '#3f6f9e',
  line1: 'rgba(40,55,70,.10)', line2: 'rgba(40,55,70,.16)', line3: 'rgba(40,55,70,.24)',
  hover: 'rgba(40,55,70,.05)', active: 'rgba(40,55,70,.09)',
  bubble: '#e8eef4', bubbleHighlight: '#e5ecf3', code: '#f2f5f8',
  scrollbar: 'rgba(40,55,70,.18)', scrollbarHover: 'rgba(40,55,70,.30)',
  error: '#b3372f', warn: '#8a6415', success: '#4f7a3a', business: '#5b7fa6', heat: '#5b87c4', idle: '#9aa4b0',
  modelTrack: '#eef2f6', modelBlue: '#4f86c6', modelThumb: '#ffffff', modelDot: 'rgba(40,55,70,.22)',
};
PALETTE.iron = {
  ...PALETTE.dark,
  app: '#1e2023', rail: '#141517', sidebar: '#181a1d',
  layer1: '#24272b', layer2: '#272a2e', layer3: '#2c2f34', selected: '#30343a',
  input: '#26292d', overlay: '#202327',
  text: '#f1f3f5', muted: '#c5c9cf', faint: '#b6bbc2',
  solid: '#f5f7f9', solidText: '#121417', brand: '#b9c6d4', accent: '#d9b072', link: '#94b8e0',
  line1: '#35393f', line2: '#40454c', line3: '#4d545c',
  hover: '#2b2f34', active: '#30353b',
  bubble: '#272a2e', bubbleHighlight: '#2b2f34', code: '#191b1e',
  error: '#ff8085', warn: '#e0a94a', success: '#7fb069', business: '#b9c6d4', heat: '#89a9d6', idle: '#6c7178',
  modelTrack: '#2a2d31', modelBlue: '#6aa8f0', modelThumb: '#f4f6f9', modelDot: 'rgba(255,255,255,.32)',
};
PALETTE.moss = {
  ...PALETTE.light,
  app: '#eef1eb', rail: '#e2e7df', sidebar: '#e9eee5',
  layer1: '#fbfcf9', layer2: '#f5f8f2', layer3: '#eff3ea', selected: '#dfe8d9',
  input: '#fcfdfa', overlay: '#fcfdfa',
  text: '#303731', muted: '#5a6459', faint: '#69746a',
  solid: '#2a322c', solidText: '#fbfcf9', brand: '#5f8a63', accent: '#a8834d', link: '#3f6f4f',
  line1: 'rgba(42,60,45,.10)', line2: 'rgba(42,60,45,.16)', line3: 'rgba(42,60,45,.24)',
  hover: 'rgba(42,60,45,.05)', active: 'rgba(42,60,45,.09)',
  bubble: '#e2ebe0', bubbleHighlight: '#dfe8db', code: '#eff3ea',
  scrollbar: 'rgba(42,60,45,.18)', scrollbarHover: 'rgba(42,60,45,.30)',
  error: '#b3372f', warn: '#8a6b1f', success: '#3f7a3f', business: '#4e7a5e', heat: '#4d7f63', idle: '#98a099',
  modelTrack: '#e9eee3', modelBlue: '#4f8a5e', modelThumb: '#ffffff', modelDot: 'rgba(42,60,45,.22)',
};
PALETTE.sunset = {
  ...PALETTE.light,
  app: '#f8efe5', rail: '#ecdfd0', sidebar: '#f3e8da',
  layer1: '#fef9f2', layer2: '#f9f1e4', layer3: '#f4e8d6', selected: '#ecd7bc',
  input: '#fffaf3', overlay: '#fffaf3',
  text: '#3a2f24', muted: '#6e5c48', faint: '#7d6a54',
  solid: '#33291e', solidText: '#fef9f2', brand: '#c26a1f', accent: '#d08a3e', link: '#a75a12',
  line1: 'rgba(80,50,25,.10)', line2: 'rgba(80,50,25,.16)', line3: 'rgba(80,50,25,.24)',
  hover: 'rgba(80,50,25,.05)', active: 'rgba(80,50,25,.09)',
  bubble: '#f4e0c6', bubbleHighlight: '#f2decc', code: '#f8efe0',
  scrollbar: 'rgba(80,50,25,.18)', scrollbarHover: 'rgba(80,50,25,.30)',
  error: '#b3352f', warn: '#8a6415', success: '#4e7a3a', business: '#c26a1f', heat: '#c26a1f', idle: '#9d9484',
  modelTrack: '#f3e6d0', modelBlue: '#c26a1f', modelThumb: '#fffdf8', modelDot: 'rgba(80,50,25,.22)',
};
PALETTE.deepsea = {
  ...PALETTE.dark,
  app: '#121c24', rail: '#0d151b', sidebar: '#101920',
  layer1: '#1a2630', layer2: '#1d2a35', layer3: '#22313c', selected: '#273744',
  input: '#1b2832', overlay: '#15212a',
  text: '#eaf2f8', muted: '#b7c6d4', faint: '#a6b7c7',
  solid: '#f0f6fb', solidText: '#0e161d', brand: '#5aa0c8', accent: '#d9a45e', link: '#6fb3dc',
  line1: '#29414f', line2: '#35505f', line3: '#446473',
  hover: '#21303b', active: '#263641',
  bubble: '#1d2a35', bubbleHighlight: '#21303b', code: '#101920',
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
  'composer.searchModel': '搜索模型',
  'composer.modelLoading': '正在读取…',
  'composer.noModels': '没有模型',
  'composer.reasoningEffort': '思考强度',
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
  'shell.main': '主页面',
  'shell.home': '首页',
  'shell.new': '新会话',
  'shell.plugins': '插件',
  'shell.settings': '设置',
  'shell.general': '通用设置',
  'shell.workspaceFilter': '工作区筛选',
  'shell.inProgress': '进行中',
  'shell.archived': '已归档',
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
  'composer.searchModel': 'Search models',
  'composer.modelLoading': 'Loading…',
  'composer.noModels': 'No models',
  'composer.reasoningEffort': 'Reasoning effort',
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
  'shell.main': 'Main page',
  'shell.home': 'Home',
  'shell.new': 'New chat',
  'shell.plugins': 'Plugins',
  'shell.settings': 'Settings',
  'shell.general': 'General',
  'shell.workspaceFilter': 'Filter workspaces',
  'shell.inProgress': 'In progress',
  'shell.archived': 'Archived',
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
