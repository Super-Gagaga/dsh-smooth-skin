import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = `${await readFile(new URL('../src/watch.js', import.meta.url), 'utf8')}\n${await readFile(new URL('../src/account.js', import.meta.url), 'utf8')}`;
function runtime() {
  let state = [];
  let index = 0;
  const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== undefined && child !== null && child !== false) });
  const sandbox = { h, PLUGIN_ID: 'smooth', hostPart: name => `.${name}`, React: {
    Fragment: 'fragment', useId: () => `id-${index++}`, useRef: value => ({ current: value }), useEffect: () => {}, useLayoutEffect: () => {},
    useState: initial => { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
  } };
  runInNewContext(source + '\nglobalThis.api = { formatAccountAmount, accountWallets, createAccountExtras, installAccountMenu, navigateAccountMenu, cloneClosingAccountMenu };', sandbox);
  return { ...sandbox.api, sandbox, render: (Component, props) => { index = 0; return Component(props); }, reset: () => { state = []; } };
}
const flatten = node => node && typeof node === 'object' ? [node, ...(node.children || []).flatMap(flatten)] : [];
const copy = node => typeof node === 'string' ? node : (node?.children || []).map(copy).join(' ');

test('wallet amounts retain decimal precision and keep currencies separate', () => {
  const r = runtime();
  assert.equal(r.formatAccountAmount('9007199254740993.000001', 'CNY'), '¥9,007,199,254,740,993.000001');
  assert.equal(r.formatAccountAmount('0', 'USD'), '$0.00');
  assert.equal(r.formatAccountAmount('-0.0001', 'USD'), '-$0.0001');
  assert.equal(r.formatAccountAmount('NaN', 'CNY'), undefined);
  const wallets = r.accountWallets([{ currency: 'CNY', balance: '12.5' }, { currency: 'USD', balance: '3.10' }, { currency: 'CNY', balance: null }]);
  assert.equal(JSON.stringify(wallets), JSON.stringify([{ currency: 'CNY', amount: '¥12.50' }, { currency: 'USD', amount: '$3.10' }]));
});

test('top-up balances round to two decimals exactly, including carries and large amounts', () => {
  const r = runtime();
  for (const [input, expected] of [
    ['5.884235220000000', '¥5.88'], ['5.885', '¥5.89'], ['9.999', '¥10.00'],
    ['9007199254740993.995', '¥9,007,199,254,740,994.00'],
    ['0', '¥0.00'], ['12.5', '¥12.50'], ['-0.0001', '¥0.00'], ['-0.005', '-¥0.01'],
  ]) assert.equal(r.formatAccountAmount(input, 'CNY', true), expected);
});

test('missing or zero bonus balances hide their row while nonzero currencies remain separate', () => {
  const r = runtime();
  const Component = r.createAccountExtras({}, (_key, fallback) => fallback);
  const balance = { status: 'ready', value: [{ currency: 'CNY', balance: '5.884235220000000' }] };
  const account = { view: { status: 'credential-stored' }, details: { balance } };
  const props = { useAccount: selector => selector(account), t: key => key };
  for (const bonusWallets of [undefined, [], [{ currency: 'CNY', balance: '0.00' }], [{ currency: 'USD', balance: '-000.000' }]]) {
    balance.bonusWallets = bonusWallets;
    const view = r.render(Component, props);
    assert.ok(copy(view).includes('¥5.88'));
    assert.ok(!copy(view).includes('5.884'));
    assert.ok(!copy(view).includes('bonusBalance'));
    assert.equal(flatten(view).filter(node => node.props.className === 'smooth-account-wallet').length, 1);
  }
  balance.bonusWallets = [{ currency: 'CNY', balance: '0' }, { currency: 'USD', balance: '0.50' }, { currency: 'EUR', balance: '0.0001' }];
  const view = r.render(Component, props);
  assert.ok(copy(view).includes('bonusBalance'));
  const bonusRow = flatten(view).filter(node => node.props.className === 'smooth-account-wallet')[1];
  assert.ok(copy(bonusRow).includes('$0.50'));
  assert.ok(copy(bonusRow).includes('€0.0001'));
  assert.ok(!copy(bonusRow).includes('¥0.00'));
});

test('remaining usage toggles the real topped-up and granted balances below its row', async () => {
  const r = runtime();
  const Component = r.createAccountExtras(new Proxy({}, { get: (_target, key) => key }), (_key, fallback) => fallback);
  let reads = 0;
  const account = { view: { status: 'credential-stored' }, details: { profile: { status: 'ready', value: { name: '实际账号', avatarUrl: 'https://example.test/avatar.png' } }, balance: { status: 'ready', value: [{ currency: 'CNY', balance: '12.34' }], bonusWallets: [{ currency: 'CNY', balance: '0.50' }] } } };
  const props = { useAccount: selector => selector(account), t: key => key, refreshAccount: async () => { reads++; } };
  let view = r.render(Component, props);
  assert.ok(copy(view).includes('实际账号'));
  assert.ok(!copy(view).includes('Plus'));
  const usage = () => flatten(view).find(node => node.props.className === 'smooth-account-usage');
  const panel = () => flatten(view).find(node => node.props.className === 'smooth-account-balance');
  assert.equal(usage().props['aria-expanded'], false);
  assert.equal(panel().props.inert, true);
  assert.equal(panel().props['aria-hidden'], true);
  assert.equal(usage().props['aria-controls'], panel().props.id);
  usage().props.onClick(); await Promise.resolve();
  view = r.render(Component, props);
  assert.equal(usage().props['aria-expanded'], true);
  assert.equal(panel().props['data-expanded'], true);
  assert.equal(panel().props.inert, false);
  assert.equal(reads, 1);
  assert.ok(copy(view).includes('¥12.34'));
  assert.ok(copy(view).includes('¥0.50'));
  assert.ok(view.children.findIndex(node => node.props?.className === 'smooth-account-balance') > view.children.findIndex(node => node.props?.className === 'smooth-account-usage'));
  usage().props.onClick(); view = r.render(Component, props);
  assert.equal(usage().props['aria-expanded'], false);
  assert.ok(panel(), 'keep the panel mounted during its closing transition');
  assert.equal(panel().props['data-expanded'], false);
  assert.equal(panel().props['aria-hidden'], true);
  assert.equal(panel().props.inert, true);
  assert.equal(flatten(panel()).find(node => node.props['aria-label'] === '刷新余额').props.disabled, true);
  usage().props.onClick(); view = r.render(Component, props);
  assert.equal(panel().props['data-expanded'], true, 'a toggle during closing reverses the same panel');
  account.view.status = 'signed-out';
  view = r.render(Component, props);
  assert.ok(!copy(view).includes('实际账号'));
  assert.equal(usage().props.disabled, true);
});

test('failed balance loads show retry feedback, never a fabricated zero', () => {
  const r = runtime();
  const Component = r.createAccountExtras({}, (_key, fallback) => fallback);
  const account = { view: { status: 'credential-stored' }, details: { balance: { status: 'failed' } } };
  const props = { useAccount: selector => selector(account), t: key => key };
  let view = r.render(Component, props);
  flatten(view).find(node => node.props.className === 'smooth-account-usage').props.onClick();
  view = r.render(Component, props);
  assert.ok(copy(view).includes('余额读取失败'));
  assert.ok(!copy(view).includes('0.00'));
  assert.ok(flatten(view).some(node => node.props['aria-label'] === '刷新余额'));
});

test('help replaces the main actions, opens the four requested browser URLs and returns', () => {
  const r = runtime();
  const opened = [];
  r.sandbox.window = { open: (...args) => opened.push(args) };
  const Component = r.createAccountExtras({}, (_key, fallback) => fallback);
  const props = { useAccount: selector => selector({ view: { status: 'credential-stored' } }), t: key => key };
  let view = r.render(Component, props);
  const page = () => flatten(view).find(node => node.props.className === 'smooth-account-help-page');
  const usage = () => flatten(view).find(node => node.props.className === 'smooth-account-usage');
  assert.equal(page().props.inert, true);
  usage().props.onClick(); view = r.render(Component, props);
  flatten(view).find(node => node.props.className === 'smooth-account-help').props.onClick();
  view = r.render(Component, props);
  assert.equal(page().props['data-active'], true);
  assert.equal(page().props['aria-hidden'], false);
  assert.equal(page().props.inert, false);
  assert.equal(usage().props.inert, true);
  assert.equal(usage().props['aria-expanded'], false);
  assert.equal(opened.length, 0, 'entering help must not open a browser');
  const links = flatten(page()).filter(node => node.props.className === 'smooth-account-help-link');
  assert.deepEqual(links.map(link => copy(link).trim()), ['查看 Github', '开发者文档', '社区插件', 'cordis 论文']);
  for (const link of links) link.props.onClick();
  assert.deepEqual(opened, [
    ['https://github.com/deepseek-ai/deepseek-harness', '_blank', 'noopener,noreferrer'],
    ['https://deepseek-harness.github.io/deepseek-harness/guide/quickstart', '_blank', 'noopener,noreferrer'],
    ['https://github.com/topics/dsh-plugin', '_blank', 'noopener,noreferrer'],
    ['https://arxiv.org/abs/2608.25512', '_blank', 'noopener,noreferrer'],
  ]);
  flatten(page()).find(node => node.props.className === 'smooth-account-help-back').props.onClick();
  view = r.render(Component, props);
  assert.equal(page().props['data-active'], false);
  assert.equal(page().props.inert, true);
  assert.equal(usage().props.inert, false);
  assert.ok(!flatten(view).some(node => node.props.className === 'smooth-account-help-copy'));
});

test('arrow navigation follows displayed order instead of native registration order', () => {
  const r = runtime();
  let focused;
  const button = (id, top) => ({ id, getBoundingClientRect: () => ({ top, left: 0, width: 100, height: 32 }), focus: () => { focused = id; }, scrollIntoView() {} });
  const settings = button('settings', 100), feedback = button('feedback', 68), usage = button('usage', 36);
  const hidden = { ...button('hidden-help-link', 200), closest: () => ({ inert: true }) };
  const menu = { querySelectorAll: () => [settings, feedback, usage, hidden] };
  const event = { key: 'ArrowDown', target: { closest: () => usage }, preventDefault() {}, stopPropagation() {} };
  r.navigateAccountMenu(event, menu);
  assert.equal(focused, 'feedback');
  r.navigateAccountMenu({ ...event, key: 'End' }, menu);
  assert.equal(focused, 'settings');
});

test('launcher retains native account operations and restores its registration on teardown', () => {
  const r = runtime();
  const native = { component: () => 'native', options: {}, locale: 'settings.account', inject: () => ({}), store: {} };
  let entries = [native]; let subscription;
  r.sandbox.require = name => name === 'react-dom' ? { createPortal() {} } : {};
  const slots = { inject: (_name, setup) => setup(), entries: () => entries,
    subscribe: (_name, fn) => { subscription = fn; return () => { subscription = undefined; }; },
    register: (options, component) => { const entry = { ...options, options, component }; entries.push(entry); return () => { entries = entries.filter(item => item !== entry); }; } };
  const dispose = r.installAccountMenu({ slots });
  assert.equal(entries[1].inject, native.inject);
  assert.equal(entries[1].store, native.store);
  assert.equal(entries[1].locale, native.locale);
  assert.equal(entries[1].options.priority, -10);
  dispose();
  assert.deepEqual(entries, [native]);
  assert.equal(subscription, undefined);
});

test('the popup entrance is armed only after the portal has laid out', () => {
  // The menu's scale animation used to start the moment it mounted, so the profile card
  // this portal renders landed in the middle of the animation and stalled it. The layout
  // effect arms the entrance (and the cleanup disarms it) instead.
  const layoutEffects = [];
  let index = 0;
  const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(child => child !== undefined && child !== null && child !== false) });
  const sandbox = {
    h, PLUGIN_ID: 'smooth', hostPart: name => `.${name}`, accountPart: name => `.account-${name}`,
    React: {
      Fragment: 'fragment', useId: () => `id-${index++}`, useRef: value => ({ current: value }),
      useState: initial => [initial, () => {}], useEffect: () => {},
      useLayoutEffect: effect => { layoutEffects.push(effect); },
    },
  };
  runInNewContext(`${source}\nglobalThis.api = { createAccountExtras };`, sandbox);
  const ui = new Proxy({}, { get: () => () => 'icon' });
  const Extras = sandbox.api.createAccountExtras(ui, (key, fallback) => fallback ?? key);
  const tree = Extras({ useAccount: selector => selector({}), refreshAccount: undefined, t: key => key });
  const find = node => node && typeof node === 'object'
    ? (node.props?.className === 'smooth-account-extras' ? node : (node.children || []).map(find).find(Boolean))
    : undefined;
  const root = find(tree);
  assert.ok(root, 'the extras root renders');
  const attributes = {};
  const menu = {
    setAttribute: (key, value) => { attributes[key] = value; },
    removeAttribute: key => { delete attributes[key]; },
    toggleAttribute: () => {}, querySelectorAll: () => [],
  };
  root.props.ref.current = { closest: () => menu };
  const cleanups = layoutEffects.map(effect => effect()).filter(Boolean);
  assert.equal(attributes['data-smooth-account-open'], '');
  for (const cleanup of cleanups) cleanup();
  assert.equal(attributes['data-smooth-account-open'], undefined);
});

test('the closing animation runs on a detached copy of the open menu', () => {
  // The host removes the real menu in the same commit that closes it, so account.js
  // clones it just before and tags the copy for the reverse keyframes.
  const r = runtime();
  const original = { 'data-smooth-account-menu': '', 'data-smooth-account-open': '' };
  const cloned = {};
  const ids = [{ name: 'viewport' }, { name: 'balance' }];
  const clone = {
    style: {},
    setAttribute: (key, value) => { cloned[key] = value; },
    removeAttribute: key => { delete cloned[key]; },
    querySelectorAll: () => ids.map(node => ({ removeAttribute: () => { node.removed = true; } })),
  };
  const menu = { hasAttribute: key => key in original, cloneNode: () => clone };
  const copy = r.cloneClosingAccountMenu(menu);
  assert.equal(copy, clone);
  assert.equal(original['data-smooth-account-open'], '', 'the original keeps its entrance state');
  assert.equal('data-smooth-account-open' in cloned, false, 'the copy drops the entrance state');
  assert.equal(cloned['data-smooth-account-leave'], '', 'the copy is tagged for the closing keyframes');
  assert.equal(cloned['aria-hidden'], 'true');
  assert.equal(cloned.inert, '');
  assert.equal(clone.style.pointerEvents, 'none');
  assert.deepEqual(ids.map(node => node.removed), [true, true], 'duplicate ids are stripped from the copy');
  assert.equal(r.cloneClosingAccountMenu({ hasAttribute: () => true }), undefined, 'a leaving copy is never cloned again');
});
