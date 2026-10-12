# claude-code-statusline

A status line for [Claude Code](https://claude.com/claude-code). It shows where Claude is working, which model it uses, how full the context window is, and how much of your plan's usage limits you have spent.

```
my-app/web/…/components ⎇ main │ Opus 5.5 · high
ctx ▰▰▱▱▱▱▱▱▱▱ 16% 162k/1M │ limits 5h 16% · 7d 28%
```

On a terminal wide enough to show everything, the two rows join into one.

## What it shows

| Part | Meaning |
| --- | --- |
| `my-app/web/…/components` | Claude's current folder, starting from the folder you launched Claude Code in. It follows Claude when it changes directory. Paths deeper than three folders keep the first two and the last. |
| `⎇ main` | The git branch of the repo that holds the current folder. Read straight from `.git/HEAD`, so no `git` process runs on every refresh. A detached HEAD shows the short commit hash. |
| `Opus 5.5 · high` | The model and its reasoning effort. |
| `ctx ▰▰▱▱▱▱▱▱▱▱ 16% 162k/1M` | How much of the context window is used: bar, percentage, tokens used out of the window size. |
| `limits 5h 16% · 7d 28%` | How much of your plan's 5-hour and 7-day usage limits you have used. Shown only when Claude Code reports them. |

Percentages are green below 50%, yellow from 50% and red from 80%.

## Requirements

- [Node.js](https://nodejs.org/) on your `PATH`.
- [Git](https://git-scm.com/), if you install by cloning.
- Claude Code. Tested on version 2.1.296 on Windows 11.

## Install

Either way, the bar appears on its next refresh, without a restart. The `~` in the `command` works on Windows too.

### Option 1: clone the repo (recommended)

Claude Code runs the script straight from your clone, so a `git pull` is all it takes to get updates.

1. Clone the repo. This command works in bash, zsh and PowerShell:

   ```sh
   git clone https://github.com/ymoud/claude-code-statusline.git $HOME/claude-code-statusline
   ```

2. Add this block to `~/.claude/settings.json`, next to your existing settings:

   ```json
   "statusLine": {
     "type": "command",
     "command": "node ~/claude-code-statusline/statusline.js",
     "padding": 0,
     "refreshInterval": 2
   }
   ```

   If you cloned somewhere else, put that path in `command`. On Windows, write it with forward slashes, e.g. `node C:/dev/claude-code-statusline/statusline.js`.

   Claude Code does not re-run the script when you resize the terminal. `refreshInterval` re-runs it every 2 seconds, so the line switches between one and two rows shortly after a resize. Without it, the switch waits for the next reply from Claude.

To update, pull the latest version. The bar uses it from its next refresh:

```sh
git -C $HOME/claude-code-statusline pull
```

### Option 2: download the single file

1. Download `statusline.js` into your Claude Code folder.

   macOS / Linux:

   ```sh
   curl -o ~/.claude/statusline.js https://raw.githubusercontent.com/ymoud/claude-code-statusline/main/statusline.js
   ```

   Windows (PowerShell):

   ```powershell
   Invoke-WebRequest https://raw.githubusercontent.com/ymoud/claude-code-statusline/main/statusline.js -OutFile "$HOME\.claude\statusline.js"
   ```

2. Add the block from option 1 to `~/.claude/settings.json`, with this command instead:

   ```json
   "command": "node ~/.claude/statusline.js",
   ```

To update, download the file again.

### If the bar stays empty

Run the script in a terminal (bash, zsh or PowerShell), with the path you used:

```sh
echo {} | node $HOME/claude-code-statusline/statusline.js
```

It should print one or two short rows, starting with the current folder. An error there means Node.js is missing or the file is not where the command points.

## Customize

The colors and the 50% / 80% thresholds sit at the top of `statusline.js`, and each part of the line has its own small function. If you cloned the repo, your own edits can conflict with the next `git pull`. Fork it instead if you want to keep a version of your own.

## License

[MIT](LICENSE)
