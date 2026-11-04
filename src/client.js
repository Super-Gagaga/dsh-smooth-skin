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

