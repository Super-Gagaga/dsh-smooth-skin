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
/** The same per-tool output weights the Claude-style meter uses, so a tool call is not
 * charged as one flat guess. The default is the cost of an unknown tool. */
const STREAM_TOOL_WEIGHTS = new Map([
  ['Bash', 370], ['Edit', 460], ['Read', 125], ['Write', 1200], ['bash', 105],
  ['bsk_inspect', 60], ['bsk_interact', 75], ['bsk_page', 75], ['desktop_eval', 240],
  ['edit', 325], ['glob', 55], ['grep', 75], ['job_output', 70], ['ops_bash', 125],
  ['ops_edit_file', 390], ['ops_glob', 60], ['ops_grep', 115], ['ops_read_files', 90],
  ['ops_stat', 45], ['ops_write_file', 495], ['present', 105], ['pwsh', 135],
  ['powershell', 135], ['read', 85], ['read_image', 55], ['run_code', 190],
  ['send_message', 1500], ['todo_write', 230], ['web_fetch', 55], ['write', 605],
]);
const STREAM_TOOL_DEFAULT = 120;
/** Word-length cost for Latin letters, CJK / symbol weights, digit triples, and
 * whitespace runs — the same character heuristic as the Claude-style meter. */
const STREAM_LATIN = [0, 0.496, 0.496, 0.62, 0.62, 0.62, 0.636, 0.636, 0.776, 0.776, 1.593];
const STREAM_CJK = 0.5235;
const STREAM_CJK_PUNCT = 2.6312;
const STREAM_NEWLINE = 1.5161;
const STREAM_SPACE = 0.3398;
const STREAM_SPACES = 1.421;
const STREAM_OTHER = 0.8153;
const STREAM_OTHER_PER = 0.1941;
const STREAM_PUNCT = /[\p{P}\p{S}]/u;

/** The Host's settled cost for one Session, fetched through the private bridge. */
function createSessionCostFeed(sessionId, request = bridgeRequest) {
  let id = typeof sessionId === 'string' ? sessionId : '';
  let value = null;
  let askedAt = 0;
  let loading = false;
  let queued = false;
  let retry = 0;
  let sequence = 0;
  const listeners = new Set();
  const notify = () => { for (const listener of listeners) listener(); };
  function clearRetry() {
    if (retry && typeof clearTimeout === 'function') clearTimeout(retry);
    retry = 0;
  }
  function follow(next) {
    const wanted = typeof next === 'string' ? next : '';
    if (wanted === id) return;
    id = wanted;
    value = null;
    askedAt = 0;
    loading = false;
    queued = false;
    clearRetry();
    sequence += 1;
    notify();
  }
  function ask(now = Date.now(), force = false) {
    if (!id) return undefined;
    if (loading) { queued = true; return undefined; }
    if (!force && askedAt !== 0 && now - askedAt < SESSION_COST_POLL_MS) {
      // A settlement that lands inside the cooldown must still be fetched; otherwise the
      // line keeps the previous Host amount while its live tail has already been reset.
      if (!retry && typeof setTimeout === 'function') {
        const wait = Math.max(0, SESSION_COST_POLL_MS - (now - askedAt));
        retry = setTimeout(() => { retry = 0; ask(Date.now(), true); }, wait);
        retry?.unref?.();
      }
      return undefined;
    }
    askedAt = now;
    loading = true;
    queued = false;
    const ticket = ++sequence;
    return Promise.resolve()
      .then(() => request('session-cost', { sessionId: id }))
      .then((next) => {
        if (ticket !== sequence || !next || typeof next !== 'object') return;
        value = next;
        notify();
      })
      .catch(() => { /* keep the previous reading; the caller has a projection fallback */ })
      .finally(() => {
        if (ticket !== sequence) return;
        loading = false;
        if (queued) { queued = false; ask(Date.now(), true); }
      });
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
      queued = false;
      clearRetry();
      sequence += 1;
      listeners.clear();
    },
  };
}

/** The character classes of the Claude-style meter: CJK, CJK punctuation, Latin word,
 * digit run, whitespace and everything else. */
function streamClass(code, character) {
  if (code >= 0x2e80) return STREAM_PUNCT.test(character) ? 2 : 1;
  if (code >= 48 && code <= 57) return 4;
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return 3;
  if (code === 32 || (code >= 9 && code <= 13)) return 5;
  return 6;
}

/** The same word/character heuristic as the Claude-style streaming meter. The caller
 * then calibrates the result against the Host's real output delta, so one multiplier
 * per model absorbs the remaining tokenizer difference. */
function estimateStreamTokens(text) {
  let total = 0;
  let kind = 0;
  let length = 0;
  let newline = false;
  const flush = () => {
    if (kind === 1) total += length * STREAM_CJK;
    else if (kind === 2) total += length * STREAM_CJK_PUNCT;
    else if (kind === 3) total += STREAM_LATIN[Math.min(length, 10)];
    else if (kind === 4) total += Math.ceil(length / 3);
    else if (kind === 5) total += newline ? STREAM_NEWLINE : length === 1 ? STREAM_SPACE : STREAM_SPACES;
    else if (kind === 6) total += STREAM_OTHER + length * STREAM_OTHER_PER;
    kind = 0;
    length = 0;
    newline = false;
  };
  for (const character of String(text ?? '')) {
    const code = character.codePointAt(0);
    const next = streamClass(code, character);
    if (next !== kind) {
      flush();
      kind = next;
    }
    length += 1;
    if (next === 5 && (code === 10 || code === 13)) newline = true;
  }
  flush();
  return total;
}

/** A tool call's output weight, keyed by the host's `data-tool` name. */
function streamToolTokens(node) {
  const name = typeof node?.getAttribute === 'function' ? node.getAttribute('data-tool') : '';
  return STREAM_TOOL_WEIGHTS.get(name) ?? STREAM_TOOL_DEFAULT;
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
      if (streaming) counted += streamToolTokens(call);
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
