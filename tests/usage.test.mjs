import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { zstdCompressSync, zstdDecompressSync } from 'node:zlib';
import {
  ensureGitServerForTest,
  foldSessionLogForTest,
  scanSessionsForTest,
} from '../lib/index.js';

const read = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
/** The Host passes node:zlib in, so the test does too. */
const zlib = { zstdDecompressSync };

/** One settlement line, serialized in the order the Session log writes its keys: the
 * fold keys on `seq`/`time` and on the last unescaped `usage` object. */
function settlement({ seq, time, turn, step, usage, attempt = false, model = 'deepseek-flash' }) {
  const data = { turn, step };
  if (!attempt) {
    data.message = {
      role: 'assistant',
      content: [{ type: 'text', text: 'prose may mention "usage":{"inputTokens":999}' }],
      source: { kind: 'model', provider: 'deepseek-account', model },
    };
  }
  data.stream = [{ type: 'chunk', time, chunk: { type: 'finish', reason: { kind: 'stop' } } }];
  data.usage = usage;
  return `${JSON.stringify({ type: attempt ? 'assistant/attempt' : 'assistant/message', seq, time, data })}\n`;
}

function frames(...texts) {
  return Buffer.concat(texts.map((text) => zstdCompressSync(Buffer.from(text, 'utf8'))));
}

function dayOf(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const afternoon = new Date(2026, 4, 12, 15, 30, 0).getTime();
const evening = new Date(2026, 4, 12, 22, 5, 0).getTime();
const nextDay = new Date(2026, 4, 13, 9, 0, 0).getTime();

test('one log folds into local-day records, and a retried step counts once', () => {
  const log = frames(
    `${JSON.stringify({ type: 'session', version: 4, createdAt: nextDay })}\n`,
    settlement({ seq: 1, time: afternoon, turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 100, cacheWriteTokens: 0 } }),
    // The same (turn, step) settled again — a retry replaces its predecessor.
    settlement({ seq: 2, time: afternoon, turn: 1, step: 1, usage: { inputTokens: 20, outputTokens: 6, cacheReadTokens: 200 } }),
    settlement({ seq: 3, time: evening, turn: 1, step: 2, usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0 } }),
    settlement({ seq: 4, time: nextDay, turn: 2, step: 1, usage: { inputTokens: 3, outputTokens: 2 } }),
  );
  const days = foldSessionLogForTest(log, zlib);
  const today = days.get(dayOf(afternoon));
  assert.equal(today.input, 21, 'the replacement is folded, the replaced attempt is not');
  assert.equal(today.output, 7);
  assert.equal(today.cacheRead, 200);
  assert.equal(today.calls, 2, 'two settled steps on that day');
  assert.equal(today.hours[15], 226, 'the afternoon settlement lands in hour 15');
  assert.equal(today.hours[22], 2, 'and the evening one in hour 22');
  assert.deepEqual(today.models, { 'deepseek-flash': 228 });
  const tomorrow = days.get(dayOf(nextDay));
  assert.equal(tomorrow.input, 3);
  assert.equal(tomorrow.output, 2);
  assert.equal(tomorrow.calls, 1);
  assert.equal(tomorrow.hours[9], 5);
  assert.equal(days.size, 2);
});

test('an attempt settlement folds through the same rule', () => {
  const text = settlement({ seq: 1, time: afternoon, turn: 4, step: 1, attempt: true, usage: { inputTokens: 9, outputTokens: 2 } });
  const days = foldSessionLogForTest(Buffer.from(text, 'utf8'), undefined);
  const day = days.get(dayOf(afternoon));
  assert.equal(day.input, 9);
  assert.equal(day.output, 2);
  assert.equal(day.calls, 1);
  assert.deepEqual(day.models, { unknown: 11 }, 'an attempt carries no message source');
});

test('a plain JSONL log folds through the same rule', () => {
  const text = settlement({ seq: 1, time: afternoon, turn: 3, step: 1, usage: { inputTokens: 7, outputTokens: 3, cacheReadTokens: 0 } });
  const days = foldSessionLogForTest(Buffer.from(text, 'utf8'), undefined);
  const day = days.get(dayOf(afternoon));
  assert.equal(day.input, 7);
  assert.equal(day.output, 3);
  assert.equal(day.calls, 1);
});

test('a torn tail frame is not counted, the frames before it are', () => {
  const complete = frames(
    settlement({ seq: 1, time: afternoon, turn: 1, step: 1, usage: { inputTokens: 5, outputTokens: 1 } }),
  );
  const torn = zstdCompressSync(Buffer.from(settlement({ seq: 2, time: afternoon, turn: 1, step: 2, usage: { inputTokens: 900, outputTokens: 900 } }), 'utf8'));
  const days = foldSessionLogForTest(Buffer.concat([complete, torn.subarray(0, Math.floor(torn.length / 2))]), zlib);
  const day = days.get(dayOf(afternoon));
  assert.equal(day.input, 5);
  assert.equal(day.calls, 1);
});

test('the archive scan aggregates every stored Session, reuses the cache and skips stale logs', async () => {
  const home = mkdtempSync(join(tmpdir(), 'smooth-usage-'));
  const sessionsRoot = join(home, 'sessions');
  const workspace = join(sessionsRoot, 'ws-a');
  mkdirSync(join(workspace, 'session-one'), { recursive: true });
  mkdirSync(join(workspace, 'session-two'), { recursive: true });
  const one = join(workspace, 'session-one', 'session.v4.jsonl.zstd');
  const two = join(workspace, 'session-two', 'session.v4.jsonl');
  writeFileSync(one, frames(
    settlement({ seq: 1, time: afternoon, turn: 1, step: 1, usage: { inputTokens: 10, outputTokens: 2, cacheReadTokens: 30 } }),
    settlement({ seq: 2, time: nextDay, turn: 2, step: 1, usage: { inputTokens: 1, outputTokens: 1 } }),
  ));
  writeFileSync(two, settlement({ seq: 1, time: evening, turn: 1, step: 1, usage: { inputTokens: 4, outputTokens: 4 } }));
  try {
    const { days, sessions } = await scanSessionsForTest({ sessionsRoot, now: Date.now() });
    const today = days.get(dayOf(afternoon));
    assert.equal(today.input, 14, 'both Sessions land on the same local day');
    assert.equal(today.output, 6);
    assert.equal(today.cached, 30);
    assert.equal(today.calls, 2);
    assert.deepEqual([...today.sessions].sort(), ['session-one', 'session-two']);
    assert.equal(days.get(dayOf(nextDay)).input, 1);
    assert.equal(Object.keys(sessions).length, 2, 'one cache record per log');
    assert.ok(sessions[join('ws-a', 'session-one', 'session.v4.jsonl.zstd')].size > 0);

    // A log whose recorded (size, mtime) still matches is not decoded again: the
    // stored record stands in for it, so a sentinel proves the file was not read.
    const key = join('ws-a', 'session-two', 'session.v4.jsonl');
    const cached = { sessions: { [key]: { ...sessions[key], days: { [dayOf(afternoon)]: { input: 777, output: 0, cacheRead: 0, cacheWrite: 0, calls: 9, hours: new Array(24).fill(0), models: {} } } } } };
    const reused = await scanSessionsForTest({ sessionsRoot, cache: cached, now: Date.now() });
    assert.equal(reused.days.get(dayOf(afternoon)).input, 787, 'cached figures plus the decoded log');
    assert.equal(reused.days.get(dayOf(afternoon)).calls, 10);

    // A log last written outside the window is not part of the answer.
    const stale = join(workspace, 'session-two', 'session.v5.jsonl');
    writeFileSync(stale, settlement({ seq: 1, time: afternoon, turn: 9, step: 9, usage: { inputTokens: 5000, outputTokens: 5000 } }));
    const old = new Date(Date.now() - 800 * 86_400_000);
    utimesSync(stale, old, old);
    const filtered = await scanSessionsForTest({ sessionsRoot, now: Date.now() });
    assert.equal(Object.keys(filtered.sessions).length, 2, 'the stale log is left out');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('the bridge serves the folded archive for the landing page', async () => {
  const home = mkdtempSync(join(tmpdir(), 'smooth-usage-home-'));
  const workspace = join(home, 'sessions', 'ws-b', 'session-one');
  mkdirSync(workspace, { recursive: true });
  writeFileSync(join(workspace, 'session.v4.jsonl.zstd'), frames(
    settlement({ seq: 1, time: afternoon, turn: 1, step: 1, usage: { inputTokens: 6, outputTokens: 4, cacheReadTokens: 90 } }),
  ));
  const previous = process.env.DSH_HOME;
  process.env.DSH_HOME = home;
  const bridge = ensureGitServerForTest({}, 39617);
  try {
    const injection = await (async () => {
      for (let attempt = 0; attempt < 50; attempt++) {
        const text = bridge.injection().text;
        if (/"base":"[^"]+"/.test(text)) return text;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error('bridge did not start');
    })();
    const token = /"token":"([^"]+)"/.exec(injection)[1];
    const base = /"base":"([^"]+)"/.exec(injection)[1];
    let payload;
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        const response = await fetch(`${base}/smooth-skin/git`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-smooth-token': token },
          body: JSON.stringify({ action: 'usage' }),
        });
        payload = { status: response.status, body: await response.json() };
        break;
      } catch (error) {
        if (attempt === 49) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    assert.equal(payload.status, 200);
    assert.equal(payload.body.ok, true);
    assert.equal(payload.body.value.today, dayOf(Date.now()));
    const [day] = payload.body.value.days;
    assert.equal(day.day, dayOf(afternoon));
    assert.equal(day.input, 6);
    assert.equal(day.output, 4);
    assert.equal(day.cached, 90);
    assert.equal(day.tokens, 100);
    assert.equal(day.calls, 1);
    assert.deepEqual(day.sessions, ['session-one']);
    assert.deepEqual(day.models, { 'deepseek-flash': 100 });
    assert.equal(day.hours[15], 100);
    assert.ok(existsSync(join(home, 'cache', 'smooth-usage-v2.json')), 'the scan is cached beside the archive');
  } finally {
    bridge.dispose();
    if (previous === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous;
    rmSync(home, { recursive: true, force: true });
  }
});

/** Evaluate src/usage.js with the harness the module expects, so the pure helpers can be
 * checked directly instead of through a rendered tree. */
function usageHelpers() {
  const sandbox = {
    React: { useState: (value) => [value, () => {}], useEffect: () => {}, useMemo: (fn) => fn() },
    bridgeRequest: async () => ({ today: '2026-05-12', days: [] }),
    hostPart: (name) => `.${name}`,
    PLUGIN_ID: 'smooth',
    HOME_ATTRIBUTE: 'data-smooth-home',
    createSurfaceWatcher: () => ({ watch: () => () => {}, dispose() {} }),
    MutationObserver: class { observe() {} disconnect() {} },
    document: { body: { hasAttribute: () => true } },
    require: () => ({ createPortal: (node) => node }),
  };
  runInNewContext(
    `${read('usage.js')}\nglobalThis.__usage = { usageTokens, usageCount, usageFill, usageCellLevels: (days) => usageCells(days).cells.map((cell) => cell.level), usageSummary, usageBookLine, usageHourLabel, usageDateKey };`,
    sandbox,
  );
  const text = (_key, fallback) => fallback;
  return { ...sandbox.__usage, text };
}

test('the counters and the heat scale match the reference card', () => {
  const { usageTokens, usageCount, usageFill } = usageHelpers();
  assert.equal(usageTokens(916), '916');
  assert.equal(usageTokens(45612), '45.6k');
  assert.equal(usageTokens(321252717), '321.3M');
  assert.equal(usageTokens(3683260964), '3.7B');
  assert.equal(usageCount(13262), '13,262');
  assert.equal(usageFill('%s — %s Token', '10月12日', '732M'), '10月12日 — 732M Token');
});

test('cell shades are the day\'s share of the busiest day', () => {
  const { usageCellLevels, usageDateKey } = usageHelpers();
  const day = (offset, tokens) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    return { day: usageDateKey(date), tokens };
  };
  const levels = usageCellLevels([day(0, 100), day(1, 400), day(2, 0), day(3, 200)]);
  // The last four cells are those days, oldest first: 200 -> 2, 0 -> 0, 400 -> 4, 100 -> 1.
  assert.deepEqual([...levels.slice(-4)], [2, 0, 4, 1]);
});

test('a period filters the figures but not the calendar', () => {
  const { usageSummary, usageDateKey } = usageHelpers();
  const make = (offset, tokens, calls) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    return { day: usageDateKey(date), tokens, calls, sessions: [`session-${offset}`], hours: new Array(24).fill(0), models: { 'deepseek-flash': tokens } };
  };
  const days = [make(40, 1000, 2), make(10, 500, 1), make(2, 300, 3), make(0, 200, 4)];
  const all = usageSummary(days, 'all', usageHelpers().text);
  assert.equal(all.tokens, 2000);
  assert.equal(all.calls, 10);
  assert.equal(all.sessions, 4);
  assert.equal(all.activeDays, 4);
  assert.equal(all.models[0].id, 'deepseek-flash');
  const week = usageSummary(days, '7d', usageHelpers().text);
  assert.equal(week.tokens, 500, 'two days fall inside seven');
  assert.equal(week.calls, 7);
  assert.equal(week.sessions, 2);
  assert.equal(all.cells.length, week.cells.length, 'the grid keeps its window');
});

test('the peak hour reads as a Chinese half-day', () => {
  const { usageHourLabel, usageSummary, usageDateKey } = usageHelpers();
  assert.equal(usageHourLabel(5, (key, fallback) => fallback), '上午 5 点');
  assert.equal(usageHourLabel(17, (key, fallback) => fallback), '下午 5 点');
  assert.equal(usageHourLabel(12, (key, fallback) => fallback), '下午 12 点');
  const hours = new Array(24).fill(0);
  hours[17] = 900;
  hours[9] = 400;
  const summary = usageSummary([{ day: usageDateKey(new Date()), tokens: 1300, calls: 2, sessions: ['a'], hours, models: {} }], 'all', (key, fallback) => fallback);
  assert.equal(summary.peakHour, 17);
});

test('the closing line picks the longest book the total has out-read', () => {
  const { usageBookLine } = usageHelpers();
  const line = usageBookLine(3683260964, (_key, fallback) => fallback);
  assert.match(line, /^你的 Token 用量相当于 2,\d{3} 本《追忆似水年华》。$/, line);
  assert.equal(usageBookLine(10, (_key, fallback) => fallback), null, 'shorter than the shortest book');
});

test('the panel keeps the reference layout and the landing-page gate', () => {
  const usage = read('usage.js');
  assert.match(usage, /const USAGE_WEEKS = 26;/, '26 weeks of cells');
  assert.match(usage, /const USAGE_LEVELS = 4;/, 'four lit shades');
  assert.match(usage, /bridgeRequest\('usage'\)/, 'the figures come from the Host half');
  for (const key of ['usage.tabOverview', 'usage.tabModels', 'usage.rangeAll', 'usage.range30d', 'usage.range7d', 'usage.sessions', 'usage.calls', 'usage.tokens', 'usage.activeDays', 'usage.peak', 'usage.topModel', 'usage.fun', 'usage.heatTip']) {
    assert.match(usage, new RegExp(`'${key.replace(/\./g, '\\.')}'`), `missing ${key}`);
  }
  assert.match(usage, /data-smooth-tip/, 'cells carry their own tooltip text');
  assert.match(usage, /slots\.register\(\{\s*name: 'shell\.overlay',[\s\S]*?id: `\$\{PLUGIN_ID\}\.usage`/);
  assert.match(usage, /document\.body\.hasAttribute\(HOME_ATTRIBUTE\)/, 'it reads the chrome\'s welcome-page flag');
  assert.match(usage, /if \(!stack \|\| !homeSurface\) \{ setMount\(null\); return undefined; \}/, 'no mount off the welcome page');
  assert.match(usage, /!skin\.state\.enabled \|\| !homeSurface \|\| !mount/, 'and it renders nothing then');
});

test('the stylesheet paints the panel, the four shades and the tooltip', () => {
  const skin = read('skin.js');
  assert.match(skin, /\.smooth-usage-panel\{[^}]*padding:12px;border-radius:12px/);
  assert.match(skin, /\.smooth-usage-stats\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\);gap:4px\}/);
  for (const level of [1, 2, 3, 4]) {
    assert.match(skin, new RegExp(`\\.smooth-usage-heat-cell\\[data-smooth-level="${level}"\\]\\{background:`), `level ${level} has a fill`);
  }
  assert.match(skin, /grid-template-rows:repeat\(7,1fr\)/, 'seven weekday rows');
  assert.match(skin, /\.smooth-usage-heat-cell\[data-smooth-tip\]:hover:after\{content:attr\(data-smooth-tip\)/);
  assert.match(skin, /\.smooth-usage-fun\{/);
  const shared = read('shared.js');
  assert.match(shared, /\['--smooth-heat'\] = pair\('heat'\)/);
});

test('the usage labels exist in both locales', () => {
  const shared = read('shared.js');
  const zh = shared.slice(shared.indexOf('const zhCN'), shared.indexOf('const enUS'));
  const en = shared.slice(shared.indexOf('const enUS'));
  for (const key of ['usage.title', 'usage.tabOverview', 'usage.tabModels', 'usage.rangeAll', 'usage.range30d', 'usage.range7d', 'usage.sessions', 'usage.calls', 'usage.tokens', 'usage.activeDays', 'usage.peak', 'usage.topModel', 'usage.hourAm', 'usage.hourPm', 'usage.heatTip', 'usage.fun', 'usage.modelsEmpty', 'usage.modelsMore', 'usage.modelsLess', 'usage.book.lostTime']) {
    const pattern = new RegExp(`'${key.replace(/\./g, '\\.')}':`);
    assert.match(zh, pattern, `missing zh ${key}`);
    assert.match(en, pattern, `missing en ${key}`);
  }
  assert.match(zh, /'usage\.fun': '你的 Token 用量相当于 %s 本《%s》。'/);
  assert.match(en, /'usage\.fun': "You've used ~%s× the tokens in %s\."/);
});
