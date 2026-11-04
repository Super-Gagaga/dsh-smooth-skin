/**
 * The bottom line's money reading: the Host's settled session cost plus the output
 * tokens the assistant is writing right now.
 *
 * The Host half folds the Session's stored settlements with the official DeepSeek
 * price table, so its figure is exact at the tier each settlement happened in. The
 * browser adds the only piece the Host cannot know yet — the stream that has not
 * produced its settlement event. It estimates that tail from the words and tool calls
 * already on screen, calibrates the estimate against each Host settlement, and the
 * caller adds the two. A missing bridge keeps the old projection estimate.
 */

/** At most one Host cost request per 1.5s; a retried step usually lands within that. */
const SESSION_COST_POLL_MS = 1_500;
/** The streaming estimate is refreshed on a quarter-second cadence while text runs. */
const STREAM_TICK_MS = 250;
/** A tool call is output too; this constant is folded into the per-model calibration. */
const STREAM_TOOL_TOKENS = 160;

/** The Host's settled cost for one Session, fetched through the private bridge. */
function createSessionCostFeed(sessionId, request = bridgeRequest) {
  let id = typeof sessionId === 'string' ? sessionId : '';
  let value = null;
  let askedAt = 0;
  let loading = false;
  let sequence = 0;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  function follow(next) {
    const wanted = typeof next === 'string' ? next : '';
    if (wanted === id) return;
    id = wanted;
    value = null;
    askedAt = 0;
    loading = false;
    sequence += 1;
    notify();
  }
  function ask(now = Date.now(), force = false) {
    if (!id || loading || (!force && askedAt !== 0 && now - askedAt < SESSION_COST_POLL_MS)) return undefined;
    askedAt = now;
    loading = true;
    const ticket = ++sequence;
    return Promise.resolve()
      .then(() => request('session-cost', { sessionId: id }))
      .then((next) => {
        if (ticket !== sequence || !next || typeof next !== 'object') return;
        value = next;
        notify();
      })
      .catch(() => { /* keep the previous reading; the caller has a projection fallback */ })
      .finally(() => { if (ticket === sequence) loading = false; });
  }
  return {
    follow,
    ask,
    value() { return value; },
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    stop() {
      id = '';
      value = null;
      askedAt = 0;
      loading = false;
      sequence += 1;
      listeners.clear();
    },
  };
}

/** A deliberately coarse tokenizer for the streaming text. Absolute precision is not
 * needed: `settle()` divides the estimate by the Host's real output delta over the same
 * span, so each model gets a multiplier that folds the remaining error away. */
function estimateStreamTokens(text) {
  let total = 0;
  for (const character of String(text ?? '')) {
    const code = character.codePointAt(0);
    if (code >= 0x2e80) total += 1.5;
    else if (character === ' ' || character === '\n' || character === '\t') total += 0.25;
    else if (/[A-Za-z0-9]/.test(character)) total += 0.25;
    else total += 0.5;
  }
  return total;
}

function streamMedian(values) {
  if (values.length === 0) return 1;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** The live output tail, measured from the conversation DOM. */
function createStreamingMeter() {
  const doc = typeof document !== 'undefined' ? document : null;
  const listeners = new Set();
  let observer = null;
  let timer = 0;
  let counted = 0;
  let lastOutput = null;
  let model = null;
  const textSeen = new Map();
  const callsSeen = new Set();
  const factors = new Map();
  const ratios = new Map();
  const notify = () => { for (const listener of listeners) listener(); };

  /** Add only the growth since the last look: a message leaving the DOM must not reset
   * the estimate, and a settlement mid-stream must not recount the text already paid. */
  function measure() {
    if (!doc || typeof doc.querySelector !== 'function') return counted;
    const scroller = doc.querySelector('[data-conversation-scroll]');
    if (!scroller) return counted;
    for (const node of scroller.querySelectorAll('[data-streaming]')) {
      // A nested streaming box is part of its parent's text; count the outer one once.
      if (node.parentElement && node.parentElement.closest('[data-streaming]')) continue;
      const tokens = estimateStreamTokens(node.textContent);
      const previous = textSeen.get(node) || 0;
      if (tokens > previous) counted += tokens - previous;
      textSeen.set(node, tokens);
    }
    for (const node of textSeen.keys()) {
      if (!node.isConnected) textSeen.delete(node);
    }
    const streaming = hasStreaming();
    for (const call of scroller.querySelectorAll('[data-chat-call-id]')) {
      if (callsSeen.has(call)) continue;
      callsSeen.add(call);
      // History can mount later (a longer row, a fold opening); it is already settled.
      if (streaming) counted += STREAM_TOOL_TOKENS;
    }
    return counted;
  }

  function hasStreaming() {
    return Boolean(doc && typeof doc.querySelector === 'function' && doc.querySelector('[data-streaming]'));
  }

  function tick() {
    const before = counted;
    measure();
    if (!hasStreaming() && timer) stopTimer();
    // Re-render only when the estimate moved; a composer or cost label mutation must
    // not start a render/mutation loop of its own.
    if (counted !== before) notify();
  }

  function refresh() {
    return measure();
  }

  function stopTimer() {
    if (timer && typeof clearInterval === 'function') clearInterval(timer);
    timer = 0;
  }

  function ensureTimer() {
    if (timer || !hasStreaming() || typeof setInterval !== 'function') return;
    timer = setInterval(tick, STREAM_TICK_MS);
    timer?.unref?.();
  }

  function watch() {
    if (!doc || !doc.body || typeof MutationObserver !== 'function') return;
    // Calls already on screen belong to settled turns; mark them without charging.
    const scroller = typeof doc.querySelector === 'function' ? doc.querySelector('[data-conversation-scroll]') : null;
    if (scroller) for (const call of scroller.querySelectorAll('[data-chat-call-id]')) callsSeen.add(call);
    let watched = null;
    const attach = () => {
      const target = (typeof doc.querySelector === 'function' ? doc.querySelector('[data-conversation-scroll]') : null) || doc.body;
      if (target === watched) return;
      watched = target;
      observer.disconnect();
      observer.observe(target, { childList: true, subtree: true, characterData: true });
    };
    observer = new MutationObserver(() => { attach(); tick(); ensureTimer(); });
    attach();
    tick();
    ensureTimer();
  }

  return {
    watch,
    /** Land a Host settlement: the counted text and tool calls up to this point are
     * already paid for, and their ratio to the real output delta calibrates the model. */
    settle(outputTokens, modelId) {
      const output = Number.isFinite(Number(outputTokens)) ? Number(outputTokens) : 0;
      const named = modelId || null;
      if (model === null) {
        // First reading of this mount: keep whatever the meter already counted from a
        // stream that was on screen before the effect ran.
        model = named;
        lastOutput = output;
        return;
      }
      if (named !== model) {
        model = named;
        counted = 0;
        lastOutput = output;
        ratios.delete(named);
        factors.delete(named);
        return;
      }
      if (lastOutput === null) {
        lastOutput = output;
        return;
      }
      const delta = output - lastOutput;
      if (delta <= 0) {
        lastOutput = output;
        counted = 0;
        return;
      }
      const estimate = counted;
      if (estimate > 0 && delta >= 20) {
        const list = ratios.get(named) || [];
        list.push(estimate / delta);
        if (list.length > 20) list.shift();
        ratios.set(named, list);
        factors.set(named, Math.min(1.1, Math.max(0.9, 1 / streamMedian(list))));
      }
      lastOutput = output;
      counted = 0;
    },
    /** Estimated output tokens written since the last Host settlement. */
    tokens(modelId) {
      refresh();
      return Math.max(0, counted) * (factors.get(modelId ?? model) ?? 1);
    },
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    stop() {
      observer?.disconnect();
      observer = null;
      stopTimer();
      listeners.clear();
    },
  };
}

/** The figure the button shows: the Host's settled amount plus the live output tail.
 * `fallback` is the old projection-based estimate, used without a Host reading or when
 * some settlement has no price. */
function combineSessionCost(host, liveTokens, outputRate, fallback) {
  if (host && host.partial !== true && Number.isFinite(host.costMicro)) {
    const settled = host.costMicro;
    // The log is written slightly after the projection. A zero Host reading next to a
    // positive projection is that lag, not a free turn; prefer the projection until the
    // first settlement lands.
    if (settled > 0 || fallback === null || fallback === 0) {
      const live = Math.max(0, Number(liveTokens) || 0) * Math.max(0, Number(outputRate) || 0);
      return settled + live;
    }
  }
  return fallback;
}
