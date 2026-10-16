import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const built = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

function loadClient({ stored, unavailable = [] } = {}) {
  let registration;
  let settings;
  let dictionaries;
  let preference = 'system';
  let tokenLayers = 0;
  const effects = [];
  const styles = new Set();
  const attributes = new Set();
  const storage = new Map(stored ? [['dsh-smooth-skin:state', JSON.stringify(stored)]] : []);
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useReducer: () => [0, () => {}],
    useEffect: () => {},
  };
  const services = {
    theme: {
      getTheme: () => ({ preference }),
      setTheme: (next) => { preference = next; },
      overrideTokens: () => { tokenLayers++; return () => { tokenLayers--; }; },
    },
    slots: {
      inject: (_name, callback) => callback(),
      register: (options, component) => {
        assert.equal(typeof options.label, 'string');
        settings = { options, component };
        return () => { settings = undefined; };
      },
    },
    locale: {
      register: (_namespace, dicts) => { dictionaries = dicts; return () => { dictionaries = undefined; }; },
      translate: (_namespace, key) => dictionaries?.zh[key],
    },
  };
  for (const name of unavailable) delete services[name];
  runInNewContext(built, {
    window: {
      __ModuleLoader__: { load: (value) => { registration = value; } },
      localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    },
    document: {
      addEventListener() {}, removeEventListener() {},
      createElement: () => { const style = { dataset: {}, remove: () => styles.delete(style) }; return style; },
      head: { append: (style) => styles.add(style) },
      body: {
        toggleAttribute: (name, enabled) => enabled ? attributes.add(name) : attributes.delete(name),
        removeAttribute: (name) => attributes.delete(name),
      },
    },
  });
  assert.equal(registration.id, manifest.name);
  const plugin = registration.factory((name) => {
    assert.equal(name, 'react');
    return react;
  });
  const ctx = new Proxy({}, {
    get: (_target, name) => {
      if (name === 'effect') return (callback) => { const dispose = callback(); if (dispose) effects.push(dispose); };
      assert.ok(plugin.inject.includes(name), `cannot get property "${String(name)}" without inject`);
      return services[name];
    },
  });
  return {
    plugin, ctx, styles, attributes, storage,
    get settings() { return settings; },
    get tokenLayers() { return tokenLayers; },
    get preference() { return preference; },
    get dictionaries() { return dictionaries; },
    dispose: () => { for (const fn of effects.reverse()) fn(); },
  };
}

test('built client exports an activatable plugin with every service declared', () => {
  const runtime = loadClient();
  assert.equal(runtime.plugin.name, manifest.name);
  assert.equal(typeof runtime.plugin.apply, 'function');
  runtime.plugin.apply(runtime.ctx);
  assert.ok(runtime.attributes.has('data-smooth-skin'));
  assert.equal(runtime.styles.size, 1);
  assert.equal(runtime.tokenLayers, 1);
  assert.equal(runtime.settings.options.label, 'Smooth 皮肤');
  assert.ok(runtime.dictionaries.zh);
  runtime.dispose();
  assert.equal(runtime.styles.size, 0);
  assert.equal(runtime.tokenLayers, 0);
  assert.equal(runtime.attributes.size, 0);
  assert.equal(runtime.settings, undefined);
  assert.equal(runtime.dictionaries, undefined);
});

test('turning the skin off restores tokens and theme, then re-enabling reapplies it', async () => {
  const runtime = loadClient({ stored: { enabled: true, theme: 'dark' } });
  runtime.plugin.apply(runtime.ctx);
  assert.equal(runtime.preference, 'dark');
  const getToggle = () => runtime.settings.component().children[1].children[0];
  await getToggle().props.onChange(false);
  assert.equal(runtime.preference, 'system');
  assert.equal(runtime.tokenLayers, 0);
  assert.equal(runtime.attributes.size, 0);
  assert.equal(JSON.parse(runtime.storage.get('dsh-smooth-skin:state')).enabled, false);
  await getToggle().props.onChange(true);
  assert.equal(runtime.tokenLayers, 1);
  assert.equal(runtime.preference, 'dark');
  runtime.dispose();
  assert.equal(runtime.preference, 'system');
  assert.equal(runtime.tokenLayers, 0);
});

test('missing declared services degrade without an undeclared service access', () => {
  const runtime = loadClient({ unavailable: ['theme', 'slots', 'locale'] });
  runtime.plugin.apply(runtime.ctx);
  assert.ok(runtime.attributes.has('data-smooth-skin'));
  runtime.dispose();
  assert.equal(runtime.styles.size, 0);
});

test('manifest loads the providers before activating the client', () => {
  for (const name of ['slots', 'theme', 'locale']) {
    const provider = name === 'locale' ? '@deepseek-ai/dsh-client-locale' : `@deepseek-ai/dsh-client-ui-${name}`;
    assert.ok(manifest.dsh.client.inject.includes(provider), `missing provider ${provider}`);
  }
  for (const name of ['layout', 'workspace', 'session', 'settings-general']) {
    assert.ok(manifest.dsh.client.inject.includes(`@deepseek-ai/dsh-client-ui-${name}`));
  }
});
