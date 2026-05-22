# Changelog

All notable changes to Skills Lector are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/xemoe/skills-lector/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/xemoe/skills-lector/releases/tag/v0.1.0
