/**
 * The browser half's one door to the Host half.
 *
 * The Host injects its private loopback origin and a per-activation capability token
 * into the served index (`window.__SMOOTH_GIT__`, kept for the pages this plugin
 * already ships), and every bridge action rides that pair: the composer's Git menu
 * and the welcome page's token table. A page served without it — a browser preview,
 * an install whose Host half is older — has no bridge, and its callers fall back to
 * their own read-only path rather than inventing a result.
 */

function smoothBridge() {
  const bridge = globalThis.__SMOOTH_GIT__;
  if (!bridge || typeof bridge.base !== 'string' || !bridge.base || typeof bridge.token !== 'string' || !bridge.token) return undefined;
  return bridge;
}

async function bridgeRequest(action, payload) {
  const bridge = smoothBridge();
  if (!bridge) throw new Error('smooth-bridge-unavailable');
  const body = JSON.stringify({ action, ...payload });
  // The desktop renderer can reach the bridge either through the origin injected
  // beside the token or through the same custom-scheme path. Try both before
  // declaring the service unavailable; an app-level error is never retried.
  let lastError;
  for (const url of [`${bridge.base}/smooth-skin/git`, '/smooth-skin/git']) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 60_000);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-smooth-token': bridge.token },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error;
      continue;
    } finally {
      window.clearTimeout(timer);
    }
    if (!response.ok) {
      lastError = new Error(`Smooth bridge HTTP ${response.status}`);
      continue;
    }
    let data;
    try {
      data = await response.json();
    } catch (error) {
      lastError = error;
      continue;
    }
    if (!data?.ok) throw new Error(data?.error?.message || 'Smooth bridge request failed');
    return data.value;
  }
  throw lastError ?? new Error('Smooth bridge connection failed');
}
