/**
 * One-shot DOM probe for the Smooth skin.
 *
 * Paste the whole IIFE into the Harness page's DevTools console. It walks the live
 * welcome screen and, when present, the live Plugin Manager page, then downloads one
 * JSON file. It only reads the document: it never writes to it, and it leaves the app
 * on the page it started on.
 */
(() => {
  const STORE = 'dsh-smooth-skin:state';
  const hadState = window.localStorage.getItem(STORE);
  const report = {
    at: new Date().toISOString(),
    viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio },
    skinApplied: {
      bodyHasSkinAttribute: document.body.hasAttribute('data-smooth-skin'),
      darkThemeAttribute: document.body.hasAttribute('data-ds-dark-theme'),
      bodyAttributes: [...document.body.attributes].map((a) => a.name),
      htmlAttributes: [...document.documentElement.attributes].map((a) => a.name),
      styleSheetsTagged: [...document.head.querySelectorAll('style')]
        .map((s) => ({ plugin: s.dataset.plugin || null, isSmooth: s.dataset.smoothSkin || null, length: s.textContent.length }))
        .filter((s) => s.isSmooth || (s.plugin && s.plugin.includes('smooth'))),
    },
    // Live theme-token values decide whether the token overrides actually landed.
    tokens: {},
    pages: {},
  };

  for (const token of [
    '--dsw-alias-bg-base', '--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2', '--dsw-alias-bg-layer-3',
    '--dsw-alias-bg-overlay', '--dsw-alias-label-primary', '--dsw-alias-label-secondary',
    '--dsw-alias-border-l1', '--dsw-alias-border-l2', '--dsw-alias-border-l3',
    '--dsw-alias-brand-primary', '--dsw-alias-state-business-primary', '--dsw-specific-sidebar-fill',
    '--dsw-specific-input-major', '--dsw-specific-bubble', '--smooth-surface', '--smooth-app', '--smooth-sidebar',
  ]) {
    const root = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    const body = getComputedStyle(document.body).getPropertyValue(token).trim();
    report.tokens[token] = { onHtml: root, onBody: body };
  }

  /** Summarize one element: its own identity plus the computed looks that matter. */
  function describe(el) {
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      data: Object.fromEntries([...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => [a.name, a.value])),
      role: el.getAttribute('role'),
      aria: Object.fromEntries([...el.attributes].filter((a) => a.name.startsWith('aria-')).map((a) => [a.name, a.value])),
      className: typeof el.className === 'string' ? el.className.slice(0, 160) : '',
      rect: { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) },
      style: {
        background: cs.backgroundColor,
        backgroundImage: cs.backgroundImage === 'none' ? 'none' : cs.backgroundImage.slice(0, 120),
        color: cs.color,
        border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
        borderRadius: cs.borderRadius,
        boxShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 120),
        font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(',')[0]}`,
        padding: cs.padding,
        gap: cs.gap,
      },
    };
  }

  /** A shallow tree: enough depth to place things, bounded so the file stays small. */
  function tree(el, depth = 0, maxDepth = 4, maxChildren = 24) {
    if (!el || depth > maxDepth) return null;
    const node = describe(el);
    const kids = [...el.children].slice(0, maxChildren);
    node.children = kids.map((child) => tree(child, depth + 1, maxDepth, maxChildren));
    if (el.children.length > maxChildren) node.truncatedChildren = el.children.length - maxChildren;
    return node;
  }

  report.pages.welcome = {
    mainSlot: tree(document.querySelector('[data-slot="main"]')),
    heroPhase: document.querySelector('[data-content-phase]')?.getAttribute('data-content-phase') || null,
    composerCard: (() => {
      const card = document.querySelector('[data-composer-card]');
      return card ? describe(card) : null;
    })(),
  };

  // Open the Plugin Manager through the sidebar, capture it, then restore the view.
  const pluginButton = [...document.querySelectorAll('button')].find((b) => {
    const label = (b.getAttribute('aria-label') || '') + (b.getAttribute('title') || '') + (b.textContent || '');
    return /插件|plugin/i.test(label) && b.closest('[data-slot="sidebar"]');
  });

  const previousPanel = document.querySelector('[data-slot="main"]')?.firstElementChild;

  const capturePlugins = () => {
    const main = document.querySelector('[data-slot="main"]');
    const panel = main?.querySelector('[data-plugin-panel]') || main?.firstElementChild;
    report.pages.plugins = {
      found: !!panel,
      panel: panel ? describe(panel) : null,
      tree: panel ? tree(panel, 0, 6, 28) : null,
      // Which of the hooks the skin currently keys on exist anywhere in this page?
      hookPresence: Object.fromEntries([
        '[data-plugin-panel]', '[data-testid="task-manager-page"]', '[data-row-key]',
        '[data-plugin-row]', '[data-plugin-badge]', '[data-plugin-icon]', '[data-plugin-art]',
        '[data-plugins-group]', '[data-plugin-group]', '[data-plugins-row]', '[role="switch"]',
      ].map((selector) => [selector, document.querySelectorAll(selector).length])),
    };
  };

  function finish() {
    if (hadState !== null) window.localStorage.setItem(STORE, hadState);
    const blob = new Blob([JSON.stringify(report, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dsh-smooth-dom.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    window.__dshSmoothProbe = report;
    console.log('[smooth probe] report ready; also available as window.__dshSmoothProbe');
  }

  if (!pluginButton) {
    console.warn('[smooth probe] no sidebar plugin button found; capturing the welcome screen only');
    report.pages.plugins = { found: false, reason: 'no sidebar plugin button matched' };
    finish();
    return;
  }

  pluginButton.click();
  // The panel swap is a React render; poll briefly, then capture whatever is there.
  let waited = 0;
  const settle = setInterval(() => {
    waited += 150;
    const main = document.querySelector('[data-slot="main"]');
    const swapped = main?.firstElementChild !== previousPanel;
    const hasPanel = !!main?.querySelector('[data-plugin-panel]');
    if ((swapped && waited >= 400) || hasPanel || waited >= 2400) {
      clearInterval(settle);
      capturePlugins();
      finish();
    }
  }, 150);
})();
