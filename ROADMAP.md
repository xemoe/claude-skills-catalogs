# Roadmap

This document plans the next four releases of Skills Lector. It is the
source of truth for *what* is being built and *why*; implementation details live in
the code and in [CLAUDE.md](CLAUDE.md).

**Current state** — every package is at version `0.1.0`, but the repository has no
git tag, no release, and no continuous integration. The first milestone closes that
gap; the three that follow add user-facing features.

| Milestone | Theme | Items |
|---|---|---|
| [v0.1.0](#milestone-v010--ci--first-release) | Ship what exists, safely | CI pipeline, first tagged release |
| [v0.2.0](#milestone-v020--usecase-guideline-page) | Onboarding | `/usecase` guideline page |
| [v0.3.0](#milestone-v030--discover-popular-skills--commands) | Discovery | Discover skill + command, plus a `/discover` page |
| [v0.4.0](#milestone-v040--hooks-catalog-page) | Hooks visibility | `/hooks` page cataloguing configured Claude Code hooks |

Task boxes (`- [ ]`) are unchecked until the work lands.

---

## Milestone v0.1.0 — CI + first release

Goal: prove the project builds cleanly on a fresh machine, scan it for security
issues, and cut the first tagged release. Nothing user-facing changes.

### 1. GitHub Actions CI — build & security

**Goal.** Every push and pull request to `main` is automatically built, type-checked,
and scanned for vulnerable dependencies and code-level security issues.

**Why.** There is no automated check today; a broken build or a vulnerable dependency
can land on `main` unnoticed. CI must exist before there is a release to protect.

**Deliverables.**

- `.github/workflows/ci.yml` — build + type-check.
- `.github/workflows/codeql.yml` — CodeQL static analysis.
- `.github/workflows/security.yml` — dependency audit + PR dependency review. (May be folded into `ci.yml`.)
- `.github/dependabot.yml` — automated dependency-update PRs.

**Build job.**

- [x] Trigger on `push` and `pull_request` against `main`.
- [x] Run a matrix of `ubuntu-latest` and `windows-latest` — the scanner has OS-specific path logic in `packages/core/src/claude-paths.ts`, so both targets must compile.
- [x] `actions/setup-node@v4`, Node 22 LTS, with the npm cache enabled.
- [x] Install with `npm ci --prefix packages/core && npm ci --prefix apps/web` — lockfiles exist in both packages, so `npm ci` is reproducible. (`npm run install:all` uses `npm install`; CI should prefer `ci`.)
- [x] Run `npm run build`. This is the project's type-correctness gate — the Next.js Turbopack build type-checks both `apps/web` and the imported `packages/core` sources.

**Security job.**

- [x] `npm audit --audit-level=high` in `packages/core` and `apps/web` (the root has no dependencies). Start with `continue-on-error: true`, then make it blocking once the baseline is clean.
- [x] CodeQL analysis for `javascript-typescript`, on push, PR, and a weekly schedule.
- [x] `actions/dependency-review-action` on pull requests — blocks a PR that introduces a known-vulnerable dependency. (Required enabling Dependabot vulnerability alerts on the repo via `PUT /repos/.../vulnerability-alerts` so the action could read the dependency graph.)
- [x] Secret scanning — repo is public, so GitHub's built-in partner-pattern secret scanning is automatically on.
- [x] `.github/dependabot.yml` watching the `npm` ecosystem in `/packages/core` and `/apps/web`, plus the `github-actions` ecosystem in `/`.

**Acceptance criteria.**

- A pull request shows passing **build** and **security** checks.
- The build succeeds on both Linux and Windows runners.
- `main` is protected: the build and CodeQL checks are required before merge.

**Notes & risks.**

- The exFAT workaround is drive-specific, not OS-specific. CI runners use normal filesystems, so the `fs.readlink` shim (`apps/web/scripts/exfat-readlink-fix.cjs`) is a harmless no-op there — CI just runs the existing npm scripts, which already pass `--turbopack` and load the shim. No CI-specific build flags are needed.
- `npm run lint` runs `next lint`, but ESLint is not configured in this repo (see CLAUDE.md). Do **not** add a lint gate to CI until ESLint is actually set up — wiring up ESLint can be tracked separately.
- Checking out git submodules is **not** required for the build; `vendor/` is only read by the vendor tooling, never at build time. Skip submodule checkout to keep CI fast.

### 2. Release v0.1.0

**Goal.** Publish the first tagged, documented release of the catalog.

**Why.** The code is already labelled `0.1.0` in all three `package.json` files, but
there is no `v0.1.0` git tag and no GitHub Release — there is no immutable reference
point to clone or to diff a future changelog against.

**Scope note.** No version bump is needed — `0.1.0` is already set. This milestone is
about *cutting* the release: changelog, tag, GitHub Release.

**Tasks.**

- [x] Add `CHANGELOG.md` (Keep a Changelog format) with a `0.1.0` entry covering the shipped feature set: skills scan, commands scan, the Skills / Commands / Analytics / Graph / Sources views, the JSON API, i18n (en/th), light/dark theme, vendored-skill installation, and the apps/web + packages/core monorepo.
- [x] Pre-release check: CI is green on `main` (depends on item 1), `README.md` and `CLAUDE.md` are accurate, and the version is `0.1.0` in the root, `apps/web`, and `packages/core` `package.json` files.
- [x] Tag the release: `git tag -a v0.1.0` on `main` and push the tag.
- [x] Create the GitHub Release for `v0.1.0` with notes derived from `CHANGELOG.md`. Published at <https://github.com/xemoe/skills-lector/releases/tag/v0.1.0>.
- [x] *(Optional)* Add `.github/workflows/release.yml`, triggered on `v*` tags, that builds the project and creates the GitHub Release automatically (e.g. via `softprops/action-gh-release`).

**Acceptance criteria.**

- A `v0.1.0` tag exists on `main` and a matching GitHub Release is published.
- `CHANGELOG.md` documents the 0.1.0 feature set.
- The release is reproducible — a clean clone at the tag builds with `npm run install:all && npm run build`.

**Notes.**

- The packages are `private: true` and the app is a local tool — this is **not** an npm publish. The "release" is a git tag plus a GitHub Release pointing at the source.

---

## Milestone v0.2.0 — `/usecase` guideline page

### 3. `/usecase` — guideline & usage-examples page

**Goal.** Add a new in-app page at the route `/usecase` that teaches someone who has
never used Claude Skills or slash Commands what they are, how the catalog helps, and
how to use both — with worked examples in several formats.

**Why.** The catalog assumes the visitor already understands Claude Skills and
commands. A newcomer landing on the dashboard has no on-ramp. `/usecase` is that
on-ramp.

**Clarification.** This is a **web route** in `apps/web` (a sibling of `/skills`,
`/commands`, `/analytic`, `/graph`, `/sources`) — *not* a Claude Code slash command.
The discover slash command is item 4.

**Deliverables.**

- `apps/web/app/usecase/page.tsx` — a dynamic Server Component, following the pattern of `apps/web/app/commands/page.tsx` (`getServerI18n()`, render content, no client-side fetching).
- A `/usecase` link added to `LINKS` in `apps/web/components/main-nav.tsx`.
- New dictionary keys in **both** `apps/web/lib/i18n/dictionaries/en.ts` and `th.ts` — a `nav.usecase` label and a `usecasePage` content section. The app ships English + Thai; the page must be bilingual like every other page.

**Content outline.**

- **Concepts** — what a Claude Skill is, what a slash Command is, and how they differ.
- **Where they live** — personal / plugin / project / local locations (mirrors the README "What it scans" table).
- **Reading this catalog** — a short tour of the Skills, Commands, Analytics, Graph, and Sources views.
- **Worked examples**, several formats:
  - Install a vendored skill with `/vendor-install`.
  - Author your own skill — a minimal `SKILL.md` (frontmatter + body).
  - Author a slash command — a minimal `.claude/commands/<name>.md`.
  - Find popular skills to install — links to the `/discover` page and discover command from item 4.
- **FAQ** — common newcomer questions.

**Tasks.**

- [ ] Create the route and page component.
- [ ] Add the nav link and the `en` / `th` dictionary entries.
- [ ] Write the guideline content; reuse `Markdown`, `InlineCode`, and `CopyButton` for code samples.
- [ ] Add an in-page section nav / anchored table of contents — the page is long-form.
- [ ] Verify the page renders in both locales and in light and dark themes.

**Acceptance criteria.**

- `/usecase` is reachable from the main navigation and renders in English and Thai.
- A reader unfamiliar with Claude Skills can follow it end to end and install or author one.
- `npm run build` stays green.

---

## Milestone v0.3.0 — discover popular skills & commands

### 4. Discover popular Claude repos — Claude Code skill + `/discover` page

**Goal.** Build an end-to-end discovery loop. A Claude Code skill searches GitHub for
the most popular Claude Skills / slash-command repositories and, on confirmation,
clones the chosen ones into `vendor/`. A new `/discover` page in the web app then
displays that ranked top-10 result with each repo's clone status.

**Why.** The catalog shows what is *installed*; the vendor tooling installs from
repos *already* vendored. Neither helps a user *find* good skills in the first place.
This closes the loop: discover on GitHub → clone into `vendor/` → install.

**Architecture — two halves, joined through the filesystem.** The Claude Code skill
and the `/discover` web page are separate processes; they never call each other. They
integrate the way the rest of this catalog already works — through files on disk:

1. The user invokes the discover skill / `/discover-skills` command **in Claude Code**.
2. The skill searches GitHub, ranks the top 10, and writes a **results manifest** — a
   JSON file at a known repo-root path — recording each repo's name, stars,
   description, URL, topics, and the discovery timestamp.
3. The skill asks the user to **confirm**, then clones the chosen repos into `vendor/`
   as git submodules (`git submodule add`).
4. The user opens the web app at **`/discover`**. The page reads the manifest,
   cross-references `vendor/` / `.gitmodules`, and shows the ranked list with each
   repo marked *cloned* or *not cloned*.
5. From there the existing `install-vendor-skill` flow takes a vendored repo the rest
   of the way (`vendor/` → `~/.claude/skills`).

The GitHub network call lives **only** in the Claude Code skill (step 2). The web app
still makes **no external calls** — `/discover` only reads local files (the manifest
and `vendor/`), exactly like every other page in the catalog.

#### 4a. Claude Code side — discover skill + command

**Deliverables.**

- `.claude/skills/discover-popular-skills/SKILL.md` — the skill (proposed name; final name TBD). It owns the GitHub search, the ranking, the manifest write, and the confirm-then-clone step.
- `.claude/commands/discover-skills.md` — a thin `/discover-skills` slash command over the skill, mirroring how `/vendor-install` wraps `install-vendor-skill`.
- A helper script under the skill's `scripts/` directory (e.g. `discover.mjs`) — Node, no dependencies (Node 18+), consistent with `vendor-skills.mjs`.

**How it works.**

- Query the GitHub REST search API (`GET /search/repositories`) with several queries — `topic:claude-skills`, `topic:claude-code`, `"claude skills" in:name,description`, etc.
- Aggregate results, deduplicate by repository, sort by star count, take the top 10.
- Write the results manifest (proposed path `.discover/results.json` at the repo root; git-ignored like `skills-lector.config.json`, since it is a local discovery cache).
- Cross-check each repo against `.gitmodules` / `vendor/` and record which are already vendored.
- Ask the user to confirm, then `git submodule add … vendor/<name>` for the chosen repos. Hand off to `install-vendor-skill` for the `vendor/` → install step.

**Tasks.**

- [ ] Write the discovery helper script; tune the search queries (GitHub search for "claude skills" is noisy — prefer `topic:` filters).
- [ ] Handle GitHub API auth: use `gh api` when the GitHub CLI is installed and authenticated (5000 req/hr); fall back to unauthenticated `fetch` (≈10 req/min for search) and degrade gracefully on rate limits.
- [ ] Define and write the results manifest in a stable JSON schema the `/discover` page can consume.
- [ ] Implement the confirm-then-clone step (`git submodule add`).
- [ ] Author `SKILL.md` with a precise `description` so Claude triggers it on phrasings like "find popular Claude skills" / "discover skills on GitHub".
- [ ] Author the `/discover-skills` command.
- [ ] Document the skill, the command, and the manifest in `CLAUDE.md` alongside the existing vendored-skills section.

#### 4b. Web side — the `/discover` page

**Deliverables.**

- `apps/web/app/discover/page.tsx` — a dynamic Server Component, following the pattern of `apps/web/app/commands/page.tsx`.
- A manifest reader in `packages/core` (e.g. `packages/core/src/discover.ts`) — server-only; reads the results manifest and cross-references `vendor/` / `.gitmodules`. It must resolve the repo root, since the web app's cwd is `apps/web/` under the npm scripts.
- A `/discover` link added to `LINKS` in `apps/web/components/main-nav.tsx`.
- New `nav.discover` + `discoverPage` keys in **both** `apps/web/lib/i18n/dictionaries/en.ts` and `th.ts`.

**How it works.**

- On render the page reads the manifest via the `packages/core` reader and shows the ranked top 10: rank, repo, stars, description, link, topics, and a *cloned into `vendor/`* / *not cloned* badge per repo.
- If no manifest exists yet (fresh clone, skill never run), it shows an empty state — mirroring the `EmptyState` in `commands/page.tsx` — explaining how to run the discover skill in Claude Code.
- The page is **read-only**: it displays state, it does not clone or install. Cloning happens in the Claude Code skill (4a); installing stays with `install-vendor-skill`.

**Tasks.**

- [ ] Build the `packages/core` manifest reader, including repo-root resolution.
- [ ] Create the `/discover` route and page component.
- [ ] Add the nav link and the `en` / `th` dictionary entries.
- [ ] Build the "no discovery run yet" empty state.
- [ ] Verify the page renders in both locales and in light and dark themes.

**Acceptance criteria.**

- Running the skill or `/discover-skills` returns a ranked top-10 list, writes the manifest, and — after confirmation — clones the chosen repos into `vendor/`.
- The GitHub call degrades gracefully (clear message, no crash) when an unauthenticated request is rate-limited.
- `/discover` is reachable from the main navigation, renders in English and Thai, and shows the discovered repos with correct *cloned* / *not cloned* status.
- Before any discovery run, `/discover` shows a helpful empty state instead of an error.
- The web app makes no network calls; `npm run build` stays green.

**Notes & risks.**

- The outbound GitHub network call happens only in **Claude Code's** execution environment — the helper script the skill runs — never in the Next.js server or the browser. The README's "no external calls — nothing leaves your computer" promise therefore still holds for the web app; keep that wording accurate.
- The manifest is the contract between the two halves. Pin a small, explicit JSON schema early so 4a and 4b can be built independently.
- GitHub search relevance is the other main risk. Mitigate with `topic:` filters and, if needed, a small curated seed list of known-good repos.

---

## Milestone v0.4.0 — `/hooks` catalog page

### 5. `/hooks` — Claude Code hooks catalog

**Goal.** Add a new in-app page at the route `/hooks` that scans the machine for
configured Claude Code **hooks** and lists them the way the Skills and Commands
catalogs already list skills and commands — which hook runs, on which event, with
what matcher and command, in which settings file, and when that file last changed.

**Why.** Hooks are shell commands wired into Claude Code's lifecycle events; they run
automatically and invisibly, and they are configured by hand across several
`settings.json` files — personal, project, project-local, and plugin. There is no
single place to see every hook active on a machine, so a stale or surprising hook is
easy to forget and hard to audit. The catalog already answers "what is deployed" for
skills and commands; hooks are the third Claude Code artifact it should make visible.

**Clarification.** This is a **web route** in `apps/web` (a sibling of `/skills`,
`/commands`, `/analytic`, `/graph`, `/sources`) — *not* a Claude Code slash command,
and distinct from Claude Code's own built-in `/hooks` configuration menu. Like every
page in this catalog it is **read-only**: it displays the hooks it finds and never
adds, edits, or removes them (see "Out of scope").

**Background — what a Claude Code hook is.** A hook is an entry under the `hooks` key
of a `settings.json` file. Each lifecycle event — `PreToolUse`, `PostToolUse`,
`UserPromptSubmit`, `Notification`, `Stop`, `SubagentStop`, `SessionStart`,
`SessionEnd`, `PreCompact` — maps to a list of matcher groups, and each group carries
one or more `{ "type": "command", "command": "…" }` entries. A single settings file
can therefore declare many individual hooks.

**Deliverables.**

*`packages/core` — the scanner (server-only):*

- `packages/core/src/hook-scanner.ts` — `scanHooks()`, the single entry point, mirroring `scanSkills()` / `scanCommands()`.
- `packages/core/src/hook-parser.ts` — reads the `hooks` object out of a `settings.json` file and flattens it into individual hook records. Must tolerate malformed or partial JSON the way `skill-parser.ts` tolerates malformed YAML.
- `Hook` and `HookScanResult` types added to `packages/core/src/types.ts`.
- Settings-file locations centralized in `packages/core/src/claude-paths.ts`, alongside the existing OS-specific path logic.

*`apps/web` — the UI:*

- `apps/web/app/hooks/page.tsx` and `apps/web/app/hooks/[id]/page.tsx` — dynamic Server Components, following `apps/web/app/commands/page.tsx` and `commands/[id]/page.tsx`.
- `apps/web/components/hooks-explorer.tsx` — the stateful client component (search / filter / sort), mirroring `commands-explorer.tsx`.
- `apps/web/app/api/hooks/route.ts` — returns the scan result as JSON, like `/api/skills` and `/api/commands`; honours `?force=1`.
- A `/hooks` link added to `LINKS` in `apps/web/components/main-nav.tsx`, and the Rescan button extended to force-refresh hooks too.
- New `nav.hooks` + `hooksPage` keys in **both** `apps/web/lib/i18n/dictionaries/en.ts` and `th.ts`.

**How the scan works.**

- Resolve the settings roots: personal `~/.claude/settings.json`; per-project `.claude/settings.json` and `.claude/settings.local.json` for the known projects in `~/.claude.json` plus the current working directory; and each installed plugin's hooks.
- Parse the `hooks` object from each file and flatten it into one record per `{ event, matcher, command }`, tagged with its scope (`personal | plugin | project | local`), its source settings file, and that file's last-modified time.
- Classify and deduplicate consistently with the skill scan, and return a `HookScanResult` (shape in `types.ts`) — cached in-process for 8 seconds with a `{ force: true }` bypass.

**Tasks.**

- [ ] Add the `Hook` / `HookScanResult` types and the settings-file paths to `packages/core`.
- [ ] Write `hook-parser.ts` — flatten the `hooks` object and recover gracefully from malformed JSON.
- [ ] Write `hook-scanner.ts` — `scanHooks()` with the 8-second cache, mirroring `scanCommands()`.
- [ ] Build the `/hooks` list page, the `/hooks/[id]` detail page, and `hooks-explorer.tsx`.
- [ ] Add the `/api/hooks` route and wire hooks into the Rescan button.
- [ ] Add the nav link and the `en` / `th` dictionary entries.
- [ ] Document the hook scan pipeline in `CLAUDE.md` alongside the skill and command pipelines.
- [ ] Verify the page renders in both locales and in light and dark themes, with a helpful empty state when no hooks are configured.

**Acceptance criteria.**

- `/hooks` is reachable from the main navigation and renders in English and Thai.
- It lists every hook configured in personal, plugin, project, and project-local settings, each showing its event, matcher, command, scope, source file, and last-changed time.
- A machine with no hooks configured shows a clear empty state, not an error.
- A malformed `settings.json` does not crash the scan — the page degrades gracefully.
- The web app makes no network calls; `npm run build` stays green.

**Notes & risks.**

- `settings.json` files hold much more than hooks — permissions, env, model, and so on. The parser must read **only** the `hooks` key and ignore everything else.
- `settings.local.json` is git-ignored and may contain machine-specific commands. Display it like any other scope; the catalog is a local tool and never transmits what it scans.
- Hooks have no git provenance the way skills do — a hook's "source" is the settings file that declares it, so the source column resolves to a file path and scope rather than to a GitHub repo.

---

## Sequencing & dependencies

1. **Item 1 (CI) first.** It gates everything — item 2 should not tag a release until CI is green, and items 3–4 benefit from CI checking their changes.
2. **Item 2 (release) closes v0.1.0**, immediately after CI is green. Ship the catalog as it stands today.
3. **Items 3, 4, and 5 are independent** of each other and can proceed in parallel after v0.1.0. Each ships as its own release (v0.2.0, v0.3.0, v0.4.0), re-exercising the release process from item 2.
4. **Within item 4**, the Claude Code side (4a) defines the results-manifest schema that the `/discover` page (4b) reads. Pin that schema first so the two halves can be built in parallel; 4b is otherwise testable with a hand-written sample manifest.

## Out of scope (future ideas)

- Wiring up ESLint and adding a lint gate to CI.
- Adding an automated test suite (there is none today; `npm run build` is the only correctness gate).
- Publishing packages to npm (the packages are intentionally `private`).
- Editing hooks — or any other `settings.json` content — from the web app; `/hooks` (item 5), like every page in the catalog, is read-only.
