# Skills Lector

A local web app that scans your machine for deployed **Claude Skills**, **slash commands**, and **hooks**, and shows them in a browser dashboard — what is installed, where it came from, and when it last changed.

Built with Next.js 15, React 19, Tailwind CSS, and shadcn/ui. Current version: **v0.5.0**. It runs entirely on your machine and makes no external calls — nothing leaves your computer. (The optional `discover-popular-skills` Claude Code skill does call GitHub, but that script runs outside the web app — see [Discover](#discover-popular-skills).)

## Repository layout

This is a **monorepo**:

- **`apps/web`** — the Next.js web app.
- **`packages/core`** — the shared, server-side scanning engine (filesystem scanners, parsers, git/source resolution, the data model). Read-only.
- **`packages/presets`** — the preset engine (SQLite-backed). The only mutating surface in the project.

## Features

- **Unified dashboard** — every `SKILL.md` discovered on the machine in one searchable, filterable, sortable table.
- **Three parallel catalogs** — Skills, slash Commands, and Hooks. Each gets its own list view, detail view, and JSON API, all sharing the same scan/filter/source-resolution patterns.
- **Knows where things come from** — classifies each item as personal, plugin, project, or local, and resolves its source to a GitHub repository or a local directory.
- **Freshness & usage** — shows when each skill was last modified and how often it has been used (read from `~/.claude.json`).
- **Skill / command / hook detail view** — renders the full `SKILL.md` (or command body / hook config) plus metadata: plugin info, source repository, branch, size, and file count.
- **Sources view** — items grouped by plugin, repository, and directory (`/sources`).
- **Analytics view** — usage and freshness charts with a preset filter (`/analytic`).
- **Graph view** — interactive relationship graph between skills, commands, and their sources (`/graph`, powered by `@xyflow/react`).
- **Skills + Commands presets** — bundle skills and commands per workflow ("debugging", "frontend-design", ...). Activating a preset toggles each item's `disable-model-invocation` frontmatter in the personal scope, with a full audit trail. See `/presets`.
- **Discover popular skills** — a Claude Code skill ranks the most popular Claude Skills repositories on GitHub and writes a manifest the `/discover` page renders.
- **Usecase guide** — long-form onboarding for newcomers at `/usecase`.
- **JSON APIs** — `GET /api/skills`, `/api/commands`, `/api/hooks`, `/api/discover`, `/api/activity`, plus the preset endpoints under `/api/presets/*`. All honour `?force=1` to bypass the 8-second scan cache.
- **Bilingual UI** — English and Thai (toggle in the header).
- **Light / dark theme toggle**.
- **Cross-platform** — Windows and macOS.

## What it scans

| Location | Item type |
|---|---|
| `~/.claude/skills`, `~/.claude/commands` | Personal skills / commands |
| `~/.claude/plugins/**` (skills, commands, `settings.json` hooks) | Plugin |
| Agent / Cowork session skills | Plugin |
| `<project>/.claude/{skills,commands,settings.json,settings.local.json}` (projects from `~/.claude.json`) | Project |
| `~/.claude/settings.json` (hooks) | Personal hooks |
| `<project>/.claude/settings.local.json` (hooks) | Local hooks |
| `apps/web/sample-skills/` (bundled with this repo) | Local |
| Any directory listed in `skills-lector.config.json` | Custom |

## Requirements

- Node.js 18.18 or newer
- npm

## Getting started

```bash
git clone https://github.com/xemoe/skills-lector.git
cd skills-lector
git submodule update --init --recursive   # pull vendored skills under vendor/
npm run install:all                       # installs all three packages
npm run dev
```

Then open **http://localhost:4317**.

The submodule step is optional — the app still runs without it — but the `vendor/` directory will be empty and `/discover` will show no vendored entries.

## Scripts

Run these from the repo root; the root `package.json` delegates each into `apps/web`.

| Command | Description |
|---|---|
| `npm run install:all` | Install dependencies for `packages/core`, `packages/presets`, and `apps/web` |
| `npm run dev` | Start the dev server (Turbopack) on port 4317 |
| `npm run dev:autoport` | Same as `dev` but picks the next free port |
| `npm run dev:portless` | Dev server behind [portless](https://github.com/vercel-labs/portless) at `https://lector-dev.local` |
| `npm run build` | Production build — also runs the TypeScript type-check |
| `npm start` | Serve the production build on port 4317 |
| `npm run start:autoport` | Production server on the next free port |
| `npm run start:portless` | Production server behind portless at `https://lector-prod.local` |

The `dev:portless` / `start:portless` scripts require the `portless` proxy running on the machine (`portless proxy start`) and the local CA trusted (`portless trust`). They are an opt-in convenience; the autoport / fixed-port variants are the default.

## Configuration

All configuration is optional.

- **`skills-lector.config.json`** — copy `apps/web/skills-lector.config.example.json` to `apps/web/skills-lector.config.json` and edit it. Add directories to scan via `extraRoots`, toggle `includeProjectSkills` / `includeCoworkSkills`, and override `dbPath` for the preset SQLite file. This file is git-ignored.
- **`SKILLS_SCAN_ROOTS`** — environment variable; a `;`- or `,`-separated list of extra directories to scan.
- **`CLAUDE_CONFIG_DIR`** — environment variable; overrides the default `~/.claude` location.
- **`SKILLS_LECTOR_PRESETS_DB`** — environment variable; overrides the default preset database path (`~/.skills-lector/presets.db`).
- **`SKILLS_LECTOR_PERSONAL_ROOT`** — environment variable; overrides the personal-scope root that preset activations write into (defaults to `~/.claude`).

## How it works

A Claude Skill is a directory containing a `SKILL.md` file — YAML frontmatter (`name`, `description`) followed by a Markdown body. A slash command is a single Markdown file under `commands/`. A hook is a `{ event, matcher, command }` entry inside a `settings.json` file.

Three parallel server-side scanners in `packages/core/src/` walk the known locations, parse each item, determine its scope and source (resolving git remotes to GitHub URLs where possible), read usage data from `~/.claude.json` where applicable, deduplicate items that appear in multiple places, and return a single result:

- **`scanSkills()`** — `scanner.ts`
- **`scanCommands()`** — `command-scanner.ts`
- **`scanHooks()`** — `hook-scanner.ts`

A fourth reader, **`readDiscoverManifest()`** (`discover.ts`), reads the JSON manifest produced by the `discover-popular-skills` Claude Code skill — the web app makes no GitHub calls itself.

Pages in `apps/web` are dynamic Next.js Server Components that call the scanners directly and hand plain data to client components for in-browser search and filtering. Results are cached in-process for 8 seconds; the **Rescan** button forces a fresh scan of all four sources.

## Skills + Commands presets

The `/presets` page is the only mutating feature in the catalog. A preset is a named bundle of skills and/or slash commands associated with a workflow ("debugging", "frontend-design", etc.). Activating a preset writes `disable-model-invocation: false` into the frontmatter of each bundled item in your personal scope and sets `disable-model-invocation: true` for items that were previously active but are not in the new preset. Pinned items override preset membership in both directions. Every activation is appended to an audit trail viewable at `/presets/log`.

The preset engine lives in `packages/presets`; the web UI is under `apps/web/app/presets/`. State persists in SQLite at `~/.skills-lector/presets.db` (path overridable, see [Configuration](#configuration)). Writes are atomic (temp file + rename, exFAT-safe); crash recovery is implicit because the filesystem is the source of truth and the next apply re-converges. An onboarding wizard on the empty `/presets` page walks through creating a first preset.

## Vendored skills

External Claude Skills are pulled in as **git submodules under `vendor/`** (currently: `9arm-skills`, `anthropic-cybersecurity-skills`, `gstack`, `ui-ux-pro-max-skill`). After cloning this repo, run `git submodule update --init --recursive` to populate them.

A project skill at `.claude/skills/install-vendor-skill/` owns the vendor workflow: list the skills in `vendor/`, install one into `~/.claude/skills/` (personal) or `.claude/skills/` (project), and add new submodules. Installing **copies** the directory — exFAT cannot store symlinks. The `/vendor-install` slash command is the shortcut.

## Discover popular skills

A discovery loop with two halves that integrate only through a JSON file on disk — the web app makes no GitHub calls.

- **Claude Code side** — the `.claude/skills/discover-popular-skills/` skill and its `/discover-skills` slash command. The helper script queries the GitHub search API for the most popular Claude Skills / slash-command repositories, writes the top 10 to `.discover/results.json` at the repo root, and (on confirmation) `git submodule add`s the chosen repos into `vendor/`. Uses `gh api` when available; falls back to unauthenticated `fetch` and reports rate-limiting in the manifest.
- **Web side** — the `/discover` page reads the manifest and renders the ranked list with each entry marked _vendored_ / _not vendored_. Empty state on a fresh clone points the user at `/discover-skills`.

`.discover/results.json` is git-ignored — it is a local discovery cache.

## Project structure

```
apps/web/            The Next.js app
  app/               App Router pages and /api routes
                     (skills, commands, hooks, presets, sources,
                      analytic, graph, discover, usecase)
  components/        shadcn/ui primitives and app-specific components
  lib/               App-local helpers — i18n, theme, analytics, relations, utils
  sample-skills/     Bundled example skills (so the dashboard is never empty)
  scripts/           The exFAT build shim
packages/core/       Shared scanning engine — SKILL.md / command / hook
  src/               parsers, git/source resolution, the data model
packages/presets/    Preset engine — SQLite store, apply diff,
  src/               atomic frontmatter writes
.claude/             This repo's own project skills and slash commands
vendor/              External skill repos as git submodules
```

## Note: running on an exFAT volume

This repository currently lives on an exFAT drive. exFAT cannot store symlinks and makes `fs.readlink` return a non-standard error, which crashes standard Node build tooling. The project works around this:

- builds use **Turbopack** (the npm scripts already pass `--turbopack`);
- `apps/web/scripts/exfat-readlink-fix.cjs` shims `fs.readlink` and is loaded via `NODE_OPTIONS`;
- install dependencies with **npm**, not pnpm — and the monorepo avoids npm workspaces, since both rely on symlinks.

On an NTFS drive or on macOS none of this is needed — the app just runs. See [CLAUDE.md](CLAUDE.md) for details.
