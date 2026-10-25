import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkoutBranchForTest,
  deleteArchivedSessionForTest,
  ensureGitServerForTest,
  gitStatusForTest,
} from '../lib/index.js';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function repository() {
  const cwd = mkdtempSync(join(tmpdir(), 'smooth-git-'));
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.email', 'smooth@example.invalid');
  git(cwd, 'config', 'user.name', 'Smooth Test');
  writeFileSync(join(cwd, 'readme.txt'), 'smooth\n');
  git(cwd, 'add', 'readme.txt');
  git(cwd, 'commit', '-q', '-m', 'initial');
  return cwd;
}

test('the host bridge reports branches and uncommitted files', async () => {
  const cwd = repository();
  try {
    const current = git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD');
    const clean = await gitStatusForTest(cwd);
    assert.equal(clean.root.toLowerCase(), cwd.toLowerCase());
    assert.equal(clean.current, current);
    assert.equal(clean.detached, false);
    assert.equal(clean.dirty, 0, 'a fresh commit is clean');
    assert.ok(clean.branches.includes(current));

    writeFileSync(join(cwd, 'readme.txt'), 'changed\n');
    writeFileSync(join(cwd, 'new.txt'), 'untracked\n');
    const dirty = await gitStatusForTest(cwd);
    assert.equal(dirty.dirty, 2, 'modified and untracked rows both count');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('the host bridge creates and switches branches', async () => {
  const cwd = repository();
  try {
    const status = await checkoutBranchForTest(cwd, 'feature/smooth', true);
    assert.equal(status.current, 'feature/smooth');
    assert.equal(git(cwd, 'rev-parse', '--abbrev-ref', 'HEAD'), 'feature/smooth');
    await assert.rejects(
      () => checkoutBranchForTest(cwd, 'feature/smooth', true),
      /already exists|已存在/i,
      'creating an existing branch fails',
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('the bridge listener authenticates and answers status with a capability token', async () => {
  const cwd = repository();
  // A throwaway home keeps the persisted capability token out of the real profile.
  const home = mkdtempSync(join(tmpdir(), 'smooth-home-'));
  const previousHome = process.env.DSH_HOME;
  process.env.DSH_HOME = home;
  const bridge = ensureGitServerForTest({}, 39617);
  try {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const injection = bridge.injection();
    const token = /"token":"([^"]+)"/.exec(injection.text)?.[1];
    const base = /"base":"([^"]+)"/.exec(injection.text)?.[1];
    assert.ok(token, 'the index injection carries the capability token');
    assert.match(base, /^http:\/\/127\.0\.0\.1:\d+$/);

    const call = async (payload, headerToken) => {
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          const response = await fetch(`${base}/smooth-skin/git`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-smooth-token': headerToken },
            body: JSON.stringify(payload),
          });
          return { statusCode: response.status, body: await response.json() };
        } catch (error) {
          if (attempt === 49) throw error;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      throw new Error('bridge did not start');
    };

    const ok = await call({ action: 'status', cwd }, token);
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.ok, true);
    assert.ok(ok.body.value.branches.length >= 1);

    const denied = await call({ action: 'status', cwd }, 'wrong-token');
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.body.ok, false);

    // The delete action rides the same authenticated route; without the archive
    // state it refuses (fail closed) instead of guessing a path.
    const refused = await call({ action: 'session-delete', sessionId: 'session-01234567-89ab-cdef-0123-456789abcdef' }, token);
    assert.equal(refused.statusCode, 200);
    assert.equal(refused.body.ok, false);
    assert.equal(refused.body.error.code, 'session-not-archived');

    // The token survives an activation: it is the value a reloaded window keeps using.
    const persisted = readFileSync(join(home, 'cache', 'smooth-bridge-token'), 'utf8').trim();
    assert.equal(persisted, token, 'the injected token is the persisted one');
  } finally {
    bridge.dispose();
    if (previousHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previousHome;
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('the bridge permanently deletes an archived Session log and refuses unsafe targets', async () => {
  const home = mkdtempSync(join(tmpdir(), 'smooth-home-'));
  const root = join(home, 'sessions');
  const id = 'session-01234567-89ab-cdef-0123-456789abcdef';
  const sessionDir = join(root, '--tmp-project--', id);
  const cacheDir = join(home, 'storages', 'session_projcache', 'sessions');
  const cacheFile = join(cacheDir, `${id}.json`);
  const materialize = () => {
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(join(sessionDir, 'session.v4.jsonl.zstd'), 'stored-session');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cacheFile, '{}');
  };
  let unarchived = 0;
  let detached = 0;
  let stopped = 0;
  let detachedSession = 0;
  const context = ({ archived = [id], live, activity = [], waterfall = true } = {}) => {
    const store = new Map(live === void 0 ? [] : [[id, 'live-entry']]);
    return {
      get(name) {
        if (name === 'sessions') {
          return {
            get: () => live,
            store,
            detachEntered: (entry) => {
              assert.equal(entry, 'live-entry');
              detachedSession += 1;
              store.delete(id);
            },
          };
        }
        if (name === 'workspaceRegistry') {
          return {
            archivedSessionIds: archived,
            unarchiveSession: async (value) => { assert.equal(value, id); unarchived += 1; },
            list: () => [{
              record: { sessionIds: [id] },
              detachSession: async (value) => { assert.equal(value, id); detached += 1; },
            }],
          };
        }
        if (name === 'sessionPersistence') {
          return { root, stat: async (value) => (value === id ? { header: { id: value } } : undefined) };
        }
        return undefined;
      },
      ...waterfall ? {
        waterfall: async (_event, _payload, fallback) => activity,
        parallel: async () => { stopped += 1; },
      } : {},
    };
  };
  try {
    materialize();
    const cold = await deleteArchivedSessionForTest(context(), id);
    assert.equal(cold.deleted, true);
    assert.equal(existsSync(sessionDir), false, 'the stored Session directory is removed');
    assert.equal(existsSync(cacheFile), false, 'its projection cache goes with it');
    assert.equal(unarchived, 1, 'the stale archive marker is dropped');
    assert.equal(detached, 1, 'its workspace accounting slot goes too');
    assert.equal(detachedSession, 0, 'a cold Session has no in-memory entry to drop');
    assert.equal(stopped, 0, 'a cold Session needs no stop');

    // DSH keeps an archived Session's Agent in memory after archiving. An idle live
    // Session is still deletable; the bridge asks the same activity providers archive
    // admission asks, issues a stop, and detaches the store entry so the client list
    // cannot bring the deleted row back.
    materialize();
    const live = await deleteArchivedSessionForTest(context({ live: {} }), id);
    assert.equal(live.deleted, true);
    assert.equal(existsSync(sessionDir), false);
    assert.equal(unarchived, 2);
    assert.equal(detached, 2);
    assert.equal(detachedSession, 1, 'the live store entry is detached');
    assert.equal(stopped, 1);

    // Anything still running refuses, and the stored log stays.
    materialize();
    await assert.rejects(() => deleteArchivedSessionForTest(context({ live: {}, activity: [{ kind: 'turn' }] }), id), /仍在运行/);
    assert.equal(existsSync(join(sessionDir, 'session.v4.jsonl.zstd')), true, 'the log survives a refused delete');

    // No activity provider means the bridge cannot prove idleness: fail closed.
    await assert.rejects(() => deleteArchivedSessionForTest(context({ live: {}, waterfall: false }), id), /正在使用/);

    await assert.rejects(() => deleteArchivedSessionForTest(context({ archived: [] }), id), /已归档/);
    await assert.rejects(() => deleteArchivedSessionForTest(context({ archived: [], live: {} }), id), /已归档/);
    await assert.rejects(() => deleteArchivedSessionForTest(context(), '../outside'), /ID 无效/);
    await assert.rejects(() => deleteArchivedSessionForTest(context({ archived: ['session-unknown-0000'] }), 'session-unknown-0000'), /不存在/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
