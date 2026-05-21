# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Claude Skills Catalog — a local Next.js web app that scans the machine for deployed Claude Skills (`SKILL.md` files) and shows them in a browser dashboard: what is deployed, when it last changed, and where it came from (a GitHub repo or a local directory).

## Commands

```bash
npm run dev      # dev server (Turbopack) — http://localhost:4317
npm run build    # production build (Turbopack); also runs the TypeScript type-check
npm start        # serve the production build on :4317
```

There is no test suite. `npm run build` is the type-correctness check; `npm run dev` is the normal feedback loop. (`npm run lint` exists but ESLint is not configured.)

## Critical: exFAT build constraint

This project sits on an exFAT volume (the `E:` drive). exFAT cannot store symlinks, and on it `fs.readlink` throws `EISDIR` instead of the POSIX `EINVAL` — which crashes standard Node build tooling with errors like `EISDIR: illegal operation ... readlink`. Consequences:

- **Build with Turbopack only** (`next build --turbopack`). The webpack builder crashes here; the npm scripts already pass `--turbopack`.
- **Do not remove `scripts/exfat-readlink-fix.cjs`** — it shims `fs.readlink` (`EISDIR`→`EINVAL`) and is loaded via `NODE_OPTIONS=--require` in every npm script.
- **Use npm, not pnpm** — pnpm's symlink/rename steps also fail on exFAT.

Moving the project to an NTFS drive would make all of the above unnecessary.

## Architecture

The app is a thin UI over one real piece of logic: a **server-side filesystem scanner**. Everything in `lib/` is server-only (uses `fs` / `child_process`) — never import it from a client component.

### Scan pipeline — `lib/scanner.ts`

`scanSkills()` is the single entry point, used by every page and the API route:

1. Resolves scan roots (`lib/claude-paths.ts`, `lib/config.ts`): personal `~/.claude/skills`, plugins `~/.claude/plugins`, Agent/Cowork session skills, project `.claude/skills` dirs (read from `~/.claude.json`), the bundled `sample-skills/`, plus any configured extra roots.
2. Recursively finds every `SKILL.md`; parses frontmatter (`lib/skill-parser.ts` — deliberately lenient, recovers fields from malformed YAML); classifies each skill as `personal | plugin | project | local`; resolves its source via git remotes (`lib/git.ts` → GitHub repo / other git remote / local directory); attaches usage counts from `~/.claude.json` (`lib/usage.ts`).
3. Deduplicates by logical identity (the same plugin+skill found across multiple Cowork sessions collapses to the newest) and returns a `ScanResult` (shape defined in `lib/types.ts`).

Results are cached in-process for 8 seconds; pass `{ force: true }` to bypass.

### UI data flow

Pages are dynamic Server Components (`export const dynamic = "force-dynamic"`) that call `scanSkills()` directly and hand plain, serializable `Skill[]` to client components — there is no client-side fetching for the initial render. `components/skills-explorer.tsx` is the only stateful client component (search / filter / sort, all in-browser). `app/api/skills/route.ts` returns the same `ScanResult` as JSON; the Rescan button calls it with `?force=1` then `router.refresh()`.

### Cross-platform

Targets Windows and macOS — always use `os.homedir()` and `path`, never hardcoded separators. `lib/claude-paths.ts` centralizes OS-specific locations (the Agent/Cowork skills directory differs between AppData / Application Support / `.config`).

## Configuration

- `skills-catalog.config.json` (git-ignored; template in `skills-catalog.config.example.json`) or the `SKILLS_SCAN_ROOTS` env var add extra scan roots.
- `CLAUDE_CONFIG_DIR` overrides the `~/.claude` location.

## Styling

Tailwind CSS v4 — there is no `tailwind.config.ts`. The theme is defined entirely in `app/globals.css`: OKLCH color tokens in `:root`/`.dark`, mapped to utilities via `@theme inline`, with `@plugin "@tailwindcss/typography"` and `@custom-variant dark`. PostCSS uses `@tailwindcss/postcss`; animations come from `tw-animate-css`. shadcn/ui components (`components/ui/`) consume the tokens. A `.dark` token block exists but nothing toggles the `dark` class, so the app renders in the GitHub-style light theme. Type/status colors are plain Tailwind classes tuned for a light background.
