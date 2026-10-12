// Claude Code status line: folder, git branch, model + effort, context usage, plan usage limits.
// Reads the session JSON on stdin and prints two rows: where Claude is and which model, then context and limits. Wired up in ~/.claude/settings.json.
const fs = require('fs');
const path = require('path');

const C = { dim: '\x1b[2m', reset: '\x1b[0m', cyan: '\x1b[36m', magenta: '\x1b[35m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m' };
const paint = (color, text) => `${color}${text}${C.reset}`;
const byLevel = pct => (pct >= 80 ? C.red : pct >= 50 ? C.yellow : C.green);
const SEP = paint(C.dim, ' │ ');

function folder(ws, cwd) {
  const dir = (ws && ws.current_dir) || cwd || process.cwd();
  const root = ws && ws.project_dir;
  if (root && dir !== root) {
    const rel = path.relative(root, dir);
    if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
      // Deep paths keep the launch folder, the project and the last folder: a/b/…/z.
      const parts = [path.basename(root), ...rel.split(path.sep)];
      return (parts.length > 3 ? [parts[0], parts[1], '…', parts[parts.length - 1]] : parts).join('/');
    }
  }
  return path.basename(dir) || dir;
}

// Reads .git/HEAD directly: no git process, so the line stays fast.
function gitBranch(dir) {
  for (let d = dir; d; ) {
    const dotGit = path.join(d, '.git');
    try {
      let gitDir = dotGit;
      if (fs.statSync(dotGit).isFile()) {
        const m = fs.readFileSync(dotGit, 'utf8').match(/gitdir:\s*(.+)/);
        if (!m) return null;
        gitDir = path.resolve(d, m[1].trim());
      }
      const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
      const ref = head.match(/^ref: refs\/heads\/(.+)$/);
      return ref ? ref[1] : head.slice(0, 7);
    } catch {
      const parent = path.dirname(d);
      d = parent === d ? null : parent;
    }
  }
  return null;
}

const kTokens = n => (n >= 1e6 ? +(n / 1e6).toFixed(1) + 'M' : Math.round(n / 1e3) + 'k');

function context(cw) {
  if (!cw || cw.used_percentage == null) return paint(C.dim, 'ctx –');
  const pct = Math.round(cw.used_percentage);
  const filled = Math.min(10, Math.round(pct / 10));
  const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
  const u = cw.current_usage;
  const used = u
    ? (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0)
    : cw.total_input_tokens || 0;
  const size = cw.context_window_size ? `/${kTokens(cw.context_window_size)}` : '';
  return `ctx ${paint(byLevel(pct), `${bar} ${pct}%`)} ${paint(C.dim, `${kTokens(used)}${size}`)}`;
}

function limits(rl) {
  if (!rl) return null;
  const parts = [['5h', rl.five_hour], ['7d', rl.seven_day]]
    .filter(([, v]) => v && v.used_percentage != null)
    .map(([label, v]) => `${label} ${paint(byLevel(v.used_percentage), Math.round(v.used_percentage) + '%')}`);
  return parts.length ? 'limits ' + parts.join(paint(C.dim, ' · ')) : null;
}

let raw = '';
process.stdin.on('data', c => (raw += c));
process.stdin.on('end', () => {
  let s = {};
  try { s = JSON.parse(raw); } catch {}
  const dir = (s.workspace && s.workspace.current_dir) || s.cwd || process.cwd();
  const branch = gitBranch(dir);
  const where = paint(C.cyan, folder(s.workspace, s.cwd)) + (branch ? ' ' + paint(C.magenta, '⎇ ' + branch) : '');

  // The context window size already shows in the ctx part, so drop "(1M context)" from the name.
  const model = ((s.model && s.model.display_name) || '').replace(/\s*\([^)]*context\)/i, '');
  const effort = s.effort && s.effort.level;
  const who = model + (effort ? paint(C.dim, ' · ' + effort) : '');

  // Two rows: a long folder path would otherwise push the usage figures off a laptop-width terminal.
  const rows = [[where, who], [context(s.context_window), limits(s.rate_limits)]];
  process.stdout.write(rows.map(r => r.filter(Boolean).join(SEP)).join('\n'));
});
