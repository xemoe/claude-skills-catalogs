---
description: Change whether a Claude Skill or slash command can be invoked by the model on its own, or only by the user via `/` — one item, or all of them at once for an audit. Run it without arguments to list every skill and command with its current setting.
argument-hint: "[name|all] [on|off|toggle]"
allowed-tools: Bash(node:*)
disable-model-invocation: true
---

## Model invocation status of every skill and command

!`node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs list`

## Your task

Change the model-invocation setting of a skill or command for the user. Arguments
given to this command: **$ARGUMENTS**

The frontmatter key `disable-model-invocation: true` makes a skill or command
**slash-only** — the user must type `/name` and Claude never triggers it on its
own. Absent or `false`, Claude may invoke it automatically. The list above shows
the current state of each one.

Interpret the arguments against that list:

- **The name is `all` or `everything`** — this is a bulk change across every
  personal and project skill and command, for auditing model invocation from a
  clean slate. Preview it, then apply:
  - Preview (writes nothing): `node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs set-all <value> --dry-run`
  - Apply: `node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs set-all <value>`
  - Map the intent to `<value>`: `off`/`disable` → `true` (everything becomes slash-only); `on`/`enable` → `unset` (everything model-invokable again).
  - Always show the dry-run preview before applying. If `all` was given with no on/off intent, ask which way first.
  - After disabling everything, the user re-enables the vetted ones one at a time with the per-name `set` form below — that is the point of the audit.
- **A name and an on/off intent were given** — apply it with the helper script:
  `node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs set <name> <value>`
  Map the intent to `<value>`:
  - `on`, `enable`, "let the model invoke it" → `unset` (removes the key — the default, model-invokable)
  - `off`, `disable`, "slash-only", "stop the model invoking it" → `true`
  - `toggle`, "flip", "the opposite" → `toggle`
  - A literal `true`, `false`, or `unset` → pass it straight through.
  - If the name is not in the list above, do not guess — tell the user and show the available names.
  - If the script reports the name is ambiguous, re-run it with `--type skill` or `--type command`, or the full file path it printed.
- **Only a name was given** — show that item's current setting from the list, ask whether to turn model invocation `on` or `off`, then apply it.
- **No arguments were given** — show the list above and ask which skill or command to change, and to what.

When finished, confirm the item and its new state, and note that the user can see
the badge change in the catalog after a Rescan (`npm run dev`).

For the full explanation of the setting, or to check it across many skills, use
the `set-model-invocation` skill.
