import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import {
  checkContract,
  contractCorpus,
  describeContract,
  findHostAsar,
  formatReport,
  readHost,
} from '../tools/host-contract.mjs';

const contract = await describeContract();
const packages = new Set(contract.packages);
const empty = () => ({ packages: [], classes: [], attributes: [], slots: [], methods: [], events: [], tokens: [], values: [], bridge: [] });

const sourceDir = new URL('../src/', import.meta.url);
const sources = new Map();
for (const name of (await readdir(sourceDir)).filter((name) => name.endsWith('.js'))) {
  sources.set(name, await readFile(new URL(name, sourceDir), 'utf8'));
}
const allSource = [...sources.values()].join('\n');

test('the host contract covers the selectors and hooks the skin actually reaches for', () => {
  // Guards the audit itself: an empty or filtered contract would make the live check pass
  // without testing anything.
  for (const name of ['sidebarCol', 'centerCol', 'footArea', 'indicator', 'cardWorkspaceTrigger', 'titleRow', 'titleCluster', 'panelRow']) {
    assert.ok(contract.classes.includes(name), `contract.classes is missing ${name}`);
  }
  for (const name of ['data-composer-card', 'data-conversation-scroll', 'data-sidebar-collapsed', 'data-testid']) {
    assert.ok(contract.attributes.includes(name), `contract.attributes is missing ${name}`);
  }
  for (const name of ['settings.section', 'settings.general.item', 'sidebar.panellist', 'shell.overlay']) {
    assert.ok(contract.slots.includes(name), `contract.slots is missing ${name}`);
  }
  for (const name of ['setTheme', 'overrideTokens', 'selectPanel', 'workspaceFiles', 'effect']) {
    assert.ok(contract.methods.includes(name), `contract.methods is missing ${name}`);
  }
  assert.ok(contract.events.includes('theme/change'), 'contract.events is missing theme/change');
  for (const name of ['--dsw-alias-label-primary', '--dsw-alias-bg-layer-1', '--dsw-specific-input-major']) {
    assert.ok(contract.tokens.includes(name), `contract.tokens is missing ${name}`);
  }
  for (const name of ['dsh-client-ui-sidebar', 'dsh-client-ui-theme', 'dsh-client-ui-primitives', 'dsh-web-frontend']) {
    assert.ok(contract.packages.includes(name), `contract.packages is missing ${name}`);
  }
  // The Host half's private bridge reads these services/events at request time; a
  // client-only audit would not notice their rename.
  for (const name of ['detachEntered', 'session/disposed', 'workspace/session-activity', 'workspace/session-stop', 'api-session/removed', 'async stat']) {
    assert.ok(contract.bridge.includes(name), `contract.bridge is missing ${name}`);
  }
  // Data attributes created by the plugin itself must not be demanded from the host.
  for (const own of ['data-smooth-skin', 'data-smooth-home', 'data-selected', 'data-preview', 'data-error', 'data-default']) {
    assert.ok(!contract.attributes.includes(own), `the host must not be required to carry ${own}`);
  }

  // A new slot dependency must be added to HOST_SLOTS, or the live audit would not
  // notice the host dropping it.
  const slots = new Set();
  for (const match of allSource.matchAll(/slots\.(?:inject|entries|subscribe\??)\(\s*['"]([^'"]+)['"]/g)) slots.add(match[1]);
  for (const match of allSource.matchAll(/slots\.register\(\{\s*name:\s*['"]([^'"]+)['"]/g)) slots.add(match[1]);
  for (const match of allSource.matchAll(/sharedSurfaceStore\(slots,\s*['"]([^'"]+)['"]/g)) slots.add(match[1]);
  for (const match of allSource.matchAll(/(?:relocate|decorate)\(\s*['"]([^'"]+)['"]/g)) slots.add(match[1]);
  for (const slot of slots) assert.ok(contract.slots.includes(slot), `HOST_SLOTS is missing ${slot}`);
});

test('the contract checker accepts a complete corpus and reports each broken hook', () => {
  const corpus = contractCorpus(contract);
  assert.deepEqual(checkContract(corpus, contract, packages).missing, empty(), 'the generated corpus should satisfy the contract');

  const cases = [
    ['class', '._hash_sidebarCol{color:red}', (result) => result.missing.classes.includes('sidebarCol')],
    ['attribute', '[data-composer-card]', (result) => result.missing.attributes.includes('data-composer-card')],
    ['slot', "'settings.section'", (result) => result.missing.slots.includes('settings.section')],
    ['method', 'setTheme(){}', (result) => result.missing.methods.includes('setTheme')],
    ['event', "'theme/change'", (result) => result.missing.events.includes('theme/change')],
    ['token', '--dsw-alias-label-primary:#000', (result) => result.missing.tokens.includes('--dsw-alias-label-primary')],
    ['value', "'assistant-step'", (result) => result.missing.values.includes('assistant-step')],
    ['bridge', "'workspace/session-activity'", (result) => result.missing.bridge.includes('workspace/session-activity')],
  ];
  for (const [label, needle, hit] of cases) {
    assert.ok(corpus.includes(needle), `the fixture is missing its ${label} probe: ${needle}`);
    const result = checkContract(corpus.replace(needle, ''), contract, packages);
    assert.ok(hit(result), `checkContract did not report the removed ${label}`);
  }

  // Packages are checked against the installed directory table, not the text corpus.
  const installed = new Set(packages);
  installed.delete('dsh-client-ui-sidebar');
  const result = checkContract(corpus, contract, installed);
  assert.ok(result.missing.packages.includes('dsh-client-ui-sidebar'), 'checkContract did not report the removed package');

  // Core client packages may live in the web front end's module table instead of a
  // package directory (DSH 0.2.1 does this for slots/primitives).
  const bundled = new Set(packages);
  bundled.delete('dsh-client-ui-primitives');
  const moduleMap = `${corpus}\n"@deepseek-ai/dsh-client-ui-primitives":hash,`;
  assert.equal(
    checkContract(moduleMap, contract, bundled).missing.packages.includes('dsh-client-ui-primitives'),
    false,
    'a module-table entry should satisfy package presence',
  );
});

test('the installed DSH host still exposes every hook the skin uses (breaking-update guard)', async (t) => {
  const asarPath = findHostAsar();
  if (!asarPath) {
    t.skip('no installed DSH app.asar found; run `node tools/host-contract.mjs --asar <path>` after the update');
    return;
  }
  const host = await readHost(asarPath);
  assert.ok(host.files.length > 50, `only ${host.files.length} host bundles/stylesheets were readable`);
  const result = checkContract(host.corpus, contract, host.packages);
  if (result.warnings.tokens.length) {
    t.diagnostic(`overrides the host does not define (inert): ${result.warnings.tokens.join(', ')}`);
  }
  assert.deepEqual(
    result.missing,
    empty(),
    `${formatReport(result)}\nhost: ${asarPath}\nAfter a DSH update, re-check the renamed hooks and update src/ plus tools/host-contract.mjs.`,
  );
});
