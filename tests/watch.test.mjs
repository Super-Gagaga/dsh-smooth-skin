import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/watch.js', import.meta.url), 'utf8');
const skin = await readFile(new URL('../src/skin.js', import.meta.url), 'utf8');

/** Minimal DOM + rAF harness: one frame is whatever the test decides to run. */
function runtime({ frames = true, body = true } = {}) {
  const observed = [];
  const framesQueued = [];
  const queries = [];
  const document = {
    body: body ? { nodeType: 1 } : undefined,
    querySelector: (selector) => { queries.push(selector); return { selector, found: true }; },
  };
  const sandbox = {
    document,
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observed.push(this); }
      observe(target, options) { this.target = target; this.options = options; }
      disconnect() { this.disconnected = true; }
    },
  };
  if (frames) sandbox.requestAnimationFrame = (callback) => { framesQueued.push(callback); return framesQueued.length; };
  runInNewContext(source + '\nglobalThis.make = createSurfaceWatcher; globalThis.coalesce = coalesceFrame;', sandbox);
  return {
    observed, queries, framesQueued,
    make: sandbox.make,
    coalesce: sandbox.coalesce,
    /** Run every animation frame the code asked for, including ones queued by a flush. */
    frame() {
      const queued = framesQueued.splice(0);
      for (const callback of queued) callback();
    },
    live: () => observed.filter((observer) => !observer.disconnected),
  };
}

test('one observer serves every watcher, watching the body once', () => {
  const r = runtime();
  const surfaces = r.make();
  surfaces.watch('.a', () => {});
  surfaces.watch('.b', () => {});
  assert.equal(r.observed.length, 1, 'a second watcher must not add a second observer');
  assert.equal(r.observed[0].target, r.observed[0].target.body ?? r.observed[0].target);
  assert.equal(r.observed[0].options.subtree, true);
  assert.equal(r.observed[0].options.childList, true);
  assert.deepEqual(r.queries, ['.a', '.b'], 'each watcher looks for its own surface once, synchronously');
});

test('a burst of mutations costs one pass per frame, not one per batch', () => {
  const r = runtime();
  const surfaces = r.make();
  const seen = [];
  surfaces.watch('.a', (match) => seen.push(match.found));
  seen.length = 0;
  // Ten mutation batches inside one frame, then the frame runs.
  for (let batch = 0; batch < 10; batch++) r.observed[0].callback();
  assert.deepEqual(r.queries, ['.a'], 'nothing runs before the frame');
  r.frame();
  assert.deepEqual(r.queries, ['.a', '.a'], 'the ten batches collapse into one check');
  assert.deepEqual(seen, [true]);
  // Two more bursts in the same frame collapse again, and a later frame re-checks.
  r.observed[0].callback();
  r.observed[0].callback();
  r.frame();
  r.observed[0].callback();
  r.frame();
  assert.equal(r.queries.length, 4);
});

test('dropping the last watcher disconnects the observer, dispose removes it', () => {
  const r = runtime();
  const surfaces = r.make();
  const dropA = surfaces.watch('.a', () => {});
  const dropB = surfaces.watch('.b', () => {});
  dropA();
  assert.equal(r.live().length, 1, 'one watcher still needs the observer');
  dropB();
  assert.equal(r.live().length, 0, 'the last watcher releases it');
  surfaces.watch('.c', () => {});
  assert.equal(r.live().length, 1, 'a new watcher starts a fresh observer');
  surfaces.dispose();
  assert.equal(r.live().length, 0);
});

test('without requestAnimationFrame the checks keep the caller\u2019s timing', () => {
  const r = runtime({ frames: false });
  const surfaces = r.make();
  const seen = [];
  surfaces.watch('.a', (match) => seen.push(match.found));
  assert.deepEqual(seen, [true], 'the first check is synchronous either way');
  r.observed[0].callback();
  assert.deepEqual(seen, [true, true], 'an engine without frames runs immediately instead of dropping the update');
});

test('coalesceFrame runs once per frame and again after it', () => {
  const r = runtime();
  const runs = [];
  const schedule = r.coalesce(() => runs.push(1));
  schedule();
  schedule();
  schedule();
  assert.deepEqual(runs, []);
  r.frame();
  assert.deepEqual(runs, [1]);
  schedule();
  r.frame();
  assert.deepEqual(runs, [1, 1]);
});

