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
/** Set while the workspace has no tab open: the welcome block is not drawn then, because
 * there is nothing to type into yet. Published by the chrome (src/layout.js) from its tab
 * ledger, read by the stylesheet (src/skin.js), cleared with the skin (src/client.js). */
const NO_TABS_ATTRIBUTE = 'data-smooth-no-tabs';
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
    idle: '#666b70',
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
    idle: '#9aa0a8',
  },
};

/**
 * Theme-token overrides. Every value carries both tones because the theme service
 * requires light and dark together; a token the host does not define is inert.
 */
function buildTokens(state) {
  const dark = PALETTE.dark;
  const light = PALETTE.light;
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

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const state = { ...DEFAULTS };
  if (typeof source.enabled === 'boolean') state.enabled = source.enabled;
  if (source.theme === 'auto' || source.theme === 'dark' || source.theme === 'light') state.theme = source.theme;
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
  if (source.theme === 'auto' || source.theme === 'dark' || source.theme === 'light') config.theme = source.theme;
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
  'shell.appearance': '外观',
  'shell.light': '浅色',
  'shell.dark': '深色',
  'shell.system': '跟随系统',
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
  'settings.subtitle': '深色配色、圆角与列表卡片质感，作用于整个 Harness 界面。',
  'settings.enable': '启用 Smooth 皮肤',
  'settings.enableHint': '关闭后恢复 Harness 原生外观。',
  'settings.theme': '日夜模式',
  'settings.theme.auto': '跟随宿主',
  'settings.theme.dark': '固定深色',
  'settings.theme.light': '固定浅色',
  'settings.themeHint': '固定模式会同步宿主的主题偏好，退出登录或卸载后恢复。',
  'settings.boot': '启动动画',
  'settings.bootHint': '页面加载时播放黑白鲸鱼开场，随后侧栏、标签与输入框依次淡入；下次加载生效，系统开启“减少动态效果”时自动跳过。',
  'settings.bootPreview': '预览',
  'settings.bootPreviewLabel': '预览启动动画',
  'settings.bootPlaying': '播放中…',
  'settings.bootReduced': '（当前系统开启了“减少动态效果”，启动时不会播放，预览不可用。）',
  'settings.windowSize': '启动窗口尺寸',
  'settings.windowSizeHint': '桌面应用启动时把窗口调整成这个尺寸并居中显示（窗口在页面加载完成前是隐藏的，所以第一眼就是这个大小和位置）；超出屏幕可用区域会自动收窄，最小 520 × 600。改完立即生效。',
  'settings.windowSizeWidth': '宽',
  'settings.windowSizeHeight': '高',
  'settings.windowSizeDefault': '恢复 1440 × 900',
  'settings.reset': '恢复默认',
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
  'shell.appearance': 'Appearance',
  'shell.light': 'Light',
  'shell.dark': 'Dark',
  'shell.system': 'System',
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
  'settings.subtitle': 'Dark palette, radii and list-card texture across the whole Harness UI.',
  'settings.enable': 'Enable the Smooth skin',
  'settings.enableHint': 'Turning this off restores the stock Harness appearance.',
  'settings.theme': 'Appearance',
  'settings.theme.auto': 'Follow the host',
  'settings.theme.dark': 'Always dark',
  'settings.theme.light': 'Always light',
  'settings.themeHint': 'A fixed mode also syncs the host theme preference and restores it on unload.',
  'settings.boot': 'Launch animation',
  'settings.bootHint': 'Plays the monochrome whale opening on page load, then fades the sidebar, tabs and input card in. It applies on the next load and is skipped when the system asks for reduced motion.',
  'settings.bootPreview': 'Preview',
  'settings.bootPreviewLabel': 'Preview the launch animation',
  'settings.bootPlaying': 'Playing…',
  'settings.bootReduced': '(Reduced motion is on, so the opening is skipped at startup and cannot be previewed.)',
  'settings.windowSize': 'Window size at launch',
  'settings.windowSizeHint': 'Sizes the desktop window and centres it while the application loads (the window is hidden until the page has loaded, so this is the first size and position you see). Requests beyond the screen work area are clamped; the minimum is 520 × 600. Changes apply immediately.',
  'settings.windowSizeWidth': 'Width',
  'settings.windowSizeHeight': 'Height',
  'settings.windowSizeDefault': 'Reset to 1440 × 900',
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
 * small Git bridge used by the composer's branch menu. The bridge is deliberately
 * narrow: it can read branches/status and switch or create a branch. It never runs
 * a shell (fixed `git` argv, `execFile`), requires a per-activation capability token,
 * and owns
 * one exact route on the existing web server. When that server is absent, the
 * rows still render and the client menus fall back to their read-only path.
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
    ]).then(([child, fs, path]) => ({ child, fs, path }));
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

async function handleGitRequest(req, res, token) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-smooth-token');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.headers['x-smooth-token'] !== token) {
    sendJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'Git bridge denied the request' } });
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
    } else {
      throw new GitBridgeError('action', '未知的 Git 操作');
    }
    sendJson(res, 200, { ok: true, value });
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      error: {
        code: error.code || 'git',
        message: error.message || 'Git 操作失败',
      },
    });
  }
}

/** The capability token is minted once per Host activation and injected into the
 * index beside this bridge's own loopback origin. A page without the token gets a
 * 403, so a random local page cannot drive Git through the listener. The listener
 * is deliberately private to the plugin: the profile's web carrier may activate
 * after this bundle, and a fixed proxy port avoids relying on its route table. */
let gitServer;
function ensureGitServer(ctx) {
  if (gitServer) return gitServer;
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  let port = 39517;
  let base = '';
  let server;
  // `node:http` arrives asynchronously. A plugin that is disposed before that import
  // resolves must not leave a listener behind that nothing can close, so the flag is
  // checked once it lands: a disposed bridge closes the server instead of listening.
  let disposed = false;
  const listen = () => {
    import('node:http').then(({ createServer }) => {
      if (disposed) return;
      server = createServer((req, res) => handleGitRequest(req, res, token));
      server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE' && port < 39527) {
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
