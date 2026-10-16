/**
 * Startup profile for the Smooth bundle.
 *
 * What this can measure without a browser: the bytes the plugin adds to the served
 * index, the JavaScript parse/evaluate cost of both artifacts (V8, cold first run and
 * warm median), the work the client half does during activation, and the static cost
 * of the injected stylesheet. What it cannot measure here: style recalculation and
 * paint in the real app, which is what the stylesheet's bytes actually turn into —
 * those numbers have to come from the browser's own DevTools.
 *
 * Run it before and after a change. The last sections print the deterministic splash
 * timeline, which is the only second-scale item in the plugin's startup path.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { Script, runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), 'utf8');
const gzip = (text) => gzipSync(Buffer.from(text)).length;
const scale = (value) => (value < 1000 ? `${value} B` : `${(value / 1024).toFixed(1)} KB`);
const ms = (value) => `${value.toFixed(2)} ms`;
const row = (label, value, extra = '') => console.log(`${label.padEnd(32)}${String(value).padStart(11)}${extra}`);
const section = (title) => console.log(`\n[${title}]`);
const median = (values) => [...values].sort((a, b) => a - b)[(values.length - 1) >> 1];

/** Time `runs` executions after two untimed warmups, keeping the first (cold) sample. */
function measure(fn, runs = 9) {
  const samples = [];
  let cold;
  for (let index = 0; index < runs + 2; index++) {
    const started = performance.now();
    fn(index);
    const elapsed = performance.now() - started;
    if (index === 0) cold = elapsed;
    if (index >= 2) samples.push(elapsed);
  }
  return { cold, median: median(samples), min: Math.min(...samples), max: Math.max(...samples) };
}

const cssRules = (css) => [...css.matchAll(/([^{}]+)\{/g)];

// ------------------------------------------------------------ 1 payload

const indexSource = read('lib/index.js');
const clientSource = read('lib/client.js');
const skinSource = read('src/skin.js');
const shared = read('src/shared.js');
const boot = read('src/boot.js');
const host = read('src/host.js');

/** The Host artifact as a plain script, so every run compiles the shipped bytes. */
const hostScript = indexSource.replace(/^export default \w+;$/gm, '').replace(/^export /gm, '');

/** Boot constants and rows, evaluated exactly as tests/boot.test.mjs does. */
const bootValues = runInNewContext(`${shared}\n${boot}\n({
  rows: bootInjections(), id: SPLASH_ID, css: SPLASH_CSS,
  hold: SPLASH_HOLD_MS, fade: SPLASH_FADE_MS, settle: SPLASH_SETTLE_MS, cap: SPLASH_CAP_MS,
  tokens: Object.keys(buildTokens({ enabled: true, theme: 'dark' })),
  whale: SPLASH_WHALE_PATH.length,
})`, {});

const [styleRow, htmlRow, scriptRow] = bootValues.rows;
const injectedBytes = styleRow.text.length + htmlRow.html.length + scriptRow.text.length;

console.log('Smooth 启动剖析 —— V8 代理测量（同进程内冷启动首跑 + 热跑中位）');

section('1 载荷：插件为启动路径增加的字节');
row('lib/index.js (Host 半)', scale(indexSource.length), `  gzip ${scale(gzip(indexSource))}`);
row('lib/client.js (Client 半)', scale(clientSource.length), `  gzip ${scale(gzip(clientSource))}`);
row('index 注入行 style', scale(styleRow.text.length), `  gzip ${scale(gzip(styleRow.text))}`);
row('index 注入行 html', scale(htmlRow.html.length), `  gzip ${scale(gzip(htmlRow.html))}`);
row('index 注入行 script', scale(scriptRow.text.length), `  gzip ${scale(gzip(scriptRow.text))}`);
row('注入行合计', scale(injectedBytes), `  gzip ${scale(gzip(styleRow.text + htmlRow.html + scriptRow.text))}`);
row('两份产物合计', scale(indexSource.length + clientSource.length), `  gzip ${scale(gzip(indexSource + clientSource))}`);

// ------------------------------------------------------------ 2 host half

section('2 Host 半：模块装载与 index 注入');
/** `runInNewContext` builds a fresh V8 context per call; that fixed cost is the
 * harness's, not the plugin's, so every load number is reported net of this control. */
const contextCost = measure(() => runInNewContext('1', {}));
const hostLoad = measure(() => runInNewContext(hostScript, {}, { timeout: 2000 }));
const hostCompile = measure(() => new Script(hostScript, { filename: 'lib/index.js' }));
row('空上下文基准（扣除用）', ms(contextCost.median));
row('模块解析+求值 冷（净）', ms(Math.max(hostLoad.cold - contextCost.cold, 0)));
row('模块解析+求值 热中位（净）', ms(Math.max(hostLoad.median - contextCost.median, 0)));
row('  其中：仅编译 热中位', ms(hostCompile.median));
row('  原始值 冷/热', `${ms(hostLoad.cold)} / ${ms(hostLoad.median)}`);

const hostPlugin = runInNewContext(`${hostScript}\nplugin`, {}, { timeout: 2000 });
const hostApply = measure(() => {
  const listeners = new Map();
  hostPlugin.apply({ on(name, handler) { listeners.set(name, handler); return () => listeners.delete(name); } });
  const table = [];
  listeners.get('webserver/index-inject')(table);
});
row('apply + 生成注入行 冷', ms(hostApply.cold));
row('apply + 生成注入行 热中位', ms(hostApply.median));
row('单次注入表行数', bootValues.rows.length);

// ------------------------------------------------------------ 3 client half

/** The activation path the manifest asks for (`immediately: true`), stubbed the same
 * way tests/client.test.mjs does, so the measurement exercises the shipped artifact. */
function runClientOnce() {
  let registration;
  const styles = new Set();
  const attributes = new Set();
  const storage = new Map([['dsh-smooth-skin:state', JSON.stringify({ enabled: true, theme: 'dark' })]]);
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useReducer: () => [0, () => {}],
    useEffect: (fn) => { const cleanup = fn(); if (typeof cleanup === 'function') cleanup(); },
    useState: (initial) => [initial, () => {}],
  };
  const modules = { react, 'react-dom': { createPortal: (node) => node } };
  const sandbox = {
    window: {
      __ModuleLoader__: { load: (value) => { registration = value; } },
      localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
      matchMedia: () => ({ matches: false }),
      addEventListener() {}, removeEventListener() {},
      setTimeout: (fn) => { fn(); return 0; }, clearTimeout() {},
    },
    document: {
      addEventListener() {}, removeEventListener() {},
      createElement: () => { const style = { dataset: {}, textContent: '', remove: () => styles.delete(style) }; return style; },
      head: { append: (style) => styles.add(style) },
      styleSheets: [],
      body: {
        toggleAttribute: (name, on) => (on ? attributes.add(name) : attributes.delete(name)),
        removeAttribute: (name) => attributes.delete(name),
      },
    },
  };

  let started = performance.now();
  runInNewContext(clientSource, sandbox, { timeout: 5000 });
  const load = performance.now() - started;

  started = performance.now();
  const plugin = registration.factory((name) => modules[name]);
  const factory = performance.now() - started;

  let tokenLayers = 0;
  const services = {
    theme: {
      getTheme: () => ({ preference: 'system' }),
      setTheme() {},
      overrideTokens: () => { tokenLayers += 1; return () => { tokenLayers -= 1; }; },
    },
    slots: {
      inject: (_name, callback) => callback(),
      register: (options, component) => { registration.section = { options, component }; return () => {}; },
    },
    locale: { register: () => () => {}, translate: () => undefined },
  };
  started = performance.now();
  plugin.apply(new Proxy({}, {
    get: (_target, name) => (name === 'effect' ? (callback) => callback() : services[name]),
  }));
  const apply = performance.now() - started;

  const sheet = [...styles][0];
  return { load, factory, apply, css: sheet ? sheet.textContent : '', tokenLayers };
}

const runs = [];
for (let index = 0; index < 12; index++) runs.push(runClientOnce());
const warm = runs.slice(2);
const stat = (key) => ({ cold: runs[0][key], median: median(warm.map((run) => run[key])) });
const load = stat('load');
const factory = stat('factory');
const apply = stat('apply');
const last = runs[runs.length - 1];
const rules = cssRules(last.css);

section('3 Client 半：immediately: true 的启动路径');
const clientCompile = measure(() => new Script(clientSource, { filename: 'lib/client.js' }));
row('模块解析+求值 冷（净）', ms(Math.max(load.cold - contextCost.cold, 0)));
row('模块解析+求值 热中位（净）', ms(Math.max(load.median - contextCost.median, 0)));
row('  其中：仅编译 热中位', ms(clientCompile.median));
row('factory：建样式表与插件对象 冷', ms(factory.cold));
row('factory 热中位', ms(factory.median));
row('apply：注入样式/令牌/插槽 冷', ms(apply.cold));
row('apply 热中位', ms(apply.median));
row('模块+factory+apply 热中位', ms(Math.max(load.median - contextCost.median, 0) + factory.median + apply.median));
row('注入的样式表', scale(last.css.length), `  gzip ${scale(gzip(last.css))}`);
row('CSS 规则块（含 @media）', rules.length);
row('CSS 选择器（按逗号拆）', rules.reduce((total, [, prelude]) => total + (prelude.trim().startsWith('@') ? 0 : prelude.split(',').length), 0));
row(':has( 次数', (last.css.match(/:has\(/g) || []).length);
row(':is( 次数', (last.css.match(/:is\(/g) || []).length);
row('启动时覆盖的 CSS 变量', bootValues.tokens.length);
row('留下的令牌层', last.tokenLayers);

section('4 注入内容的静态构成');
row('鲸鱼路径 d', scale(bootValues.whale), `  占注入行 ${((bootValues.whale / injectedBytes) * 100).toFixed(0)}%`);
row('注入脚本', scale(scriptRow.text.length));
row('注入 CSS', scale(styleRow.text.length));
row('src/skin.js 源码', scale(skinSource.length));

section('5 开场时间线（源码常量，确定性）');
row('首帧（鲸鱼随 index 到达）', '0 ms');
row('开始淡出（最短停留）', `${bootValues.hold} ms`);
row('淡出时长', `${bootValues.fade} ms`);
row('节点移除（撤场完成）', `${bootValues.settle} ms`);
row('完全撤场合计', `${bootValues.hold + bootValues.fade + bootValues.settle} ms`);
row('应用始终未挂载的兜底', `${bootValues.hold + bootValues.cap} ms`);
row('开场期间的交互阻塞', '无（pointer-events:none）');

section('6 本脚本测不到的部分（需要浏览器 DevTools）');
console.log('  · 注入样式表在真实 DOM 上的匹配与样式重算成本');
console.log('  · index 与 client.js 的传输时间（桌面端走本机服务；静态部署另算）');
console.log('  · 宿主 React 挂载本身，以及鲸鱼首帧的绘制与合成层开销');
