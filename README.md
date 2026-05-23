# Skills Lector

A local web app that scans your machine for deployed **Claude Skills** and slash commands and shows them in a browser dashboard — what is installed, where it came from, and when it last changed.

Built with Next.js 15, React 19, Tailwind CSS, and shadcn/ui. It runs entirely on your machine and makes no external calls — nothing leaves your computer.

## Repository layout

This is a **monorepo**:

- **`apps/web`** — the Next.js web app.
- **`packages/core`** — the shared, server-side scanning engine (filesystem scanners, parsers, git/source resolution, the data model).

## Features

- **Unified dashboard** — every `SKILL.md` discovered on the machine in one searchable, filterable, sortable table.
- **Knows where skills come from** — classifies each skill as personal, plugin, project, or local, and resolves its source to a GitHub repository or a local directory.
- **Freshness & usage** — shows when each skill was last modified and how often it has been used (read from `~/.claude.json`).
- **Skill detail view** — renders the full `SKILL.md` plus metadata: plugin info, source repository, branch, size, and file count.
- **Sources view** — skills grouped by plugin, repository, and directory.
- **Skills + Commands presets** — bundle skills and commands per workflow ("debugging", "frontend-design", ...). Activating a preset toggles each item's `disable-model-invocation` frontmatter in the personal scope. See `/presets` in the app.
- **JSON API** — `GET /api/skills` returns the full scan result.
- **Cross-platform** — Windows and macOS.

## What it scans

| Location | Skill type |
|---|---|
| `~/.claude/skills` | Personal |
| `~/.claude/plugins` | Plugin |
| Agent / Cowork session skills | Plugin |
| `<project>/.claude/skills` (projects from `~/.claude.json`) | Project |
| `apps/web/sample-skills/` (bundled with this repo) | Local |
| Any directory listed in `skills-lector.config.json` | Custom |

## Requirements

- Node.js 18.18 or newer
- npm

## Getting started

```bash
git clone https://github.com/xemoe/skills-lector.git
cd skills-lector
npm run install:all   # installs packages/core and apps/web
npm run dev
```

Then open **http://localhost:4317**.

## Scripts

Run these from the repo root; the root `package.json` delegates each into `apps/web`.

| Command | Description |
|---|---|
| `npm run install:all` | Install dependencies for both packages |
| `npm run dev` | Start the dev server (Turbopack) on port 4317 |
| `npm run build` | Production build — also runs the TypeScript type-check |
| `npm start` | Serve the production build on port 4317 |

## Configuration

All configuration is optional.

- **`skills-lector.config.json`** — copy `apps/web/skills-lector.config.example.json` to `apps/web/skills-lector.config.json` and edit it. Add directories to scan via `extraRoots`, and toggle `includeProjectSkills` / `includeCoworkSkills`. This file is git-ignored.
- **`SKILLS_SCAN_ROOTS`** — environment variable; a `;`- or `,`-separated list of extra directories to scan.
- **`CLAUDE_CONFIG_DIR`** — environment variable; overrides the default `~/.claude` location.

## How it works

A Claude Skill is a directory containing a `SKILL.md` file — YAML frontmatter (`name`, `description`) followed by a Markdown body.

A server-side scanner (`packages/core/src/scanner.ts`) walks every known location, parses each `SKILL.md`, determines its type and source (resolving git remotes to GitHub URLs where possible), reads usage data from `~/.claude.json`, deduplicates skills that appear in multiple places, and returns a single result.

Pages in `apps/web` are dynamic Next.js Server Components that call the scanner directly and hand plain data to client components for in-browser search and filtering. Results are cached in-process for 8 seconds; the **Rescan** button forces a fresh scan.

## Project structure

```
apps/web/            The Next.js app
  app/               App Router pages and the /api routes
  components/        shadcn/ui primitives and app-specific components
  lib/               App-local helpers — i18n, theme, analytics, relations, utils
  sample-skills/     Bundled example skills (so the dashboard is never empty)
  scripts/           The exFAT build shim
packages/core/       Shared scanning engine — SKILL.md/command parsers,
  src/               git/source resolution, the data model
```

## Skills + Commands presets

The `/presets` page is the first mutating feature in the catalog. A preset is a named bundle of skills and/or slash commands associated with a workflow ("debugging", "frontend-design", etc.). Activating a preset writes `disable-model-invocation: false` into the frontmatter of each bundled item in your personal scope and sets `disable-model-invocation: true` for items that were previously active but are not in the new preset. Every activation is written to an audit trail viewable at `/presets/log`. The preset engine lives in `packages/presets`; the web UI is under `apps/web/app/presets/`. An onboarding wizard on the empty `/presets` page walks through creating a first preset.

## Note: running on an exFAT volume

This repository currently lives on an exFAT drive. exFAT cannot store symlinks and makes `fs.readlink` return a non-standard error, which crashes standard Node build tooling. The project works around this:

- builds use **Turbopack** (the npm scripts already pass `--turbopack`);
- `apps/web/scripts/exfat-readlink-fix.cjs` shims `fs.readlink` and is loaded via `NODE_OPTIONS`;
- install dependencies with **npm**, not pnpm — and the monorepo avoids npm workspaces, since both rely on symlinks.

On an NTFS drive or on macOS none of this is needed — the app just runs. See [CLAUDE.md](CLAUDE.md) for details.
