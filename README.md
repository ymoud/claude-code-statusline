# claude-code-statusline

A status line for [Claude Code](https://claude.com/claude-code). It shows where Claude is working, which model it uses, how full the context window is, and how much of your plan's usage limits you have spent.

```
my-app/web/…/components ⎇ main │ Opus 5.5 · high │ ctx ▰▰▱▱▱▱▱▱▱▱ 16% 162k/1M │ limits 5h 16% · 7d 28%
```

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
- Claude Code. Tested on version 2.1.296 on Windows 11.

## Install

1. Download `statusline.js` into your Claude Code folder.

   macOS / Linux:

   ```sh
   curl -o ~/.claude/statusline.js https://raw.githubusercontent.com/ymoud/claude-code-statusline/main/statusline.js
   ```

   Windows (PowerShell):

   ```powershell
   Invoke-WebRequest https://raw.githubusercontent.com/ymoud/claude-code-statusline/main/statusline.js -OutFile "$HOME\.claude\statusline.js"
   ```

2. Add this block to `~/.claude/settings.json`, next to your existing settings:

   ```json
   "statusLine": {
     "type": "command",
     "command": "node ~/.claude/statusline.js",
     "padding": 0
   }
   ```

   The same command works on Windows. The bar appears on the next refresh, without a restart.

If the bar stays empty, run `echo {} | node $HOME/.claude/statusline.js` in a terminal (bash, zsh or PowerShell). It should print a short line with the current folder. An error there means Node.js is missing or the file is not where the command points.

## Customize

The colors and the 50% / 80% thresholds sit at the top of `statusline.js`, and each part of the line has its own small function.

## License

[MIT](LICENSE)
