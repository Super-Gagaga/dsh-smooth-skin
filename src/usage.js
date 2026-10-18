/**
 * The landing page's usage panel.
 *
 * The page this decorates is the landing page shown once every tab is closed: the
 * Host still mounts the blank-session hero — the headline the skin already joins
 * with the product name — and nothing else. The panel is portalled into that hero's
 * own stack, so it lands directly under the headline, inside the column the composer
 * card occupies when a tab is open, and disappears with the hero.
 *
 * Layout follows the claude-style usage card: tabs (概览 / 模型) and a period switch
 * (全部 / 30 天 / 7 天) in one header, six figures, then a 26-week heatmap whose cell
 * shade is the day's share of the busiest day in the window. The numbers come from the
 * Host half's `usage` bridge action, which folds the stored Session logs into per-day
 * records (src/host.js). One request serves every mount for a minute; a page whose Host
 * half predates the action shows no panel at all rather than an empty frame.
 */

/** The window the reference card draws: 26 weeks ending with the current one. */
const USAGE_WEEKS = 26;
/** The reference card's four lit shades. */
const USAGE_LEVELS = 4;
/** How many models the 模型 tab lists before asking to expand. */
const USAGE_MODEL_ROWS = 6;
const USAGE_TTL_MS = 60_000;
const USAGE_RANGES = [
  { id: 'all', days: 0, key: 'usage.rangeAll', fallback: '全部' },
  { id: '30d', days: 30, key: 'usage.range30d', fallback: '30 天' },
  { id: '7d', days: 7, key: 'usage.range7d', fallback: '7 天' },
];

/** The reading ladder behind the closing line: tokens in one copy of each book. The
 * counts are the reference card's own approximations, so the same total lands on the
 * same book; the list only has to stay sorted by length. Names are locale entries so
 * both languages read naturally. */
const USAGE_BOOKS = [
  { tokens: 7607, key: 'usage.book.taoTeChing', zh: '道德经' },
  { tokens: 27557, key: 'usage.book.metamorphosis', zh: '变形记' },
  { tokens: 37248, key: 'usage.book.alice', zh: '爱丽丝梦游仙境' },
  { tokens: 39000, key: 'usage.book.animalFarm', zh: '动物农场' },
  { tokens: 65763, key: 'usage.book.gatsby', zh: '了不起的盖茨比' },
  { tokens: 100000, key: 'usage.book.philosophersStone', zh: '哈利·波特与魔法石' },
  { tokens: 136278, key: 'usage.book.nineteenEightyFour', zh: '一九八四' },
  { tokens: 138725, key: 'usage.book.sherlock', zh: '福尔摩斯探案集' },
  { tokens: 152659, key: 'usage.book.walden', zh: '瓦尔登湖' },
  { tokens: 159575, key: 'usage.book.madameBovary', zh: '包法利夫人' },
  { tokens: 171701, key: 'usage.book.pride', zh: '傲慢与偏见' },
  { tokens: 173150, key: 'usage.book.odyssey', zh: '奥德赛' },
  { tokens: 187333, key: 'usage.book.taleOfTwoCities', zh: '双城记' },
  { tokens: 202000, key: 'usage.book.threeBody', zh: '三体' },
  { tokens: 285009, key: 'usage.book.crimeAndPunishment', zh: '罪与罚' },
  { tokens: 481659, key: 'usage.book.annaKarenina', zh: '安娜·卡列尼娜' },
  { tokens: 574243, key: 'usage.book.donQuixote', zh: '堂吉诃德' },
  { tokens: 625000, key: 'usage.book.lordOfTheRings', zh: '魔戒' },
  { tokens: 638009, key: 'usage.book.threeKingdoms', zh: '三国演义' },
  { tokens: 769001, key: 'usage.book.warAndPeace', zh: '战争与和平' },
  { tokens: 783200, key: 'usage.book.journeyWest', zh: '西游记' },
  { tokens: 801791, key: 'usage.book.lesMiserables', zh: '悲惨世界' },
  { tokens: 903956, key: 'usage.book.redChamber', zh: '红楼梦' },
  { tokens: 958242, key: 'usage.book.waterMargin', zh: '水浒传' },
  { tokens: 998000, key: 'usage.book.ordinaryWorld', zh: '平凡的世界' },
  { tokens: 1409000, key: 'usage.book.harryPotter', zh: '哈利·波特全集' },
  { tokens: 1647000, key: 'usage.book.lostTime', zh: '追忆似水年华' },
];

/** One remembered response, shared by every remount of the landing page. */
let usageCache;

async function usageSnapshot() {
  if (usageCache && Date.now() - usageCache.at < USAGE_TTL_MS) return usageCache.value;
  const value = await bridgeRequest('usage');
  usageCache = { at: Date.now(), value };
  return value;
}

/** `%s` substitution for the counters that carry a number: the shared locale table has
 * no formatter, and a whole ICU layer for five strings would outweigh the panel. */
function usageFill(template, ...values) {
  let index = 0;
  return template.replace(/%s/g, () => String(values[index++] ?? ''));
}

/** 916 -> 916, 45 612 -> 45.6k, 3 683 260 964 -> 3.7B. One decimal at most, which is
 * what the reference card prints and what the Host's own status bar does. */
function usageTokens(value) {
  const total = Number(value) || 0;
  for (const [size, suffix] of [[1e9, 'B'], [1e6, 'M'], [1e3, 'k']]) {
    const scaled = Math.round(total / size * 10) / 10;
    if (scaled >= 1) return `${scaled}${suffix}`;
  }
  return String(Math.round(total));
}

/** Whole counts keep their groups: 13,262 messages reads better than 13.3k. */
function usageCount(value) {
  return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function usageDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const usageDateFormatter = (() => {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return null;
  }
})();

function usageDateLabel(key) {
  const [year, month, day] = key.split('-').map(Number);
  if (!usageDateFormatter) return key;
  try {
    return usageDateFormatter.format(new Date(year, month - 1, day));
  } catch {
    return key;
  }
}

/** 05:00 -> "上午 5 点", 17:00 -> "下午 5 点", 0 -> "上午 12 点". */
function usageHourLabel(hour, text) {
  const clock = hour % 12 === 0 ? 12 : hour % 12;
  return usageFill(
    text(hour < 12 ? 'usage.hourAm' : 'usage.hourPm', hour < 12 ? '上午 %s 点' : '下午 %s 点'),
    clock,
  );
}

/** The closing line: the largest book the total has out-read, and how many copies. */
function usageBookLine(tokens, text) {
  let chosen;
  for (const book of USAGE_BOOKS) if (tokens >= book.tokens) chosen = book;
  if (!chosen) return null;
  return usageFill(
    text('usage.fun', '你的 Token 用量相当于 %s 本《%s》。'),
    usageCount(Math.round(tokens / chosen.tokens)),
    text(chosen.key, chosen.zh),
  );
}

/** The 26-week grid: Sunday-first columns of seven days, shades relative to the busiest
 * day in the window — the reference card's own scale, which keeps a busy month distinct
 * from a quiet one instead of splitting quantiles of a handful of days. */
function usageCells(days) {
  const byDay = new Map(days.map((entry) => [entry.day, Number(entry.tokens) || 0]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (USAGE_WEEKS * 7 - 1));
  start.setDate(start.getDate() - start.getDay());
  const cells = [];
  let peak = 0;
  for (const cursor = new Date(start); cursor <= today; cursor.setDate(cursor.getDate() + 1)) {
    const key = usageDateKey(cursor);
    const tokens = byDay.get(key) || 0;
    if (tokens > peak) peak = tokens;
    cells.push({ key, tokens, level: 0 });
  }
  for (const cell of cells) {
    cell.level = cell.tokens > 0 && peak > 0
      ? Math.max(1, Math.min(USAGE_LEVELS, Math.ceil(cell.tokens / peak * USAGE_LEVELS)))
      : 0;
  }
  return { cells, peak };
}

/** One period's figures: the six tiles and the model ranking. The heatmap always shows
 * the whole window (the reference card does the same — the switch filters the figures,
 * not the calendar). */
function usageSummary(days, rangeId, text) {
  const range = USAGE_RANGES.find((entry) => entry.id === rangeId) || USAGE_RANGES[0];
  let cutoff;
  if (range.days > 0) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (range.days - 1));
    cutoff = usageDateKey(from);
  }
  let tokens = 0;
  let calls = 0;
  let activeDays = 0;
  const sessions = new Set();
  const hours = new Array(24).fill(0);
  const models = {};
  for (const entry of days) {
    if (cutoff && entry.day < cutoff) continue;
    const dayTokens = Number(entry.tokens) || 0;
    tokens += dayTokens;
    calls += Number(entry.calls) || 0;
    if (dayTokens > 0) activeDays += 1;
    for (const id of entry.sessions || []) sessions.add(id);
    for (let hour = 0; hour < 24; hour++) hours[hour] += Number(entry.hours?.[hour]) || 0;
    for (const [model, value] of Object.entries(entry.models || {})) models[model] = (models[model] || 0) + Number(value || 0);
  }
  let peakHour = null;
  if (hours.some((value) => value > 0)) {
    peakHour = 0;
    for (let hour = 1; hour < 24; hour++) if (hours[hour] > hours[peakHour]) peakHour = hour;
  }
  const ranking = Object.entries(models)
    .filter(([, value]) => Number(value) > 0)
    .map(([id, value]) => ({ id, tokens: value }))
    .sort((left, right) => right.tokens - left.tokens || (left.id < right.id ? -1 : 1));
  return {
    tokens,
    calls,
    sessions: sessions.size,
    activeDays,
    peakHour,
    model: ranking.length ? ranking[0].id : null,
    models: ranking,
    cells: usageCells(days).cells,
    fun: usageBookLine(tokens, text),
  };
}

function UsagePanel({ text, days, pending }) {
  const [tab, setTab] = React.useState('overview');
  const [range, setRange] = React.useState('all');
  const [expanded, setExpanded] = React.useState(false);
  const summary = React.useMemo(() => usageSummary(days, range, text), [days, range]);
  const columns = Math.ceil(summary.cells.length / 7);
  const edge = 3;
  const known = !pending;
  const stat = (id, label, value) => h('div', { className: 'smooth-usage-stat', 'data-smooth-stat': id },
    h('span', { className: 'smooth-usage-stat-label' }, label),
    h('span', { className: 'smooth-usage-stat-value' }, known ? value : '—'));
  const tabButton = (id, label) => h('button', {
    key: id,
    type: 'button',
    role: 'tab',
    className: 'smooth-usage-tab',
    'aria-selected': tab === id,
    'data-active': tab === id ? '' : undefined,
    onClick: () => setTab(id),
  }, label);
  const rangeButton = (entry) => h('button', {
    key: entry.id,
    type: 'button',
    className: 'smooth-usage-range',
    'aria-pressed': range === entry.id,
    'data-active': range === entry.id ? '' : undefined,
    onClick: () => setRange(entry.id),
  }, text(entry.key, entry.fallback));
  return h('section', {
    className: 'smooth-usage-panel',
    role: 'region',
    'aria-label': text('usage.title', '每日 token 使用'),
    'aria-busy': pending ? 'true' : 'false',
  },
  h('div', { className: 'smooth-usage-head' },
    h('div', { className: 'smooth-usage-tabs', role: 'tablist', 'aria-label': text('usage.title', '每日 token 使用') },
      tabButton('overview', text('usage.tabOverview', '概览')),
      tabButton('models', text('usage.tabModels', '模型'))),
    h('div', { className: 'smooth-usage-ranges', role: 'group' }, USAGE_RANGES.map(rangeButton))),
  tab === 'models'
    ? h(UsageModels, { text, summary, expanded, onToggle: () => setExpanded((value) => !value) })
    : h(React.Fragment, null,
      h('div', { className: 'smooth-usage-stats' },
        stat('sessions', text('usage.sessions', '会话数'), usageCount(summary.sessions)),
        stat('calls', text('usage.calls', '消息数'), usageCount(summary.calls)),
        stat('tokens', text('usage.tokens', 'Token 总量'), usageTokens(summary.tokens)),
        stat('days', text('usage.activeDays', '活跃天数'), usageCount(summary.activeDays)),
        stat('peak', text('usage.peak', '高峰时段'), summary.peakHour === null ? '—' : usageHourLabel(summary.peakHour, text)),
        stat('model', text('usage.topModel', '最常用模型'), summary.model || '—')),
      h('div', { className: 'smooth-usage-heat', 'data-smooth-skeleton': pending ? '' : undefined },
        summary.cells.map((cell, index) => {
          const column = Math.floor(index / 7);
          const tip = pending ? undefined : usageFill(text('usage.heatTip', '%s — %s Token'), usageDateLabel(cell.key), usageTokens(cell.tokens));
          return h('span', {
            key: cell.key,
            className: 'smooth-usage-heat-cell',
            'data-smooth-level': String(cell.level),
            'data-smooth-tip': tip,
            'data-smooth-edge': column < edge ? 'start' : column >= columns - edge ? 'end' : undefined,
            'aria-label': tip,
          });
        })),
      summary.fun ? h('span', { className: 'smooth-usage-fun' }, summary.fun) : null));
}

function UsageModels({ text, summary, expanded, onToggle }) {
  if (!summary.models.length) return h('div', { className: 'smooth-usage-models-empty' }, text('usage.modelsEmpty', '暂无模型数据'));
  const total = summary.models.reduce((sum, model) => sum + model.tokens, 0);
  const rows = expanded ? summary.models : summary.models.slice(0, USAGE_MODEL_ROWS);
  const hidden = summary.models.length - rows.length;
  return h('div', { className: 'smooth-usage-models' },
    rows.map((model, index) => h('div', { key: model.id, className: 'smooth-usage-model' },
      h('span', { className: 'smooth-usage-model-swatch', 'data-smooth-rank': String(Math.min(index, 5)) }),
      h('span', { className: 'smooth-usage-model-name' }, model.id),
      h('span', { className: 'smooth-usage-model-split' }, usageTokens(model.tokens)),
      h('span', { className: 'smooth-usage-model-share' }, total > 0 ? `${Math.round(model.tokens / total * 1000) / 10}%` : '—'))),
    hidden > 0 || expanded
      ? h('button', {
        type: 'button',
        className: 'smooth-usage-more',
        'aria-expanded': expanded,
        onClick: onToggle,
      }, expanded ? text('usage.modelsLess', '收起') : usageFill(text('usage.modelsMore', '再显示 %s 个'), hidden))
      : null);
}

function installUsage({ slots, useSmoothState, text }) {
  if (!slots || typeof slots.inject !== 'function') return () => {};
  const { createPortal } = require('react-dom');
  const surfaces = createSurfaceWatcher();
  function useTarget(selector) {
    const [target, setTarget] = React.useState(null);
    React.useEffect(() => surfaces.watch(selector, setTarget), [selector]);
    return target;
  }
  /** The landing page is the one with no tab open; the chrome publishes that state on
   * the body (src/layout.js) and the stylesheet already drops the composer card there.
   * The panel belongs to that page alone — a new Session keeps its hero to itself. */
  function useNoTabs() {
    const [noTabs, setNoTabs] = React.useState(() => document.body.hasAttribute(NO_TABS_ATTRIBUTE));
    React.useEffect(() => {
      const publish = () => setNoTabs(document.body.hasAttribute(NO_TABS_ATTRIBUTE));
      publish();
      const observer = new MutationObserver(publish);
      observer.observe(document.body, { attributes: true, attributeFilter: [NO_TABS_ATTRIBUTE] });
      return () => observer.disconnect();
    }, []);
    return noTabs;
  }
  function WelcomeUsage() {
    const skin = useSmoothState();
    const noTabs = useNoTabs();
    // The hero stack is the centered column holding the headline; the panel belongs at
    // its end, directly under the headline.
    const title = useTarget(`[data-content-phase="hero"] ${hostPart('composerHero')} ${hostPart('titleGroup')}`);
    const stack = title?.parentElement?.parentElement || null;
    const [mount, setMount] = React.useState(null);
    const [snapshot, setSnapshot] = React.useState(() => usageCache && Date.now() - usageCache.at < USAGE_TTL_MS
      ? { status: 'ready', value: usageCache.value }
      : { status: 'loading' });
    React.useEffect(() => {
      if (!stack || !noTabs) { setMount(null); return undefined; }
      const node = document.createElement('div');
      node.className = 'smooth-usage-mount';
      stack.append(node);
      setMount(node);
      return () => { node.remove(); };
    }, [stack, noTabs]);
    React.useEffect(() => {
      if (snapshot.status !== 'loading') return undefined;
      let alive = true;
      usageSnapshot().then((value) => { if (alive) setSnapshot({ status: 'ready', value }); })
        .catch(() => { if (alive) setSnapshot({ status: 'unavailable' }); });
      return () => { alive = false; };
    }, [snapshot.status]);
    if (!skin.state.enabled || !noTabs || !mount || snapshot.status === 'unavailable') return null;
    return createPortal(h(UsagePanel, {
      text,
      days: snapshot.status === 'ready' ? snapshot.value.days : [],
      pending: snapshot.status === 'loading',
    }), mount);
  }
  const dispose = slots.inject('shell.overlay', () => slots.register({
    name: 'shell.overlay',
    id: `${PLUGIN_ID}.usage`,
    order: 20,
  }, WelcomeUsage));
  return () => { dispose?.(); surfaces.dispose(); };
}
