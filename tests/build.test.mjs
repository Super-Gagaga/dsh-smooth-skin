import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const build = fileURLToPath(new URL('../build.mjs', import.meta.url));
const artifacts = ['index.js', 'client.js'].map(name => new URL(`../lib/${name}`, import.meta.url));

test('an unchanged build preserves artifact timestamps so HMR does not reload it', async () => {
  await run(process.execPath, [build]);
  const before = await Promise.all(artifacts.map(path => stat(path)));
  const result = await run(process.execPath, [build]);
  const after = await Promise.all(artifacts.map(path => stat(path)));
  for (let i = 0; i < artifacts.length; i++) {
    assert.equal(after[i].mtimeMs, before[i].mtimeMs, `${artifacts[i].pathname} was needlessly rewritten`);
    assert.equal(after[i].ctimeMs, before[i].ctimeMs, 'the HMR watcher also compares ctime');
  }
  assert.match(result.stdout, /artifacts unchanged/);
});
