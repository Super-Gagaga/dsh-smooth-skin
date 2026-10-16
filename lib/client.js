window.__ModuleLoader__.load({id:'dsh-smooth-skin',factory:(require)=>{const exports={};
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
    sidebar: '#202123',
    layer1: '#303335',
    layer2: '#323537',
    layer3: '#393a3e',
    overlay: '#2b2b2b',
    text: '#e0e1e3',
    muted: '#b3b5ba',
    faint: '#a4a7af',
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
    error: '#ef3538',
    warn: '#e0a94a',
    success: '#7fb069',
    business: '#85b2ff',
    idle: '#666b70',
  },
  light: {
    app: '#f4f5f7',
    sidebar: '#eceef1',
    layer1: '#ffffff',
    layer2: '#f5f6f8',
    layer3: '#f0f1f4',
    overlay: '#ffffff',
    text: '#31343a',
    muted: '#63676e',
    faint: '#83878e',
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
    bubble: '#eef0f3',
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
  put('--dsw-specific-input-major', 'layer2');
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
  tokens['--smooth-sidebar'] = pair('sidebar');
  tokens['--smooth-surface'] = pair('layer1');
  tokens['--smooth-surface-2'] = pair('layer2');
  tokens['--smooth-surface-3'] = pair('layer3');
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

const SKIN_CSS = `
body[data-smooth-skin]{
  --smooth-radius-lg:26px;--smooth-radius-md:16px;--smooth-radius-sm:11px;
  --smooth-shadow-1:0 2px 4px #0002,0 6px 12px #0003;
  --smooth-shadow-2:0 2px 5px #0004,0 8px 24px #0003;
  --dsw-radius-panel:26px;--dsw-radius-xl:26px;--dsw-radius-lg:16px;--dsw-radius-md:11px;
  --dsw-focus-ring-color:var(--smooth-accent);
  font-family:"Segoe UI","Microsoft YaHei","PingFang SC",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
body[data-smooth-skin][data-ds-dark-theme]{color-scheme:dark}
body[data-smooth-skin]:not([data-ds-dark-theme]){color-scheme:light}

/* Shell geometry continues to be owned by the host, including resize handles. */
/* ChatView also uses a CSS-module class named frame. Only the application frame
   owns a sidebar column; keep its sidebar fill off the conversation canvas. */
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')}){background:var(--smooth-sidebar);--dsh-windows-content-radius:26px}
/* The desktop preload measures this body-level probe to synchronize the native
   caption buttons. Change its token locally, without recoloring the sidebar. */
body[data-smooth-skin]>span[style*="--dsw-specific-sidebar-fill"][style*="--dsw-alias-label-primary"]{--dsw-specific-sidebar-fill:var(--smooth-app)}
/* Leave sidebar color behind the curved tab-bar corner; the rest of the native
   caption remains the workspace color, including the window-button area. */
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')})::before{background:linear-gradient(to right,var(--smooth-sidebar) 0 calc(var(--smooth-left-width) + 35 * var(--smooth-u)),var(--smooth-app) calc(var(--smooth-left-width) + 35 * var(--smooth-u)) 100%)}
body[data-smooth-skin] ${hostPart('frame')}>${hostPart('centerCol')}{background:var(--smooth-app);border-radius:26px 0 0 26px;box-shadow:-2px 0 6px #0001,-6px 0 14px #0001}
body[data-smooth-skin] ${hostPart('sidebarCol')}{background:var(--smooth-sidebar);border-right:0}
body[data-smooth-skin] [data-sidebar-collapsed]>${hostPart('centerCol')}{border-radius:0;box-shadow:none}
body[data-smooth-skin] ${hostPart('centerCol')}>${hostPart('root')}{background:var(--smooth-app)}

/* Rail made from the existing panel buttons and account trigger. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')}){position:relative;padding:8px 14px 10px 70px;background:var(--smooth-sidebar);--dsh-sidebar-inline-padding:14px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')})::before{content:"";position:absolute;top:0;bottom:12px;left:var(--smooth-rail-width);width:1px;background:var(--smooth-line);pointer-events:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('logoRow')}{min-height:46px;margin-bottom:10px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}{min-height:40px;margin-bottom:18px;border:1px solid var(--smooth-line);border-radius:15px;background:var(--smooth-surface-2);font-weight:500}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}:hover{background:var(--smooth-surface-3)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('panelList')}{position:absolute;top:68px;bottom:82px;left:7px;width:42px;overflow:auto;margin:0;gap:10px;padding:0;scrollbar-width:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')}{box-sizing:border-box;display:flex;align-items:center;align-self:center;flex:none;width:var(--smooth-rail-button-size);min-width:0;min-height:var(--smooth-rail-button-size);margin:0;padding:0;justify-content:center;border:0;border-radius:var(--smooth-rail-button-radius);corner-shape:round}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} ${hostPart('panelTitle')}{position:absolute;width:1px;height:1px;padding:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelActive')}{background:var(--smooth-surface-3)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('footArea')}{position:fixed;bottom:12px;left:0;box-sizing:border-box;width:var(--smooth-rail-width);display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0;padding:0;z-index:29}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('triggerRow')}{width:var(--smooth-rail-button-size);margin:0 auto}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('trigger')}{width:var(--smooth-rail-button-size);min-width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);padding:0;justify-content:center;border-radius:var(--smooth-rail-button-radius);corner-shape:round}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('triggerLabel')}{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} button[data-signed-out]{box-sizing:border-box;display:flex;align-items:center;align-self:center;flex:none;width:var(--smooth-rail-button-size);min-width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);margin:0 auto;padding:0;gap:0;justify-content:center;border:0;border-radius:var(--smooth-rail-button-radius);corner-shape:round}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} button[data-signed-out]>${hostPart('label')}{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"]{border-radius:11px}
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"][aria-selected="true"]{background:var(--smooth-surface-3);border-color:transparent;box-shadow:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"]:hover{background:var(--smooth-surface-2)}

/* Preserve the native plugin page; only change its canvas background. */
body[data-smooth-skin] [data-plugin-panel]{background:var(--smooth-app)}

/* Native settings navigation, rows and form controls. */
body[data-smooth-skin] [data-shortcut-modal="settings"]{width:min(1080px,calc(100vw - 48px));border:1px solid var(--smooth-line-strong);border-radius:26px;background:var(--smooth-app);box-shadow:var(--smooth-shadow-2)}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{width:210px;min-width:180px;padding:22px 14px;background:var(--smooth-sidebar);box-shadow:inset -1px 0 var(--smooth-line)}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navTitle')}{font-size:22px;font-weight:600;padding:4px 12px 18px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}{gap:5px}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav button{min-height:42px;padding:10px 12px;border-radius:11px;gap:11px;font-size:14px}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav button[aria-current="true"]{background:var(--smooth-surface-3);font-weight:600;color:var(--smooth-text)}
body[data-smooth-skin] [data-shortcut-modal="settings"]>${hostPart('content')}{background:var(--smooth-app)}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding:4px clamp(20px,3vw,44px) 36px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}>:is(section,div){max-width:1120px;margin-inline:auto}
body[data-smooth-skin] [data-shortcut-modal="settings"] h2{font-size:24px;line-height:1.5;font-weight:600}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')}{padding-block:20px;min-height:76px;border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] [data-shortcut-modal="settings"] :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select){background:var(--smooth-surface);border-color:var(--smooth-line-strong);border-radius:12px;color:var(--smooth-text)}
body[data-smooth-skin] [data-shortcut-modal="settings"] :is(input,textarea,select):focus-visible{outline:2px solid var(--smooth-accent);outline-offset:3px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [role="tab"]{border-radius:999px;padding:7px 15px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [role="tab"][aria-selected="true"]{background:var(--smooth-surface-3)}

/* Conversation: rounded tabs, flat welcome ground and elevated composer. */
body[data-smooth-skin] [data-content-phase]{background:var(--smooth-app)}
body[data-smooth-skin] [data-conversation-scroll]{background:var(--smooth-app)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')}{background:var(--smooth-app);border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')}${hostPart('headerBlank')}{border-top:1px solid var(--smooth-line);border-bottom:0}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('tabs')}{gap:8px;border-bottom:0;padding-block:8px;margin-top:4px}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('tab')}{padding:6px 18px;border:1px solid var(--smooth-line);border-radius:999px;background:transparent;font-size:13px;font-weight:500}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('tabActive')}{background:var(--smooth-surface-3);border-color:var(--smooth-surface-3);color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('tab')}::after{background:transparent}
body[data-smooth-skin] [data-content-phase="hero"] ${hostPart('headline')}{font-size:clamp(25px,2.7vw,38px);font-weight:650;letter-spacing:.01em}
body[data-smooth-skin] [data-content-phase="hero"] ${hostPart('stack')}{gap:24px}
body[data-smooth-skin] [data-content-phase="hero"] ${hostPart('workspaceRow')}{font-size:15px;color:var(--smooth-muted)}
/* One outer frame owns the surface; the editor and toolbar share its background. */
body[data-smooth-skin] [data-composer-card]{--dsw-radius-panel:20px;--dsh-composer-text-max-height:min(300px,40vh);border:1px solid var(--smooth-line-strong);border-radius:20px;background:var(--smooth-surface);padding-top:0;gap:0;box-shadow:var(--smooth-shadow-1);transition:border-color .18s ease,box-shadow .18s ease}
body[data-smooth-skin] [data-composer-card]:focus-within{border-color:color-mix(in srgb,var(--smooth-accent) 55%,var(--smooth-line-strong));box-shadow:var(--smooth-shadow-1)}
body[data-smooth-skin] [data-composer-card]${hostPart('cardWorkspaceTrigger')}{border-style:dashed}
body[data-smooth-skin] [data-composer-card]${hostPart('cardWorkspaceTrigger')}::after{border:0}
body[data-smooth-skin] [data-composer-card] ${hostPart('scroll')}{box-sizing:border-box;padding:12px 16px 0;min-height:64px;max-height:var(--dsh-composer-text-max-height);margin:0;border:0;border-radius:0;background:transparent;flex:1 1 auto}
body[data-smooth-skin] [data-composer-input]{min-height:48px;padding:0;font-size:var(--dsh-content-font-size,14px);line-height:1.65;color:var(--smooth-text)}
body[data-smooth-skin] [data-composer-card] ${hostPart('placeholder')}{inset:0 0 auto;font-size:var(--dsh-content-font-size,14px);line-height:1.65;color:var(--smooth-muted)}
body[data-smooth-skin] [data-composer-card] [data-composer-placeholder][data-smooth-placeholder]{--smooth-composer-placeholder:"";color:transparent}
body[data-smooth-skin] [data-composer-card] [data-composer-placeholder][data-smooth-placeholder]::after{position:absolute;inset:0;content:var(--smooth-composer-placeholder);font-size:var(--dsh-content-font-size,14px);color:var(--smooth-muted)}
body[data-smooth-skin] [data-composer-card] ${hostPart('row')}{box-sizing:border-box;flex:none;min-height:48px;padding:8px 12px;gap:8px;border:0;border-radius:0;background:transparent;font-size:13px;line-height:20px}
body[data-smooth-skin] [data-composer-card] :is(${hostPart('tools')},${hostPart('modes')},${hostPart('trailing')},${hostPart('standardControls')}){gap:8px}
body[data-smooth-skin] [data-composer-card] ${hostPart('accessory')}{border-bottom:1px solid var(--smooth-line);padding:9px 16px;color:var(--smooth-muted)}
body[data-smooth-skin] [data-composer-card] :is(${hostPart('primary')},${hostPart('add')}){box-sizing:border-box;flex:none;width:32px;height:32px;padding:0;border-radius:50%;transform:none}
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}{background:transparent;color:var(--smooth-muted)}
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}:hover:not(:disabled){background:var(--smooth-surface-3);color:var(--smooth-text)}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}{background:var(--smooth-accent);color:var(--smooth-ink);transition:background-color .16s ease,transform .16s ease}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:hover:not(:disabled){background:color-mix(in srgb,var(--smooth-accent) 85%,var(--smooth-text))}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:active:not(:disabled){transform:scale(.94)}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:disabled{background:var(--smooth-surface-3);color:var(--smooth-muted);opacity:.6;cursor:default}
body[data-smooth-skin] .smooth-composer-model{display:flex;align-items:center;min-width:0;max-width:100%;font-size:13px;line-height:20px}
body[data-smooth-skin] .smooth-composer-model button{height:32px;min-height:32px;font-size:inherit;line-height:20px;padding-block:0}
body[data-smooth-skin] [data-chat-flow-kind="assistant-step"]{color:var(--smooth-text)}
body[data-smooth-skin] [data-chat-group-part="reasoning"]{color:var(--smooth-muted)}
/* Flow rows include attachments and actions and span the conversation column.
   Paint only the native bubble, retaining its content-sized, right-aligned stack. */
body[data-smooth-skin] :is([data-chat-flow-kind="user"],[data-chat-flow-kind="steering"]) ${hostPart('bubble')}{border-radius:16px;background:var(--smooth-surface-2)}

/* State styling only; no glyph/font/image replacement. */
body[data-smooth-skin] [role="switch"]:not([data-plugin-panel] *){border-radius:999px;transition:background-color .16s ease;background:var(--smooth-line-strong)}
body[data-smooth-skin] [role="switch"]:not([data-plugin-panel] *):is([aria-checked="true"],:checked){background:var(--dsw-alias-button-primary-fill);color:var(--smooth-ink)}
body[data-smooth-skin] button[role="switch"]:not([data-plugin-panel] *){width:44px;height:26px;padding:3px;box-sizing:border-box}
body[data-smooth-skin] button[role="switch"]:not([data-plugin-panel] *)>span{width:20px;height:20px}
body[data-smooth-skin] button[role="switch"]:not([data-plugin-panel] *)[aria-checked="true"]>span{transform:translateX(18px)}
body[data-smooth-skin] [role="switch"]:not([data-plugin-panel] *)[aria-checked="true"]>span{background:var(--smooth-ink)}
body[data-smooth-skin] :is([role="menu"],[data-popover]){border:1px solid var(--smooth-line-strong);border-radius:20px;background:var(--dsw-alias-bg-overlay);box-shadow:var(--smooth-shadow-2)}
body[data-smooth-skin] [role="menuitem"]{border-radius:13px}
/* Account popup follows the reference's .75px scale. Keep the native menu,
   focus handling, shortcuts, login state and action confirmations intact. */
${accountMenu}{
  --smooth-account-unit:.75px;
  --dsw-menu-surface-fill:color-mix(in srgb,var(--dsw-alias-bg-overlay) 96%,transparent);
  --dsw-menu-backdrop-filter:blur(16px);
  inset:auto auto calc(8 * var(--smooth-account-unit)) max(12px,calc(var(--smooth-rail-width) - 10 * var(--smooth-account-unit)))!important;
  width:min(calc(304 * var(--smooth-account-unit)),calc(100vw - var(--smooth-rail-width) - 8px));
  min-width:0;max-width:none;max-height:calc(100dvh - var(--smooth-caption) - 16px);overflow-x:clip;
  padding:calc(8 * var(--smooth-account-unit)) calc(6 * var(--smooth-account-unit));
  border:1px solid var(--smooth-line);border-radius:calc(26 * var(--smooth-account-unit));corner-shape:round;
  background:transparent;box-shadow:var(--smooth-shadow-2);font-family:inherit;font-size:var(--dsh-content-font-size,14px);
}
${accountMenu} ${accountPart('viewport')}{display:grid;grid-template-columns:minmax(0,1fr);min-width:0;overflow-x:hidden}
${accountMenu} [role="menuitem"]{
  display:flex;align-items:center;width:100%;border:0;background:transparent;text-align:left;cursor:pointer;
  box-sizing:border-box;min-height:calc(43 * var(--smooth-account-unit));
  gap:calc(10 * var(--smooth-account-unit));padding:calc(6 * var(--smooth-account-unit)) calc(12 * var(--smooth-account-unit));
  border-radius:calc(19 * var(--smooth-account-unit));corner-shape:round;
  color:color-mix(in srgb,var(--smooth-text) 40%,var(--dsw-alias-button-primary-fill));
  font-family:inherit;font-size:inherit;line-height:1.4;
}
${accountMenu} ${accountPart('itemIcon')}{width:calc(22 * var(--smooth-account-unit));height:calc(22 * var(--smooth-account-unit));color:var(--smooth-text)}
${accountMenu} ${accountPart('itemIcon')}>svg{width:100%;height:100%}
${accountMenu} ${accountPart('shortcutKeys')}{color:var(--smooth-muted);font-size:inherit;line-height:1.4}
${accountMenu} [role="menuitem"]:is(:hover,:focus-visible):not(:disabled){background:color-mix(in srgb,var(--smooth-surface-3) 85%,var(--smooth-muted));outline:none}
body[data-smooth-skin] .smooth-account-launcher{flex:1;min-width:0;width:100%}
body[data-smooth-skin] .smooth-account-extras{display:contents}
${accountMenu} ${accountPart('viewport')}>${accountPart('itemWrap')}{grid-column:1;grid-row:7}
${accountMenu} ${accountPart('viewport')}>${accountPart('itemWrap')}:nth-child(1){grid-row:5}
${accountMenu} ${accountPart('viewport')}>${accountPart('itemWrap')}:nth-child(2){grid-row:4}
body[data-smooth-skin] .smooth-account-profile{grid-column:1;grid-row:1;display:flex;align-items:center;gap:8px;margin:0 9px 4px;padding:7px 0 10px;border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] .smooth-account-avatar{display:flex;align-items:center;justify-content:center;flex:none;width:23px;height:23px;border-radius:50%;corner-shape:round;overflow:hidden;background:var(--smooth-surface-3)}
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
body[data-smooth-skin] .smooth-account-balance-inner{min-height:0;max-height:200px;overflow:auto;margin:4px 6px 6px;padding:10px;border:1px solid var(--smooth-line);border-radius:12px;corner-shape:round;background:var(--smooth-surface);font-size:inherit;line-height:1.5}
body[data-smooth-skin] .smooth-account-balance-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}
body[data-smooth-skin] .smooth-account-refresh{display:flex;align-items:center;justify-content:center;flex:none;width:26px;height:26px;border:0;border-radius:50%;background:transparent;color:var(--smooth-muted);cursor:pointer}
body[data-smooth-skin] .smooth-account-refresh:hover{background:var(--smooth-surface-3);color:var(--smooth-text)}
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
body[data-smooth-skin] ${hostPart('footArea')} button[data-signed-out][aria-expanded="true"]{border-radius:var(--smooth-rail-button-radius);corner-shape:round;background:var(--smooth-surface-3)}
body[data-smooth-skin] :is(button,[role="menuitem"],a):focus-visible{outline-color:var(--smooth-accent)}
@property --smooth-scrollbar-inset{syntax:"<length>";inherits:true;initial-value:3px}
body[data-smooth-skin] *{scrollbar-width:auto;scrollbar-color:auto}
body[data-smooth-skin] ::-webkit-scrollbar{width:8px;height:8px}
body[data-smooth-skin] ::-webkit-scrollbar-track{background:transparent}
body[data-smooth-skin] ::-webkit-scrollbar-thumb{border:var(--smooth-scrollbar-inset,3px) solid transparent;border-radius:999px;background:var(--dsw-alias-scrollbar-bg-l1);background-clip:content-box;transition:background-color .18s ease}
body[data-smooth-skin] ::-webkit-scrollbar-thumb:hover{background-color:var(--dsw-alias-scrollbar-hover-l1)}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] ::-webkit-scrollbar-thumb{transition:none}}
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

/* Reference geometry. Units intentionally follow the supplied HTML rather than
   giving the existing host layout a second set of approximate dimensions. */
body[data-smooth-skin]{
  --smooth-u:calc(100vw / 1950);--smooth-l:clamp(.72px,calc(100vw / 1790),1.12px);
  --smooth-left-width:clamp(320px,28.5vw,560px);--smooth-rail-width:calc(64 * var(--smooth-l));
  --smooth-rail-button-size:calc(46 * var(--smooth-l));--smooth-rail-icon-size:calc(29 * var(--smooth-l));--smooth-rail-button-radius:calc(14 * var(--smooth-l));
  --smooth-rail-inset:calc((var(--smooth-rail-width) - var(--smooth-rail-button-size)) / 2);
  --smooth-rail-gap:calc(12 * var(--smooth-l));
  --smooth-s:clamp(.78px,calc((100vw - var(--smooth-left-width)) / 1250),1.1px);
  --smooth-caption:clamp(48px,calc(65 * var(--smooth-u)),64px);--dsh-windows-titlebar-height:var(--smooth-caption);
  --smooth-rail-top:calc(var(--smooth-caption) + 18 * var(--smooth-l));
  --smooth-rail-panels-top:calc(var(--smooth-rail-top) + var(--smooth-rail-button-size) + var(--smooth-rail-gap));
}
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')})>${hostPart('centerCol')}{border-radius:0 0 0 calc(35 * var(--smooth-u));overflow:clip;corner-shape:round}
body[data-smooth-skin] .smooth-workspace-bar{
  position:fixed;top:0;left:var(--smooth-left-width);right:132px;height:var(--smooth-caption);
  display:flex;align-items:center;gap:4px;padding:0 calc(10 * var(--smooth-u));background:var(--smooth-app);
  border-radius:calc(35 * var(--smooth-u)) 0 0 0;corner-shape:round;pointer-events:auto;z-index:50;-webkit-app-region:no-drag;
}
body[data-smooth-skin] .smooth-workspace-tabs{display:flex;align-items:center;gap:calc(12 * var(--smooth-u));min-width:0;overflow-x:auto;scrollbar-width:none;flex:1}
body[data-smooth-skin] .smooth-workspace-tab{
  display:flex;align-items:center;justify-content:center;flex:none;max-width:calc(300 * var(--smooth-u));min-width:calc(138 * var(--smooth-u));
  height:calc(43 * var(--smooth-u));padding:0 5px 0 10px;border:1px solid var(--smooth-line);border-radius:999px;
  background:transparent;color:var(--smooth-text);font-family:inherit;font-weight:500;font-size:max(12px,calc(20 * var(--smooth-u)));line-height:1.4;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;
}
body[data-smooth-skin] .smooth-tab-label{display:flex;align-items:center;justify-content:center;align-self:stretch;min-width:0;flex:1;padding:0 5px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;border-radius:999px}
body[data-smooth-skin] .smooth-tab-label>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-workspace-tab[data-preview="true"] .smooth-tab-label{font-style:italic}
body[data-smooth-skin] .smooth-workspace-tab[data-selected="true"]{background:color-mix(in srgb,var(--smooth-surface-3) 80%,var(--smooth-muted));border-color:transparent;font-weight:650}
body[data-smooth-skin] .smooth-workspace-tab:hover{background:var(--smooth-surface-3)}
body[data-smooth-skin] .smooth-tab-close{display:flex;align-items:center;justify-content:center;flex:none;width:20px;height:20px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--smooth-muted);cursor:pointer}
body[data-smooth-skin] .smooth-tab-close:hover{background:var(--smooth-line-strong);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-tab-scroll{display:flex;align-items:center;justify-content:center;flex:none;width:22px;height:28px;border:0;background:transparent;color:var(--smooth-muted);border-radius:50%;cursor:pointer}
body[data-smooth-skin] :is(.smooth-tab-label,.smooth-tab-close,.smooth-tab-scroll,.smooth-rail-home,.smooth-rail-plugins):focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins){
  position:fixed;left:var(--smooth-rail-inset);top:var(--smooth-rail-top);
  display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);padding:0;
  border:0;border-radius:var(--smooth-rail-button-radius);corner-shape:round;background:transparent;color:var(--smooth-muted);pointer-events:auto;z-index:30;cursor:pointer;
}
body[data-smooth-skin] .smooth-rail-home[aria-pressed="true"]{background:var(--smooth-surface-3);color:var(--dsw-alias-button-primary-fill)}
body[data-smooth-skin] .smooth-rail-plugins{top:var(--smooth-rail-panels-top);background:transparent}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins)>svg,
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} svg{width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} ${hostPart('panelIcon')}{width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);display:flex;align-items:center;justify-content:center;flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} button[data-signed-out] ${accountPart('avatar')}{display:flex;align-items:center;justify-content:center;width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);border-radius:50%;overflow:hidden;flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} button[data-signed-out] img{width:100%;height:100%;object-fit:cover}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins):hover,
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('panelRow')},${hostPart('footArea')} button[data-signed-out]):hover{background:var(--smooth-surface-3);color:var(--dsw-alias-button-primary-fill)}
body[data-smooth-skin]:has([data-sidebar-collapsed]) .smooth-rail-home{opacity:0;pointer-events:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')}){padding:calc(4 * var(--smooth-l)) calc(18 * var(--smooth-l)) 10px calc(var(--smooth-rail-width) + 18 * var(--smooth-l))}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('logoRow')}{height:calc(45 * var(--smooth-l));min-height:calc(45 * var(--smooth-l));margin:0;padding:0}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}{height:calc(46 * var(--smooth-l));min-height:calc(46 * var(--smooth-l));margin-top:calc(10 * var(--smooth-l));margin-bottom:calc(16 * var(--smooth-l) + 1px);border-radius:calc(15 * var(--smooth-l));font-size:calc(20 * var(--smooth-l))}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('panelList')}{position:fixed;top:var(--smooth-rail-panels-top);bottom:calc(24px + var(--smooth-rail-button-size));left:0;box-sizing:border-box;width:var(--smooth-rail-width);display:flex;flex-direction:column;align-items:center;gap:var(--smooth-rail-gap);margin:0;padding:0;overflow-x:hidden;overflow-y:auto;z-index:29}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')}{width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);min-height:0}
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="tree"]{font-size:calc(19 * var(--smooth-l))}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('regionArea')}{border-top:1px solid var(--smooth-line);padding-top:10px;margin-inline:0;padding-inline:0}

/* Blank-session welcome: headline, open spacing, centered native workspace picker,
   a second context line and the two-tier input card at the reference position. */
/* Keep the native blank header and its right-sidebar launcher in their original
   position; its top border separates the workspace tabs from the content. */
body[data-smooth-skin] [data-content-phase="hero"] [data-conversation-scroll]{justify-content:initial;position:relative}
body[data-smooth-skin] [data-content-phase="hero"] [data-composer-seat]{flex:1;min-height:540px;position:relative}
body[data-smooth-skin] [data-content-phase="hero"] ${hostPart('composerHero')}{position:relative;display:block;width:100%;max-width:none;height:100%;flex:1;padding:0;align-self:stretch}
body[data-smooth-skin] ${hostPart('composerHero')}>${hostPart('root')}:has(${hostPart('headline')}){
  position:absolute;top:calc(40.65% - 58 * var(--smooth-u));left:50%;transform:translate(-50%,-50%);
  width:min(calc(915 * var(--smooth-u)),calc(100% - 120 * var(--smooth-u)));height:auto;padding:0;
}
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('stack')}{gap:0;max-width:none}
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('headline')}{width:100%;font-size:calc(44 * var(--smooth-u));line-height:1.5;font-weight:700;letter-spacing:calc(1 * var(--smooth-u));padding-bottom:calc(29 * var(--smooth-u));border-bottom:0}
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('previewBadge')}{display:none}
body[data-smooth-skin] ${hostPart('composerHero')}>${hostPart('heroWorkspaceRow')}{position:absolute;top:calc(40.65% + 22 * var(--smooth-u));left:50%;transform:translateX(-50%);justify-content:center;gap:calc(9 * var(--smooth-u));width:90%;margin:0;padding:0;font-size:calc(23 * var(--smooth-u));line-height:calc(41 * var(--smooth-u))}
body[data-smooth-skin] ${hostPart('composerHero')}>${hostPart('heroWorkspaceRow')}::before{content:"我们正在";color:var(--smooth-muted)}
body[data-smooth-skin] ${hostPart('composerHero')}>${hostPart('heroWorkspaceRow')}::after{content:"工作。";color:var(--smooth-muted)}
body[data-smooth-skin] ${hostPart('composerHero')}>${hostPart('heroWorkspaceRow')} button{font-size:inherit}
body[data-smooth-skin] ${hostPart('composerHero')}::after{content:"在当前工作区开始新的对话。";position:absolute;top:calc(40.65% + 63 * var(--smooth-u));left:0;right:0;text-align:center;color:var(--smooth-muted);font-size:calc(23 * var(--smooth-u));line-height:calc(41 * var(--smooth-u));pointer-events:none}
body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('root')}${hostPart('hero')}{
  --smooth-composer-top:max(51.5%,calc(40.65% + 122 * var(--smooth-u)));
  position:absolute;top:var(--smooth-composer-top);left:7.45%;right:8.2%;width:auto;padding:0;
  max-height:max(192px,calc(100% - var(--smooth-composer-top) - 16px));
}
body[data-smooth-skin] ${hostPart('composerHero')} [data-composer-card]{max-width:none;min-height:150px;padding-top:0}
body[data-smooth-skin] ${hostPart('composerHero')} [data-composer-card]:has(.smooth-composer-meta){padding-top:34px}
body[data-smooth-skin] .smooth-composer-meta{position:absolute;top:0;left:0;right:0;box-sizing:border-box;height:34px;padding:0 14px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--smooth-line);font-size:12px;line-height:18px;color:var(--smooth-muted);pointer-events:auto}
body[data-smooth-skin] :is(.smooth-meta-workspace,.smooth-meta-branch){max-width:30%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-meta-branch{display:inline-flex;align-items:center;gap:6px}
body[data-smooth-skin] .smooth-meta-host{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
body[data-smooth-skin] .smooth-meta-divider{flex:none;height:12px;width:1px;background:var(--smooth-line)}
body[data-smooth-skin] [data-smooth-permission-seat]{margin-left:auto;flex:none}
body[data-smooth-skin] .smooth-composer-permission button{height:26px;min-height:26px;padding:0 7px;border-radius:8px;background:transparent;font-size:12px;line-height:18px;gap:5px}
body[data-smooth-skin] .smooth-composer-permission button:hover:not(:disabled){background:var(--smooth-surface-3)}
body[data-smooth-skin] .smooth-composer-permission svg{width:14px;height:14px}
body[data-smooth-skin] .smooth-hero-branch{display:inline-flex;align-items:center;gap:calc(16 * var(--smooth-u));min-width:0}
body[data-smooth-skin] .smooth-hero-branch .smooth-meta-branch{max-width:240px;color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] .smooth-composer-preset{display:inline-flex;align-items:center;min-width:0}
body[data-smooth-skin] .smooth-composer-preset button{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 8px;border-radius:8px;background:transparent;font-size:13px;line-height:20px;font-weight:500;color:var(--smooth-text)}
body[data-smooth-skin] .smooth-composer-preset button:hover:not(:disabled){background:var(--smooth-surface-3)}

/* Full-workspace settings retain the native store, rows, focus and controls. */
body[data-smooth-skin] [data-shortcut-modal="settings"]{position:fixed;inset:var(--smooth-caption) 0 0 var(--smooth-rail-width);width:auto;height:auto;max-width:none;max-height:none;border:0;border-radius:0;box-shadow:none}
body[data-smooth-skin] [role="presentation"]:has(>[data-shortcut-modal="settings"])>[aria-hidden="true"]{background:transparent;backdrop-filter:none}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{box-sizing:border-box;width:calc(var(--smooth-left-width) - var(--smooth-rail-width));min-width:0;padding:calc(30 * var(--smooth-l)) calc(16 * var(--smooth-l));gap:calc(20 * var(--smooth-l))}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navTitle')}{padding:0 calc(8 * var(--smooth-l));font-size:calc(28 * var(--smooth-l));line-height:1.5}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav button{height:calc(48 * var(--smooth-l));min-height:0;font-size:calc(19 * var(--smooth-l));padding:calc(10 * var(--smooth-l)) calc(16 * var(--smooth-l));gap:calc(13 * var(--smooth-l))}
body[data-smooth-skin] [data-shortcut-modal="settings"]>${hostPart('content')}{border-radius:0 0 0 calc(35 * var(--smooth-u))}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('header')}{height:calc(32 * var(--smooth-s));padding:6px 16px 0}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('header')} ${hostPart('action')}{position:absolute;top:calc(44 * var(--smooth-s));right:calc(56 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding:0 calc(56 * var(--smooth-s)) calc(56 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')}{box-sizing:border-box;min-height:calc(92 * var(--smooth-s));padding-block:calc(22 * var(--smooth-s))}
body[data-smooth-skin] .smooth-general-title{margin:calc(8 * var(--smooth-s)) 0 calc(20 * var(--smooth-s));font-size:calc(30 * var(--smooth-s));line-height:1.5;font-weight:650}
body[data-smooth-skin] .smooth-native-appearance{padding:calc(22 * var(--smooth-s)) 0;border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] .smooth-native-appearance h3{margin:0 0 calc(12 * var(--smooth-s));font-size:calc(19 * var(--smooth-s));line-height:1.5;font-weight:550}
body[data-smooth-skin] .smooth-native-appearance-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:calc(12 * var(--smooth-s))}
body[data-smooth-skin] .smooth-native-appearance-options button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(12 * var(--smooth-s));min-height:calc(124 * var(--smooth-s));padding:calc(20 * var(--smooth-s)) calc(12 * var(--smooth-s));border:1px solid var(--smooth-line-strong);border-radius:calc(25 * var(--smooth-s));background:transparent;color:var(--smooth-text);font:inherit;font-size:calc(21 * var(--smooth-s));cursor:pointer}
body[data-smooth-skin] .smooth-native-appearance-options button[aria-checked="true"]{background:var(--smooth-surface-2);border-color:var(--smooth-muted)}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')} ${hostPart('title')}{font-size:calc(19 * var(--smooth-s));line-height:1.5;font-weight:600}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')} :is(${hostPart('desc')},${hostPart('description')}){font-size:calc(16 * var(--smooth-s));line-height:1.5}

/* Each item has its own slot wrapper, so :last-child on a native row matches
   many rows. Style the actual item roots, including Shortcuts' setting root. */
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('row')},${hostPart('setting')}){box-sizing:border-box;min-height:calc(92 * var(--smooth-s));padding-block:calc(22 * var(--smooth-s));border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('settingTitle')},${hostPart('title')}){font-size:calc(19 * var(--smooth-s));font-weight:550;line-height:1.5}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('settingDescription')},${hostPart('desc')},${hostPart('description')}){font-size:calc(15 * var(--smooth-s));line-height:1.65;color:var(--smooth-muted)}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('selector')},${hostPart('stepper')}){box-sizing:border-box;min-height:calc(42 * var(--smooth-s));border:1px solid var(--smooth-line-strong);border-radius:calc(12 * var(--smooth-s));background:var(--smooth-surface);font-size:calc(18 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] ${hostPart('selector')}{min-width:calc(150 * var(--smooth-s));justify-content:space-between;padding-inline:calc(14 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] ${hostPart('stepper')}{min-width:calc(108 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] ${hostPart('value')}{font-size:calc(18 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] ${hostPart('button')}{min-height:calc(40 * var(--smooth-s));border:1px solid var(--smooth-line-strong);border-radius:999px;background:transparent;font-size:calc(16 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"]>${hostPart('content')}>${hostPart('header')}>${hostPart('close')}{position:fixed;top:calc((var(--smooth-caption) - 28px) / 2);right:144px;z-index:55}
body[data-smooth-skin] [data-shortcut-modal="settings"] .smooth-workspace-bar{right:180px}
body[data-smooth-skin] [data-shortcut-modal="settings"] button[role="switch"]{width:calc(44 * var(--smooth-s));height:calc(26 * var(--smooth-s));padding:calc(3 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"] button[role="switch"]>span{width:calc(20 * var(--smooth-s));height:calc(20 * var(--smooth-s))}
body[data-smooth-skin] [data-shortcut-modal="settings"] button[role="switch"][aria-checked="true"]>span{transform:translateX(calc(18 * var(--smooth-s)))}
body[data-smooth-skin] :is(.smooth-workspace-tab,.smooth-native-appearance-options button,[data-composer-card]){corner-shape:round}
@media(max-width:800px){
  body[data-smooth-skin] .smooth-workspace-bar{left:0;right:128px;padding-left:92px}
  body[data-smooth-skin] [data-shortcut-modal="settings"]{left:0}
  body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{width:160px}
  body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding-inline:20px}
  body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('headline')}{font-size:26px}
  body[data-smooth-skin] ${hostPart('composerHero')}>${hostPart('heroWorkspaceRow')}{font-size:14px}
  body[data-smooth-skin] ${hostPart('composerHero')}::after{font-size:13px}
  body[data-smooth-skin] .smooth-composer-meta{gap:8px}
  body[data-smooth-skin] .smooth-meta-host{font-size:12px}
}
`;

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

/** Render native controls into reference positions without moving React-owned DOM.
 * The native component keeps its locale, injected actions, hooks and confirmations. */
function installComposerLayout({ slots, remote, useSmoothState, text }) {
  const { createPortal } = require('react-dom');
  const ui = require('@deepseek-ai/dsh-client-ui-primitives');
  const disposers = [];
  const hero = '[data-content-phase="hero"]';
  function useTarget(selector) {
    const [target, setTarget] = React.useState(null);
    React.useEffect(() => {
      const update = () => setTarget(document.querySelector(selector));
      update();
      const observer = new MutationObserver(update);
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
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
  function Metadata(props) {
    const skin = useSmoothState();
    const sessions = props.useSessions((value) => value);
    const workspaces = props.useWorkspaces((value) => value);
    const session = sessions.byId?.[props.sessionId];
    const workspace = workspaces.items?.find((item) => item.sessionIds.includes(props.sessionId));
    const name = workspace?.title || session?.cwd?.split(/[\\/]/).filter(Boolean).pop();
    const card = useTarget(`${hero} [data-composer-card]`);
    const row = useTarget(`${hero} ${hostPart('heroWorkspaceRow')}`);
    const branch = useBranch(card && skin.state.enabled ? props.sessionId : undefined, session?.cwd);
    if (!skin.state.enabled || !card) return null;
    const git = branch && h('span', { className: 'smooth-meta-branch', title: branch }, h(ui.IconBranchOutlineRegular, { size: 16, 'aria-hidden': true }), branch);
    return h(React.Fragment, null,
      createPortal(h('div', { className: 'smooth-composer-meta' },
        name && h('span', { className: 'smooth-meta-workspace', title: session?.cwd }, name), git,
        h('span', { className: 'smooth-meta-divider', 'aria-hidden': true }),
        h('span', { className: 'smooth-meta-host' }, h(ui.IconFollowsystemOutlineRegular, { size: 16, 'aria-hidden': true }), text('shell.host', '当前主机')),
        h('div', { 'data-smooth-permission-seat': '' })), card),
      row && git && createPortal(h('span', { className: 'smooth-hero-branch' }, h('span', { 'aria-hidden': true }, '/'), git), row));
  }
  disposers.push(slots.inject('conversation.input.overlay', () => slots.register({ name: 'conversation.input.overlay', id: `${PLUGIN_ID}.metadata`, order: -100 }, Metadata)));
  function ComposerHint(props) {
    const skin = useSmoothState();
    const target = useTarget('[data-composer-card] [data-composer-placeholder]');
    const heroPrompt = props.t('placeholder.hero');
    const normalPrompt = props.t('placeholder.default');
    const shortPrompt = text('composer.placeholder', '描述任务，/ 调用指令，@ 引用文件或对话');
    React.useEffect(() => {
      if (skin.state.enabled) return installComposerHint(target, [heroPrompt, normalPrompt], shortPrompt);
    }, [target, heroPrompt, normalPrompt, shortPrompt, skin.state.enabled]);
    return null;
  }
  disposers.push(slots.inject('conversation.input.overlay', () => slots.register({ name: 'conversation.input.overlay', id: `${PLUGIN_ID}.hint`, order: -90, locale: 'conversation' }, ComposerHint)));
  function decorate(name, wrap) {
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
        disposeNative = slots.register({ name, priority: (native.options.priority || 0) - 10, registrant: PLUGIN_ID,
          locale: native.locale, inject: native.inject, store: native.store }, wrap(original.component));
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
  disposers.push(decorate('conversation.input.model', Native => function ModelControl(props) {
    const skin = useSmoothState();
    const control = h(Native, props);
    return skin.state.enabled ? h('div', { className: 'smooth-composer-model' }, control) : control;
  }));
  disposers.push(relocate('conversation.hero.agentPreset', `${hero} [data-composer-card] ${hostPart('tools')}`, 'smooth-composer-preset'));
  disposers.push(relocate('conversation.input.permission', `${hero} [data-smooth-permission-seat]`, 'smooth-composer-permission'));
  return () => { for (const dispose of disposers.reverse()) dispose?.(); };
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
          const onKey = (event) => { if (marked) navigateAccountMenu(event, marked); };
          const observe = () => {
            const open = root.current?.querySelector('button[data-signed-out][aria-expanded="true"]');
            const menu = open ? document.querySelector('body > [role="menu"]') : null;
            if (marked !== menu) {
              marked?.removeAttribute('data-smooth-account-menu');
              marked?.removeEventListener('keydown', onKey, true);
              marked = menu;
              marked?.addEventListener('keydown', onKey, true);
            }
            menu?.setAttribute('data-smooth-account-menu', '');
            setTarget(menu?.querySelector(accountPart('viewport')) || null);
          };
          observe();
          const observer = new MutationObserver(observe);
          observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-expanded'] });
          return () => { observer.disconnect(); marked?.removeEventListener('keydown', onKey, true); marked?.removeAttribute('data-smooth-account-menu'); };
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

function currentWorkspaceTab(snapshot, panel, settingsOpen, panelTitle, text) {
  if (settingsOpen) return { key: 'settings', kind: 'settings', title: text('shell.settings', '设置') };
  if (panel) return { key: `panel:${panel}`, kind: 'panel', id: panel, title: panelTitle || (panel === 'plugins' ? text('shell.plugins', '插件') : panel) };
  const byId = snapshot?.byId || {};
  const currentId = snapshot?.current || Object.keys(byId).find((id) => byId[id]?.retainedBy?.mainView > 0);
  const current = byId[currentId];
  return currentId && current
    ? { key: `session:${currentId}`, kind: 'session', id: currentId, title: current.blank ? text('shell.new', '新会话') : current.title || text('shell.untitled', '未命名会话') }
    : { key: 'home', kind: 'home', title: text('shell.home', '首页') };
}

/** UI-only ledger: one replaceable preview and an ordered list of operated tabs.
 * Closing an entry only changes this ledger; session lifetime belongs to DSH. */
function createWorkspaceTabs() {
  let state = { pinned: [], preview: null, activeKey: null };
  const listeners = new Set();
  const publish = (next) => { state = next; for (const listener of listeners) listener(); };
  const items = () => [...state.pinned, ...(state.preview ? [state.preview] : [])];
  return {
    getSnapshot: () => state,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    show(tab) {
      const existing = state.pinned.find(item => item.key === tab.key);
      if (state.activeKey === tab.key && (existing || state.preview)?.title === tab.title) return;
      publish({ activeKey: tab.key,
        pinned: existing ? state.pinned.map(item => item.key === tab.key ? tab : item) : state.pinned,
        preview: existing ? state.preview : tab });
    },
    pin(tab) {
      if (!tab) return;
      const existing = state.pinned.find(item => item.key === tab.key);
      if (existing?.title === tab.title) return;
      publish({ ...state, activeKey: tab.key,
        pinned: existing ? state.pinned.map(item => item.key === tab.key ? tab : item) : [...state.pinned, tab],
        preview: state.preview?.key === tab.key ? null : state.preview });
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
 * Use a native non-passive listener so the content below cannot scroll with it. */
function installTabScroll(node) {
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
  const animate = (time) => {
    const elapsed = lastTime === undefined ? 16 : Math.min(48, time - lastTime);
    lastTime = time;
    target = Math.max(0, Math.min(node.scrollWidth - node.clientWidth, target));
    const distance = target - node.scrollLeft;
    if (Math.abs(distance) < .5 || reducedMotion?.matches) {
      node.scrollLeft = target;
      frame = null;
      lastTime = undefined;
      return;
    }
    // Time-based easing keeps the speed consistent on high refresh-rate screens.
    const previous = node.scrollLeft;
    node.scrollLeft += distance * (1 - Math.exp(-elapsed / 55));
    // Scroll offsets can round to device pixels. Finish when the easing step
    // becomes too small to move, instead of leaving a frame loop running forever.
    if (node.scrollLeft === previous) {
      node.scrollLeft = target;
      frame = null;
      lastTime = undefined;
      return;
    }
    frame = window.requestAnimationFrame(animate);
  };
  const scrollBy = (delta) => {
    if (frame === null) target = node.scrollLeft;
    target = Math.max(0, Math.min(node.scrollWidth - node.clientWidth, target + delta));
    if (reducedMotion?.matches) { stop(); node.scrollLeft = target; }
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

function installReferenceShell({ slots, layout, uiWorkspace, theme, remote, subscribeTheme, chooseTheme, useSmoothState, text }) {
  if (!slots || !layout || !uiWorkspace) return { dispose() {} };
  const ui = require('@deepseek-ai/dsh-client-ui-primitives');
  const layoutStore = sharedSurfaceStore(slots, 'root', 'setSidebar');
  const settingsStore = sharedSurfaceStore(slots, 'sidebar.settings', 'open');
  let previousWidth;
  let appliedWidth;
  let active = false;
  const workspaceTabs = createWorkspaceTabs();
  let currentView;
  let appearanceDispose;
  let headingDispose;
  let composerDispose;
  let accountDispose;
  const disposers = [];
  const recordOperation = (event) => { if (active && isWorkspaceOperation(event)) workspaceTabs.pin(currentView); };
  for (const type of ['input', 'change', 'click']) {
    document.addEventListener(type, recordOperation, true);
    disposers.push(() => document.removeEventListener(type, recordOperation, true));
  }
  const setLeftWidth = () => {
    const info = layoutStore?.getSnapshot().layoutInfo;
    if (info) document.body.style.setProperty('--smooth-left-width', `${info.sidebar || 0}px`);
  };
  function setEnabled(enabled) {
    if (enabled === active) return;
    active = enabled;
    if (enabled) {
      composerDispose = installComposerLayout({ slots, remote, useSmoothState, text });
      accountDispose = installAccountMenu({ slots, text });
    } else {
      composerDispose?.(); composerDispose = undefined;
      accountDispose?.(); accountDispose = undefined;
    }
    if (enabled && theme) {
      appearanceDispose = slots.inject('settings.general.item', () => slots.register({ name: 'settings.general.item', id: 'appearance', order: 10, priority: -10 }, Appearance));
      headingDispose = slots.inject('settings.general.item', () => slots.register({ name: 'settings.general.item', id: `${PLUGIN_ID}.heading`, order: -100 }, () => h('h1', { className: 'smooth-general-title' }, text('shell.general', '通用设置'))));
    } else {
      appearanceDispose?.(); headingDispose?.();
      appearanceDispose = headingDispose = undefined;
    }
    if (!layoutStore) return;
    const current = layoutStore.getSnapshot().layoutInfo.sidebar;
    if (enabled) {
      previousWidth = current;
      if (current > 0) {
        appliedWidth = Math.min(560, Math.max(320, Math.round(window.innerWidth * .285)));
        layoutStore.actions.setSidebar(appliedWidth);
      }
    } else if (current === appliedWidth) layoutStore.actions.setSidebar(previousWidth);
    setLeftWidth();
  }
  if (layoutStore) { disposers.push(layoutStore.subscribe(setLeftWidth)); setLeftWidth(); }
  function closeSettings() { settingsStore?.actions.close(); }
  function openSession(id) { closeSettings(); uiWorkspace.openSession(id); }
  function openHome() { closeSettings(); uiWorkspace.clearMain(); }
  function openMain(panel, settingsOpen) {
    if (!panel && !settingsOpen) return;
    if (settingsOpen) closeSettings();
    if (panel) layout.selectPanel(null);
  }
  function openPlugins() { closeSettings(); layout.selectPanel('plugins'); }
  function openSettings() {
    if (settingsStore?.actions.openSection) settingsStore.actions.openSection('general');
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
    else { openHome(); workspaceTabs.show({ key: 'home', kind: 'home', title: text('shell.home', '首页') }); }
  }
  function Appearance() {
    const preference = React.useSyncExternalStore(subscribeTheme, () => theme.getTheme().preference);
    const modes = [
      ['light', 'shell.light', '浅色', ui.IconLightOutlineRegular],
      ['dark', 'shell.dark', '深色', ui.IconDarkOutlineRegular],
      ['system', 'shell.system', '跟随系统', ui.IconFollowsystemOutlineRegular],
    ];
    return h('section', { className: 'smooth-native-appearance' },
      h('h3', null, text('shell.appearance', '外观')),
      h('div', { className: 'smooth-native-appearance-options', role: 'radiogroup', 'aria-label': text('shell.appearance', '外观') },
        ...modes.map(([id, key, fallback, icon]) => h('button', {
          key: id, type: 'button', role: 'radio', 'aria-checked': preference === id,
          onClick: () => chooseTheme(id),
        }, h(icon, { size: 24, 'aria-hidden': true }), text(key, fallback)))));
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
    const ownsSurface = skin.state.enabled && !!props.inSettings === settingsOpen;
    React.useEffect(() => {
      if (!ownsSurface) return;
      currentView = view;
      workspaceTabs.show(view);
    }, [ownsSurface, view.key, view.title]);
    const scroll = React.useRef(null);
    const tabScroll = React.useRef(null);
    React.useEffect(() => {
      if (!ownsSurface) return;
      const controller = installTabScroll(scroll.current);
      tabScroll.current = controller;
      return () => { controller?.dispose(); tabScroll.current = null; };
    }, [ownsSurface]);
    const [overflow, setOverflow] = React.useState({ left: false, right: false });
    const updateOverflow = () => {
      const node = scroll.current;
      if (!node) return;
      const next = { left: node.scrollLeft > 1, right: node.scrollLeft + node.clientWidth < node.scrollWidth - 1 };
      setOverflow((old) => old.left === next.left && old.right === next.right ? old : next);
    };
    const tabs = [...tabState.pinned, ...(tabState.preview ? [tabState.preview] : [])];
    const tabSignature = `${tabState.activeKey}/${tabs.map(item => `${item.key}:${item.title}`).join('/')}`;
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
    const tabItems = tabs.map(item => {
      const selected = item.key === tabState.activeKey;
      const preview = item.key === tabState.preview?.key;
      return h('div', { key: item.key, className: 'smooth-workspace-tab', 'data-selected': selected, 'data-preview': preview },
        h('button', { role: 'tab', type: 'button', className: 'smooth-tab-label', 'aria-selected': selected, tabIndex: selected ? 0 : -1,
          title: item.title, onClick: () => activateTab(item), onDoubleClick: () => workspaceTabs.pin(item), onKeyDown: event => {
            if (event.key === 'Delete') { event.preventDefault(); event.stopPropagation(); closeTab(item); }
          } }, h('span', null, item.title)),
        h('button', { type: 'button', className: 'smooth-tab-close', tabIndex: selected ? 0 : -1,
          'aria-label': `${text('shell.closeTab', '关闭标签页')}：${item.title}`, title: text('shell.closeTab', '关闭标签页'),
          onClick: event => { event.stopPropagation(); closeTab(item); } },
          h('svg', { width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, 'aria-hidden': true }, h('path', { d: 'm4 4 8 8M12 4l-8 8' }))));
    });
    return h(React.Fragment, null,
      h('button', { type: 'button', className: 'smooth-rail-home', 'aria-pressed': !panel && !settingsOpen, title: text('shell.main', '主页面'), 'aria-label': text('shell.main', '主页面'), onClick: () => openMain(panel, settingsOpen) },
        h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, h('path', { d: 'm3 10.5 9-7.5 9 7.5M5 9v10a2 2 0 0 0 2 2h3v-7h4v7h3a2 2 0 0 0 2-2V9' }))),
      props.inSettings && h('button', { type: 'button', className: 'smooth-rail-plugins', title: '插件', 'aria-label': '插件', onClick: openPlugins }, h(ui.IconPluginPinwheelOutlineRegular, { size: 23, 'aria-hidden': true })),
      h('div', { className: 'smooth-workspace-bar' },
        overflow.left && h('button', { type: 'button', className: 'smooth-tab-scroll', 'aria-label': '向左滚动标签页', onClick: () => tabScroll.current?.scrollBy(-240) }, h(ui.IconChevronLeftOutlineRegular, { size: 15 })),
        h('nav', { ref: scroll, onScroll: updateOverflow, className: 'smooth-workspace-tabs', role: 'tablist', 'aria-label': '工作区标签页', onKeyDown: (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          const buttons = [...event.currentTarget.querySelectorAll('[role="tab"]')];
          const current = event.target.closest('[role="tab"]') || event.target.closest('.smooth-workspace-tab')?.querySelector('[role="tab"]');
          const index = buttons.indexOf(current);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
          event.preventDefault(); buttons[next]?.focus(); buttons[next]?.click();
        } },
          ...tabItems),
        overflow.right && h('button', { type: 'button', className: 'smooth-tab-scroll', 'aria-label': '向右滚动标签页', onClick: () => tabScroll.current?.scrollBy(240) }, h(ui.IconChevronRightOutlineRegular, { size: 15 })),
      ));
  }
  disposers.push(slots.inject('shell.overlay', () => slots.register({ name: 'shell.overlay', id: `${PLUGIN_ID}.chrome`, order: 10 }, Chrome)));
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
const inject = ['slots', 'theme', 'locale', 'layout', 'uiWorkspace', 'remote', 'remote.workspaceFiles'];
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
.smooth-button{font:inherit;font-size:13px;padding:8px 16px;border-radius:999px;border:1px solid var(--dsw-alias-border-l3);background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;cursor:pointer}
.smooth-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(128,128,128,.12))}
.smooth-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
.smooth-button:disabled{opacity:.5;cursor:default}
.smooth-status{font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.smooth-status[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
@media(max-width:600px){.smooth-choices{gap:8px}.smooth-choice{min-height:72px;font-size:12px;padding:16px 6px}.smooth-row{gap:14px}}
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

  function writeState(next) {
    state = normalize(next);
    failure = '';
    emit();
    sync();
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

  function ToggleRow(props) {
    return h('div', { className: 'smooth-row' },
      h('div', { className: 'smooth-row-copy' },
        h('h3', null, props.title),
        props.hint ? h('small', null, props.hint) : null),
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

  function SmoothSettings() {
    const view = useSmoothState();
    const current = view.state;
    const disabled = !view.ready;
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
        })),
      h('section', null,
        h('div', { className: 'smooth-footer' },
          h('button', {
            type: 'button',
            className: 'smooth-button',
            disabled,
            onClick: () => view.update({ enabled: true, theme: 'auto' }),
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
    document.body.removeAttribute(SKIN_ATTRIBUTE);
  }, 'smooth-skin');

  referenceShell = installReferenceShell({ slots, layout, uiWorkspace, theme, remote, useSmoothState, text,
    subscribeTheme: (listener) => ctx.on('theme/change', listener),
    chooseTheme: (preference) => { writeState({ ...state, theme: 'auto' }); theme?.setTheme(preference); },
  });
  readState();
}

// The module loader activates the returned exports object, not local declarations.
exports.name = PLUGIN_ID;
exports.inject = inject;
exports.apply = apply;

return exports;}});
