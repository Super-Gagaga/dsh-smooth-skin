/**
 * Host contract audit for a DSH update.
 *
 * The skin does not import the host components it decorates: it reaches them by CSS
 * module local names, public data attributes, slot names, theme tokens and a handful of
 * service methods. A host upgrade can rename any of those without a compile error, so the
 * skin would silently stop painting. This tool reads the installed `app.asar`, derives the
 * contract from `src/`, and reports every hook that is no longer there.
 *
 * Run it directly (`node tools/host-contract.mjs`) or let `tests/host-contract.test.mjs`
 * run it as part of `npm test`. The test is skipped when no installed app is found; set
 * `DSH_APP_ASAR` to point at a different `app.asar`.
 */
import { readdir, readFile, open } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const CLIENT_PREFIX = '/dsh/node_modules/@deepseek-ai/';
const FRONTEND_CSS = /\/dsh-web-frontend\/dist\/assets\/index-[^/]+\.css$/;
const FRONTEND_JS = /\/dsh-web-frontend\/dist\/assets\/index-[^/]+\.js$/;

/** Packages whose CSS/JS the skin styles or decorates. A rename here is a hard break. */
export const REQUIRED_PACKAGES = [
  'dsh-client-ui-sidebar',
  'dsh-client-ui-settings',
  'dsh-client-ui-settings-general',
  'dsh-client-ui-settings-account',
  'dsh-client-ui-conversation',
  'dsh-client-ui-chat',
  'dsh-client-ui-workspace',
  'dsh-client-ui-theme',
  'dsh-client-ui-slots',
  'dsh-client-ui-layout',
  'dsh-client-locale',
  'dsh-client-ui-session',
  'dsh-client-connection',
  'dsh-client-ui-permission-presets',
  'dsh-client-ui-primitives',
  'dsh-web-frontend',
];

/** Slots this plugin injects into, registers on, reads entries from, or reads stores from. */
export const HOST_SLOTS = [
  'root',
  'sidebar.settings',
  'sidebar.panellist',
  'conversation.input.overlay',
  'conversation.input.right',
  'conversation.input.model',
  'conversation.input.permission',
  'conversation.input.left',
  'conversation.hero.agentPreset',
  'settings.launcher',
  'settings.section',
  'settings.general.item',
  'settings.action',
  'shell.overlay',
];

/** Service methods called by the client half. */
export const HOST_METHODS = [
  'setTheme',
  'getTheme',
  'overrideTokens',
  'inject',
  'register',
  'entries',
  'subscribe',
  'selectPanel',
  'startSession',
  'openSession',
  'clearMain',
  'workspaceFiles',
  'translate',
  'setSidebar',
  'layoutInfo',
  'openSection',
  'effect',
  'on',
];

/** Cordis events the client half subscribes to. */
export const HOST_EVENTS = ['theme/change'];

/** Distinctive attribute values the selectors key on. */
export const HOST_VALUES = [
  'assistant-step',
  'steering',
  'reasoning',
  'todo-panel',
  'in_progress',
  'ongoing',
  'compact',
  'settings.general.item',
];

/** Attributes written by this plugin, so the host does not need to carry them. */
const OWN_ATTRIBUTES = new Set([
  'data-active',
  'data-error',
  'data-expanded',
  'data-pane',
  'data-preview',
  'data-selected',
  'data-view',
]);

/** Host attributes written through `element.dataset`, so the kebab-case spelling never
 * appears in the source corpus; the camelCase property is what the host file contains. */
const DATASET_ATTRIBUTES = new Map([
  ['data-windows-menu', 'dataset.windowsMenu'],
]);

const EMPTY_MISSING = () => ({
  packages: [], classes: [], attributes: [], slots: [], methods: [], events: [], tokens: [], values: [],
});

/** Locate the installed Electron archive without assuming one platform. */
export function findHostAsar(env = process.env) {
  const explicit = [env.DSH_APP_ASAR, env.DSH_APP_PATH].filter(Boolean);
  const local = env.LOCALAPPDATA
    ? path.join(env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness', 'resources', 'app.asar')
    : undefined;
  const programFiles = env.ProgramFiles
    ? path.join(env.ProgramFiles, 'DeepSeek Harness', 'resources', 'app.asar')
    : undefined;
  const candidates = [
    ...explicit.map((candidate) => path.extname(candidate).toLowerCase() === '.asar'
      ? candidate
      : path.join(candidate, 'app.asar')),
    local,
    programFiles,
    '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar',
    path.join(os.homedir(), 'Applications', 'DeepSeek Harness.app', 'Contents', 'Resources', 'app.asar'),
    '/opt/DeepSeek Harness/resources/app.asar',
    '/usr/lib/deepseek-harness/resources/app.asar',
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

/** Read the asar directory table and return its file records. */
async function readAsarTable(asarPath) {
  const handle = await open(asarPath, 'r');
  try {
    const head = Buffer.alloc(16);
    await handle.read(head, 0, head.length, 0);
    const headerLength = head.readUInt32LE(12);
    if (!Number.isInteger(headerLength) || headerLength <= 0 || headerLength > 64 * 1024 * 1024) {
      throw new Error(`unexpected asar header length ${headerLength}`);
    }
    const headerBuffer = Buffer.alloc(headerLength);
    await handle.read(headerBuffer, 0, headerLength, 16);
    const header = JSON.parse(headerBuffer.toString('utf8').replace(/\0+$/, ''));
    const dataStart = 16 + headerLength;
    const files = [];
    const walk = (node, parts) => {
      for (const [name, value] of Object.entries(node.files || {})) {
        const next = [...parts, name];
        if (value.files) { walk(value, next); continue; }
        if (value.unpacked) continue;
        const offset = Number(value.offset);
        const size = Number(value.size);
        if (!Number.isInteger(offset) || !Number.isInteger(size)) continue;
        files.push({ path: `/${next.join('/')}`, size, offset });
      }
    };
    walk(header, []);
    return { handle, files, dataStart };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

/**
 * Read the text corpus the skin's hooks can live in: every client bundle, every package
 * stylesheet, and the web front-end's static stylesheet.
 */
export async function readHost(asarPath) {
  const { handle, files, dataStart } = await readAsarTable(asarPath);
  try {
    const packageNames = new Set();
    for (const file of files) {
      const match = new RegExp(`^${CLIENT_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^/]+)/`).exec(file.path);
      if (match) packageNames.add(match[1]);
    }
    const selected = files.filter((file) => {
      // The preload owns the Windows caption menubar; it mounts the native 应用 / 编辑 menu
      // through `dataset.windowsMenu`, which is the hook a collapsed caption is measured by.
      if (file.path === '/lib/preload-app.cjs') return true;
      // The front-end bundle also lives under CLIENT_PREFIX, so match it first.
      if (FRONTEND_CSS.test(file.path) || FRONTEND_JS.test(file.path)) return true;
      if (file.path.startsWith(CLIENT_PREFIX)) {
        return /\/lib\/client\.js$/.test(file.path) || /\.css$/.test(file.path);
      }
      return false;
    });
    const chunks = [];
    for (const file of selected) {
      const buffer = Buffer.alloc(file.size);
      await handle.read(buffer, 0, file.size, dataStart + file.offset);
      chunks.push(buffer.toString('utf8'));
    }
    let version;
    const manifestFile = files.find((file) => file.path === '/package.json');
    if (manifestFile) {
      const buffer = Buffer.alloc(manifestFile.size);
      await handle.read(buffer, 0, manifestFile.size, dataStart + manifestFile.offset);
      try { version = JSON.parse(buffer.toString('utf8')).version; } catch {}
    }
    return {
      asarPath,
      version,
      corpus: chunks.join('\n'),
      packages: packageNames,
      files: selected.map((file) => file.path),
    };
  } finally {
    await handle.close();
  }
}

/** Derive the host contract from this plugin's sources. */
export async function describeContract(root = ROOT) {
  const sourceDir = fileURLToPath(new URL('src/', root));
  const names = (await readdir(sourceDir)).filter((name) => name.endsWith('.js')).sort();
  const sources = new Map();
  for (const name of names) sources.set(name, await readFile(path.join(sourceDir, name), 'utf8'));
  const all = [...sources.values()].join('\n');

  const classes = new Set();
  for (const match of all.matchAll(/(?:hostPart|accountPart)\('([^']+)'\)/g)) classes.add(match[1]);

  const attributes = new Set();
  for (const match of all.matchAll(/\[(data-[a-z0-9-]+)/g)) {
    if (match[1].startsWith('data-smooth-') || OWN_ATTRIBUTES.has(match[1])) continue;
    attributes.add(match[1]);
  }

  const shared = sources.get('shared.js') || '';
  const sandbox = Object.create(null);
  vm.runInNewContext(`${shared}\nglobalThis.__smoothTokenNames = Object.keys(buildTokens(DEFAULTS));`, sandbox);
  const overridden = new Set(sandbox.__smoothTokenNames.filter((token) => token.startsWith('--dsw-') || token.startsWith('--dsh-')));

  const used = new Set();
  for (const match of all.matchAll(/var\((--ds[wh]-[a-z0-9-]+)/g)) used.add(match[1]);

  // Keep the package list in step with the manifest's client injections; the base list
  // adds the packages reached by `require` and the bundled web front end.
  const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const injected = (manifest.dsh?.client?.inject || []).map((name) => name.replace(/^@deepseek-ai\//, ''));
  const packages = new Set([...REQUIRED_PACKAGES, ...injected]);

  return {
    classes: [...classes].sort(),
    attributes: [...attributes].sort(),
    slots: [...HOST_SLOTS].sort(),
    methods: [...HOST_METHODS].sort(),
    events: [...HOST_EVENTS].sort(),
    values: [...HOST_VALUES].sort(),
    tokens: [...used].sort(),
    optionalTokens: [...overridden].filter((token) => !used.has(token)).sort(),
    packages: [...packages].sort(),
  };
}

/** Check one corpus against a contract. Pure so the test can exercise it with fixtures. */
export function checkContract(corpus, contract, packages = new Set()) {
  const missing = EMPTY_MISSING();
  const warnings = { tokens: [] };

  const presentClass = (name) => new RegExp(`_${name}(?=[^A-Za-z0-9]|$)`).test(corpus);
  for (const name of contract.classes) if (!presentClass(name)) missing.classes.push(name);
  for (const name of contract.attributes) {
    const dataset = DATASET_ATTRIBUTES.get(name);
    if (!corpus.includes(name) && !(dataset && corpus.includes(dataset))) missing.attributes.push(name);
  }
  for (const name of contract.slots) if (!corpus.includes(name)) missing.slots.push(name);
  for (const name of contract.methods) if (!corpus.includes(name)) missing.methods.push(name);
  for (const name of contract.events) if (!corpus.includes(name)) missing.events.push(name);
  for (const value of contract.values) if (!corpus.includes(value)) missing.values.push(value);
  for (const token of contract.tokens) {
    // --dsw-* aliases are declared in the theme stylesheet; --dsh-* values may be set
    // inline by the composer, so only their name needs to exist.
    const found = token.startsWith('--dsw-') ? corpus.includes(`${token}:`) : corpus.includes(token);
    if (!found) missing.tokens.push(token);
  }
  for (const token of contract.optionalTokens) {
    if (!corpus.includes(`${token}:`)) warnings.tokens.push(token);
  }
  for (const name of contract.packages) {
    // DSH 0.3 folds core client packages such as `dsh-client-ui-slots` and
    // `dsh-client-ui-primitives` into the web front end's module table instead of
    // shipping their directories. Either form counts as present.
    if (!packages.has(name) && !corpus.includes(`"@deepseek-ai/${name}":`)) missing.packages.push(name);
  }

  return { missing, warnings };
}

/** A short, copy-pasteable summary of missing hooks. */
export function formatReport(result) {
  const lines = [];
  for (const [kind, names] of Object.entries(result.missing)) {
    if (!names.length) continue;
    lines.push(`${kind} (${names.length}): ${names.join(', ')}`);
  }
  return lines.length ? `DSH host contract mismatch:\n- ${lines.join('\n- ')}` : 'DSH host contract matches';
}

/** Render a corpus that satisfies every requirement, for checker self-tests. */
export function contractCorpus(contract) {
  return [
    ...contract.classes.map((name) => `._hash_${name}{color:red}`),
    ...contract.attributes.map((name) => `[${name}]`),
    ...contract.slots.map((name) => `'${name}'`),
    ...contract.methods.map((name) => `${name}(){}`),
    ...contract.events.map((name) => `'${name}'`),
    ...contract.values.map((value) => `'${value}'`),
    ...contract.tokens.map((token) => `${token}:#000`),
    ...contract.optionalTokens.map((token) => `${token}:#000`),
    ...contract.packages.map((name) => `/dsh/node_modules/@deepseek-ai/${name}/`),
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const asarFlag = args.indexOf('--asar');
  const asarPath = asarFlag >= 0 ? path.resolve(args[asarFlag + 1]) : findHostAsar();
  if (!asarPath) {
    console.error('No installed DSH app.asar found. Set DSH_APP_ASAR to its path.');
    process.exitCode = 2;
    return;
  }
  const host = await readHost(asarPath);
  const contract = await describeContract();
  const result = checkContract(host.corpus, contract, host.packages);
  const failures = Object.values(result.missing).reduce((sum, names) => sum + names.length, 0);
  if (args.includes('--json')) {
    // Keep stdout a single JSON document so a pre-update snapshot can be diffed with
    // the post-update one.
    console.log(JSON.stringify({ asarPath, version: host.version, contract, ...result }, null, 2));
  } else {
    console.log(`host      ${asarPath}${host.version ? ` (DSH ${host.version})` : ''}`);
    console.log(`files     ${host.files.length} bundles/stylesheets, ${(host.corpus.length / 1048576).toFixed(1)} MB`);
    console.log(`classes   ${contract.classes.length}`);
    console.log(`attrs     ${contract.attributes.length}`);
    console.log(`slots     ${contract.slots.length}`);
    console.log(`methods   ${contract.methods.length}`);
    console.log(`events    ${contract.events.length}`);
    console.log(`tokens    ${contract.tokens.length} required, ${contract.optionalTokens.length} optional`);
    if (result.warnings.tokens.length) {
      console.log(`warn      overrides the host does not define: ${result.warnings.tokens.join(', ')}`);
    }
    console.log(formatReport(result));
  }
  if (failures) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
