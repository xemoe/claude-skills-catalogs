# Changelog

All notable changes to Skills Lector are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-05-23

Skills + Commands presets — the first mutating feature in the catalog.
Bundle skills and commands per workflow, switch between them in one
click, with an audit trail.

### Added

- **Preset engine** — `packages/presets/src/`, the only mutating surface
  in the project. SQLite (better-sqlite3) at `~/.skills-lector/presets.db`
  stores preset definitions, items, pinned items, an apply audit trail,
  and a singleton active-preset row. Schema migrations are forward-only
  and idempotent. The bare `applyPreset()` function reads preset + pinned
  state, scans personal-scope items via `packages/core`, computes a diff
  with the pure `computeApplyDiff()`, then writes each item's
  `disable-model-invocation` frontmatter atomically (temp file +
  rename — exFAT-safe).
- **`/presets` catalog UI** — list page with active card and pinned
  panel, empty-state onboarding wizard, standalone `/presets/new` wizard,
  `/presets/[id]` detail with add/remove items, archive/unarchive, and a
  dry-run confirmation dialog before every activate. `/presets/log`
  surfaces the apply audit trail with expandable per-item detail.
- **TanStack Query** — first use in the project. Used exclusively under
  `/presets/*`; existing catalog pages keep their Server-Component
  pattern. `apps/web/app/providers.tsx` wraps the root layout.
- **SSE progress** — `POST /api/presets/[id]/activate/stream` emits
  per-phase events (scanning / enabling / disabling / logging / done).
  UI uses simple JSON for < 4 changes; switches to the SSE stream + a
  progress modal at or above the threshold.
- **Soft delete only** — presets and pinned items have an `archived_at`
  column; the UI exposes Active/Archived tabs and no hard-delete path.
- **`Presets` nav link** added between `Hooks` and `Analytics`. Bilingual
  `nav.presets` + full `presetsPage` content in `en` and `th` dictionaries.

### Architecture

- New `packages/presets` package consumed by `apps/web` via TS path
  alias `@lector/presets/*`. `packages/core` stays read-only.
- New env-var overrides: `SKILLS_LECTOR_PRESETS_DB` (DB file path),
  `SKILLS_LECTOR_PERSONAL_ROOT` (apply target root). Both also overridable
  via `skills-lector.config.json`. For tests against a fake `~/.claude`,
  set `CLAUDE_CONFIG_DIR` to the same root so the `packages/core`
  scanner matches the apply target.
- Crash recovery is implicit — fs is the source of truth; the next apply
  recomputes the diff from current state and converges.

### Documentation

- `CLAUDE.md` documents the preset engine pipeline alongside the skill,
  command, and hook pipelines.
- `docs/superpowers/specs/2026-05-23-skills-commands-preset-design.md` is
  the design spec.

## [0.4.0] - 2026-05-23

Hooks visibility — the catalog gains a third scanner so every Claude Code
hook configured on the machine is discoverable in one place.

### Added

- **Hooks scan** — `packages/core/src/hook-scanner.ts` exposes `scanHooks()`,
  the third entry point alongside `scanSkills()` and `scanCommands()`. Reads
  Claude Code hook configurations out of `settings.json` files across four
  scopes: personal (`~/.claude/settings.json`), each installed plugin's
  `settings.json`, per-project `.claude/settings.json`, and per-project
  `.claude/settings.local.json` (the git-ignored, machine-specific `local`
  scope). Cached in-process for 8 seconds with a `{ force: true }` bypass,
  consistent with the skill and command scans.
- **Hook parser** — `packages/core/src/hook-parser.ts` reads **only** the
  `hooks` key from a settings file (every other field is ignored) and
  flattens its nested `{ event → matcher group → command entry }` shape
  into one `Hook` record per `{ event, matcher, command }`, tagged with the
  source file's mtime and size. JSON parse failures and unknown event names
  degrade into the result's `errors` list rather than crashing the scan.
- **`Hook` / `HookScanResult` types** added to `packages/core/src/types.ts`,
  with the per-OS settings-file locations centralized in
  `packages/core/src/claude-paths.ts`.
- **Hooks catalog UI** — `/hooks` list page (`apps/web/app/hooks/page.tsx`),
  `/hooks/[id]` detail page, and `hooks-explorer.tsx` client component
  (search / filter / sort), all mirroring the Skills and Commands catalogs.
  Each row shows the event, matcher, command, scope, source settings file,
  and last-changed time.
- **`/api/hooks` route** — returns the scan result as JSON; honours
  `?force=1`. The Rescan button now force-refreshes hooks alongside skills
  and commands.
- **Hook stat cards** — `components/hook-stat-cards.tsx` for the dashboard.
- **Bilingual `/hooks` page** — `nav.hooks` label and the `hooksPage`
  content keys added to both `en` and `th` dictionaries.

### Documentation

- `CLAUDE.md` documents the hook scan pipeline alongside the skill and
  command pipelines.

## [0.3.0] - 2026-05-23

Discovery — a Claude Code skill finds the most popular Claude Skills
repositories on GitHub, and a new `/discover` web page surfaces the ranked
list with each repo's vendoring status.

### Added

- **`discover-popular-skills` skill** — `.claude/skills/discover-popular-skills/`
  with a helper at `scripts/discover.mjs` (Node 18+, no dependencies). The
  `search` subcommand queries the GitHub REST search API for the most
  popular Claude Skills / slash-command repositories, deduplicates and ranks
  the top 10 by star count, and writes the result to `.discover/results.json`
  at the repo root. The `clone` subcommand `git submodule add`s the chosen
  repos into `vendor/` after confirmation. Prefers `gh api` when the GitHub
  CLI is available (5000 req/hr) and falls back to unauthenticated `fetch`
  (~10 req/min for search), reporting `rateLimited` in the manifest when
  GitHub throttles a run. Probes `C:\Program Files\GitHub CLI\gh.exe` on
  Windows for off-PATH installs.
- **`/discover-skills` slash command** — `.claude/commands/discover-skills.md`,
  a thin wrapper over the discover skill mirroring how `/vendor-install`
  wraps `install-vendor-skill`.
- **Discover results manifest** — JSON file at `.discover/results.json`
  (git-ignored — a local discovery cache), pinned to `schemaVersion: 1`.
  Documented as `DiscoverManifest` / `DiscoverEntry` / `DiscoverItem` /
  `DiscoverResult` in `packages/core/src/types.ts`; the discover skill's
  `SKILL.md` carries the canonical JSON sample.
- **Discover manifest reader** — `packages/core/src/discover.ts` walks up
  from `cwd` to find the repo root (the web app's cwd is `apps/web/`),
  reads `.discover/results.json`, validates each entry leniently (bad rows
  surface in `errors` instead of crashing the read), and cross-references
  `.gitmodules` to annotate each entry with `vendored` / `vendorPath`.
  Cached for 8 seconds, invalidated whenever the manifest's mtime changes.
- **`/discover` page** — `apps/web/app/discover/page.tsx`, a dynamic Server
  Component that renders the ranked top 10 with _vendored_ / _not vendored_
  badges, the queries that produced the list, a rate-limited warning when
  GitHub throttled the run, and what-next / refresh-command cards. Shows a
  helpful empty state pointing the user at `/discover-skills` when no
  manifest exists yet.
- **`/api/discover` route** — returns the discover result as JSON.
- **Bilingual `/discover` page** — `nav.discover` label and the
  `discoverPage` content keys added to both `en` and `th` dictionaries.
- **Vendored discovery seed** — `vendor/gstack` and
  `vendor/ui-ux-pro-max-skill` submodules added by running
  `/discover-skills clone` against the freshly-shipped flow.

### Architecture

- The outbound GitHub network call stays exclusively inside the Claude Code
  skill's helper script. The Next.js server still makes no external calls —
  the README's "nothing leaves your computer" promise for the web app
  continues to hold.

### Documentation

- `CLAUDE.md` documents the discover skill, the slash command, and the
  manifest reader; `.gitignore` adds `.discover/`.

## [0.2.0] - 2026-05-23

Onboarding — a long-form `/usecase` page on-boards visitors unfamiliar
with Claude Skills and slash commands, plus two security fixes that landed
in the same release window.

### Added

- **`/usecase` guideline page** — `apps/web/app/usecase/page.tsx`, a dynamic
  Server Component sibling of `/skills`, `/commands`, `/analytic`, `/graph`,
  and `/sources`. Covers what a Claude Skill is and how it differs from a
  slash command (including model invocation), where each scope lives
  (personal / plugin / project / local), a short tour of the five catalog
  views, four worked examples (install a vendored skill with
  `/vendor-install`, author a `SKILL.md`, author a slash command, find
  popular skills via `/discover`), and a newcomer FAQ. Long-form layout
  uses a sticky anchored table of contents; code samples reuse `Markdown`,
  `InlineCode`, and `CopyButton`.
- **`/usecase` nav link** — added to `LINKS` in
  `apps/web/components/main-nav.tsx`.
- **Bilingual `/usecase` page** — `nav.usecase` label and the full
  `usecasePage` content section added to both `en` and `th` dictionaries
  (the `Dictionary` shape is enforced by `typeof en`, so both stay in lockstep).

### Security

- **Override `postcss` to `^8.5.10`** to remediate GHSA-qx2v-qp2m-jg93.
- **Use exact host match for GitHub URLs** in the source-link logic to fix
  CodeQL alert #1 (incomplete URL substring sanitization).

## [0.1.0] - 2026-05-23

First tagged release. The catalog ships as a local-only Next.js dashboard over
two parallel filesystem scanners, with no external network calls.

### Added

- **Skills scan** — recursive scanner (`packages/core/src/scanner.ts`) that walks
  personal (`~/.claude/skills`), plugin (`~/.claude/plugins`), Agent/Cowork
  session, project (`.claude/skills` for projects in `~/.claude.json`), and
  bundled-sample roots, parses every `SKILL.md`, classifies it as
  `personal | plugin | project | local`, resolves its source via git remotes
  (GitHub repo / other remote / local directory), attaches usage counts from
  `~/.claude.json`, and deduplicates by logical identity. Results are cached
  in-process for 8 seconds with a `{ force: true }` bypass.
- **Slash command scan** — parallel scanner (`packages/core/src/command-scanner.ts`)
  for Claude Code slash commands across personal, plugin, and project roots.
  Subdirectories under `commands/` become a `:` namespace in the command name.
- **Web app routes** in `apps/web` — Skills catalog at `/` and `/skills/[id]`,
  Commands catalog at `/commands` and `/commands/[id]`, plus `/analytic`,
  `/graph`, and `/sources` views.
- **JSON API** — `GET /api/skills` and `GET /api/commands` return the scan
  results as JSON; both honour `?force=1`. `GET /api/activity` exposes the
  activity timeline used by the Analytics view.
- **Rescan** — force-refreshes both scans and re-renders the current page.
- **Bilingual UI** — English and Thai dictionaries in
  `apps/web/lib/i18n/dictionaries/`.
- **Light / dark theme** — header toggle, OKLCH color tokens defined in
  `apps/web/app/globals.css` via Tailwind CSS v4 `@theme inline`.
- **Vendored-skill installation** — `install-vendor-skill` project skill and
  `/vendor-install` slash command for copying skills out of `vendor/` (git
  submodules) into a Claude Skills directory; copy-based because exFAT cannot
  store symlinks.
- **Monorepo layout** — `apps/web` (Next.js app) consumes `packages/core`
  (scanning engine) through the `@lector/core/*` TypeScript path alias. No npm
  workspaces, no symlinks — required to build on exFAT.
- **exFAT build shim** — `apps/web/scripts/exfat-readlink-fix.cjs` translates
  exFAT's non-standard `fs.readlink` `EISDIR` into the POSIX `EINVAL` Next.js /
  Node tooling expects. Loaded via `NODE_OPTIONS=--require` from every
  `apps/web` npm script.
- **Configuration** — optional `skills-lector.config.json` (template at
  `apps/web/skills-lector.config.example.json`) and `SKILLS_SCAN_ROOTS` /
  `CLAUDE_CONFIG_DIR` env vars for extending the scan roots.

### Documentation

- `README.md` covers features, requirements, scripts, configuration, and the
  exFAT note.
- `CLAUDE.md` documents the monorepo layout, scan pipelines, exFAT constraint,
  and the vendored-skills workflow.
- `ROADMAP.md` plans v0.1.0 through v0.4.0.

[Unreleased]: https://github.com/xemoe/skills-lector/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/xemoe/skills-lector/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/xemoe/skills-lector/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/xemoe/skills-lector/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/xemoe/skills-lector/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/xemoe/skills-lector/releases/tag/v0.1.0
