---
name: track-skill-changes
description: Version-control the Claude skills and slash commands directories with git — set up a tracking repository over the skills/ and commands/ folders, review what changed, and commit snapshots so the history is preserved. Use this whenever the user wants to track, version, snapshot, back up, or review the history of their installed skills or slash commands — phrasings like "track my skills with git", "set up git for .claude/skills and .claude/commands", "commit my command changes", "what skills changed", "init a repo for my skills", "snapshot my Claude setup", or Thai phrasings such as "track การเปลี่ยนแปลง skill/command ด้วย git", "สร้าง git repo ให้ skills", "commit การเปลี่ยนแปลง skill". Trigger even when the user does not say "git" explicitly but clearly wants a history of, or a way to save, changes to their skills or commands.
---

# Track Skill Changes

Your Claude **skills** (`~/.claude/skills/`) and **slash commands** (`~/.claude/commands/`) change over time — you install, edit, and remove them — but nothing records that history. This skill puts those two directories under **git** so every change can be reviewed and committed as a snapshot.

## How tracking works here

- The tracking **git repository lives at the Claude config directory itself** — `~/.claude` (or `$CLAUDE_CONFIG_DIR`, or a directory passed with `--dir`).
- Its `.gitignore` is written to **scope version control to `skills/` and `commands/` only**. Everything else in `~/.claude` — `projects/`, `plugins/`, session data, settings — stays ignored and untracked.
- One repo, one history, covering exactly the skills and commands the user cares about.
- The repo is **local only** — there is no remote and nothing is ever pushed.

## Helper script

Every operation goes through one bundled script (no dependencies, Node 18+):

```
node .claude/skills/track-skill-changes/scripts/git-track.mjs <command>
```

That is the path while this skill lives in this repo. If the skill is installed elsewhere (e.g. `~/.claude/skills/track-skill-changes/`), the script is at `scripts/git-track.mjs` relative to this `SKILL.md` — adjust the path accordingly.

| Command | What it does |
| --- | --- |
| `status` | Report whether tracking is set up and list what changed since the last snapshot. |
| `init` | Create the tracking git repo and its `.gitignore`, then make the first snapshot. Safe to re-run. |
| `commit ["message"]` | Stage the current `skills/` and `commands/` state and commit it. |
| `log [count]` | List recent snapshots (default 15). |

Option `--dir <path>` points every command at a directory other than `~/.claude` (rarely needed). Run the script with `--help` for the full option list.

## Workflow

Always **run `status` first** — it tells you which step applies next.

1. **Check the state:**
   ```
   node .claude/skills/track-skill-changes/scripts/git-track.mjs status
   ```
2. **If status says tracking is not set up** — initialize it:
   ```
   node .claude/skills/track-skill-changes/scripts/git-track.mjs init
   ```
   This writes the `.gitignore`, runs `git init`, and commits an initial snapshot of whatever skills and commands exist now.
3. **If status lists changes** — review them with the user, then commit. Pass a short message describing what actually changed:
   ```
   node .claude/skills/track-skill-changes/scripts/git-track.mjs commit "Add the pdf-tools skill, update the deploy command"
   ```
   If the message is omitted, the script generates one from the changed files.
4. **To see history** at any time:
   ```
   node .claude/skills/track-skill-changes/scripts/git-track.mjs log
   ```

If `status` reports a clean working tree, there is nothing to commit — say so and stop.

## Notes

- **`init` is idempotent.** If the repo already exists it reports that and does nothing destructive. It never overwrites an existing `.gitignore`.
- **Commit identity.** If no global git `user.name` / `user.email` is set, the script commits with a local fallback identity (`Claude Skills Tracker`) so the commit still succeeds — it never changes the user's global git config.
- **Nested repos are refused.** If the config directory is already inside another git repo, the script will not operate there — those files are already versioned by that repo.
- **What is tracked:** only `skills/` and `commands/` under the config directory. Plugins, session data, and settings are deliberately left out.
- Proactively suggest a `commit` after any noticeable change to skills or commands — installing, editing, or removing one — so the history stays useful.
