---
description: Discover popular Claude Skills repositories on GitHub. Run bare to search and rank the top 10; pass a subcommand to clone one into ./vendor.
argument-hint: "[search|clone <name|all>|status]"
allowed-tools: Bash(node:*), Bash(git:*)
disable-model-invocation: true
---

## Your task

Discover popular Claude Skills repos on GitHub for the user, using the `discover-popular-skills` skill. Arguments given to this command: **$ARGUMENTS**

The helper script is at `.claude/skills/discover-popular-skills/scripts/discover.mjs`. Interpret the arguments:

- **No arguments** — run a fresh search and show the ranked list:
  ```
  node .claude/skills/discover-popular-skills/scripts/discover.mjs search
  ```
  Then summarize the top results to the user and ask which repos (if any) they want to clone into `vendor/`.

- **`clone <name>` or `clone all`** — clone the chosen entries:
  ```
  node .claude/skills/discover-popular-skills/scripts/discover.mjs clone <name>
  ```
  Confirm with the user before running `clone all`. Always remind them that `git submodule add` only stages the change — they need to commit it themselves.

- **`status`** — print the current manifest without re-searching:
  ```
  node .claude/skills/discover-popular-skills/scripts/discover.mjs status
  ```

- **Other / unclear arguments** — pass them through to the script and surface its `--help` output if needed.

When finished, point the user at the `/discover` page in the Skills Lector web app (`npm run dev`) to see the same manifest in the browser, and at `/vendor-install` to install a vendored skill into `~/.claude/skills/`.

For details on tuning queries, the manifest schema, and the GitHub auth behaviour, see the `discover-popular-skills` skill.
