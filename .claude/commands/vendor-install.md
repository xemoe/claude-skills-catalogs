---
description: Install a Claude Skill from the vendored repos under ./vendor. Run it without arguments to list what is available.
argument-hint: "[skill-name] [personal|project]"
allowed-tools: Bash(node:*)
disable-model-invocation: true
---

## Skills available under ./vendor

!`node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs list`

## Your task

Install a vendored Claude Skill for the user. Arguments given to this command: **$ARGUMENTS**

Interpret the arguments against the list above:

- **A skill name was given** — install it:
  `node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs install <name> --target <target>`
  - `<target>` defaults to `personal` (`~/.claude/skills/`, usable in every project). Use `project` (`.claude/skills/`, this repo only) when the arguments contain the word `project` or `--target project`.
  - If the requested name is not in the list above, do not guess — tell the user and show the available names.
  - **Never** pass `--force`; that flag has been removed. **Never** add `--on-conflict` on this first attempt — run the bare install and let the conflict detector run.
- **No skill name was given** — show the available skills from the list above, ask which one to install and whether to install it for `personal` (everywhere) or `project` (this repo only), then install it.

### If the script reports a conflict (exit code 2)

If the install fails with a `CONFLICT:` block and a comparison table, **stop**. Do not retry blindly and do not pick a resolution yourself. The default policy is to ask the user to choose:

1. Repeat the script's comparison table to the user verbatim, then ask which resolution they want:
   - **1. Override** — replace the existing install with the new vendor copy.
   - **2. Skip** — keep the existing install untouched.
   - **3. Rename** — install the new copy alongside the existing one under a `<name>-YYYYMMDDTHHMMSS` directory; user manages cleanup later.
2. Only after the user picks, re-run the install with the matching flag:
   - `--on-conflict=override`
   - `--on-conflict=skip`
   - `--on-conflict=rename`
3. When the user is unsure, recommend **skip** or **rename** (both are non-destructive). Do not default to override.

When finished, confirm the installed skill name and where it landed (or that the install was skipped). The user can verify it in the catalog with `npm run dev` then Rescan.

For adding a new skills repository as a submodule, or updating vendored repos, use the `install-vendor-skill` skill.
