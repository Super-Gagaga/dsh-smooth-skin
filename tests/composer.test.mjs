import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const read = (name) => readFile(new URL(`../src/${name}`, import.meta.url), 'utf8');
// The bundle order: composer.js watches surfaces through watch.js.
const source = `${await read('watch.js')}\n${await read('composer.js')}`;
const sandbox = { PLUGIN_ID: 'smooth', hostPart: name => `.${name}` };
runInNewContext(source + '\nglobalThis.readBranch = readWorkspaceBranch; globalThis.install = installComposerLayout; globalThis.installHint = installComposerHint; globalThis.findChip = findNativeWorkspaceChip; globalThis.openPicker = openNativeWorkspacePicker;', sandbox);

function files(entries) {
  const calls = [];
  return {
    calls,
    read: async (id, path, range, signal) => {
      calls.push({ id, path, range, signal });
      return entries[path] === undefined ? { ok: false, error: { code: 'workspace-file/not-found' } } : { ok: true, value: { text: entries[path] } };
    },
  };
}

test('Git branch is read from the selected session, including branch names with slashes', async () => {
  const api = files({ 'C:/repo/.git/HEAD': 'ref: refs/heads/feature/skin\n' });
  const signal = new AbortController().signal;
  assert.equal(await sandbox.readBranch(api, 'live', 'C:\\repo', signal), 'feature/skin');
  assert.equal(api.calls[0].id, 'live');
  assert.equal(api.calls[0].signal, signal);
});

test('worktrees, subdirectories and detached HEAD retain actual Git identity', async () => {
  const api = files({ 'C:/repo/.git': 'gitdir: ../main/.git/worktrees/repo', 'C:/repo/../main/.git/worktrees/repo/HEAD': 'ref: refs/heads/worktree' });
  assert.equal(await sandbox.readBranch(api, 's', 'C:/repo/src', new AbortController().signal), 'worktree');
  assert.equal(await sandbox.readBranch(files({ '/repo/.git/HEAD': 'a'.repeat(40) }), 's', '/repo', new AbortController().signal), 'aaaaaaaa');
});

test('missing repositories and cancelled reads never invent branch or file statistics', async () => {
  assert.equal(await sandbox.readBranch(files({}), 's', 'C:/repo', new AbortController().signal), undefined);
  const controller = new AbortController(); controller.abort();
  const api = files({});
  assert.equal(await sandbox.readBranch(api, 's', 'C:/repo', controller.signal), undefined);
  assert.equal(api.calls.length, 0);
});

test('compact prompts preserve native unavailable, workspace, planning and running hints', () => {
  let notify, disconnected = false;
  sandbox.MutationObserver = class {
    constructor(fn) { notify = fn; }
    observe(node, options) { assert.equal(node, input); assert.deepEqual(Array.from(options.attributeFilter), ['data-placeholder', 'aria-disabled']); }
    disconnect() { disconnected = true; }
  };
  const attributes = new Map([['data-placeholder', 'Original hero'], ['aria-label', 'Original hero']]);
  const input = { getAttribute: key => attributes.get(key) ?? null };
  const marker = new Map(), properties = new Map([['--smooth-composer-placeholder', '"Previous"']]);
  const placeholder = {
    textContent: 'Original hero', parentElement: { querySelector: () => input },
    style: { getPropertyValue: key => properties.get(key) || '', getPropertyPriority: () => 'important', setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) },
    getAttribute: key => marker.get(key) ?? null, setAttribute: (key, value) => marker.set(key, value), removeAttribute: key => marker.delete(key),
  };
  const dispose = sandbox.installHint(placeholder, ['Original hero', 'Original message'], 'Short prompt');
  assert.equal(properties.get('--smooth-composer-placeholder'), '"Short prompt"');
  assert.equal(marker.has('data-smooth-placeholder'), true);
  for (const prompt of ['Choose workspace', 'Plan guidance', 'Parent unavailable', 'Steer queued messages', 'Custom prompt']) {
    attributes.set('data-placeholder', prompt); notify();
    assert.equal(marker.has('data-smooth-placeholder'), false);
  }
  attributes.set('data-placeholder', 'Original message'); attributes.set('aria-disabled', 'true'); notify();
  assert.equal(marker.has('data-smooth-placeholder'), false);
  attributes.delete('aria-disabled'); notify(); assert.equal(marker.has('data-smooth-placeholder'), true);
  assert.equal(placeholder.textContent, 'Original hero', 'never replace React-owned text');
  assert.equal(attributes.get('aria-label'), 'Original hero', 'screen-reader instructions remain native');
  dispose(); assert.equal(disconnected, true); assert.equal(marker.size, 0);
  assert.equal(properties.get('--smooth-composer-placeholder'), '"Previous"');
  assert.equal(sandbox.installHint(null, [], ''), undefined);
});

test('the model seat is contributed through the composer right slot', () => {
  const overrides = new Map();
  sandbox.h = (type, props, ...children) => ({ type, props, children });
  sandbox.require = name => name === 'react-dom' ? { createPortal() {} } : {};
  const slots = {
    inject: (_name, setup) => setup(), entries: () => [],
    register: (options, component) => { overrides.set(options.name, { options, component }); return () => overrides.delete(options.name); },
  };
  const dispose = sandbox.install({
    slots, modelDirectories: {}, text: () => 'Short prompt',
    useSmoothState: () => ({ state: { enabled: true } }),
  });
  const seat = overrides.get('conversation.input.right');
  assert.ok(seat, 'the model/effort seat lives in the generic right-control list');
  assert.equal(seat.options.id, 'smooth.model');
  assert.equal(typeof seat.component, 'function');
  assert.equal(overrides.has('conversation.composer.bar'), false, 'the native composer retains its child-slot ownership');
  dispose(); assert.equal(overrides.size, 0);
});

test('the metadata workspace chip toggles the native picker and anchors it to the visible chip', () => {
  let clicked = 0;
  const rect = { left: 10, top: 20, width: 30, height: 18 };
  const chip = {
    dataset: {},
    click: () => { clicked += 1; },
    getAttribute: () => 'false',
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
  };
  sandbox.document = {
    querySelector: selector => selector.includes('heroWorkspaceRow') && selector.includes('button[aria-haspopup="menu"]') ? chip : null,
  };
  const button = { getBoundingClientRect: () => rect };
  assert.equal(sandbox.findChip(), chip, 'the hidden native workspace chip is the picker owner');
  assert.equal(sandbox.openPicker(button), chip);
  assert.equal(clicked, 1, 'the visible metadata chip clicks the native control');
  assert.equal(chip.getBoundingClientRect(), rect, 'the picker anchors to the visible chip, not the hidden row');
  sandbox.openPicker(button);
  assert.equal(clicked, 2, 'a second click still toggles the native picker');
});

test('relocated native controls retain injection, locale, store, child slots and clean up', () => {
  const entries = new Map();
  const listeners = new Map();
  const children = { 'conversation.hero.agentPreset.detail': { kind: 'single', scope: 'session', inline: true } };
  const native = { component: () => 'native', options: { priority: 0, children }, locale: 'native', inject: () => ({}), store: {} };
  entries.set('conversation.hero.agentPreset', [native]);
  const registered = [];
  sandbox.require = name => name === 'react-dom' ? { createPortal() {} } : {};
  const slots = {
    inject: (_name, setup) => setup(),
    entries: name => entries.get(name) || [],
    subscribe: (name, fn) => { listeners.set(name, fn); return () => listeners.delete(name); },
    register: (options, component) => {
      const entry = { ...options, options, component };
      entries.set(options.name, [...(entries.get(options.name) || []), entry]);
      registered.push(entry);
      return () => entries.set(options.name, entries.get(options.name).filter(item => item !== entry));
    },
  };
  sandbox.PLUGIN_ID = 'smooth';
  const dispose = sandbox.install({ slots });
  const relocated = registered.find(item => item.options.name === 'conversation.hero.agentPreset');
  assert.equal(relocated.inject, native.inject);
  assert.equal(relocated.store, native.store);
  assert.equal(relocated.locale, native.locale);
  assert.equal(relocated.options.children, children, 'the relocated entry keeps its nested slot declarations');
  assert.equal(relocated.options.priority, -10);
  dispose();
  assert.equal(entries.get('conversation.hero.agentPreset').length, 1);
  assert.equal(entries.get('conversation.input.overlay').length, 0);
  assert.equal(listeners.size, 0);
});
