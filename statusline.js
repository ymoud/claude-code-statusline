// yline: a Claude Code status line with folder, git branch, model + effort, context usage, plan usage limits.
// Reads the session JSON on stdin and prints one row, or two when one would not fit the terminal: where Claude is and which model, then context and limits. Wired up in ~/.claude/settings.json.
const fs = require('fs');
const os = require('os');
const path = require('path');

// Settings from ~/.claude/yline.json, read on every refresh so a change shows at once.
// A missing file, broken JSON or a missing key falls back to the default: bars on, folder as a path.
function settings() {
  let user = {};
  try { user = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude', 'yline.json'), 'utf8')) || {}; } catch {}
  const bars = user.bars && typeof user.bars === 'object' ? user.bars : {};
  return {
    bars: { ctx: bars.ctx !== false, '5h': bars['5h'] !== false, '7d': bars['7d'] !== false },
    folder: user.folder === 'name' ? 'name' : 'path',
  };
}
const CONFIG = settings();

const C = { dim: '\x1b[2m', reset: '\x1b[0m', cyan: '\x1b[36m', magenta: '\x1b[35m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m' };
const paint = (color, text) => `${color}${text}${C.reset}`;
const rgb = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

// The colors Claude Code's own /effort menu gives each level, from its dark theme: warning, success, permission and auto-accept.
// "max" is an animated rainbow there; a status line cannot animate, so it gets the rainbow's first colors, one per letter.
const EFFORT = { low: rgb(255, 193, 7), medium: rgb(78, 186, 101), high: rgb(177, 185, 249), xhigh: rgb(208, 180, 255) };
const RAINBOW = [rgb(235, 95, 87), rgb(250, 195, 95), rgb(145, 200, 130)];
const effortText = level =>
  level === 'max'
    ? [...level].map((ch, i) => paint(RAINBOW[i % RAINBOW.length], ch)).join('')
    : paint(EFFORT[level] || EFFORT.high, level);
const byLevel = pct => (pct >= 80 ? C.red : pct >= 50 ? C.yellow : C.green);
const SEP = paint(C.dim, ' │ ');
// Columns kept free for the space Claude Code puts around the status line.
const MARGIN = 2;

// Visible width: drop the color codes; every symbol used here takes one column.
const width = text => [...text.replace(/\x1b\[[0-9;]*m/g, '')].length;

function folder(ws, cwd) {
  const dir = (ws && ws.current_dir) || cwd || process.cwd();
  const root = ws && ws.project_dir;
  if (CONFIG.folder === 'path' && root && dir !== root) {
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

// Ten blocks, one per 10%.
const bar = pct => {
  const filled = Math.min(10, Math.max(0, Math.round(pct / 10)));
  return '▰'.repeat(filled) + '▱'.repeat(10 - filled);
};
// A part's percentage, after its bar unless the settings turn that part's bar off.
const meter = (part, pct) => (CONFIG.bars[part] ? `${bar(pct)} ${pct}%` : `${pct}%`);

const kTokens = n => (n >= 1e6 ? +(n / 1e6).toFixed(1) + 'M' : Math.round(n / 1e3) + 'k');

function context(cw) {
  if (!cw || cw.used_percentage == null) return paint(C.dim, 'ctx –');
  const pct = Math.round(cw.used_percentage);
  const u = cw.current_usage;
  const used = u
    ? (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0)
    : cw.total_input_tokens || 0;
  const size = cw.context_window_size ? `/${kTokens(cw.context_window_size)}` : '';
  return `ctx ${paint(byLevel(pct), meter('ctx', pct))} ${paint(C.dim, `${kTokens(used)}${size}`)}`;
}

// Time until a window resets, from its Unix epoch seconds: the two largest units that are not zero ("2h 15m", "1d 5h", "40m"),
// or days alone once more than two remain, when the hours no longer matter.
function untilReset(at) {
  if (!at) return null;
  const mins = Math.ceil(Math.max(0, at - Date.now() / 1000) / 60);
  const d = Math.floor(mins / 1440), h = Math.floor(mins / 60) % 24, m = mins % 60;
  if (d > 2) return `${d}d`;
  const units = [[d, 'd'], [h, 'h'], [m, 'm']].filter(([n]) => n);
  return units.length ? units.slice(0, 2).map(([n, u]) => n + u).join(' ') : 'now';
}

function limits(rl) {
  if (!rl) return [];
  return [['5h', rl.five_hour], ['7d', rl.seven_day]]
    .filter(([, v]) => v && v.used_percentage != null)
    .map(([label, v]) => {
      const reset = untilReset(v.resets_at);
      const pct = Math.round(v.used_percentage);
      return `${label} ${paint(byLevel(v.used_percentage), meter(label, pct))}` + (reset ? ' ' + paint(C.dim, `↻ ${reset}`) : '');
    });
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
  // The effort level sets how much the model reasons, so it keeps the color Claude Code gives it rather than a dim one.
  const who = model + (effort ? paint(C.dim, ' · ') + effortText(effort) : '');

  // One row when it fits, else two, so a long folder path never pushes the usage figures off screen.
  // Claude Code captures the output, so the terminal width comes from COLUMNS. With no width known, two rows are the safe choice.
  const rows = [[where, who], [context(s.context_window), ...limits(s.rate_limits)]].map(r => r.filter(Boolean).join(SEP));
  const oneRow = rows.join(SEP);
  const cols = Number(process.env.COLUMNS) || process.stdout.columns;
  process.stdout.write(cols && width(oneRow) <= cols - MARGIN ? oneRow : rows.join('\n'));
});
