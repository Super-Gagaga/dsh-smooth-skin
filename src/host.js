/**
 * Host half of the Smooth bundle.
 *
 * Besides the launch animation's rows for the served index, this half owns the
 * small Git bridge used by the composer's branch menu. The bridge is deliberately
 * narrow: it can read branches/status and switch or create a branch. It never runs
 * a shell (fixed `git` argv, `execFile`), requires a per-activation capability token,
 * and owns
 * one exact route on the existing web server. When that server is absent, the
 * rows still render and the client menus fall back to their read-only path.
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
    ]).then(([child, fs, path]) => ({ child, fs, path }));
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

async function handleGitRequest(req, res, token) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, x-smooth-token');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST' || req.headers['x-smooth-token'] !== token) {
    sendJson(res, 403, { ok: false, error: { code: 'forbidden', message: 'Git bridge denied the request' } });
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
    } else {
      throw new GitBridgeError('action', '未知的 Git 操作');
    }
    sendJson(res, 200, { ok: true, value });
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      error: {
        code: error.code || 'git',
        message: error.message || 'Git 操作失败',
      },
    });
  }
}

/** The capability token is minted once per Host activation and injected into the
 * index beside this bridge's own loopback origin. A page without the token gets a
 * 403, so a random local page cannot drive Git through the listener. The listener
 * is deliberately private to the plugin: the profile's web carrier may activate
 * after this bundle, and a fixed proxy port avoids relying on its route table. */
let gitServer;
function ensureGitServer(ctx) {
  if (gitServer) return gitServer;
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  let port = 39517;
  let base = '';
  let server;
  // `node:http` arrives asynchronously. A plugin that is disposed before that import
  // resolves must not leave a listener behind that nothing can close, so the flag is
  // checked once it lands: a disposed bridge closes the server instead of listening.
  let disposed = false;
  const listen = () => {
    import('node:http').then(({ createServer }) => {
      if (disposed) return;
      server = createServer((req, res) => handleGitRequest(req, res, token));
      server.on('error', (error) => {
        if (error?.code === 'EADDRINUSE' && port < 39527) {
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
