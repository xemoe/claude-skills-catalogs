---
name: set-model-invocation
description: Inspect and change the `disable-model-invocation` frontmatter of any Claude Skill or slash command — the setting that decides whether Claude may invoke it on its own or only the user can run it via `/`. Use this whenever the user wants to make a skill or command slash-only, stop Claude from auto-invoking one, let Claude invoke one automatically again, toggle or set its model-invocation behaviour, check that setting, or disable model invocation across every skill and command at once to audit them before re-enabling the vetted ones — phrasings like "make the debug skill slash-only", "stop Claude from auto-running X", "disable model invocation for X", "disable model invocation for everything", "turn model invocation off for all skills", "let Claude invoke X on its own again", "set disable-model-invocation on X", or Thai phrasings such as "ทำให้ skill เรียกผ่าน slash เท่านั้น", "ปิด model invocation ของ X", "ปิด model invocation ทั้งหมด", "ห้าม Claude เรียก skill เอง", "เปลี่ยนค่า model invocation ของ X". Trigger even when the user only names the skill/command and the on/off intent without saying "model invocation" literally.
---

# Set Model Invocation

Every Claude **skill** (`SKILL.md`) and **slash command** (`.md`) carries an optional
frontmatter flag, `disable-model-invocation`, that decides **who can invoke it**.
This skill reports that setting for every skill and command and changes it on the
one you name.

## What the setting means

The frontmatter key is phrased as a *negative* — read it carefully:

| `disable-model-invocation` | Who can run it | Catalog badge |
| --- | --- | --- |
| `true` | **slash-only** — only the user, by typing `/name`. Claude never triggers it on its own. | amber slash icon |
| `false` *or absent* | **model-invokable** — Claude may invoke it automatically when its description matches, and the user can still type `/name`. | teal bot icon |

So "turn model invocation **off**" means writing `disable-model-invocation: true`, and
"turn it **on**" means `false` or removing the key. The default (no key) is on.

## Helper script

Every operation goes through one bundled script (no dependencies, Node 18+):

```
node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs <command>
```

That is the path while this skill lives in this repo. If the skill is installed
elsewhere (e.g. `~/.claude/skills/set-model-invocation/`), the script sits at
`scripts/set-model-invocation.mjs` next to this `SKILL.md` — adjust the path.

| Command | What it does |
| --- | --- |
| `list` | List every personal and project skill/command with its current `disable-model-invocation` value. |
| `get <name>` | Show the setting for one skill or command. |
| `set <name> <value>` | Change the setting on one skill or command. |
| `set-all <value>` | Change the setting on **every** personal and project skill and command at once. |

`<value>` for `set` and `set-all` is the literal `disable-model-invocation` value:

| Value | Result |
| --- | --- |
| `true` | slash-only — Claude will not invoke it on its own |
| `false` | model-invokable — the key is written explicitly as `false` |
| `unset` | the key is removed entirely — model-invokable (the default) |
| `toggle` | flip between slash-only and model-invokable (`set` only) |

`set-all` takes `true`, `false`, or `unset` — not `toggle`.

Options: `--type skill|command` disambiguates a name shared by a skill and a
command, or limits `set-all` to one kind; `--dry-run` previews a `set` or
`set-all` without writing any file; `--help` prints full usage.

## Workflow

Always **run `list` first** — it gives you the exact names and current values.

1. **See what exists and its current state:**
   ```
   node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs list
   ```
2. **Confirm the intent.** Map the user's words to a value before editing:
   - "make it slash-only" / "stop Claude invoking it" / "model invocation off" → `true`
   - "let Claude invoke it" / "model invocation on" → `unset` (or `false`)
   - "flip it" / "the opposite" → `toggle`
3. **Change it** — pass a name from the `list` output:
   ```
   node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs set <name> <value>
   ```
   - If a name matches both a skill and a command, the script lists the matches —
     re-run with `--type skill` or `--type command`.
   - If a name is ambiguous across the personal and project directories, the
     script prints both paths — re-run with the full file path instead.
4. **Confirm.** The script prints the before → after state. The user can open the
   catalog (`npm run dev`) and click Rescan to see the badge change.

## Auditing — disable model invocation everywhere, then re-enable the vetted ones

To review every skill and command from a clean slate — nothing model-invokable
until you have approved it — turn the setting off across the board, then switch it
back on only for the ones that pass the audit.

1. **Snapshot first (recommended).** A bulk change touches many files; the
   `track-skill-changes` skill can commit the current `skills/` and `commands/`
   state so the sweep can be diffed or undone.
2. **Preview** with `--dry-run` — it writes nothing and lists every item that would
   change:
   ```
   node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs set-all true --dry-run
   ```
3. **Apply** — every personal and project skill and command becomes slash-only:
   ```
   node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs set-all true
   ```
4. **Audit, then re-enable selectively.** Go through the skills and commands; for
   each one approved, turn model invocation back on individually:
   ```
   node .claude/skills/set-model-invocation/scripts/set-model-invocation.mjs set <name> unset
   ```
   This per-item path is preferred — see the Notes on why `set-all unset` is blunt.

`set-all` accepts `--type skill|command` to scope the sweep and `--dry-run` to
preview; it prints a per-item before → after line and a summary count.

## Notes

- **Scope.** Only the personal (`~/.claude/skills`, `~/.claude/commands`) and the
  current project's (`.claude/skills`, `.claude/commands`) skills and commands are
  scanned and edited. **Plugin skills are left untouched** — they are owned by the
  plugin that ships them and would be overwritten on the next plugin update.
- **In-place edit.** `set` rewrites only the frontmatter of the one file — the body,
  the order of the other keys, the line endings, and any BOM are preserved. If the
  file has no frontmatter block, `set true`/`set false` adds a minimal one.
- **Idempotent.** Running `set` or `set-all` with a value a file already has reports
  "no change" for it and writes nothing.
- **`set-all` is blunt.** `set-all unset` and `set-all false` also clear the flag
  from skills and commands that are *meant* to be slash-only — for example this
  repo's own `/model-invocation` and `/vendor-install`. After a bulk re-enable, set
  those back with `set <name> true`; snapshotting first (step 1 above) makes the
  difference easy to spot.
- The catalog (Skills Lector) reads this frontmatter directly and shows it as the
  model-invocation badge and as a filter — a `list` here and the catalog agree.
