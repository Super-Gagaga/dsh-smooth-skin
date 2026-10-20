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
  --smooth-radius-lg:26px;--smooth-radius-md:16px;--smooth-radius-sm:11px;
  --smooth-shadow-1:0 2px 4px #0002,0 6px 12px #0003;
  --smooth-shadow-2:0 2px 5px #0004,0 8px 24px #0003;
  --dsw-radius-panel:26px;--dsw-radius-xl:26px;--dsw-radius-lg:16px;--dsw-radius-md:11px;
  --dsw-focus-ring-color:var(--smooth-accent);
  font-family:"Segoe UI","Microsoft YaHei","PingFang SC",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  position:fixed;inset:0;width:100%;height:100dvh;min-height:0;overflow:clip;overscroll-behavior:none;
}
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

/* Shell geometry continues to be owned by the host, including resize handles. */
/* ChatView also uses a CSS-module class named frame. Only the application frame
   owns a sidebar column; keep its sidebar fill off the conversation canvas. */
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')}){height:100%;min-height:0;max-height:100%;background:var(--smooth-sidebar);--dsh-windows-content-radius:26px}
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')})>:is(${hostPart('sidebarCol')},${hostPart('centerCol')}){min-height:0}
/* The desktop preload measures this body-level probe to synchronize the native
   caption buttons. Change its token locally, without recoloring the sidebar. */
body[data-smooth-skin]>span[style*="--dsw-specific-sidebar-fill"][style*="--dsw-alias-label-primary"]{--dsw-specific-sidebar-fill:var(--smooth-surface)}
/* Leave sidebar color behind the curved tab-bar corner; the rest of the native
   caption remains the workspace color, including the window-button area. */
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')})::before{background:linear-gradient(to right,var(--smooth-sidebar) 0 calc(var(--smooth-left-width) + 18px),var(--smooth-surface) calc(var(--smooth-left-width) + 18px) 100%)}
/* The centre surface is flat: no ambient shadow lifts it off the sidebar, so the page
   reads as one continuous ground instead of a lit panel floating above it. */
body[data-smooth-skin] ${hostPart('frame')}>${hostPart('centerCol')}{position:relative;z-index:1;box-sizing:border-box;background:var(--smooth-app);border-left:0;border-radius:26px 0 0 26px}
body[data-smooth-skin] ${hostPart('sidebarCol')}{background:var(--smooth-sidebar);border-right:0}
body[data-smooth-skin] [data-sidebar-collapsed]>${hostPart('centerCol')}{border-left:0;border-radius:0;box-shadow:none}
body[data-smooth-skin] ${hostPart('centerCol')}>${hostPart('root')}{background:var(--smooth-app)}

/* Rail made from the existing panel buttons and account trigger. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')}){position:relative;padding:8px 14px 10px 70px;background:var(--smooth-sidebar);--dsh-sidebar-inline-padding:14px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')})::after{content:"";position:absolute;top:0;bottom:0;left:0;width:var(--smooth-rail-width);border-radius:0 14px 0 0;corner-shape:round;background:var(--smooth-rail);box-shadow:none;pointer-events:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('logoRow')}{min-height:46px;margin-bottom:10px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}{min-height:40px;margin-bottom:18px;border:1px solid var(--smooth-line);border-radius:15px;background:var(--smooth-surface-2);font-weight:500}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}:hover{background:var(--smooth-surface-3)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('panelList')}{position:absolute;top:68px;bottom:82px;left:var(--smooth-rail-inset);width:var(--smooth-rail-button-size);overflow:auto;margin:0;gap:var(--smooth-rail-gap);padding:0;scrollbar-width:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')}{box-sizing:border-box;display:flex;align-items:center;align-self:center;flex:none;width:var(--smooth-rail-button-size);min-width:0;min-height:var(--smooth-rail-button-size);margin:0;padding:0;justify-content:center;border:0;border-radius:var(--smooth-rail-button-radius);corner-shape:round}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} ${hostPart('panelTitle')}{position:absolute;width:1px;height:1px;padding:0;clip-path:inset(50%);overflow:hidden;white-space:nowrap}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelActive')}{background:var(--smooth-selected)}
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
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} ${hostPart('indicator')}[aria-disabled]:hover:not([aria-disabled="true"]){background:var(--smooth-surface-3);color:var(--dsw-alias-brand-primary-new-colorprimary-new-color)}
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
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"]{border-radius:8px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}{height:28px;border-radius:8px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')} ${hostPart('title')}{font-size:12.5px;line-height:18px;color:var(--smooth-muted)}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sessionRow')}[aria-selected="true"] ${hostPart('title')}{color:var(--smooth-text)}
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
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('projectRow')}{height:29px;border-radius:8px}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('projectRow')} :is(${hostPart('folder')},${hostPart('chevron')}){display:none}
/* Workspace group titles are the sidebar's section headers: they keep the host's own
   title colour so the tree reads as one list; only their size/weight is tightened. */
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('projectRow')} ${hostPart('title')}{font-size:13.5px;line-height:19px;font-weight:500}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('sectionLabel')}{font-size:12px;line-height:18px}
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"][aria-selected="true"]{background:var(--smooth-selected);border-color:transparent;box-shadow:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} [role="treeitem"]:not([aria-selected="true"]):hover{background:var(--smooth-surface-2)}

/* Preserve the native plugin page; only change its canvas background. */
body[data-smooth-skin] [data-plugin-panel]{background:var(--smooth-app)}

/* Native settings navigation, rows and form controls. */
body[data-smooth-skin] [data-shortcut-modal="settings"]{width:min(1080px,calc(100vw - 48px));border:1px solid var(--smooth-line-strong);border-radius:26px;background:var(--smooth-app);box-shadow:var(--smooth-shadow-2)}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{width:210px;min-width:180px;padding:22px 14px;background:var(--smooth-sidebar);box-shadow:none}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navTitle')}{font-size:22px;font-weight:600;padding:4px 12px 18px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}{gap:5px}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav button{min-height:42px;padding:10px 12px;border-radius:11px;gap:11px;font-size:14px}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav button[aria-current="true"]{background:var(--smooth-selected);font-weight:600;color:var(--smooth-text)}
body[data-smooth-skin] [data-shortcut-modal="settings"]>${hostPart('content')}{background:var(--smooth-app)}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding:4px clamp(20px,3vw,44px) 36px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}>:is(section,div){max-width:1120px;margin-inline:auto}
body[data-smooth-skin] [data-shortcut-modal="settings"] h2{font-size:24px;line-height:1.5;font-weight:600}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('row')}{padding-block:20px;min-height:76px;border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] [data-shortcut-modal="settings"] :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select){background:var(--smooth-surface);border-color:var(--smooth-line-strong);border-radius:12px;color:var(--smooth-text)}
body[data-smooth-skin] [data-shortcut-modal="settings"] :is(input,textarea,select):focus-visible{outline:2px solid var(--smooth-line-strong);outline-offset:3px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [role="tab"]:not(.smooth-tab-label){border-radius:999px;padding:7px 15px}
body[data-smooth-skin] [data-shortcut-modal="settings"] [role="tab"][aria-selected="true"]:not(.smooth-tab-label){background:var(--smooth-surface-3)}

/* Conversation: rounded tabs, flat welcome ground and elevated composer. */
body[data-smooth-skin] [data-content-phase]{background:var(--smooth-app)}
body[data-smooth-skin] [data-conversation-scroll]{background:var(--smooth-app)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')}{background:var(--smooth-app);border-bottom:1px solid var(--smooth-line)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')}${hostPart('headerBlank')}{border-top:1px solid var(--smooth-line);border-bottom:0}
/* The view switch is the reference's segmented pill: one track with a thumb that slides
   between 对话 and 轨迹, and the whole control fades in only while the pointer is in the
   conversation column (keyboard focus shows it as well). The host renders the two views
   as plain buttons under data-conversation-tabs, so the thumb is the container's own
   ::before, moved by the selected button's index; two equal halves make that exact. */
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs]{position:absolute;left:50%;top:6px;transform:translateX(-50%);display:inline-flex;box-sizing:border-box;gap:0;margin:0;padding:0;border:1px solid var(--smooth-line);border-radius:999px;background:transparent;overflow:hidden;z-index:3;opacity:0;transition:opacity .18s ease}
/* Reveal on the column hover or on *keyboard* focus. Keying this on :focus-within
   pinned the switch open after a click: the clicked 对话/轨迹 tab keeps :focus when the
   pointer leaves, while a mouse click never matches :focus-visible. */
body[data-smooth-skin] ${hostPart('centerCol')}:hover ${hostPart('header')} [data-conversation-tabs],
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs]:has(:focus-visible){opacity:1}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs]::before{content:"";position:absolute;top:0;bottom:0;left:0;width:50%;border-radius:999px;background:var(--smooth-surface-3);transition:transform .26s cubic-bezier(.22,1,.36,1)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs]:has(>[role="tab"]:nth-child(2)[aria-selected="true"])::before{transform:translateX(100%)}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs] [role="tab"]{position:relative;z-index:1;flex:1 1 0;padding:6px 18px;border:0;border-radius:0;background:transparent;color:var(--smooth-muted);font-size:13px;font-weight:500;line-height:16px}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs] [role="tab"][aria-selected="true"]{color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] ${hostPart('centerCol')}:has([data-content-phase]) ${hostPart('header')} [data-conversation-tabs] [role="tab"]::after{content:none}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] [data-conversation-tabs],body[data-smooth-skin] [data-conversation-tabs]::before{transition:none}}
/* The conversation header follows the supplied reference: the session title owns the
   first line, the header's chips — the agent team, the creation mode, whatever the
   utilities slot adds — sit on a second line under it, and the 对话 / 轨迹 buttons are
   centred over the header on that first line. Only the ground stays this skin's own; the
   type, the pill shapes and the spacing are the reference's. The host stacks the tabs in
   a grid row of their own that spans the header, so they take that same span in row one
   instead, centred over it; the title cluster turns into two stacked rows — crumbs first,
   action chips second — while the title row keeps its utilities and corner at the right
   end, centred against the two-line block. */
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
body[data-smooth-skin] [data-composer-card]{--dsw-radius-panel:20px;--dsh-composer-text-max-height:min(300px,40vh);--smooth-composer-footer-h:38px;position:relative;isolation:isolate;border:0;border-radius:0;background:transparent;padding-top:0;gap:0;box-shadow:none}
body[data-smooth-skin] [data-composer-card]::before{content:"";position:absolute;z-index:-1;left:0;right:0;top:0;bottom:var(--smooth-composer-footer-h);border:1px solid var(--smooth-line-strong);border-radius:14px;background:var(--dsw-specific-input-major);pointer-events:none}
body[data-smooth-skin] [data-composer-card]${hostPart('cardWorkspaceTrigger')}{border-style:dashed}
body[data-smooth-skin] [data-composer-card]${hostPart('cardWorkspaceTrigger')}::after{border:0}
body[data-smooth-skin] [data-composer-card] ${hostPart('scroll')}{box-sizing:border-box;padding:10px 54px 10px 14px;min-height:42px;max-height:var(--dsh-composer-text-max-height);margin:0;border:0;border-radius:0;background:transparent;flex:1 1 auto}
/* Attached previews sit inside the same well, above the placeholder; they carry no border
   of their own so there is no line beside the image. */
body[data-smooth-skin] [data-composer-card] ${hostPart('rail')}{box-sizing:border-box;min-width:0;margin:0;padding:10px 12px 0;border:0;border-radius:0;background:transparent;overflow:hidden;contain:layout paint;animation:smooth-composer-open .15s cubic-bezier(.2,0,0,1) both}
@keyframes smooth-composer-open{from{max-height:0;opacity:0}to{max-height:140px;opacity:1}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] [data-composer-card] ${hostPart('rail')}{animation:none}}
body[data-smooth-skin] [data-composer-card] :is(${hostPart('imageItem')},${hostPart('thumbnail')}){width:124px;height:124px;min-width:124px;min-height:124px;max-width:124px;max-height:124px;aspect-ratio:1/1;flex:none;display:block}
body[data-smooth-skin] [data-composer-card] ${hostPart('thumbnail')}{box-sizing:border-box;padding:0;overflow:hidden;border:0;border-radius:14px}
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
body[data-smooth-skin] [data-content-phase="active"] ${hostPart('composerSeat')}{background:linear-gradient(180deg,color-mix(in srgb,var(--smooth-app) 0%,transparent) 0,var(--smooth-app) 36px)}
body[data-smooth-skin] [data-composer-card] :is(${hostPart('primary')},${hostPart('add')}){box-sizing:border-box;flex:none;width:32px;height:32px;padding:0;border-radius:50%;transform:none}
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}{background:transparent;color:var(--smooth-muted)}
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}:hover:not(:disabled){background:var(--smooth-surface-3);color:var(--smooth-text)}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}{background:var(--smooth-accent);color:var(--smooth-ink);transition:background-color .16s ease,transform .16s ease}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:hover:not(:disabled){background:color-mix(in srgb,var(--smooth-accent) 85%,var(--smooth-text))}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:active:not(:disabled){transform:scale(.94)}
body[data-smooth-skin] [data-composer-card] ${hostPart('primary')}:disabled{background:var(--smooth-surface-3);color:var(--smooth-muted);opacity:.6;cursor:default}
/* The send key lives in the input well's top-right corner, not in the footer: the last
   primary button in the trailing group is the send/queue key, so it is lifted out of the
   row and pinned over the well. It keeps the skin's accent ball: a 32px round key. A stop
   key rendered while a turn runs sits before it and stays in the footer. */
body[data-smooth-skin] [data-composer-card] ${hostPart('trailing')}>${hostPart('primary')}:last-of-type{position:absolute;top:auto;bottom:calc(var(--smooth-composer-footer-h) + 5px);right:8px;z-index:3;width:32px;height:32px;border:0;border-radius:50%;background:var(--smooth-accent);color:var(--smooth-ink);box-shadow:none;transform:none}
body[data-smooth-skin] [data-composer-card] ${hostPart('trailing')}>${hostPart('primary')}:last-of-type:hover:not(:disabled){background:color-mix(in srgb,var(--smooth-accent) 85%,var(--smooth-text))}
body[data-smooth-skin] [data-composer-card] ${hostPart('trailing')}>${hostPart('primary')}:last-of-type:disabled{background:var(--smooth-surface-3);color:var(--smooth-muted);opacity:.6}
/* The host's own bottom dock (rounds/steps and tok/s, the token total with its cache hit
   rate, and its context ring) is removed: those readings moved into the context panel the
   composer seat opens, and the ring itself now sits before the model selector. */
body[data-smooth-skin] [data-composer-dock]{display:none}
/* The context meter, drawn like the supplied occupancy-ring asset: the reading sits in
   the middle of the ring, and the ring opens a panel above the composer. */
body[data-smooth-skin] .smooth-context-button{display:grid;place-items:center;flex:none;width:22px;height:22px;margin:0;padding:0;border:0;border-radius:50%;background:transparent;color:var(--smooth-muted);cursor:pointer;transition:background-color .16s ease}
body[data-smooth-skin] .smooth-context-button:hover,
body[data-smooth-skin] .smooth-context-button:focus-visible,
body[data-smooth-skin] .smooth-context-button[aria-expanded="true"]{background:var(--smooth-surface-3)}
body[data-smooth-skin] .smooth-context-button:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:2px}
body[data-smooth-skin] .smooth-context-button svg{display:block;overflow:visible}
body[data-smooth-skin] .smooth-context-ring-track{fill:none;stroke:color-mix(in srgb,var(--smooth-muted) 42%,transparent);stroke-width:2.1}
body[data-smooth-skin] .smooth-context-ring-fill{fill:none;stroke:var(--smooth-accent);stroke-width:2.1;transition:stroke-dasharray .3s cubic-bezier(.22,1,.36,1)}
body[data-smooth-skin] .smooth-context-ring-label{fill:var(--smooth-text);font-family:inherit;font-size:7.2px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
body[data-smooth-skin] .smooth-context-menu{position:fixed;z-index:1200;box-sizing:border-box;padding:12px;border:1px solid var(--smooth-line-strong);border-radius:16px;background:var(--dsw-alias-bg-overlay,var(--smooth-surface));box-shadow:var(--smooth-shadow-2);color:var(--smooth-muted);font-size:12px;line-height:20px;animation:smooth-context-in .16s cubic-bezier(.2,0,0,1)}
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
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-context-menu{animation:none}body[data-smooth-skin] .smooth-context-ring-fill{transition:none}}
body[data-smooth-skin] .smooth-composer-model{display:flex;align-items:center;min-width:0;max-width:100%;font-size:13px;line-height:20px}
body[data-smooth-skin] .smooth-composer-model button{height:32px;min-height:32px;font-size:inherit;line-height:20px;padding-block:0}
body[data-smooth-skin] .smooth-model-effort{display:flex;flex-direction:column;align-items:stretch;gap:0;width:100%;min-width:0;max-width:100%}
/* The slider has no tick labels: the level the thumb is on is named above the model
   selector, and re-enters with a small rise every time the level changes. */
body[data-smooth-skin] .smooth-model-level{display:flex;align-items:center;justify-content:center;gap:6px;min-height:18px;margin-bottom:1px;color:var(--smooth-muted);font-size:10.5px;line-height:16px;letter-spacing:.05em}
body[data-smooth-skin] .smooth-model-level::before{content:"";flex:none;width:4px;height:4px;border-radius:50%;background:var(--smooth-model-blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--smooth-model-blue) 16%,transparent)}
/* The auto chip returns a provider-decided model to the host's "Default" effort. It sits
   left of the level dot; the active state uses the same blue as the dot, not a filled
   button, so the row still reads as one line of text. */
body[data-smooth-skin] .smooth-model-auto{order:-1;box-sizing:border-box;display:inline-flex;align-items:center;flex:none;height:15px;min-height:15px;padding:0 6px;border:1px solid var(--smooth-line-strong);border-radius:999px;background:transparent;color:var(--smooth-muted);font-family:inherit;font-size:9.5px;line-height:13px;letter-spacing:.04em;cursor:pointer;transition:background-color .16s ease,border-color .16s ease,color .16s ease}
body[data-smooth-skin] .smooth-model-auto:hover:not(:disabled){background:var(--smooth-surface-3);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-auto[data-active="true"]{border-color:transparent;background:color-mix(in srgb,var(--smooth-model-blue) 20%,transparent);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-auto:focus-visible{outline:2px solid var(--smooth-model-blue);outline-offset:2px}
body[data-smooth-skin] .smooth-model-auto:disabled{opacity:.5;cursor:default}
/* Default is not a stop on the explicit scale: dim the track while the provider owns the
   level, but keep it interactive so picking a stop immediately takes the level back. */
body[data-smooth-skin] .smooth-model-slider[data-default="true"]{opacity:.5}
body[data-smooth-skin] .smooth-model-level-name{color:var(--smooth-text);font-size:11px;font-weight:600;animation:smooth-model-level-in .26s cubic-bezier(.22,1,.36,1)}
@keyframes smooth-model-level-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-level-name{animation:none}}
body[data-smooth-skin] .smooth-model-effort .smooth-model-trigger{display:flex;align-items:center;justify-content:center;gap:5px;height:22px;min-height:22px;padding:0 4px;border:0;border-radius:7px;background:transparent;color:var(--smooth-muted);font-size:12px;line-height:18px;cursor:pointer}
body[data-smooth-skin] .smooth-model-effort .smooth-model-trigger:hover:not(:disabled){background:var(--smooth-surface-3);color:var(--smooth-text)}
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
body[data-smooth-skin] .smooth-model-error{padding:1px 4px;color:var(--dsw-alias-state-error-primary);font-size:10.5px;line-height:14px}
body[data-smooth-skin] .smooth-model-group{display:flex;flex-direction:column;gap:1px}
body[data-smooth-skin] .smooth-git-menu.smooth-model-panel{padding:0;gap:0;overflow:hidden;max-height:none;--smooth-model-fade:color-mix(in srgb,var(--smooth-surface-3) 80%,var(--dsw-specific-input-major))}
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
body[data-smooth-skin] .smooth-model-list{display:flex;flex-direction:column;gap:6px;min-width:0;padding:12px 14px 14px}
body[data-smooth-skin] .smooth-model-list-head{display:flex;align-items:center;gap:4px;min-height:22px}
body[data-smooth-skin] .smooth-model-back{display:grid;place-items:center;width:22px;height:22px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--smooth-muted);cursor:pointer}
body[data-smooth-skin] .smooth-model-back:hover{background:var(--smooth-surface-3);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-list-title{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--smooth-text)}
body[data-smooth-skin] .smooth-model-list .smooth-git-list{max-height:min(42vh,320px);overflow-y:auto;overscroll-behavior:contain;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none}
body[data-smooth-skin] .smooth-model-list .smooth-git-heading{padding:4px 4px 2px}
/* The panel's backdrop: one cutout per thinking level, stacked and cross-faded as the
   thumb moves. The bottom fade lands on the panel's own colour, so the art melts into
   the controls instead of ending on a hard edge. */
body[data-smooth-skin] .smooth-model-media{position:relative;flex:none;height:168px;overflow:hidden;border-radius:13px 13px 0 0;background:radial-gradient(130% 150% at 50% 6px,color-mix(in srgb,var(--smooth-model-blue) 14%,transparent),transparent 72%)}
/* The whole backdrop — artwork and the soft bottom fade — sits 6px lower than the
   panel's top edge. Moving them together keeps the picture and its blur in step. */
body[data-smooth-skin] .smooth-model-media::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent calc(68% + 6px),var(--smooth-model-fade) 100%);pointer-events:none}
body[data-smooth-skin] .smooth-model-art{position:absolute;left:0;top:6px;width:100%;height:100%;object-fit:cover;object-position:50% 38%;opacity:0;transition:opacity .28s ease;pointer-events:none;user-select:none}
body[data-smooth-skin] .smooth-model-art[data-active="true"]{opacity:1}
body[data-smooth-skin] .smooth-model-body{display:flex;flex-direction:column;align-items:stretch;gap:2px;min-width:0;padding:10px 12px 12px}
body[data-smooth-skin] .smooth-model-panel .smooth-model-trigger{height:24px;min-height:24px;font-size:13px}
body[data-smooth-skin] .smooth-model-panel .smooth-model-slider{margin-top:4px}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-art{transition:none}}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] .smooth-model-panel{animation:none}body[data-smooth-skin] .smooth-model-panel-viewport,body[data-smooth-skin] .smooth-model-panel-pane{transition:none}}
/* Keep TodoPanel's projection, native StateDot and conditional list rendering.
   Scope every local name to its public panel hook so chat headers stay untouched. */
body[data-smooth-skin] [data-testid="todo-panel"]{border:0;border-radius:16px;background:var(--smooth-surface);box-shadow:var(--smooth-shadow-1);backdrop-filter:none}
body[data-smooth-skin] [data-testid="todo-panel"]>${hostPart('body')}{gap:0;padding:0}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('header')}[aria-expanded]{box-sizing:border-box;min-height:40px;height:auto;gap:8px;padding:8px 14px;border:0;border-radius:0;background:transparent;color:var(--smooth-text);transition:background-color .16s ease}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('header')}:hover{background:color-mix(in srgb,var(--smooth-text) 4%,transparent)}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('header')}:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-3px;border-radius:14px}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('title')}{font-size:13px;line-height:20px;font-weight:600;color:var(--smooth-text)}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('progress')}{font-size:12px;line-height:20px;color:var(--smooth-muted);font-variant-numeric:tabular-nums}
body[data-smooth-skin] [data-testid="todo-panel"] :is(${hostPart('lead')},${hostPart('chevron')}){color:var(--smooth-muted);width:16px;height:20px}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('list')}{gap:2px;max-height:min(224px,30vh);margin:0;padding:2px 8px 10px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('item')}{box-sizing:border-box;flex:none;align-items:flex-start;gap:10px;min-height:34px;padding:7px 10px;border-radius:9px;font-size:13px;line-height:20px;color:var(--smooth-muted)}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('glyph')}{width:16px;height:20px}
body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('content')}{min-width:0;flex:1;white-space:normal;overflow:visible;overflow-wrap:anywhere;text-overflow:clip}
body[data-smooth-skin] [data-testid="todo-panel"] [data-smooth-status="in_progress"]{background:color-mix(in srgb,var(--smooth-accent) 8%,transparent);color:var(--smooth-text);font-weight:500}
body[data-smooth-skin] [data-testid="todo-panel"] [data-smooth-status="in_progress"] [data-smooth-state="ongoing"]{color:var(--smooth-accent)}
body[data-smooth-skin] [data-testid="todo-panel"] [data-smooth-status="completed"]{color:var(--dsw-alias-label-tertiary)}
@media(prefers-reduced-motion:reduce){body[data-smooth-skin] [data-testid="todo-panel"] ${hostPart('header')}{transition:none}}
/* Native question form: retain radio/checkbox semantics, draft mirrors, paging,
   countdowns and submission. Only the question seat owns these local classes. */
body[data-smooth-skin] [data-question-key]{container-type:inline-size;container-name:smooth-question}
body[data-smooth-skin] ${questionPanel}{max-height:min(68vh,620px);padding:0;border-radius:20px;background:var(--dsw-specific-input-major);box-shadow:var(--smooth-shadow-1)}
body[data-smooth-skin] ${questionPanel} ${hostPart('header')}{display:flex;gap:16px;min-height:0;max-height:min(24vh,180px);padding:16px 18px 12px;border:0;overflow-y:auto;overscroll-behavior:contain}
body[data-smooth-skin] ${questionPanel} ${hostPart('headingBlock')}{flex:1;overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('eyebrow')}{margin-bottom:6px;color:var(--smooth-muted);font-size:12px;line-height:18px}
body[data-smooth-skin] ${questionPanel} h2${hostPart('title')}{margin:0;font-size:var(--dsh-content-font-size,14px);line-height:1.65;font-weight:550;color:var(--smooth-text);overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('headerActions')}{position:sticky;top:0;gap:4px;flex-wrap:wrap;justify-content:flex-end;max-width:190px}
body[data-smooth-skin] ${questionPanel} ${hostPart('waitStatus')}{font-size:12px;line-height:24px;color:var(--smooth-muted)}
body[data-smooth-skin] ${questionPanel} ${hostPart('iconButton')}{width:28px;height:28px;color:var(--smooth-muted);border-radius:8px}
body[data-smooth-skin] ${questionPanel} ${hostPart('iconButton')}:disabled{color:var(--dsw-alias-label-tertiary);opacity:.4}
/* Focusing the free-text answer turns the block's border business-blue; the caret already
   shows focus, so the block keeps the same quiet border it has when idle. */
body[data-smooth-skin] ${questionPanel} ${hostPart('customBlock')}:focus-within{border-color:var(--smooth-line)}
body[data-smooth-skin] ${questionPanel} [data-question-scroll]{min-height:0;scrollbar-gutter:stable;overflow-x:hidden}
body[data-smooth-skin] ${questionPanel} ${hostPart('detail')}{margin:0;padding:4px 18px 8px;font-size:var(--dsh-content-font-size,14px);line-height:1.65}
body[data-smooth-skin] ${questionPanel} ${hostPart('options')}{margin:0;padding:8px 16px 12px;gap:6px}
body[data-smooth-skin] ${questionPanel} :is(${hostPart('option')},${hostPart('customRow')}){gap:10px;min-height:44px;padding:10px 12px;border:1px solid transparent;border-radius:10px;transition:background-color .16s ease,border-color .16s ease}
body[data-smooth-skin] ${questionPanel} ${hostPart('option')}:hover:not(:disabled){background:color-mix(in srgb,var(--smooth-accent) 4%,var(--dsw-specific-input-major))}
body[data-smooth-skin] ${questionPanel} ${hostPart('option')}[aria-checked="true"]{background:color-mix(in srgb,var(--smooth-accent) 8%,var(--dsw-specific-input-major));border-color:color-mix(in srgb,var(--smooth-accent) 45%,var(--smooth-line))}
body[data-smooth-skin] ${questionPanel} ${hostPart('number')}{margin-top:1px;width:22px;height:22px;flex-basis:22px;border-radius:6px;background:var(--smooth-app);color:var(--smooth-muted);font-size:12px;line-height:20px}
body[data-smooth-skin] ${questionPanel} ${hostPart('option')}[aria-checked="true"] ${hostPart('number')}{background:color-mix(in srgb,var(--smooth-accent) 14%,var(--dsw-specific-input-major));color:var(--smooth-text)}
body[data-smooth-skin] ${questionPanel} ${hostPart('checkboxChecked')}{color:var(--smooth-ink)}
body[data-smooth-skin] ${questionPanel} ${hostPart('checkboxChecked')}::before{background:var(--smooth-accent);border-color:var(--smooth-accent)}
body[data-smooth-skin] ${questionPanel} ${hostPart('optionLine')}{gap:4px 8px}
body[data-smooth-skin] ${questionPanel} ${hostPart('optionLabel')}{font-size:14px;line-height:22px;font-weight:550;color:var(--smooth-text);overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('description')}{display:block;flex-basis:100%;font-size:13px;line-height:1.65;color:var(--smooth-muted);overflow-wrap:anywhere}
body[data-smooth-skin] ${questionPanel} ${hostPart('badge')}{padding:0 6px;border-radius:5px;background:color-mix(in srgb,var(--smooth-accent) 10%,var(--dsw-specific-input-major));color:var(--dsw-alias-link);font-size:11px;line-height:20px}
body[data-smooth-skin] ${questionPanel} :is(${hostPart('customRow')},${hostPart('customBlock')}){border:1px solid var(--smooth-line);background:var(--smooth-surface-2)}
body[data-smooth-skin] ${questionPanel} ${hostPart('customRow')}{margin-top:4px}
body[data-smooth-skin] ${questionPanel} ${hostPart('customRowActive')}{border-color:color-mix(in srgb,var(--smooth-accent) 45%,var(--smooth-line));background:color-mix(in srgb,var(--smooth-accent) 8%,var(--dsw-specific-input-major))}
body[data-smooth-skin] ${questionPanel} ${hostPart('customBlock')}{margin-inline:0;border-radius:10px;--dsh-answer-field-padding:10px 12px}
body[data-smooth-skin] ${questionPanel} ${hostPart('customRow')}:focus-within{border-color:var(--smooth-accent);background:var(--dsw-specific-input-major)}
body[data-smooth-skin] ${questionPanel} ${hostPart('field')}>*{font-size:14px;line-height:22px}
body[data-smooth-skin] ${questionPanel} ${hostPart('fieldInput')}::placeholder{color:var(--smooth-muted)}
body[data-smooth-skin] ${questionPanel} ${hostPart('footer')}{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px 12px;align-items:center;flex-shrink:0;margin:0;padding:12px 16px;border-top:1px solid var(--smooth-line);background:var(--dsw-specific-input-major)}
body[data-smooth-skin] ${questionPanel} ${hostPart('footerActions')}{gap:8px}
body[data-smooth-skin] ${questionPanel} ${hostPart('footerActions')}>button{height:34px;min-height:34px;padding:0 14px;border-radius:10px;font-size:13px;line-height:20px;font-weight:500}
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
body[data-smooth-skin] :is([data-chat-flow-kind="user"],[data-chat-flow-kind="steering"]) ${hostPart('bubble')}{border-radius:16px;background:var(--dsw-specific-bubble);padding:12px 16px;font-size:var(--dsh-content-font-size,14px);line-height:1.7;color:var(--smooth-text)}

/* State styling only; no glyph/font/image replacement. Switches are left entirely to
   the surface that owns them: plugin pages and the host ship their own switch geometry,
   and the skin's earlier global width/thumb overrides broke plugin toggles. The only
   switch the skin sizes is the host's own general-settings row (below), whose default
   geometry it re-asserts. */
body[data-smooth-skin] [role="menu"]{border:1px solid var(--smooth-line-strong);border-radius:20px;background:var(--dsw-alias-bg-overlay);box-shadow:var(--smooth-shadow-2)}
body[data-smooth-skin] [role="menuitem"]{border-radius:13px}
/* Account popup follows the reference's .75px scale. Keep the native menu,
   focus handling, shortcuts, login state and action confirmations intact. */
${accountMenu}{
  --smooth-account-unit:.75px;
  --dsw-menu-surface-fill:color-mix(in srgb,var(--dsw-alias-bg-overlay) 96%,transparent);
  --dsw-menu-backdrop-filter:blur(16px);
  /* Nudge the popup a few pixels clear of the rail's silhouette: the avatar stays the
     anchor, the menu just stops crowding the column edge. */
  inset:auto auto calc(8 * var(--smooth-account-unit)) max(12px,calc(var(--smooth-rail-width) - 10 * var(--smooth-account-unit) + 6px))!important;
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
     width. The bar's own padding and corner radius stay on --smooth-u because they
     meet the shell curve drawn at --smooth-left-width + 35 * --smooth-u. */
  --smooth-tab-u:.65px;
  --smooth-left-width:352px;--smooth-rail-width:calc(44 * var(--smooth-l));
  --smooth-rail-button-size:calc(38 * var(--smooth-l));--smooth-rail-icon-size:calc(24 * var(--smooth-l));--smooth-rail-button-radius:calc(12 * var(--smooth-l));
  --smooth-rail-inset:calc((var(--smooth-rail-width) - var(--smooth-rail-button-size)) / 2);
  --smooth-rail-gap:calc(9 * var(--smooth-l));
  /* The tab strip takes the host's own caption height (40px in the desktop app) instead
     of a taller fixed caption: the tabs keep their size, the strip's extra whitespace
     disappears, and the rail keeps the same 4-unit gap under the strip. */
  --smooth-caption:var(--dsh-windows-titlebar-height,40px);
  --smooth-rail-top:calc(var(--smooth-caption) + 4 * var(--smooth-l));
  --smooth-rail-panels-top:calc(var(--smooth-rail-top) + var(--smooth-rail-button-size) + var(--smooth-rail-gap));
}
body[data-smooth-skin] ${hostPart('frame')}:has(>${hostPart('sidebarCol')})>${hostPart('centerCol')}{border-radius:0 0 0 calc(35 * var(--smooth-u));overflow:clip;corner-shape:round}
body[data-smooth-skin] .smooth-workspace-bar{
  position:fixed;top:0;left:var(--smooth-left-width);right:132px;height:var(--smooth-caption);
  display:flex;align-items:center;gap:4px;padding:0 35px 0 5px;background:var(--smooth-surface);
  border-radius:18px 0 0 0;corner-shape:round;pointer-events:auto;z-index:50;-webkit-app-region:drag;
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
body[data-smooth-skin] .smooth-workspace-tab[data-selected="true"]{background:color-mix(in srgb,var(--smooth-surface-3) 80%,var(--smooth-muted));border-color:transparent}
body[data-smooth-skin] .smooth-workspace-tab:hover{background:var(--smooth-surface-3)}
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
body[data-smooth-skin] .smooth-tab-scroll{position:absolute;top:50%;transform:translateY(-50%);z-index:3;display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:24px;height:24px;border:1px solid var(--smooth-line);background:var(--smooth-surface);color:var(--smooth-muted);border-radius:50%;box-shadow:var(--smooth-shadow-1);cursor:pointer}
body[data-smooth-skin] .smooth-tab-scroll[data-side="left"]{left:calc(10 * var(--smooth-u))}
body[data-smooth-skin] .smooth-tab-scroll[data-side="right"]{right:calc(10 * var(--smooth-u))}
/* An arrow exists only while its direction can still be scrolled, so the strip never
   shows one over the end of the list. */
body[data-smooth-skin] .smooth-tab-scroll:hover{background:var(--smooth-surface-2);color:var(--smooth-text)}
body[data-smooth-skin] :is(.smooth-tab-label,.smooth-tab-close,.smooth-tab-scroll,.smooth-rail-home,.smooth-rail-plugins):focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins){
  position:fixed;left:var(--smooth-rail-inset);top:var(--smooth-rail-top);
  display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:var(--smooth-rail-button-size);height:var(--smooth-rail-button-size);padding:0;
  border:0;border-radius:var(--smooth-rail-button-radius);corner-shape:round;background:transparent;color:var(--smooth-muted);pointer-events:auto;z-index:30;cursor:pointer;
}
body[data-smooth-skin] .smooth-rail-home[aria-pressed="true"]{background:var(--smooth-selected);color:var(--dsw-alias-button-primary-fill)}
body[data-smooth-skin] .smooth-rail-plugins{top:var(--smooth-rail-panels-top);background:transparent}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins)>svg,
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} svg{width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('panelRow')} ${hostPart('panelIcon')}{width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);display:flex;align-items:center;justify-content:center;flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} :is(${hostPart('trigger')},button[data-signed-out]) ${accountPart('avatar')}{display:flex;align-items:center;justify-content:center;width:var(--smooth-rail-icon-size);height:var(--smooth-rail-icon-size);border-radius:50%;overflow:hidden;flex:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('footArea')} :is(${hostPart('trigger')},button[data-signed-out]) img{width:100%;height:100%;object-fit:cover}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins):hover,
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('panelRow')},${hostPart('footArea')} button[data-signed-out]):hover{background:var(--smooth-surface-3);color:var(--dsw-alias-button-primary-fill)}
body[data-smooth-skin]:has([data-sidebar-collapsed]) :is(.smooth-rail-home,.smooth-rail-plugins){opacity:0;pointer-events:none}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:has(>${hostPart('logoRow')}):not(${hostPart('collapsed')}){padding:0 calc(18 * var(--smooth-l)) 10px calc(var(--smooth-rail-width) + 18 * var(--smooth-l))}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('logoRow')}{height:calc(32 * var(--smooth-l));min-height:calc(32 * var(--smooth-l));margin:0;padding:0}
/* The collapsed rail has no room for the brand row; the host removes it, so the skin's
   fixed logo-row height must not leave an empty band above the fixed caption buttons. */
body[data-smooth-skin]:has([data-sidebar-collapsed]) ${hostPart('sidebarCol')} ${hostPart('logoRow')}{height:0;min-height:0;margin:0;padding:0;overflow:hidden}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('newSession')}{height:calc(30 * var(--smooth-l));min-height:calc(30 * var(--smooth-l));margin-top:calc(2 * var(--smooth-l));margin-bottom:calc(3 * var(--smooth-l) + 1px);border-radius:calc(10 * var(--smooth-l));font-size:calc(14 * var(--smooth-l))}
/* Collapsed, the host turns the new-conversation row into a 28px icon button next to the
   expand toggle. Keep its box on the host's fixed 28px geometry so the two stay aligned. */
body[data-smooth-skin]:has([data-sidebar-collapsed]) ${hostPart('sidebarCol')} ${hostPart('newSession')}{
  box-sizing:border-box;position:fixed;left:48px;top:calc((var(--smooth-caption) - 28px) / 2);
  width:28px;height:28px;min-height:28px;margin:0;padding:0;border:0;
  border-radius:calc(9 * var(--smooth-l));background:transparent;color:var(--smooth-muted);
}
body[data-smooth-skin] ${hostPart('sidebarCol')} ${hostPart('root')}:not(${hostPart('collapsed')})>${hostPart('panelList')}{position:fixed;top:var(--smooth-rail-panels-top);bottom:calc(24px + var(--smooth-rail-button-size));left:0;box-sizing:border-box;width:var(--smooth-rail-width);display:flex;flex-direction:column;align-items:center;gap:var(--smooth-rail-gap);margin:0;padding:0;overflow-x:hidden;overflow-y:auto;z-index:29}
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
  height:24px;padding:2px;border:0;border-radius:7px;corner-shape:round;
  background:color-mix(in srgb,var(--smooth-text) 6%,var(--smooth-sidebar));
  opacity:0;pointer-events:none;user-select:none;-webkit-app-region:no-drag;
  transition:opacity .16s cubic-bezier(.2,0,0,1);
}
/* The control is frame-fixed, so hovering it is not hovering the sidebar underneath it;
   both are named here or the reveal would flicker off the moment the pointer lands.
   :where() keeps the hover's specificity below the collapse/search suppression below.
   The keyboard reveal keys on :focus-visible, never :focus-within: a clicked option
   keeps :focus after the pointer leaves, so :focus-within left the overlay pinned open
   until focus moved somewhere else. A mouse click is not :focus-visible, so the control
   follows the pointer again, while Tab still reveals it. */
body[data-smooth-skin]:where(:has(${hostPart('sidebarCol')}:hover, .smooth-workspace-filter:hover)) .smooth-workspace-filter,
body[data-smooth-skin] .smooth-workspace-filter:has(:focus-visible){opacity:1;pointer-events:auto}
body[data-smooth-skin] .smooth-filter-option{
  appearance:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;
  height:20px;min-width:0;margin:0;padding:0 9px;border:0;border-radius:5px;background:transparent;
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
  width:16px;height:16px;margin:0;padding:0;border:0;border-radius:4px;background:transparent;
  color:var(--dsw-alias-label-tertiary);cursor:pointer;flex:none;
}
body[data-smooth-skin] .smooth-session-delete svg{width:14px;height:14px}
body[data-smooth-skin] .smooth-session-delete:hover{color:var(--dsw-alias-state-error-primary)}
body[data-smooth-skin] .smooth-session-delete:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
body[data-smooth-skin] .smooth-session-delete-error{margin-top:8px;padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;white-space:pre-wrap}

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
body[data-smooth-skin] .smooth-composer-meta .smooth-meta-button{max-width:170px;height:20px;margin:0;padding:0 5px;border-radius:6px}
body[data-smooth-skin] .smooth-composer-meta .smooth-meta-preset{display:inline-flex;align-items:center;min-width:0;max-width:170px}
body[data-smooth-skin] .smooth-composer-meta .smooth-composer-preset button{height:20px;min-height:20px;padding:0 5px;border-radius:6px;gap:4px;font-size:12px;line-height:18px;font-weight:400;color:inherit;pointer-events:auto}
body[data-smooth-skin] .smooth-composer-meta .smooth-composer-preset button>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] :is(.smooth-meta-workspace,.smooth-meta-branch){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-meta-branch{display:inline-flex;align-items:center;gap:5px}
body[data-smooth-skin] .smooth-meta-host{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
body[data-smooth-skin] .smooth-meta-button{display:inline-flex;align-items:center;gap:5px;min-width:0;max-width:170px;margin:0;padding:2px 5px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;line-height:inherit;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}
body[data-smooth-skin] .smooth-meta-button>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-meta-button:hover{background:var(--smooth-surface-3);color:var(--smooth-text)}
body[data-smooth-skin] .smooth-meta-button:focus-visible{outline:2px solid var(--smooth-accent);outline-offset:-2px}
body[data-smooth-skin] .smooth-meta-divider{flex:none;height:12px;width:1px;background:var(--smooth-line)}
/* The access mode and plan live natively in the row's modes group, right beside the add
   button: keep them as one quiet line of text, not as card furniture. The plus leads and
   the mode follows, so the attach/command action sits before the access-mode chip. */
body[data-smooth-skin] [data-composer-card] ${hostPart('tools')} ${hostPart('modes')}{order:0}
body[data-smooth-skin] [data-composer-card] ${hostPart('modes')} :is(button,[role="button"]){height:28px;min-height:28px;padding:0 6px;border:0;border-radius:8px;background:transparent;color:var(--smooth-text);font-size:13px;line-height:18px;gap:5px;cursor:pointer}
body[data-smooth-skin] [data-composer-card] ${hostPart('modes')} :is(button,[role="button"]):hover:not(:disabled){background:var(--smooth-surface-3);color:var(--smooth-text)}
body[data-smooth-skin] [data-composer-card] ${hostPart('modes')} svg{width:14px;height:14px}
body[data-smooth-skin] .smooth-git-menu{position:fixed;z-index:1200;box-sizing:border-box;display:flex;flex-direction:column;gap:4px;max-height:min(420px,calc(100vh - 24px));padding:8px;border:1px solid var(--smooth-line);border-radius:14px;background:color-mix(in srgb,var(--smooth-surface-3) 80%,var(--dsw-specific-input-major));box-shadow:0 18px 48px rgba(0,0,0,.38);color:var(--smooth-text);font-size:13px;line-height:20px;overflow:auto}
body[data-smooth-skin] .smooth-git-heading{padding:4px 8px 2px;color:var(--smooth-muted);font-size:12px}
body[data-smooth-skin] .smooth-git-search{box-sizing:border-box;width:100%;height:32px;margin:2px 0 4px;padding:0 10px;border:1px solid var(--smooth-line);border-radius:9px;background:var(--dsw-specific-input-major);color:var(--smooth-text);font:inherit;outline:none}
body[data-smooth-skin] .smooth-git-search:focus{border-color:var(--smooth-accent)}
body[data-smooth-skin] .smooth-git-list{display:flex;flex-direction:column;gap:1px;min-height:0;overflow:auto}
body[data-smooth-skin] .smooth-git-row{display:flex;align-items:center;gap:9px;width:100%;min-height:34px;padding:5px 8px;border:0;border-radius:9px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
body[data-smooth-skin] .smooth-git-row:hover:not(:disabled){background:var(--smooth-surface-3)}
body[data-smooth-skin] .smooth-git-row[data-current="true"]{background:var(--dsw-alias-interactive-bg-active,rgba(128,128,128,.16))}
body[data-smooth-skin] .smooth-git-row:disabled{opacity:.5;cursor:default}
body[data-smooth-skin] .smooth-git-row-main{display:flex;flex-direction:column;min-width:0;flex:1}
body[data-smooth-skin] .smooth-git-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body[data-smooth-skin] .smooth-git-note{padding:0 8px;color:var(--smooth-muted);font-size:11.5px;line-height:17px}
body[data-smooth-skin] .smooth-git-check{margin-left:auto;color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] .smooth-git-footer{display:flex;align-items:center;gap:7px;margin-top:4px;padding:8px;border:0;border-top:1px solid var(--smooth-line);border-radius:0 0 9px 9px;background:transparent;color:var(--smooth-text);font:inherit;text-align:left;cursor:pointer}
body[data-smooth-skin] .smooth-git-footer:hover{background:var(--smooth-surface-3)}
body[data-smooth-skin] .smooth-git-footer:disabled{opacity:.5;cursor:default}
body[data-smooth-skin] .smooth-git-create{display:flex;gap:6px;padding-top:6px;border-top:1px solid var(--smooth-line)}
body[data-smooth-skin] .smooth-git-create .smooth-git-search{flex:1;margin:0}
body[data-smooth-skin] .smooth-git-create-action{height:32px;padding:0 9px;border:1px solid var(--smooth-line);border-radius:9px;background:var(--smooth-surface-3);color:inherit;font:inherit;cursor:pointer}
body[data-smooth-skin] .smooth-git-create-action:disabled{opacity:.5;cursor:default}
body[data-smooth-skin] .smooth-git-error{padding:6px 8px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:17px;white-space:pre-wrap}
body[data-smooth-skin] .smooth-git-empty{padding:10px 8px;color:var(--smooth-muted)}
body[data-smooth-skin] .smooth-hero-branch{display:inline-flex;align-items:center;gap:calc(16 * var(--smooth-u));min-width:0}
body[data-smooth-skin] .smooth-hero-branch .smooth-meta-branch{max-width:240px;color:var(--smooth-text);font-weight:600}
body[data-smooth-skin] .smooth-composer-preset{display:inline-flex;align-items:center;min-width:0}
body[data-smooth-skin] .smooth-composer-preset button{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 8px;border-radius:8px;background:transparent;font-size:13px;line-height:20px;font-weight:500;color:var(--smooth-text)}
body[data-smooth-skin] .smooth-composer-preset button:hover:not(:disabled){background:var(--smooth-surface-3)}

/* Landing-page usage panel. The panel is portalled into the host hero's own stack
   (src/usage.js) and follows the reference card's construction: a 12px-padded well,
   a tab/period header, six figures, then a 26-week grid whose shade is the day's
   share of the busiest day in the window. Widths are capped so the figures keep
   their proportions and the grid cells stay square at any window size. */
body[data-smooth-skin] .smooth-usage-mount{display:flex;justify-content:center;width:100%;min-width:0;margin-top:2px}
body[data-smooth-skin] .smooth-usage-panel{box-sizing:border-box;display:flex;flex-direction:column;gap:12px;width:min(560px,100%);padding:12px;border-radius:12px;background:color-mix(in srgb,var(--smooth-text) 4%,var(--smooth-surface-2));color:var(--smooth-muted);font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
body[data-smooth-skin] .smooth-usage-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
body[data-smooth-skin] :is(.smooth-usage-tabs,.smooth-usage-ranges){display:flex;align-items:center;gap:2px}
body[data-smooth-skin] :is(.smooth-usage-tab,.smooth-usage-range,.smooth-usage-more){appearance:none;box-sizing:border-box;margin:0;padding:1px 8px;border:0;border-radius:5px;background:transparent;color:var(--smooth-muted);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
body[data-smooth-skin] :is(.smooth-usage-tab,.smooth-usage-range):hover:not([data-active]){background:color-mix(in srgb,var(--smooth-text) 6%,transparent);color:var(--smooth-text)}
body[data-smooth-skin] :is(.smooth-usage-tab,.smooth-usage-range)[data-active]{background:color-mix(in srgb,var(--smooth-text) 11%,var(--smooth-surface-2));color:var(--smooth-text)}
body[data-smooth-skin] :is(.smooth-usage-tab,:is(.smooth-usage-range,.smooth-usage-more)):focus-visible{outline:2px solid var(--smooth-accent);outline-offset:1px}
body[data-smooth-skin] .smooth-usage-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
body[data-smooth-skin] .smooth-usage-stat{display:flex;flex-direction:column;gap:2px;box-sizing:border-box;min-width:0;padding:5px 8px;border-radius:8px;background:color-mix(in srgb,var(--smooth-text) 9%,var(--smooth-surface-2))}
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
body[data-smooth-skin] .smooth-usage-heat-cell[data-smooth-tip]:hover:after{content:attr(data-smooth-tip);position:absolute;bottom:calc(100% + 6px);left:50%;z-index:6;transform:translate(-50%);padding:5px 10px;border-radius:8px;background:var(--smooth-text);color:var(--smooth-app);font-size:13px;font-weight:500;line-height:18px;white-space:nowrap;font-variant-numeric:tabular-nums;pointer-events:none}
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
   panel follows the rest of the window instead. */
body[data-smooth-skin] [data-shortcut-modal="settings"]{position:fixed;inset:var(--smooth-caption) 0 0 var(--smooth-rail-width);width:auto;height:auto;max-width:none;max-height:none;border:0;border-radius:0;box-shadow:none}
body[data-smooth-skin] [role="presentation"]:has(>[data-shortcut-modal="settings"])>[aria-hidden="true"]{background:transparent;backdrop-filter:none}
body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{box-sizing:border-box;width:calc(var(--smooth-left-width) - var(--smooth-rail-width));min-width:0;min-height:0;padding:16px 10px 10px;gap:8px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navTitle')}{padding:0 10px;font-size:20px;line-height:28px;font-weight:700;letter-spacing:-.01em}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}{flex:1;min-height:0;gap:2px;padding-top:34px;overflow-x:hidden;overflow-y:auto}
/* Native icons and labels stay in separate cells, including plugin sections.
   Keep each row's height; a short window scrolls the list instead of crushing it.
   The cells run at the size of the screenshot this panel follows — 15px labels on a
   34px row with an 18px icon — so the column reads as text rather than as a list of
   small print; the icon column is sized to the icon so the labels share one edge. */
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button{position:relative;box-sizing:border-box;display:grid;grid-template-columns:18px minmax(0,1fr);align-items:center;flex:none;width:100%;height:34px;min-height:34px;border-radius:8px;padding:0 10px;gap:13px;font-size:15px;line-height:22px;text-align:left;white-space:nowrap}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button>:is(svg,${hostPart('navIcon')}){grid-column:1;grid-row:1;justify-self:center;width:18px;height:18px;min-width:18px}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button::before{grid-column:1;grid-row:1;justify-self:center;align-self:center}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button>${hostPart('navLabel')}{grid-column:2;grid-row:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button[aria-current="true"]{background:var(--smooth-selected);color:var(--smooth-text);font-weight:600}
/* The host builds one flat list out of the settings.section entries and puts no id
   or grouping attribute on a cell, so the four groups are anchored on position:
   account | application | extensions | appearance. Adding or removing a settings
   section moves the boundary with it. The label floats in the gap above the first
   cell of its group, inside navList's padding-top so the scroller cannot clip it.
   It runs at the size of the cells (15px/500) and sits in a 34px gap: 4px under the
   previous group, the label's own 20px line box, then 10px of air before its first
   cell — the rhythm the reference settings panel uses, where a group is separated by
   its heading rather than by empty rows.
   Keep ::before available for plugins that replace the native gear with a mask. */
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button::after{position:absolute;left:10px;top:-30px;font-size:15px;line-height:20px;font-weight:500;color:var(--smooth-muted);pointer-events:none}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(1)::after{content:"账户"}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(2)::after{content:"应用"}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(4)::after{content:"扩展"}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(7)::after{content:"外观"}
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(2),
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(4),
body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('navList')}>button:nth-child(7){margin-top:34px}
body[data-smooth-skin] [data-shortcut-modal="settings"]>${hostPart('content')}{position:relative;z-index:1;border-left:0;border-radius:0 0 0 calc(35 * var(--smooth-u));corner-shape:round;background:var(--smooth-app);overflow:clip}
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
body[data-smooth-skin] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] :is(${hostPart('selector')},${hostPart('stepper')}){box-sizing:border-box;min-height:30px;border:1px solid var(--smooth-line-strong);border-radius:8px;background:var(--smooth-surface);font-size:13px;line-height:20px}
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
body[data-smooth-skin] .smooth-workspace-tab[data-selected="true"]:hover{background-color:color-mix(in srgb,var(--smooth-surface-3) 80%,var(--smooth-muted))}
/* The caption bar is white in light mode, and mixing its surface with the dark
   muted label turns the selected chip grey (almost black). Use the palette's
   selection fill there — the same soft blue every other selected row gets. */
body[data-smooth-skin]:not([data-ds-dark-theme]) .smooth-workspace-tab[data-selected="true"]{background-color:var(--smooth-selected)}
body[data-smooth-skin]:not([data-ds-dark-theme]) .smooth-workspace-tab[data-selected="true"]:hover{background-color:color-mix(in srgb,var(--smooth-selected) 94%,var(--smooth-text))}
body[data-smooth-skin] :is(.smooth-workspace-tab,.smooth-rail-home,.smooth-rail-plugins),
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('newSession')},${hostPart('panelRow')}),
body[data-smooth-skin] [data-composer-card] ${hostPart('add')},
body[data-smooth-skin] :is(.smooth-composer-preset,.smooth-composer-model) button{transition:background-color .16s cubic-bezier(.22,1,.36,1),box-shadow .16s cubic-bezier(.22,1,.36,1),color .16s cubic-bezier(.22,1,.36,1)}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins):hover:not(:disabled),
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('newSession')},${hostPart('panelRow')}):hover:not(:disabled),
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}:hover:not(:disabled),
body[data-smooth-skin] :is(.smooth-composer-preset,.smooth-composer-model) button:hover:not(:disabled){background-color:color-mix(in srgb,var(--smooth-surface-3) 95%,var(--smooth-text))}
body[data-smooth-skin] :is(.smooth-rail-home,.smooth-rail-plugins):active:not(:disabled),
body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('newSession')},${hostPart('panelRow')}):active:not(:disabled),
body[data-smooth-skin] [data-composer-card] ${hostPart('add')}:active:not(:disabled),
body[data-smooth-skin] :is(.smooth-composer-preset,.smooth-composer-model) button:active:not(:disabled){background-color:var(--smooth-surface-2);box-shadow:none}
@media(prefers-reduced-motion:reduce){
  body[data-smooth-skin] :is([data-composer-card],.smooth-workspace-tab,.smooth-rail-home,.smooth-rail-plugins),
  body[data-smooth-skin] ${hostPart('sidebarCol')} :is(${hostPart('newSession')},${hostPart('panelRow')}),
  body[data-smooth-skin] [data-composer-card] ${hostPart('add')},
  body[data-smooth-skin] :is(.smooth-composer-preset,.smooth-composer-model) button{transition:none}
}
@media(max-width:800px){
  body[data-smooth-skin] .smooth-workspace-bar{left:0;right:128px;padding-left:92px}
  body[data-smooth-skin] [data-shortcut-modal="settings"]{left:0}
  body[data-smooth-skin] [data-shortcut-modal="settings"]>nav{width:160px}
  body[data-smooth-skin] [data-shortcut-modal="settings"] ${hostPart('options')}{padding-inline:20px}
  body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('headline')}{font-size:26px}
  body[data-smooth-skin] ${hostPart('composerHero')} ${hostPart('heroWorkspaceRow')}{font-size:13px}
  body[data-smooth-skin] .smooth-composer-meta{gap:8px}
  body[data-smooth-skin] .smooth-meta-host{font-size:12px}
}
`;
