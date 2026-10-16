/**
 * Startup-time DOM watching.
 *
 * The skin decorates host surfaces it does not own, so it has to wait for them. The
 * naive shape of that wait is expensive exactly when it matters most: a
 * `MutationObserver` on `document.body` with `{childList, subtree}` calls back once per
 * mutation batch, and the callback runs a whole-document `querySelector`. During the
 * shell's own mount — the busiest stretch of the application's startup — React commits
 * repeatedly, so N watchers each paying one document lookup per commit multiplies out to
 * O(document) × commits.
 *
 * This module keeps one observer for all of them and coalesces its checks into a single
 * animation frame, so a burst of commits costs one pass instead of one pass per commit.
 * The first check of every watcher stays synchronous: the surface it decorates is found
 * in its first render, not one frame later.
 */

/** Coalesce repeated calls into one per animation frame.
 * Engines without `requestAnimationFrame` (test sandboxes, very old runtimes) keep the
 * caller's original timing by running immediately; the returned function is idempotent
 * within a frame either way. */
function coalesceFrame(callback) {
  let pending = false;
  const run = () => { pending = false; callback(); };
  return () => {
    if (pending) return;
    pending = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else run();
  };
}

/** A set of selector watchers sharing one body observer. */
function createSurfaceWatcher() {
  const watchers = new Set();
  let observer;
  const check = () => {
    for (const watcher of [...watchers]) watcher();
  };
  const schedule = coalesceFrame(check);
  return {
    /** Call `callback(match)` now and on every later frame in which the document changed.
     * Returns the disposer that drops this watcher. */
    watch(selector, callback) {
      const watcher = () => { callback(document.querySelector(selector)); };
      watcher();
      watchers.add(watcher);
      if (!observer) {
        observer = new MutationObserver(schedule);
        observer.observe(document.body, { childList: true, subtree: true });
      }
      return () => {
        watchers.delete(watcher);
        if (watchers.size === 0 && observer) {
          observer.disconnect();
          observer = undefined;
        }
      };
    },
    dispose() {
      watchers.clear();
      observer?.disconnect();
      observer = undefined;
    },
  };
}

