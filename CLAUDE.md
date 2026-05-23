# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Skills Lector — a local Next.js web app that scans the machine for deployed Claude Skills (`SKILL.md` files) and slash commands and shows them in a browser dashboard: what is deployed, when it last changed, and where it came from (a GitHub repo or a local directory).

The repository is a **monorepo** with two packages:

- **`apps/web`** — the Next.js web app (UI, pages, API routes, app-local helpers).
- **`packages/core`** — the server-side scanning engine (filesystem scanners, parsers, git/source resolution, the shared data model). The app imports it as `@lector/core/*`.

## Monorepo layout

```
package.json            Root orchestrator — delegates dev/build/start/lint to apps/web
tsconfig.base.json      Shared TypeScript compiler options (both packages extend it)
apps/web/               The Next.js application
  app/                  App Router pages + /api routes
  components/           shadcn/ui primitives and app components
  lib/                  App-local helpers: utils (cn), i18n, theme, analytics, relations
  sample-skills/        Bundled example skills (so the dashboard is never empty)
  scripts/              exfat-readlink-fix.cjs (the exFAT build shim)
packages/core/          The shared scanning engine
  src/                  scanner, command-scanner, parsers, git, usage, config,
                        claude-paths, activity, types, pipeline
.claude/                This repo's own project skills + slash commands
vendor/                 External skills repos as git submodules
```

The root **deliberately does not use npm workspaces** — workspaces link packages with symlinks/junctions, which the exFAT volume cannot store (see below). Each package has its own `node_modules`; `apps/web` consumes `packages/core` through the TypeScript path alias `@lector/core/*` (configured in `apps/web/tsconfig.json`), and `apps/web/next.config.mjs` sets `turbopack.root` to the monorepo root so Turbopack resolves the sibling package.

## Commands

Run from the repo root (the root `package.json` delegates each script into `apps/web`):

```bash
npm run install:all   # install deps for packages/core and apps/web
npm run dev           # dev server (Turbopack) — http://localhost:4317
npm run build         # production build (Turbopack); also runs the TypeScript type-check
npm start             # serve the production build on :4317
```

After a fresh clone, run `npm run install:all` — a plain root `npm install` only covers the orchestrator, which has no dependencies. You can also run `dev`/`build`/`start` directly inside `apps/web`.

There is no test suite. `npm run build` is the type-correctness check; `npm run dev` is the normal feedback loop. (`npm run lint` exists but ESLint is not configured.)

## Critical: exFAT build constraint

This project sits on an exFAT volume (the `E:` drive). exFAT cannot store symlinks, and on it `fs.readlink` throws `EISDIR` instead of the POSIX `EINVAL` — which crashes standard Node build tooling with errors like `EISDIR: illegal operation ... readlink`. Consequences:

- **Build with Turbopack only** (`next build --turbopack`). The webpack builder crashes here; the npm scripts already pass `--turbopack`.
- **Do not remove `apps/web/scripts/exfat-readlink-fix.cjs`** — it shims `fs.readlink` (`EISDIR`→`EINVAL`) and is loaded via `NODE_OPTIONS=--require` in every `apps/web` npm script.
- **Use npm, not pnpm** — pnpm's symlink/rename steps also fail on exFAT.
- **No npm workspaces** — workspaces also rely on symlinks/junctions. This monorepo wires the packages together with a TypeScript path alias instead (see "Monorepo layout").

Moving the project to an NTFS drive would make all of the above unnecessary.

## Architecture

The app is a thin UI (`apps/web`) over three parallel **server-side filesystem scanners** in `packages/core` — one for Skills, one for slash Commands, one for Hooks. Everything in `packages/core/src/` is server-only (uses `fs` / `child_process`) — never import it from a client component. `apps/web/lib/` holds app-local helpers, some of which (`i18n`, `utils`) are client-safe.

### Scan pipeline — `packages/core/src/scanner.ts`

`scanSkills()` is the single entry point, used by every page and the API route:

1. Resolves scan roots (`packages/core/src/claude-paths.ts`, `packages/core/src/config.ts`): personal `~/.claude/skills`, plugins `~/.claude/plugins`, Agent/Cowork session skills, project `.claude/skills` dirs (read from `~/.claude.json`), the bundled `apps/web/sample-skills/`, plus any configured extra roots.
2. Recursively finds every `SKILL.md`; parses frontmatter (`skill-parser.ts` — deliberately lenient, recovers fields from malformed YAML); classifies each skill as `personal | plugin | project | local`; resolves its source via git remotes (`git.ts` → GitHub repo / other git remote / local directory); attaches usage counts from `~/.claude.json` (`usage.ts`).
3. Deduplicates by logical identity (the same plugin+skill found across multiple Cowork sessions collapses to the newest) and returns a `ScanResult` (shape defined in `packages/core/src/types.ts`).

Results are cached in-process for 8 seconds; pass `{ force: true }` to bypass.

### Command scan pipeline — `packages/core/src/command-scanner.ts`

`scanCommands()` mirrors `scanSkills()` for Claude Code slash commands. It scans three kinds of root: personal `~/.claude/commands`, each installed plugin's `commands/` directory, and project `.claude/commands` dirs (known projects from `~/.claude.json` plus the current working directory). Every `.md` file is a command — its name is the path relative to the `commands/` dir, with subdirectories becoming a `:` namespace. Frontmatter is parsed by `command-parser.ts`; the lenient YAML helpers shared with `skill-parser.ts` live in `frontmatter.ts`. Returns a `CommandScanResult`; cached for 8 seconds like the skill scan.

### Hook scan pipeline — `packages/core/src/hook-scanner.ts`

`scanHooks()` is the third scanner — it mirrors `scanCommands()` but reads a single JSON file per scope instead of walking a directory. It looks at four kinds of `settings.json`: personal `~/.claude/settings.json`, each installed plugin's `settings.json`, per-project `.claude/settings.json`, and per-project `.claude/settings.local.json` (the git-ignored, machine-specific scope, which surfaces as the `local` `HookScope`). Each file is read by `hook-parser.ts`, which parses **only** the `hooks` key — every other settings field is ignored — and flattens its nested `{ event → matcher group → command entry }` shape into one `Hook` record per `{ event, matcher, command }`, tagged with its source file's mtime and size. JSON parse failures and unknown event names degrade into the result's `errors` list rather than crashing the scan. Returns a `HookScanResult`; cached for 8 seconds, same as the skill and command scans.

### Discover manifest reader — `packages/core/src/discover.ts`

`readDiscoverManifest()` is the third reader, but it does not crawl the filesystem — it consumes a JSON file written by the `discover-popular-skills` Claude Code skill (see "Discover popular skills" below). It walks up from `cwd` to find the repo root (the web app's cwd is `apps/web/`), reads `.discover/results.json` if it exists, validates each entry leniently (a malformed row is reported in `errors` rather than crashing the read), then cross-references `.gitmodules` to annotate each entry with `vendored` / `vendorPath`. Returns a `DiscoverResult` (shape in `types.ts`); cached for 8 seconds, invalidated whenever the manifest's mtime changes. The manifest schema is `schemaVersion: 1`; bump that field on any breaking change to keep the skill and the reader in lockstep.

### UI data flow

Pages are dynamic Server Components (`export const dynamic = "force-dynamic"`) that call `scanSkills()` / `scanCommands()` / `scanHooks()` / `readDiscoverManifest()` directly and hand plain, serializable data to client components — there is no client-side fetching for the initial render. `apps/web/components/skills-explorer.tsx`, `commands-explorer.tsx`, and `hooks-explorer.tsx` are the stateful client components (search / filter / sort, all in-browser). The Skills catalog lives at `/` and `/skills/[id]`; the Commands catalog mirrors it at `/commands` and `/commands/[id]`; the Hooks catalog at `/hooks` and `/hooks/[id]`; the Discover view is a single page at `/discover`. `apps/web/app/api/skills/route.ts`, `app/api/commands/route.ts`, `app/api/hooks/route.ts`, and `app/api/discover/route.ts` return the corresponding results as JSON; the Rescan button force-refreshes all of them (plus activity) with `?force=1` then calls `router.refresh()`.

`apps/web/lib/` holds the app-only modules that depend on React/Next or i18n and therefore stay out of `packages/core`: `analytics.ts` and `relations.ts` (view-model builders for the analytics and graph pages), `i18n/` (locale context + dictionaries), `theme.ts`, and `utils.ts` (the shadcn `cn` helper and locale-aware formatting).

### Cross-platform

Targets Windows and macOS — always use `os.homedir()` and `path`, never hardcoded separators. `packages/core/src/claude-paths.ts` centralizes OS-specific locations (the Agent/Cowork skills directory differs between AppData / Application Support / `.config`).

## Configuration

- `skills-lector.config.json` (git-ignored; template in `apps/web/skills-lector.config.example.json`) or the `SKILLS_SCAN_ROOTS` env var add extra scan roots. The scanner reads the config from the current working directory — when started via the npm scripts that is `apps/web/`, so place a real `skills-lector.config.json` there.
- `CLAUDE_CONFIG_DIR` overrides the `~/.claude` location.

## Vendored skills

External Claude Skills are pulled in as **git submodules under `vendor/`** (e.g. `vendor/9arm-skills`). After cloning this repo, run `git submodule update --init --recursive` to populate them.

A project skill at `.claude/skills/install-vendor-skill/` owns the vendor workflow: list the skills in `vendor/`, install one into `~/.claude/skills/` (personal) or `.claude/skills/` (project), and add new submodules. Its helper script is `node .claude/skills/install-vendor-skill/scripts/vendor-skills.mjs <list|install|installed>`. Installing **copies** the skill directory — exFAT cannot store symlinks.

The `/vendor-install` slash command (`.claude/commands/vendor-install.md`) is a thin shortcut over that script: run it bare to list vendored skills, or `/vendor-install <skill-name>` to install one.

## Discover popular skills

The discovery loop has two halves that integrate **only through a JSON file on disk** — the web app makes no GitHub calls.

- **Claude Code side** — the `.claude/skills/discover-popular-skills/` skill (helper at `scripts/discover.mjs`) and its `/discover-skills` slash command. `node .claude/skills/discover-popular-skills/scripts/discover.mjs <search|clone|status>` queries the GitHub search API for the most popular Claude-Skills repositories, writes the ranked top 10 to `.discover/results.json` at the repo root, and on confirmation runs `git submodule add … vendor/<name>` for the chosen repos. It prefers `gh api` when the GitHub CLI is available (5000 req/hr); falls back to unauthenticated `fetch` (~10 req/min for search) and reports `rateLimited` in the manifest when GitHub throttles a run. The outbound network call lives **only** in this script — never in the Next.js server.
- **Web side** — the `/discover` page in `apps/web` reads the manifest via `readDiscoverManifest()` and shows the ranked list with each entry marked *vendored* / *not vendored*. When no manifest exists yet (fresh clone, skill never run), it shows an empty state pointing the user at `/discover-skills`.

`.discover/results.json` is git-ignored — it is a local discovery cache. Its shape is documented in the `DiscoverManifest` / `DiscoverEntry` types in `packages/core/src/types.ts`; the discover skill's `SKILL.md` carries the canonical JSON sample.

## Styling

Tailwind CSS v4 — there is no `tailwind.config.ts`. The theme is defined entirely in `apps/web/app/globals.css`: OKLCH color tokens in `:root`/`.dark`, mapped to utilities via `@theme inline`, with `@plugin "@tailwindcss/typography"` and `@custom-variant dark`. PostCSS uses `@tailwindcss/postcss`; animations come from `tw-animate-css`. shadcn/ui components (`apps/web/components/ui/`) consume the tokens. The site header has a light/dark theme toggle.
