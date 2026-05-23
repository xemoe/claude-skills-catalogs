---
name: discover-popular-skills
description: Find the most popular Claude Skills / slash-command repositories on GitHub, present a ranked top-10, and clone the chosen ones into ./vendor as git submodules. Use this whenever the user wants to discover, find, browse, search for, or explore popular Claude skills, Claude Code skills, or skill repositories — phrasings like "find popular Claude skills", "discover skills on GitHub", "what are the most popular Claude Code skills", "show me top Claude skills repos", "vendor a popular skill", or Thai phrasings such as "หา skill ยอดนิยม", "ค้นหา skill บน GitHub", "discover Claude skill ยอดนิยม", "ดู skill ที่คนใช้กันเยอะ". Also use it to refresh the discovery list after the GitHub repos may have changed, or to clone a discovered repo into vendor/. Trigger even when the user does not say "discover" literally but is clearly asking to find or browse popular Claude skills on GitHub.
---

# Discover Popular Skills

This skill helps the user **find popular Claude Skills repositories on GitHub** and vendor the interesting ones into this project's `vendor/` directory. From there the existing `install-vendor-skill` flow takes them the rest of the way (`vendor/` → `~/.claude/skills/`).

It is the missing piece of the existing catalog: the dashboard shows what is *installed*; `install-vendor-skill` installs from what is *already vendored*; **this skill is how new repos get vendored in the first place.**

## How it works — two halves joined through a manifest

The discovery loop has two halves that never call each other — they integrate through a file on disk, the **results manifest**:

1. This skill (Claude Code side) searches GitHub, ranks the top 10 by stars, writes the manifest at `.discover/results.json`, then asks the user to confirm and clones the chosen repos into `vendor/` as git submodules.
2. The `/discover` page in the Skills Lector web app reads that manifest and shows the ranked list with each entry marked *cloned* / *not cloned*. The web app makes **no** outbound calls — the GitHub network call happens only here.

That manifest is the contract between the two halves. Keep its shape stable.

## Helper script

Everything is bundled into one Node script (Node 18+, no dependencies):

```
node .claude/skills/discover-popular-skills/scripts/discover.mjs <command>
```

| Command | What it does |
| --- | --- |
| `search` | Query GitHub, rank the top N (default 10), write the manifest. |
| `clone <name\|all>` | Read the manifest and `git submodule add` the chosen repos into `vendor/`. Skips entries already vendored. |
| `status` | Print the manifest as a ranked list with cloned / not-cloned status. |

Run the script with `--help` for the full option list.

## GitHub API auth

The script prefers the **GitHub CLI** (`gh`) when it is installed and authenticated — that gives you 5000 search-API requests per hour. When `gh` is unavailable or not logged in, it falls back to **unauthenticated `fetch`**, which GitHub rate-limits to ~10 search requests per minute.

- On Windows, the script also probes `C:\Program Files\GitHub CLI\gh.exe` for cases where `gh` is installed but off `PATH`.
- Pass `--no-gh` to force the unauthenticated path (useful when testing the rate-limit branch).
- A rate-limited query is reported clearly and skipped; the run still produces a manifest from any queries that did succeed, with `rateLimited: true` recorded so the UI can show a degraded state.

## Discovering popular skills (typical flow)

1. **Search** — run with no arguments to query GitHub with the default set of topic filters and write the top 10:
   ```
   node .claude/skills/discover-popular-skills/scripts/discover.mjs search
   ```
   Tune the result with `--top <n>` or `--queries q1,q2,...`. The default queries lean on `topic:` filters because the literal phrase "claude skills" returns a lot of unrelated repos.

2. **Show the ranked list to the user.** The script prints rank, full name, stars, description, topics, and a `[vendored]` / `[not vendored]` tag for each entry. Confirm with the user which ones they want to vendor.

3. **Clone** the chosen entries into `vendor/`:
   ```
   node .claude/skills/discover-popular-skills/scripts/discover.mjs clone <name>
   ```
   - Pass a repo name (matches either `owner/repo` or just `repo`).
   - Pass `all` to clone every entry that is not yet vendored.
   - The script invokes `git submodule add` against the repo's `clone_url` and lands it at `vendor/<name>`. The submodule entry is **staged but not committed** — tell the user that and let them commit, unless they ask you to.

4. **Hand off to `install-vendor-skill`** for the `vendor/` → `~/.claude/skills/` step:
   ```
   /vendor-install <skill-name>
   ```

5. **Verify in the catalog** — open `npm run dev`, navigate to `/discover` to see the manifest, and the `Sources` view to see the new submodule listed.

## The `/discover-skills` slash command

The `/discover-skills` slash command (`.claude/commands/discover-skills.md`) is a thin wrapper over this skill — running `/discover-skills` bare triggers a fresh search; arguments like `/discover-skills clone <name>` map to the script's clone subcommand. Use the slash command when the user is doing this interactively at the prompt; use this skill when Claude triggers the workflow itself from a higher-level request.

## The results manifest

Written at `.discover/results.json` at the repo root. The directory is git-ignored — it is a local discovery cache, not a checked-in artifact. The schema is versioned (`schemaVersion: 1`) so it can evolve; the `/discover` page in the web app reads the same JSON, so any breaking field change here needs to be matched in `packages/core/src/discover.ts`.

```jsonc
{
  "schemaVersion": 1,
  "discoveredAt": "2026-05-23T14:30:00.000Z",
  "queries": ["topic:claude-skills", "topic:claude-code"],
  "auth": "gh",            // or "anonymous"
  "rateLimited": false,    // omitted when false
  "entries": [
    {
      "rank": 1,
      "fullName": "owner/repo",
      "owner": "owner",
      "name": "repo",
      "htmlUrl": "https://github.com/owner/repo",
      "cloneUrl": "https://github.com/owner/repo.git",
      "description": "…",
      "stars": 1234,
      "topics": ["claude-skills", "claude-code"],
      "defaultBranch": "main",
      "pushedAt": "2026-05-01T00:00:00Z"
    }
    // ...
  ]
}
```

Notes:

- Vendored status is **not stored** in the manifest. The `/discover` page (and the `status` subcommand) compute it at read time by cross-referencing `.gitmodules`, so the badge stays accurate even when the manifest predates a `clone`.
- Always overwrite the manifest atomically (`writeFileSync` after `mkdirSync` of `.discover/`).

## When the user is just exploring

If the user only wants to browse without cloning anything, run `search --dry-run` — it prints the ranked list without writing the manifest. Useful for "what's out there" questions where the user has not committed to vendoring anything.

## Refreshing a stale manifest

GitHub star counts move. Re-run `search` to overwrite the manifest with a fresh ranking — the existing one is simply replaced.

## Caveats

- GitHub search relevance is noisy. The default queries lean on `topic:claude-skills` and `topic:claude-code` to keep the signal high; widen with `--queries` only if the user complains about missing results.
- The submodule entries are staged, not committed. Surface that fact when you finish, and let the user decide whether to commit and push.
- This repo lives on an exFAT volume on the dev machine — that is fine for `git submodule add` (it stores objects, not symlinks), but the cloned working tree is what `install-vendor-skill` copies later, so a successful clone here is enough.
