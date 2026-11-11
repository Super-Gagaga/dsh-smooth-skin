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
  background:var(--dsh-boot-bg,#FFFFFF);color:var(--smooth-splash-ink);
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
