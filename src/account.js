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
