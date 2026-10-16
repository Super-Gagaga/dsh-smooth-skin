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
