/**
 * Host half of the Smooth bundle.
 *
 * Besides the launch animation's rows for the served index, this half owns the
 * small local bridge the browser half calls over loopback. The bridge is deliberately
 * narrow and capability-gated:
 *   - `status` / `checkout`: the composer's Git branch menu. It never runs a shell
 *     (fixed `git` argv, `execFile`).
 *   - `usage`: the welcome page's daily token table. It reads the stored Session logs
 *     (read-only) and returns per-day totals; nothing else leaves the process.
 *   - `session-cost`: the bottom line's settled cost for one Session. It folds that
 *     Session's stored settlements with the shared price table; the browser adds the
 *     still-running output stream.
 *   - `session-delete`: the archived Session list's trailing delete action. DSH has no
 *     session-delete service, so the bridge removes the Session's stored log directory
 *     (and its projection cache) for an archived Session with no running work; DSH keeps
 *     an archived Session's Agent in memory after archiving, so liveness alone is not a
 *     refusal. The browser half then re-pulls the Session list; the query index prunes
 *     the missing row.
 * The bridge requires a per-activation capability token and owns one exact route.
 * When it is absent the rows still render and the client menus fall back to their
 * read-only path.
 *
 * Cordis decides a plugin's shape in `registry.resolve()`:
 *   1. a function is used as the callback directly — `name`, `inject` and `Config`
 *      then have to be own properties of that function, and `Function.prototype.name`
 *      is read-only, so a mirror cannot be attached reliably; or
 *   2. an object with an `apply` method contributes its `apply` as the callback
 *      while `name`, `inject` and `Config` are read off the object.
 * Shape 2 is the one that keeps all three readable, so this module exports a single
 * plugin object as its default export. `unwrapExports` collapses the namespace to
 * that default, which is what makes the metadata visible.
 */
export function apply(ctx) {
  const bridge = ensureGitServer(ctx);
  ctx.on('webserver/index-inject', (table) => {
    table.push(...bootInjections());
    if (bridge) table.push(bridge.injection());
  });
}

/** No `Config`: cordis reads `Config["~standard"].validate`, which a plain object lacks.
 * The Git bridge owns a private loopback listener, so the Host declares no service. */
const plugin = { name: PLUGIN_ID, inject: [], apply };

export default plugin;
export { plugin };
export {
  gitStatus as gitStatusForTest,
  checkoutBranch as checkoutBranchForTest,
  ensureGitServer as ensureGitServerForTest,
  deleteArchivedSession as deleteArchivedSessionForTest,
  foldSessionLog as foldSessionLogForTest,
  scanSessions as scanSessionsForTest,
  dailyUsage as dailyUsageForTest,
  foldSessionCostLog as foldSessionCostLogForTest,
  sessionCost as sessionCostForTest,
};

const GIT_ROUTE = '/smooth-skin/git';
const GIT_TIMEOUT = 20_000;
const CHECKOUT_TIMEOUT = 60_000;
const BODY_LIMIT = 64 * 1024;

let bridgeModules;
async function bridgeNode() {
  if (!bridgeModules) {
    bridgeModules = Promise.all([
      import('node:child_process'),
      import('node:fs/promises'),
      import('node:path'),
      import('node:os'),
      import('node:zlib'),
    ]).then(([child, fs, path, os, zlib]) => ({ child, fs, path, os, zlib }));
  }
  return bridgeModules;
}

class GitBridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** A fixed argv array, no shell. The Host already owns this machine; the bridge
 * still keeps every argument out of shell parsing and bounds runtime and output. */
async function runGit(cwd, args, timeout = GIT_TIMEOUT) {
  const { child } = await bridgeNode();
  return await new Promise((resolve) => {
    child.execFile('git', args, {
      cwd,
      timeout,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      encoding: 'utf8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_PAGER: 'cat', GIT_OPTIONAL_LOCKS: '0' },
    }, (error, stdout, stderr) => resolve({
      ok: !error,
      killed: Boolean(error?.killed),
      stdout: stdout || '',
      stderr: stderr || '',
    }));
  });
}

function gitMessage(result) {
  const text = `${result.stderr || ''}\n${result.stdout || ''}`.trim();
  return text.split(/\r?\n/).filter(Boolean).slice(-3).join('\n') || 'Git 命令执行失败';
}

async function repository(cwd) {
  const { fs, path } = await bridgeNode();
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) throw new GitBridgeError('cwd', '工作目录无效');
  const stat = await fs.stat(cwd).catch(() => undefined);
  if (!stat?.isDirectory()) throw new GitBridgeError('cwd', '工作目录不存在');
  const top = await runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (!top.ok) throw new GitBridgeError('not-git', '当前目录不是 Git 仓库');
  const root = path.resolve(top.stdout.trim());
  return { root, cwd: path.resolve(cwd) };
}

/** Branch list and working-tree state. `dirty` is the number of porcelain rows,
 * so untracked files count too, matching the "未提交: N 个文件" wording. */
async function gitStatus(cwd) {
  const { root } = await repository(cwd);
  const [head, status, refs] = await Promise.all([
    runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD']),
    runGit(root, ['status', '--porcelain']),
    runGit(root, ['for-each-ref', '--format=%(refname:short)', 'refs/heads']),
  ]);
  if (!head.ok) throw new GitBridgeError('git', gitMessage(head));
  const current = head.stdout.trim();
  const detached = current === 'HEAD';
  const dirty = status.ok ? status.stdout.split(/\r?\n/).filter(Boolean).length : 0;
  const branches = refs.ok ? refs.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [];
  if (!detached && current && !branches.includes(current)) branches.unshift(current);
  branches.sort((a, b) => {
    if (a === current) return -1;
    if (b === current) return 1;
    return a.localeCompare(b);
  });
  return { root, current, detached, dirty, branches };
}

async function checkoutBranch(cwd, branch, create) {
  if (typeof branch !== 'string' || !branch.trim()) throw new GitBridgeError('branch', '分支名不能为空');
  const name = branch.trim();
  if (/[\s~^:?*[\\]/.test(name) || name.startsWith('-') || name.includes('..') || name.includes('\\')) {
    throw new GitBridgeError('branch', '分支名无效');
  }
  const { root } = await repository(cwd);
  const valid = await runGit(root, ['check-ref-format', '--branch', name]);
  if (!valid.ok) throw new GitBridgeError('branch', '分支名无效');
  const result = await runGit(root, create ? ['checkout', '-b', name] : ['checkout', name], CHECKOUT_TIMEOUT);
  if (!result.ok) throw new GitBridgeError('checkout', gitMessage(result));
  return await gitStatus(root);
}

const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/;

/** Permanently remove one archived Session's stored log. DSH exposes no session-delete
 * service: the persistence seam only creates/opens/lists logs, and the query index
 * reconciles its rows against that list — removing the Session's directory is therefore
 * what makes the Session disappear for good (the index prunes it on the next list).
 * Archiving stops a Session's work but does not evict its Agent, so a Session can stay
 * live in the Session store indefinitely; the bridge therefore asks the same
 * `workspace/session-activity` admission the archive flow uses and refuses only when
 * something still runs. The projection-cache file, the workspace accounting slot, and the
 * stale archive marker are cleaned up around the removal so nothing references the gone
 * identity. */
async function deleteArchivedSession(ctx, sessionId) {
  const { fs, path } = await bridgeNode();
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new GitBridgeError('session', '会话 ID 无效');
  }
  const registry = ctx?.get?.('workspaceRegistry');
  let archived;
  try { archived = registry?.archivedSessionIds; } catch { archived = undefined; }
  // Fail closed: a destructive delete must not proceed on the guess that the Session
  // happened to be archived, so an unreadable archive state refuses just like a
  // non-archived id does.
  if (!Array.isArray(archived) || !archived.includes(sessionId)) {
    throw new GitBridgeError('session-not-archived', '只能删除已归档的会话');
  }
  const sessions = ctx?.get?.('sessions');
  if (sessions?.get?.(sessionId) !== undefined) {
    // The archived-session gate already blocks every model step, but a turn, job,
    // subagent, or schedule can still be settling. Ask the providers the same question
    // archive admission asks; an unreadable answer refuses rather than deleting blind.
    let activity;
    try {
      if (typeof ctx?.waterfall === 'function') {
        activity = await ctx.waterfall('workspace/session-activity', { sessionId }, () => Promise.resolve([]));
      }
    } catch {
      activity = undefined;
    }
    if (!Array.isArray(activity)) throw new GitBridgeError('session-live', '会话正在使用，无法删除');
    if (activity.length > 0) throw new GitBridgeError('session-live', '会话仍在运行，无法删除');
    try { await ctx.parallel?.('workspace/session-stop', { sessionId }); } catch { /* nothing left to stop */ }
  }
  const persistence = ctx?.get?.('sessionPersistence');
  const root = typeof persistence?.root === 'string' ? persistence.root : undefined;
  if (!root || typeof persistence?.stat !== 'function') throw new GitBridgeError('session-root', '无法定位会话存储目录');
  const snapshot = await persistence.stat(sessionId).catch(() => undefined);
  if (snapshot === undefined) throw new GitBridgeError('session-missing', '会话记录不存在');
  // `<root>/<projectKey(cwd)>/<sessionId>`: the per-session directory is the encoded id
  // under the project directory. Session ids are path-safe, so the segment is the id.
  const projects = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
  let directory;
  for (const project of projects) {
    if (!project.isDirectory()) continue;
    const candidate = path.join(root, project.name, sessionId);
    const info = await fs.stat(candidate).catch(() => undefined);
    if (info?.isDirectory()) { directory = candidate; break; }
  }
  if (!directory) throw new GitBridgeError('session-missing', '会话目录不存在');
  // A live Session's log writer only holds a handle for the duration of an append, but a
  // just-settled batch can still be closing. `maxRetries` absorbs that transient sharing
  // violation instead of failing the delete on Windows.
  await fs.rm(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 120 });
  const cache = path.join(path.dirname(root), 'storages', 'session_projcache', 'sessions', `${sessionId}.json`);
  await fs.rm(cache, { force: true }).catch(() => {});
  // Drop the accounting slot too: while the live Session remains in the Host's in-memory
  // catalog, the workspace's `candidateMatches` index can keep the id visible until a
  // restart. Detaching here is what makes the archived row leave on the client refresh.
  try {
    for (const entity of registry?.list?.() ?? []) {
      if (Array.isArray(entity?.record?.sessionIds) && entity.record.sessionIds.includes(sessionId)) {
        await entity.detachSession?.(sessionId);
        break;
      }
    }
  } catch { /* accounting cleanup only */ }
  try { await registry?.unarchiveSession?.(sessionId); } catch { /* marker cleanup only */ }
  // An opened Session's Agent stays in memory for the whole app run, so the deleted id
  // would otherwise remain in the in-memory catalog and come back on the next list.
  // Detach the store entry only after the log is gone: the controller turns the paired
  // disposal into `api-session/removed`, and the client refresh drops the archived row.
  if (sessions?.get?.(sessionId) !== undefined) {
    try {
      const entry = sessions?.store?.get?.(sessionId);
      if (entry !== undefined && typeof sessions.detachEntered === 'function') sessions.detachEntered(entry);
    } catch { /* the removed log still disappears from the list after a restart */ }
  }
  return { deleted: true, sessionId };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-smooth-token');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new GitBridgeError('body', '请求体过大');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new GitBridgeError('body', '请求体不是有效 JSON');
  }
}

async function handleBridgeRequest(req, res, tokenOf, ctx) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-smooth-token');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.headers['x-smooth-token'] !== tokenOf()) {
    sendJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'Smooth bridge denied the request' } });
    return;
  }
  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    sendJson(res, 200, { ok: false, error: { code: error.code || 'body', message: error.message } });
    return;
  }
  const cwd = typeof body.cwd === 'string' ? body.cwd : '';
  try {
    let value;
    if (body.action === 'status') {
      value = await gitStatus(cwd);
    } else if (body.action === 'checkout') {
      value = await checkoutBranch(cwd, body.branch, Boolean(body.create));
    } else if (body.action === 'usage') {
      value = await dailyUsage();
    } else if (body.action === 'session-cost') {
      value = await sessionCost(body.sessionId);
    } else if (body.action === 'session-delete') {
      value = await deleteArchivedSession(ctx, body.sessionId);
    } else {
      throw new GitBridgeError('action', '未知的桥接操作');
    }
    sendJson(res, 200, { ok: true, value });
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      error: {
        code: error.code || 'bridge',
        message: error.message || '桥接操作失败',
      },
    });
  }
}

/** The capability token is minted once per Host activation and injected into the
 * index beside this bridge's own loopback origin. A page without the token gets a
 * 403, so a random local page cannot drive Git through the listener. The listener
 * is deliberately private to the plugin: the profile's web carrier may activate
 * after this bundle, and a fixed proxy port avoids relying on its route table.
 *
 * `preferredPort` exists for the tests: a test process shares the machine with the
 * running application, whose own listener already owns the default port and would
 * answer in its place. */
let gitServer;
function ensureGitServer(ctx, preferredPort = 39517) {
  if (gitServer) return gitServer;
  let token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  // Keep the token across activations. A page holds the copy it was served with, so a
  // fresh activation (a rebuilt bundle, a plugin reload) that minted a new token would
  // answer that page's requests with 403 until the window reloaded — the usage panel
  // and the branch menu both go quiet with no visible reason. The persisted value is
  // per profile home, not per process, which also covers a page loaded from a cached
  // index after a restart.
  adoptBridgeToken(token).then((value) => { token = value; }).catch(() => {});
  let port = preferredPort;
  let base = '';
  let server;
  // `node:http` arrives asynchronously. A plugin that is disposed before that import
  // resolves must not leave a listener behind that nothing can close, so the flag is
  // checked once it lands: a disposed bridge closes the server instead of listening.
  let disposed = false;
  const listen = () => {
    import('node:http').then(({ createServer }) => {
      if (disposed) return;
      server = createServer((req, res) => handleBridgeRequest(req, res, () => token, ctx));
      server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE' && port < preferredPort + 10) {
          port += 1;
          server.listen(port, '127.0.0.1');
          return;
        }
        console.error('smooth git bridge:', error);
      });
      server.on('listening', () => {
        base = `http://127.0.0.1:${port}`;
      });
      if (disposed) { try { server.close(); } catch {} return; }
      server.listen(port, '127.0.0.1');
    }).catch((error) => {
      console.error('smooth git bridge:', error);
    });
  };
  listen();
  const api = {
    injection() {
      const current = base || `http://127.0.0.1:${port}`;
      return {
        kind: 'script',
        placement: 'head',
        text: `window.__SMOOTH_GIT__=${JSON.stringify({ base: current, token })};`,
      };
    },
    dispose() {
      disposed = true;
      try { server?.close(); } catch {}
      if (gitServer === api) gitServer = undefined;
    },
  };
  gitServer = api;
  if (typeof ctx.effect === 'function') ctx.effect(() => () => api.dispose());
  return api;
}

/* ------------------------------------------------------------- token usage ---
 *
 * The welcome page's daily table is fed from the stored Session logs rather than
 * from a live projection: a projection reports one Session's totals, and the table
 * needs per-day buckets across every Session the user has ever had. The logs are
 * append-only JSONL (optionally one Zstandard frame per batch), so the read is a
 * fold over `assistant/message` settlements — no Host service is required and the
 * archive is read-only.
 */

/** The table draws a quarter of a year; the archive scan keeps the same window and
 * stops decoding logs whose last write predates it. */
const USAGE_WINDOW_DAYS = 371;
/** A cold fold decodes the whole archive, so one result answers every mount of the
 * welcome page for a minute. */
const USAGE_TTL_MS = 60_000;
/** The bridge's capability token is persisted here so it survives an activation. */
const BRIDGE_TOKEN_FILE = 'smooth-bridge-token';

/** Read the token a previous activation left, or claim this one's for the next.
 *
 * The guard only needs to keep a page that the plugin itself did not serve from
 * driving the listener, and a local file is outside a random web page's reach; the
 * trade for that is a token that stays valid across restarts, which is what keeps an
 * already-loaded window talking to a re-activated bridge. */
async function adoptBridgeToken(fallback) {
  const { fs, path, os } = await bridgeNode();
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const file = path.join(home, 'cache', BRIDGE_TOKEN_FILE);
  try {
    const existing = (await fs.readFile(file, 'utf8')).trim();
    if (/^[A-Za-z0-9-]{16,}$/.test(existing)) return existing;
  } catch {}
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, fallback, { mode: 0o600 });
  } catch {}
  return fallback;
}
const USAGE_CACHE_VERSION = 2;
const USAGE_CACHE_FILE = `smooth-usage-v${USAGE_CACHE_VERSION}.json`;
const USAGE_LOG_NAME = /^session\.v\d+\.jsonl(\.zstd)?$/;
/** The envelope of a settlement: its own sequence and the wall clock of the event. */
const USAGE_LOG_EVENT = /^\{"type":"assistant\/(?:message|attempt)","seq":\d+,"time":(\d+)/;
const USAGE_LOG_STEP = /"turn":(\d+),"step":(\d+)/;
const USAGE_LOG_KEY = '"usage":{';
const USAGE_LOG_MODEL = /"model":"([^"]+)"/;
const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

function usageDayKey(time) {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Byte offsets of every Zstandard frame start, plus the end of the buffer.
 *
 * A Session log appends one frame per batch and Node's one-shot decoder refuses
 * everything after the first frame, so the frames are split before decoding. The
 * four-byte magic makes a false positive inside compressed data practically
 * impossible, and a frame that still fails to decode is a torn tail — the write path
 * truncates it before its next append, so it is simply not an event yet. */
function zstdFrameStarts(buffer) {
  const starts = [];
  for (let index = 0; index + 3 < buffer.length; index++) {
    if (buffer[index] === ZSTD_MAGIC[0] && buffer[index + 1] === ZSTD_MAGIC[1]
      && buffer[index + 2] === ZSTD_MAGIC[2] && buffer[index + 3] === ZSTD_MAGIC[3]) starts.push(index);
  }
  starts.push(buffer.length);
  return starts;
}

/** The usage sample of one settlement line.
 *
 * `assistant/message` carries it in `data.usage`, written after the stream; an
 * `assistant/attempt` carries the same sample as the last `usage` stream chunk.
 * Message text is JSON-escaped, so an unescaped `"usage"` key can only belong to the
 * settlement itself — the last one on the line is the one the projection folds. */
function lastUsageSample(line) {
  const at = line.lastIndexOf(USAGE_LOG_KEY);
  if (at < 0) return undefined;
  const end = line.indexOf('}', at);
  if (end < 0) return undefined;
  try {
    const usage = JSON.parse(line.slice(at + USAGE_LOG_KEY.length - 1, end + 1));
    return typeof usage?.inputTokens === 'number' ? usage : undefined;
  } catch {
    return undefined;
  }
}

/** One log's day records.
 *
 * `YYYY-MM-DD -> { input, output, cacheRead, cacheWrite, calls, hours, models }`: the
 * token buckets the usage panel totals, the settlement count that becomes 消息数, the
 * 24-slot token histogram that names 高峰时段, and the per-model split behind 最常用
 * 模型. The fold repeats the Session projection's own rule — a later settlement for the
 * same (turn, step) replaces the earlier one — so a retried step is counted once and the
 * panel agrees with the Session's own token meter. */
function foldSessionLog(buffer, zlib) {
  const settled = new Map();
  const record = (text) => {
    for (const line of text.split('\n')) {
      const head = USAGE_LOG_EVENT.exec(line);
      if (!head) continue;
      const usage = lastUsageSample(line);
      if (!usage) continue;
      const step = USAGE_LOG_STEP.exec(line);
      settled.set(step ? `${step[1]}/${step[2]}` : `time/${head[1]}`, {
        time: Number(head[1]),
        // Message text is JSON-escaped, so the only unescaped `"model"` on the line is
        // the settlement's own source.
        model: USAGE_LOG_MODEL.exec(line)?.[1] || 'unknown',
        buckets: [
          usage.inputTokens || 0,
          usage.outputTokens || 0,
          usage.cacheReadTokens || 0,
          usage.cacheWriteTokens || 0,
        ],
      });
    }
  };
  if (zlib) {
    const starts = zstdFrameStarts(buffer);
    for (let index = 0; index < starts.length - 1; index++) {
      let text;
      try {
        text = zlib.zstdDecompressSync(buffer.subarray(starts[index], starts[index + 1])).toString('utf8');
      } catch {
        continue;
      }
      record(text);
    }
  } else {
    record(buffer.toString('utf8'));
  }
  const days = new Map();
  for (const { time, model, buckets } of settled.values()) {
    const day = usageDayKey(time);
    const value = days.get(day) || {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0,
      hours: new Array(24).fill(0), models: {},
    };
    value.input += buckets[0];
    value.output += buckets[1];
    value.cacheRead += buckets[2];
    value.cacheWrite += buckets[3];
    value.calls += 1;
    const tokens = buckets[0] + buckets[1] + buckets[2] + buckets[3];
    value.hours[new Date(time).getHours()] += tokens;
    value.models[model] = (value.models[model] || 0) + tokens;
    days.set(day, value);
  }
  return days;
}

/* ------------------------------------------------------------ session cost ---
 *
 * The bottom line's settled amount follows the same rule as the welcome page's usage
 * table, but per settlement rather than per day: fold the stored log's
 * `assistant/message` / `assistant/attempt` samples, price each one at the tier in force
 * when it happened, and let a later sample for the same (turn, step) replace the earlier
 * one. The browser adds the still-running stream on top; this half never guesses it.
 */

const SESSION_COST_CACHE_LIMIT = 128;
/** A Session directory may not exist yet on the first frame; do not walk for it again
 * on every 1.5s request. */
const SESSION_COST_MISS_MS = 2_000;
const sessionCostCache = new Map();
const sessionCostLogs = new Map();

/** One Session's settled cost, in millionths of a yuan. */
function foldSessionCostLog(buffer, zlib) {
  const settled = new Map();
  const record = (text) => {
    let currentModel = null;
    for (const line of text.split('\n')) {
      const head = USAGE_LOG_EVENT.exec(line);
      if (!head) continue;
      const usage = lastUsageSample(line);
      if (!usage) continue;
      const named = USAGE_LOG_MODEL.exec(line)?.[1];
      if (named) currentModel = named;
      const step = USAGE_LOG_STEP.exec(line);
      settled.set(step ? `${step[1]}/${step[2]}` : `time/${head[1]}`, {
        time: Number(head[1]),
        model: currentModel || 'unknown',
        usage: {
          uncachedInputTokens: Number(usage.inputTokens) || 0,
          outputTokens: Number(usage.outputTokens) || 0,
          cacheReadTokens: Number(usage.cacheReadTokens) || 0,
          cacheWriteTokens: Number(usage.cacheWriteTokens) || 0,
        },
      });
    }
  };
  if (zlib) {
    const starts = zstdFrameStarts(buffer);
    for (let index = 0; index < starts.length - 1; index++) {
      let text;
      try {
        text = zlib.zstdDecompressSync(buffer.subarray(starts[index], starts[index + 1])).toString('utf8');
      } catch {
        continue;
      }
      record(text);
    }
  } else {
    record(buffer.toString('utf8'));
  }
  let costMicro = 0;
  let partial = false;
  let last = null;
  for (const event of settled.values()) {
    const cost = usageCostMicro(event.usage, event.model, event.time);
    if (cost === null) partial = true;
    else costMicro += cost;
    if (last === null || event.time >= last.time) last = event;
  }
  return {
    // An unpriced old event must not silently shrink the bill; the client falls back to
    // its projection estimate instead of showing a confidently wrong number.
    costMicro: partial ? null : costMicro,
    partial,
    model: last?.model ?? null,
    settledAt: last?.time ?? null,
  };
}

/** The newest log file for one Session id under `$DSH_HOME/sessions`. */
async function findSessionLog(sessionId) {
  const { fs, path, os } = await bridgeNode();
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const root = path.join(home, 'sessions');
  const held = sessionCostLogs.get(sessionId);
  if (held?.path) {
    try {
      await fs.stat(held.path);
      return held.path;
    } catch {
      sessionCostLogs.delete(sessionId);
    }
  } else if (held && Date.now() - held.at < SESSION_COST_MISS_MS) {
    return null;
  }
  let found = null;
  const walk = async (directory) => {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (!entry.isDirectory()) continue;
      if (entry.name === sessionId) {
        let files;
        try {
          files = await fs.readdir(target, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const file of files) {
          if (!file.isFile() || !USAGE_LOG_NAME.test(file.name)) continue;
          const logPath = path.join(target, file.name);
          let stat;
          try {
            stat = await fs.stat(logPath);
          } catch {
            continue;
          }
          if (found === null || stat.mtimeMs > found.mtimeMs) found = { path: logPath, mtimeMs: stat.mtimeMs };
        }
        continue;
      }
      await walk(target);
    }
  };
  await walk(root);
  sessionCostLogs.set(sessionId, found ? { path: found.path, at: Date.now() } : { path: null, at: Date.now() });
  while (sessionCostLogs.size > SESSION_COST_CACHE_LIMIT) {
    sessionCostLogs.delete(sessionCostLogs.keys().next().value);
  }
  return found?.path ?? null;
}

/** The Host half of the bottom line's money reading. The browser adds the live tail. */
async function sessionCost(sessionId) {
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new GitBridgeError('session', '会话 ID 无效');
  }
  const { fs, zlib } = await bridgeNode();
  const logPath = await findSessionLog(sessionId);
  if (!logPath) return { costMicro: 0, partial: false, model: null, settledAt: null };
  let stat;
  try {
    stat = await fs.stat(logPath);
  } catch {
    return { costMicro: 0, partial: false, model: null, settledAt: null };
  }
  const cached = sessionCostCache.get(sessionId);
  if (cached && cached.path === logPath && cached.size === stat.size && cached.mtimeMs === stat.mtimeMs) {
    return cached.value;
  }
  let buffer;
  try {
    buffer = await fs.readFile(logPath);
  } catch {
    return null;
  }
  const value = foldSessionCostLog(buffer, /\.zstd$/.test(logPath) ? zlib : undefined);
  sessionCostCache.set(sessionId, { path: logPath, size: stat.size, mtimeMs: stat.mtimeMs, value });
  while (sessionCostCache.size > SESSION_COST_CACHE_LIMIT) {
    sessionCostCache.delete(sessionCostCache.keys().next().value);
  }
  return value;
}

/** Per-day usage across the stored Sessions under `sessionsRoot`.
 *
 * `cache` is the last persisted result: a log whose size and modification time still
 * match is not decoded again, which is what makes a restart cost one pass over the
 * files the user actually touched. Returns the aggregate days and the record to
 * persist (one entry per log, so a deleted Session drops out of the archive view). */
async function scanSessions({ sessionsRoot, cache, now = Date.now() }) {
  const { fs, path, zlib } = await bridgeNode();
  const cutoff = now - USAGE_WINDOW_DAYS * 86_400_000;
  const sessions = {};
  const days = new Map();
  const walk = async (directory) => {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) { await walk(target); continue; }
      const log = USAGE_LOG_NAME.exec(entry.name);
      if (!log) continue;
      let stat;
      try {
        stat = await fs.stat(target);
      } catch {
        continue;
      }
      // Every event a log holds was written before its last modification.
      if (stat.mtimeMs < cutoff) continue;
      const key = path.relative(sessionsRoot, target);
      const previous = cache?.sessions?.[key];
      let record = previous && previous.size === stat.size && previous.mtimeMs === stat.mtimeMs ? previous : undefined;
      if (!record) {
        let buffer;
        try {
          buffer = await fs.readFile(target);
        } catch {
          continue;
        }
        record = {
          size: stat.size,
          mtimeMs: stat.mtimeMs,
          days: Object.fromEntries(foldSessionLog(buffer, log[1] ? zlib : undefined)),
        };
        // The Agent loop runs on this thread: yield between logs so a cold scan can
        // never hold a model step for the whole archive.
        await new Promise((resolve) => setImmediate(resolve));
      }
      sessions[key] = record;
    }
  };
  await walk(sessionsRoot);
  for (const [key, record] of Object.entries(sessions)) {
    // The session id is the directory the log lives in; one log is one session.
    const session = path.basename(path.dirname(key));
    for (const [day, value] of Object.entries(record.days)) {
      if (Date.parse(`${day}T00:00:00`) < cutoff) continue;
      const total = days.get(day) || {
        input: 0, output: 0, cached: 0, calls: 0,
        hours: new Array(24).fill(0), models: {}, sessions: [],
      };
      total.input += value.input;
      total.output += value.output;
      total.cached += value.cacheRead + value.cacheWrite;
      total.calls += value.calls;
      for (let hour = 0; hour < 24; hour++) total.hours[hour] += value.hours[hour] || 0;
      for (const [model, tokens] of Object.entries(value.models || {})) {
        total.models[model] = (total.models[model] || 0) + tokens;
      }
      if (!total.sessions.includes(session)) total.sessions.push(session);
      days.set(day, total);
    }
  }
  return { days, sessions };
}

let usageResult;
let usageScan;

/** The bridge action's answer:
 * `{ today, days: [{ day, tokens, input, output, cached, calls, hours, models, sessions }] }`.
 * `tokens` is everything the model processed that day — uncached input, cache traffic
 * and output — which is the number a token meter reports. */
async function dailyUsage() {
  if (usageResult && Date.now() - usageResult.at < USAGE_TTL_MS) return usageResult.value;
  if (!usageScan) {
    usageScan = scanUsageArchive().then((value) => {
      usageResult = { at: Date.now(), value };
      return value;
    }).finally(() => { usageScan = undefined; });
  }
  return usageScan;
}

async function scanUsageArchive() {
  const { fs, path, os } = await bridgeNode();
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const sessionsRoot = path.join(home, 'sessions');
  const cachePath = path.join(home, 'cache', USAGE_CACHE_FILE);
  let cache;
  try {
    cache = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  } catch {
    cache = undefined;
  }
  if (cache?.version !== USAGE_CACHE_VERSION) cache = undefined;
  const { days, sessions } = await scanSessions({ sessionsRoot, cache });
  const value = {
    today: usageDayKey(Date.now()),
    days: [...days.entries()]
      .map(([day, record]) => ({ day, tokens: record.input + record.output + record.cached, ...record }))
      .sort((left, right) => (left.day < right.day ? -1 : 1)),
  };
  // Persist after the answer is built: a failed write only costs the next scan.
  try {
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(`${cachePath}.tmp`, JSON.stringify({ version: USAGE_CACHE_VERSION, sessions }));
    await fs.rename(`${cachePath}.tmp`, cachePath);
  } catch {}
  return value;
}
