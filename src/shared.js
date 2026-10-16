/**
 * Shared half of the Smooth bundle: the design palette, the theme-token map and
 * the persisted-state normalizer. Both halves read this file (build.mjs folds it
 * into lib/index.js and lib/client.js).
 */

/** Must stay identical to package.json `name`: the client module table keys on it. */
const PLUGIN_ID = 'dsh-smooth-skin';
const SKIN_ATTRIBUTE = 'data-smooth-skin';
/** The Client half's durable store. Reaching no host service is what keeps activation safe. */
const STORAGE_KEY = 'dsh-smooth-skin:state';

const DEFAULTS = {
  enabled: true,
  theme: 'auto',
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
  put('--dsw-alias-state-negative-primary', 'error');
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

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const state = { ...DEFAULTS };
  if (typeof source.enabled === 'boolean') state.enabled = source.enabled;
  if (source.theme === 'auto' || source.theme === 'dark' || source.theme === 'light') state.theme = source.theme;
  return state;
}

function configFromState(state) {
  return { enabled: state.enabled, theme: state.theme };
}

function normalizeConfig(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const config = {};
  if (typeof source.enabled === 'boolean') config.enabled = source.enabled;
  if (source.theme === 'auto' || source.theme === 'dark' || source.theme === 'light') config.theme = source.theme;
  return config;
}

const LocaleNS = 'smooth';
const zhCN = {
  'composer.placeholder': '描述任务，/ 调用指令，@ 引用文件或对话',
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
  'shell.host': '当前主机',
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
  'settings.reset': '恢复默认',
  'settings.loading': '正在读取设置…',
  'settings.saved': '已保存',
};

const enUS = {
  'composer.placeholder': 'Describe a task, / commands, @ files or chats',
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
  'shell.host': 'Current host',
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
  'settings.reset': 'Reset to defaults',
  'settings.loading': 'Reading settings…',
  'settings.saved': 'Saved',
};
