---
name: install-vendor-skill
description: Install Claude Skills that are vendored as git submodules under ./vendor into a skills directory Claude Code scans, so they become usable. Use this whenever the user wants to install, deploy, add, enable, or list a skill from the vendor/ directory or a vendored skills repository (such as 9arm-skills) — phrasings like "install the debug-mantra skill", "list the vendored skills", "add a skill from vendor", "ติดตั้ง skill จาก vendor", "deploy a skill from the submodule", or naming a skill that lives under vendor/. Also use it to vendor a new skills repository as a git submodule under vendor/, or to update vendored repos. Trigger even when the user does not say "vendor" explicitly but is clearly asking to pull in or enable one of the skills that live in this repo's submodules.
---

# Install Vendor Skill

External Claude Skills are vendored into this repo as **git submodules under `vendor/`**. Each submodule is a skills repository (for example `vendor/9arm-skills`). This skill installs an individual skill out of `vendor/` into a directory that Claude Code scans — making it usable — and helps add or update the vendored repos.

## How vendoring works here

- `vendor/<repo>/` is a git submodule pointing at an external GitHub repo.
- A repo holds one or more skills; each skill is a directory containing a `SKILL.md`, often nested (e.g. `vendor/9arm-skills/skills/engineering/debug-mantra/`).
- **Installing a skill means copying that skill directory** into a location Claude Code discovers:
  - **personal** — `~/.claude/skills/` — the skill works in every project.
  - **project** — `<repo>/.claude/skills/` — the skill works only in this repo.
- This repo lives on an exFAT volume, which cannot store symlinks, so installing **copies** the folder rather than linking it. That means an installed skill is a snapshot — re-run install with `--force` to pick up upstream changes.

## Helper script

Listing and installing go through one bundled script. Prefer it over copying files by hand — it finds nested skill directories, resolves name collisions, and computes target paths for you:

```
node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs <command>
```

| Command | What it does |
| --- | --- |
| `list` | Show every skill found under `vendor/` — name, source repo, path, description. |
| `install <name\|path>` | Copy a skill into a target skills directory. |
| `installed` | Show what is already installed at a target. |

Run the script with `--help` for the full option list. It needs no dependencies (Node 18+, already required by this project).

## Installing a skill from vendor/

**Quick path:** the `/vendor-install [skill-name]` slash command (defined in `.claude/commands/vendor-install.md`) wraps this whole section — it lists the vendored skills and installs the one you name. Use the manual steps below when you need finer control, such as a custom `--target` path or `--as`.

1. **List what is available** — run `list` first so you have exact skill names and paths:
   ```
   node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs list
   ```
2. **Choose the target.** Default is `personal` (`~/.claude/skills/`, usable everywhere). Use `--target project` to scope the skill to this repo only. If the user has not said which they want, ask — `personal` vs `project` decides where the skill is usable.
3. **Install** — pass a plain skill name from the `list` output:
   ```
   node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs install <name> --target personal
   ```
   - If a name is ambiguous, the script prints the matching paths — re-run `install` with one of those paths.
   - Add `--force` to overwrite an existing install (use this to refresh a skill after its submodule was updated).
   - Add `--as <name>` to install under a different directory name.
4. **Confirm** — run `installed --target <same target>`, or open the catalog (`npm run dev`) and click Rescan to see it listed.

## Adding a new skills repo as a submodule

To vendor another skills repository:

```
git submodule add <repo-url> vendor/<short-name>
```

- Derive `<short-name>` from the repo — e.g. `git@github.com:thananon/9arm-skills.git` becomes `vendor/9arm-skills`.
- This stages `.gitmodules` and the new submodule entry. Tell the user the changes are staged and let them commit — do not commit on their behalf unless they ask.
- Anyone who clones this repo afterwards must run `git submodule update --init --recursive` to populate `vendor/`.

## Updating vendored repos

Pull the latest upstream commits for a vendored repo:

```
git submodule update --remote vendor/<short-name>
```

Then re-run `install <name> --force` for any skill you had already installed, so the installed copy reflects the update.

## Notes

- Installed skills are plain copies: editing a copy does not change the vendored source, and updating a submodule does not change an already-installed copy.
- Each install writes a `.vendor-source.json` marker into the installed copy, recording the origin repo, the path within it, and the pinned commit. Skills Lector reads this marker so an installed skill shows its real GitHub source instead of a bare local path.
- `list` reads each skill's frontmatter directly from `vendor/`; a skill does not have to be installed to appear there.
