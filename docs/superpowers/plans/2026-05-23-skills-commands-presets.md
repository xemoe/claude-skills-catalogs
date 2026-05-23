# Skills + Commands Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a preset system to Skills Lector — bundle skills + commands per workflow, switch between them in one click. Switching toggles each item's `disable-model-invocation` frontmatter in the personal scope (`~/.claude/skills`, `~/.claude/commands`). Persist preset definitions + apply history in SQLite at `~/.skills-lector/presets.db`.

**Architecture:** New `packages/presets` package (only mutating surface — `packages/core` stays read-only). SQLite via `better-sqlite3` (sync, no symlinks, exFAT-safe). New `/presets/*` pages in `apps/web` use Server Components for initial render + TanStack Query for client mutations. SSE streams progress during multi-item activations.

**Tech Stack:** TypeScript (strict), Next.js 15 App Router, better-sqlite3, zod (input validation), @tanstack/react-query v5, shadcn/ui, Tailwind CSS v4.

**Spec:** [docs/superpowers/specs/2026-05-23-skills-commands-preset-design.md](../specs/2026-05-23-skills-commands-preset-design.md)

**Working Directory:** All commands run from `E:\PycharmProjects\claude-skills-catalogs` unless stated otherwise. Path separators use forward slashes in commands (works on Windows PowerShell + Git Bash).

**Important constraints (project-wide):**
- exFAT volume — no symlinks, no pnpm, no npm workspaces, must use `next build --turbopack`
- The `apps/web/scripts/exfat-readlink-fix.cjs` shim is loaded via `NODE_OPTIONS=--require` in every npm script. Do not remove.
- Cross-platform paths: always `os.homedir()` + `path.join()`. Never hardcoded separators.
- No automated test suite exists — verification = `npm run build` (typecheck via Turbopack/tsc) + manual smoke. **Do not add a test runner in this plan** (it is a ROADMAP candidate, out of scope here).

**TDD note:** Because there is no test runner, this plan uses **type-driven development** instead. Each domain function task: (1) write types/signatures, (2) write implementation, (3) typecheck, (4) for pure functions, exercise via a one-off Node script and discard. Replace this pattern with real tests when the test-suite ROADMAP item ships.

---

## File Structure

### New files in `packages/presets/`

```
package.json                       Package manifest
tsconfig.json                      Extends ../../tsconfig.base.json
src/
  types.ts                         Preset, PresetItem, PinnedItem, ApplyLog, ApplyResult, ApplyDiff, ActiveState
  db.ts                            openDb() — singleton SQLite connection + migration runner
  schema.sql                       (NOT used at runtime — reference only; runtime uses migrations/)
  migrations/
    001_initial.sql                v1 schema (presets, preset_items, pinned_items, active_preset, apply_log, apply_log_items, schema_version)
  identity.ts                      resolveItemPath, listPersonalItems
  frontmatter.ts                   readInvocation, writeInvocation (atomic — tmp + rename)
  diff.ts                          computeApplyDiff (pure function)
  presets.ts                       CRUD: createPreset, listPresets, getPreset, updatePreset, archivePreset, unarchivePreset, addItem, removeItem, getActivePreset
  pinned.ts                        CRUD: listPinned, addPin, archivePin, unarchivePin
  activate.ts                      applyPreset orchestrator (loads state → diff → write → log)
  log.ts                           listApplyLog, getApplyLogDetail
  events.ts                        Apply event emitter for SSE (per-call, not global)
```

### New files in `apps/web/`

```
app/
  providers.tsx                                       QueryClientProvider wrapper (client component)
  layout.tsx                                          MODIFY — wrap children in <Providers>
  presets/
    page.tsx                                          List + active card + pinned panel + empty-state wizard
    new/page.tsx                                      Standalone wizard
    [id]/page.tsx                                     Detail + edit + activate
    log/page.tsx                                      Apply history
  api/presets/
    route.ts                                          GET (list), POST (create)
    [id]/
      route.ts                                        GET (detail), PATCH (update name/desc)
      archive/route.ts                                POST
      unarchive/route.ts                              POST
      items/route.ts                                  POST (add), DELETE (remove)
      activate/route.ts                               POST (?dryRun=1) — JSON
      activate/stream/route.ts                        POST — SSE stream
    pin/
      route.ts                                        GET (list), POST (add)
      [kind]/[id]/
        archive/route.ts                              POST
        unarchive/route.ts                            POST
    log/route.ts                                      GET (paged)
components/
  presets/
    presets-explorer.tsx                              Client — list + tabs (Active/Archived) + search
    preset-card.tsx                                   List item card
    preset-detail-client.tsx                          Detail page client component
    preset-wizard.tsx                                 3-step wizard (used by /new + empty state)
    preset-item-picker.tsx                            Sheet for multi-select from catalog
    activate-confirm-dialog.tsx                       Dry-run diff dialog
    activate-progress-modal.tsx                       SSE-driven progress (≥ 4 items)
    pinned-panel.tsx                                  Pinned items management
    apply-log-table.tsx                               Apply history with expandable rows
    use-preset-queries.ts                             TanStack Query hooks (keys + queryFns + mutations)
main-nav.tsx                                          MODIFY — add Presets link
lib/i18n/dictionaries/
  en.ts                                               MODIFY — add nav.presets + presetsPage section
  th.ts                                               MODIFY — add nav.presets + presetsPage section
skills-lector.config.example.json                     MODIFY — document optional dbPath / personalRoot
```

### Modified files at repo root

```
package.json                                          MODIFY — install:all script includes packages/presets
apps/web/tsconfig.json                                MODIFY — add @lector/presets/* path alias
.gitignore                                            MODIFY (if needed) — skills-lector data dir is in $HOME (no repo change needed)
CLAUDE.md                                             MODIFY — add Preset engine section
README.md                                             MODIFY — feature bullet + short section
CHANGELOG.md                                          MODIFY — 0.5.0 entry
ROADMAP.md                                            MODIFY — note shipped feature
```

---

## Phase 1 — Foundation (packages/presets bootstrap)

### Task 1: Create packages/presets skeleton

**Files:**
- Create: `packages/presets/package.json`
- Create: `packages/presets/tsconfig.json`
- Create: `packages/presets/src/.gitkeep` (placeholder)

- [ ] **Step 1: Create package.json**

```json
{
    "name": "@lector/presets",
    "version": "0.5.0",
    "private": true,
    "description": "Preset engine — SQLite-backed bundles of skills + commands that can be activated to toggle disable-model-invocation in the personal scope. The only mutating surface in the project.",
    "type": "module",
    "dependencies": {
        "@lector/core": "file:../core",
        "better-sqlite3": "^11.5.0",
        "gray-matter": "^4.0.3",
        "zod": "^3.23.8"
    },
    "devDependencies": {
        "@types/better-sqlite3": "^7.6.12",
        "@types/node": "^22.10.7",
        "typescript": "^5.7.3"
    }
}
```

Note: `@lector/core` is listed as a `file:` dep purely so npm install creates a symlink-free copy resolution; the actual import path used in `apps/web` is the TS path alias `@lector/core/*`. On exFAT, `file:` deps install as a directory copy (no symlink), which is what we want.

- [ ] **Step 2: Create tsconfig.json**

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "paths": {
            "@lector/core/*": ["../core/src/*"]
        }
    },
    "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create placeholder src directory**

Create empty file `packages/presets/src/.gitkeep` so git tracks the directory.

- [ ] **Step 4: Install dependencies**

```bash
cd packages/presets && npm install
cd ../..
```

Expected: `node_modules/` populated, no errors. If `better-sqlite3` post-install fails on Windows, retry once — pre-gyp binaries fetch from GitHub releases and can transient-fail.

- [ ] **Step 5: Commit**

```bash
git add packages/presets/package.json packages/presets/tsconfig.json packages/presets/src/.gitkeep
git commit -m "Add packages/presets skeleton for v0.5.0 preset engine"
```

---

### Task 2: Wire up monorepo install + path alias

**Files:**
- Modify: `package.json` (root)
- Modify: `apps/web/tsconfig.json`

- [ ] **Step 1: Update root install:all script**

Edit `package.json`, replace the `install:all` line:

```json
"install:all": "npm install --prefix packages/core && npm install --prefix packages/presets && npm install --prefix apps/web"
```

- [ ] **Step 2: Add path alias in apps/web/tsconfig.json**

Edit `apps/web/tsconfig.json`. Update `paths`:

```json
"paths": {
    "@lector/core/*": ["../../packages/core/src/*"],
    "@lector/presets/*": ["../../packages/presets/src/*"],
    "@/*": ["./*"]
}
```

- [ ] **Step 3: Verify build still passes (no presets code yet, just config)**

```bash
cd apps/web && npm run build
cd ../..
```

Expected: Build succeeds. No reference to `@lector/presets` anywhere yet so it's a no-op for the typecheck — this just confirms the path alias addition didn't break anything.

- [ ] **Step 4: Commit**

```bash
git add package.json apps/web/tsconfig.json
git commit -m "Wire packages/presets into monorepo install and tsconfig path alias"
```

---

### Task 3: Define types

**Files:**
- Create: `packages/presets/src/types.ts`

- [ ] **Step 1: Write types.ts**

```typescript
// packages/presets/src/types.ts

export type ItemKind = "skill" | "command";

export type Preset = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    color: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type PresetItem = {
    presetId: number;
    kind: ItemKind;
    identifier: string;
    addedAt: string;
};

export type PinnedItem = {
    kind: ItemKind;
    identifier: string;
    pinnedAt: string;
    reason: string | null;
    archivedAt: string | null;
};

export type ActiveState = {
    presetId: number | null;
    activatedAt: string | null;
};

export type ApplyAction =
    | "enabled"
    | "disabled"
    | "skipped"
    | "error"
    | "missing";

export type ApplyLog = {
    id: number;
    ts: string;
    fromPresetId: number | null;
    toPresetId: number | null;
    enabledCount: number;
    disabledCount: number;
    skippedCount: number;
    errorCount: number;
    durationMs: number;
    status: "success" | "partial" | "failed";
};

export type ApplyLogItem = {
    logId: number;
    kind: ItemKind;
    identifier: string;
    action: ApplyAction;
    message: string | null;
};

export type InvocationState = "enabled" | "disabled";

export type FsItem = {
    kind: ItemKind;
    identifier: string;
    currentInvocation: InvocationState;
    filePath: string;
};

export type ApplyDiffEntry = {
    kind: ItemKind;
    identifier: string;
    fromState?: InvocationState;
    toState?: InvocationState;
    reason?: string;
    message?: string;
};

export type ApplyDiff = {
    enabled: ApplyDiffEntry[];
    disabled: ApplyDiffEntry[];
    skipped: ApplyDiffEntry[];
    missing: ApplyDiffEntry[];
};

export type ApplyResult = ApplyDiff & {
    status: "success" | "partial" | "failed";
    logId: number | null;
    errors: ApplyDiffEntry[];
    durationMs: number;
};

export type ApplyOptions = {
    dryRun?: boolean;
    force?: boolean;
};

export type ApplyPhase =
    | "scanning"
    | "diff"
    | "enabling"
    | "disabling"
    | "logging"
    | "done"
    | "error";

export type ApplyEvent =
    | { phase: "scanning" }
    | { phase: "diff"; diff: ApplyDiff }
    | { phase: "enabling"; current: number; total: number; currentItem: { kind: ItemKind; identifier: string } }
    | { phase: "disabling"; current: number; total: number; currentItem: { kind: ItemKind; identifier: string } }
    | { phase: "logging" }
    | { phase: "done"; result: ApplyResult }
    | { phase: "error"; message: string };
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/presets && npx tsc --noEmit
cd ../..
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/presets/src/types.ts
git commit -m "Define Preset, PinnedItem, ApplyDiff, ApplyEvent types for preset engine"
```

---

### Task 4: SQLite schema + migration runner

**Files:**
- Create: `packages/presets/src/migrations/001_initial.sql`
- Create: `packages/presets/src/schema.sql`
- Create: `packages/presets/src/db.ts`

- [ ] **Step 1: Write the migration file**

Create `packages/presets/src/migrations/001_initial.sql`:

```sql
-- v1 initial schema for Skills Lector preset engine

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS presets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    slug         TEXT    NOT NULL UNIQUE,
    name         TEXT    NOT NULL,
    description  TEXT,
    color        TEXT,
    archived_at  TEXT,
    created_at   TEXT    NOT NULL,
    updated_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_presets_archived ON presets(archived_at);

CREATE TABLE IF NOT EXISTS preset_items (
    preset_id    INTEGER NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
    kind         TEXT    NOT NULL CHECK (kind IN ('skill','command')),
    identifier   TEXT    NOT NULL,
    added_at     TEXT    NOT NULL,
    PRIMARY KEY (preset_id, kind, identifier)
);

CREATE INDEX IF NOT EXISTS idx_preset_items_by_identity ON preset_items(kind, identifier);

CREATE TABLE IF NOT EXISTS pinned_items (
    kind         TEXT    NOT NULL CHECK (kind IN ('skill','command')),
    identifier   TEXT    NOT NULL,
    pinned_at    TEXT    NOT NULL,
    reason       TEXT,
    archived_at  TEXT,
    PRIMARY KEY (kind, identifier)
);

CREATE TABLE IF NOT EXISTS active_preset (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    preset_id     INTEGER REFERENCES presets(id) ON DELETE SET NULL,
    activated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS apply_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ts              TEXT    NOT NULL,
    from_preset_id  INTEGER REFERENCES presets(id) ON DELETE SET NULL,
    to_preset_id    INTEGER REFERENCES presets(id) ON DELETE SET NULL,
    enabled_count   INTEGER NOT NULL DEFAULT 0,
    disabled_count  INTEGER NOT NULL DEFAULT 0,
    skipped_count   INTEGER NOT NULL DEFAULT 0,
    error_count     INTEGER NOT NULL DEFAULT 0,
    duration_ms     INTEGER NOT NULL,
    status          TEXT    NOT NULL CHECK (status IN ('success','partial','failed'))
);

CREATE TABLE IF NOT EXISTS apply_log_items (
    log_id       INTEGER NOT NULL REFERENCES apply_log(id) ON DELETE CASCADE,
    kind         TEXT    NOT NULL,
    identifier   TEXT    NOT NULL,
    action       TEXT    NOT NULL CHECK (action IN ('enabled','disabled','skipped','error','missing')),
    message      TEXT,
    PRIMARY KEY (log_id, kind, identifier)
);

CREATE INDEX IF NOT EXISTS idx_apply_log_items_log ON apply_log_items(log_id);

INSERT OR IGNORE INTO schema_version(version) VALUES (1);
```

- [ ] **Step 2: Write schema.sql as a reference copy**

Create `packages/presets/src/schema.sql` with the same content. This is a documentation snapshot — `db.ts` does not read it. (Migrations are the source of truth.)

- [ ] **Step 3: Write db.ts**

```typescript
// packages/presets/src/db.ts
import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = join(
    dirname(fileURLToPath(import.meta.url)),
    "migrations",
);

let cached: Database.Database | null = null;
let cachedPath: string | null = null;

function resolveDbPath(): string {
    const fromEnv = process.env.SKILLS_LECTOR_PRESETS_DB;
    if (fromEnv && fromEnv.trim()) return expandHome(fromEnv.trim());
    return join(homedir(), ".skills-lector", "presets.db");
}

function expandHome(p: string): string {
    if (p === "~") return homedir();
    if (p.startsWith("~/") || p.startsWith("~\\")) {
        return join(homedir(), p.slice(2));
    }
    return p;
}

function loadMigrations(): Array<{ version: number; sql: string; file: string }> {
    if (!existsSync(MIGRATIONS_DIR)) return [];
    const entries = readdirSync(MIGRATIONS_DIR)
        .filter((f) => /^\d{3}_.*\.sql$/.test(f))
        .sort();
    return entries.map((file) => {
        const version = Number(file.slice(0, 3));
        const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
        return { version, sql, file };
    });
}

function currentVersion(db: Database.Database): number {
    try {
        const row = db
            .prepare("SELECT MAX(version) AS v FROM schema_version")
            .get() as { v: number | null } | undefined;
        return row?.v ?? 0;
    } catch {
        return 0; // schema_version table does not exist yet
    }
}

function runMigrations(db: Database.Database): void {
    const migrations = loadMigrations();
    const current = currentVersion(db);
    for (const m of migrations) {
        if (m.version <= current) continue;
        db.exec("BEGIN");
        try {
            db.exec(m.sql);
            db.exec("COMMIT");
        } catch (err) {
            db.exec("ROLLBACK");
            throw new Error(
                `Migration ${m.file} failed: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }
}

export function openDb(): Database.Database {
    const path = resolveDbPath();
    if (cached && cachedPath === path) return cached;
    if (cached) {
        cached.close();
        cached = null;
    }
    mkdirSync(dirname(path), { recursive: true });
    const db = new Database(path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    runMigrations(db);
    cached = db;
    cachedPath = path;
    return db;
}

export function closeDb(): void {
    if (cached) {
        cached.close();
        cached = null;
        cachedPath = null;
    }
}

export function getDbPath(): string {
    return resolveDbPath();
}
```

- [ ] **Step 4: Typecheck**

```bash
cd packages/presets && npx tsc --noEmit
cd ../..
```

Expected: No errors.

- [ ] **Step 5: Smoke test DB bootstrap**

Create a throwaway script `packages/presets/scripts/smoke-db.mjs`:

```javascript
import { openDb, getDbPath } from "../src/db.ts";
// NOTE: this script is for the agent's manual smoke only — delete after verifying
const db = openDb();
console.log("DB path:", getDbPath());
console.log("Tables:", db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
console.log("Version:", db.prepare("SELECT MAX(version) AS v FROM schema_version").get());
```

Actually — we cannot run TS directly with node. Use a tsx-style command:

```bash
cd packages/presets && SKILLS_LECTOR_PRESETS_DB=/tmp/lector-smoke.db npx tsx -e "import('./src/db.ts').then(m => { const db = m.openDb(); console.log('DB path:', m.getDbPath()); console.log('Tables:', db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all()); console.log('Version:', db.prepare('SELECT MAX(version) AS v FROM schema_version').get()); })"
```

On Windows PowerShell, the env-var syntax differs:
```powershell
$env:SKILLS_LECTOR_PRESETS_DB="$env:TEMP/lector-smoke.db"; cd packages/presets; npx tsx -e "..."
```

Expected output: lists 7 tables (`schema_version`, `presets`, `preset_items`, `pinned_items`, `active_preset`, `apply_log`, `apply_log_items`) and `{ v: 1 }`.

If `tsx` is not available, install it as a one-off devDep: `npm install --save-dev tsx --prefix packages/presets`.

After verification, **delete** `/tmp/lector-smoke.db` (and on Windows, `%TEMP%\lector-smoke.db`).

- [ ] **Step 6: Commit**

```bash
git add packages/presets/src/migrations/001_initial.sql packages/presets/src/schema.sql packages/presets/src/db.ts packages/presets/package.json
git commit -m "Add SQLite schema (v1) and migration runner for preset engine"
```

(Include `package.json` if you added `tsx` as a devDep above.)

---

## Phase 2 — Domain functions

### Task 5: Identity and personal-scope item resolution

**Files:**
- Create: `packages/presets/src/identity.ts`

This module is the bridge between the catalog scanners (which see all scopes) and the preset engine (which only operates on personal scope). It converts the scanner's flat list into `{ kind, identifier, currentInvocation, filePath }` filtered to `scope === 'personal'`.

- [ ] **Step 1: Read the relevant scanner types from `packages/core` to confirm field names**

```bash
cd packages/core
```

Read `src/types.ts` — find `Skill` and `Command` (or whatever the scan result item types are called) and confirm:
- The scope field is called `scope` with `"personal"` as one value
- There is a `disableModelInvocation` boolean (or similar) reflecting the frontmatter flag
- There is an absolute `filePath` (or `path`) on each item
- Skill identifier vs command identifier — what field to use

Cross-check by reading `packages/core/src/scanner.ts` and `packages/core/src/command-scanner.ts`. **Do not assume the field names — look them up.** If they differ from what is referenced below, adjust the implementation in Step 2 to match.

- [ ] **Step 2: Write identity.ts**

```typescript
// packages/presets/src/identity.ts
import { homedir } from "node:os";
import { join } from "node:path";
import { scanSkills } from "@lector/core/scanner";
import { scanCommands } from "@lector/core/command-scanner";
import type { FsItem, ItemKind, InvocationState } from "./types";

function personalRoot(): string {
    const fromEnv = process.env.SKILLS_LECTOR_PERSONAL_ROOT;
    if (fromEnv && fromEnv.trim()) {
        return fromEnv.trim() === "~"
            ? homedir()
            : fromEnv.replace(/^~(?=[\\/])/, homedir());
    }
    return join(homedir(), ".claude");
}

/**
 * Resolve a preset_items.identifier back to the absolute filesystem path
 * under the personal scope. Returns null if the file does not exist.
 *
 * Skill identifier "debug-mantra" → ~/.claude/skills/debug-mantra/SKILL.md
 * Command identifier "vendor-install" → ~/.claude/commands/vendor-install.md
 * Command identifier "git:commit" → ~/.claude/commands/git/commit.md
 */
export function resolveItemPath(
    kind: ItemKind,
    identifier: string,
): string {
    const root = personalRoot();
    if (kind === "skill") {
        return join(root, "skills", identifier, "SKILL.md");
    }
    // command: ":" becomes "/" for namespaced commands
    const rel = identifier.replace(/:/g, "/") + ".md";
    return join(root, "commands", rel);
}

/**
 * Scan personal-scope skills + commands and return a unified FsItem list.
 * Re-uses packages/core scanners; filters to scope === 'personal'.
 *
 * NOTE: field names below assume the scanner result shape — verify against
 * packages/core/src/types.ts in Task 5 Step 1 before relying on them.
 */
export function listPersonalItems(opts: { force?: boolean } = {}): FsItem[] {
    const items: FsItem[] = [];
    const skillResult = scanSkills({ force: opts.force });
    for (const s of skillResult.skills) {
        if (s.scope !== "personal") continue;
        const filePath = s.filePath;
        if (!filePath) continue;
        items.push({
            kind: "skill",
            identifier: s.name, // adjust if the scanner exposes a more stable id
            currentInvocation: invocationFromFlag(s.disableModelInvocation),
            filePath,
        });
    }
    const cmdResult = scanCommands({ force: opts.force });
    for (const c of cmdResult.commands) {
        if (c.scope !== "personal") continue;
        const filePath = c.filePath;
        if (!filePath) continue;
        items.push({
            kind: "command",
            identifier: c.name, // command-scanner already namespaces with ":"
            currentInvocation: invocationFromFlag(c.disableModelInvocation),
            filePath,
        });
    }
    return items;
}

function invocationFromFlag(flag: unknown): InvocationState {
    return flag === true ? "disabled" : "enabled";
}
```

If the scanner field names you discovered in Step 1 differ (e.g. `s.disableModelInvocation` is actually `s.frontmatter.disable_model_invocation`), adjust the property paths in Step 2 to match. **The plan is a guide — the source code is the truth.**

- [ ] **Step 3: Typecheck**

```bash
cd packages/presets && npx tsc --noEmit
cd ../..
```

Expected: No errors. If errors point to wrong field paths on scanner results, fix and re-typecheck.

- [ ] **Step 4: Smoke verification**

```bash
cd packages/presets && npx tsx -e "import('./src/identity.ts').then(m => { console.log('Personal items:', m.listPersonalItems().slice(0, 5)); console.log('Path for skill debug-mantra:', m.resolveItemPath('skill', 'debug-mantra')); console.log('Path for command git:commit:', m.resolveItemPath('command', 'git:commit')); })"
```

Expected: list of `FsItem` records (length depends on user's `~/.claude/skills`), correct resolved paths.

- [ ] **Step 5: Commit**

```bash
git add packages/presets/src/identity.ts
git commit -m "Add identity module — resolve preset identifiers ↔ personal-scope paths"
```

---

### Task 6: Atomic frontmatter writer

**Files:**
- Create: `packages/presets/src/frontmatter.ts`

- [ ] **Step 1: Read existing frontmatter helpers in core to reuse parsing**

Read `packages/core/src/frontmatter.ts` (and `skill-parser.ts` / `command-parser.ts` if needed). Identify whether `gray-matter` is the right tool to use directly, or whether there's a wrapper that handles the lenient YAML cases. **Prefer reusing the existing wrapper** to keep behavior consistent.

- [ ] **Step 2: Write frontmatter.ts**

```typescript
// packages/presets/src/frontmatter.ts
import matter from "gray-matter";
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { InvocationState } from "./types";

/**
 * Read the disable-model-invocation flag from a file's frontmatter.
 * Returns "disabled" if the flag is truthy, "enabled" otherwise (including missing key).
 * Throws if the file is unreadable or the frontmatter cannot be parsed at all.
 */
export function readInvocation(filePath: string): InvocationState {
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const src = readFileSync(filePath, "utf8");
    const parsed = matter(src);
    const flag = parsed.data?.["disable-model-invocation"];
    return flag === true ? "disabled" : "enabled";
}

/**
 * Atomically write the disable-model-invocation flag to a file's frontmatter.
 * - to "enabled":   removes the key entirely (cleaner than setting to false)
 * - to "disabled":  sets the key to true
 * Uses temp-file + rename for atomicity. exFAT supports rename for files
 * (it's symlinks that fail).
 */
export function writeInvocation(filePath: string, state: InvocationState): void {
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const src = readFileSync(filePath, "utf8");
    const parsed = matter(src);
    const data = { ...(parsed.data ?? {}) };
    if (state === "disabled") {
        data["disable-model-invocation"] = true;
    } else {
        delete data["disable-model-invocation"];
    }
    const out = matter.stringify(parsed.content, data);
    const tmp = filePath + ".tmp-preset-" + process.pid + "-" + Date.now();
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(tmp, out, "utf8");
    renameSync(tmp, filePath);
}
```

- [ ] **Step 3: Typecheck**

```bash
cd packages/presets && npx tsc --noEmit
cd ../..
```

Expected: No errors.

- [ ] **Step 4: Smoke verification — round-trip**

Create a throwaway SKILL.md for testing, run readInvocation → writeInvocation('disabled') → readInvocation → writeInvocation('enabled') → readInvocation. Verify the file content makes sense.

```bash
# Bash / Git Bash:
TMPSKILL=/tmp/lector-fm-test.md
cat > $TMPSKILL <<'EOF'
---
name: test
description: test skill
---
# Body
EOF
cd packages/presets && npx tsx -e "
import('./src/frontmatter.ts').then(async (m) => {
  console.log('initial:', m.readInvocation('$TMPSKILL'));
  m.writeInvocation('$TMPSKILL', 'disabled');
  console.log('after disable:', m.readInvocation('$TMPSKILL'));
  m.writeInvocation('$TMPSKILL', 'enabled');
  console.log('after enable:', m.readInvocation('$TMPSKILL'));
});
"
cat $TMPSKILL
rm $TMPSKILL
cd ../..
```

Expected:
```
initial: enabled
after disable: disabled
after enable: enabled
```
And the final file should have no `disable-model-invocation` key in the frontmatter.

On Windows PowerShell, adapt the path to `$env:TEMP\lector-fm-test.md` and the env-var syntax accordingly.

- [ ] **Step 5: Commit**

```bash
git add packages/presets/src/frontmatter.ts
git commit -m "Add atomic frontmatter writer for disable-model-invocation toggle"
```

---

### Task 7: Pure diff function

**Files:**
- Create: `packages/presets/src/diff.ts`

- [ ] **Step 1: Write diff.ts**

```typescript
// packages/presets/src/diff.ts
import type {
    ApplyDiff,
    ApplyDiffEntry,
    FsItem,
    PinnedItem,
    PresetItem,
} from "./types";

type DiffInput = {
    presetItems: Pick<PresetItem, "kind" | "identifier">[];
    pinnedItems: Pick<PinnedItem, "kind" | "identifier">[];
    fsItems: FsItem[];
};

function key(kind: string, id: string): string {
    return `${kind}::${id}`;
}

/**
 * Pure function — computes what would happen if we applied the given preset.
 * Does not touch the filesystem or the database.
 *
 * Rules:
 *  - targetEnabled = presetItems ∪ pinnedItems
 *  - For each fsItem:
 *      pinned                                  → skipped("pinned")
 *      in preset and currently enabled         → skipped("already-correct")
 *      in preset and currently disabled        → ENABLE
 *      not in preset and currently enabled     → DISABLE
 *      not in preset and currently disabled    → skipped("already-correct")
 *  - For each presetItem absent from fsItems   → missing
 *
 * Pinned overrides preset: if an item is in the preset but also pinned,
 * it is skipped with reason "pinned" (and stays enabled).
 */
export function computeApplyDiff(input: DiffInput): ApplyDiff {
    const pinnedKeys = new Set(
        input.pinnedItems.map((p) => key(p.kind, p.identifier)),
    );
    const presetKeys = new Set(
        input.presetItems.map((p) => key(p.kind, p.identifier)),
    );
    const fsKeys = new Set(input.fsItems.map((f) => key(f.kind, f.identifier)));

    const enabled: ApplyDiffEntry[] = [];
    const disabled: ApplyDiffEntry[] = [];
    const skipped: ApplyDiffEntry[] = [];
    const missing: ApplyDiffEntry[] = [];

    for (const fsItem of input.fsItems) {
        const k = key(fsItem.kind, fsItem.identifier);
        const entry: ApplyDiffEntry = {
            kind: fsItem.kind,
            identifier: fsItem.identifier,
            fromState: fsItem.currentInvocation,
        };
        if (pinnedKeys.has(k)) {
            skipped.push({ ...entry, reason: "pinned" });
            continue;
        }
        const wanted = presetKeys.has(k);
        if (wanted && fsItem.currentInvocation === "enabled") {
            skipped.push({ ...entry, reason: "already-correct" });
        } else if (wanted && fsItem.currentInvocation === "disabled") {
            enabled.push({ ...entry, toState: "enabled" });
        } else if (!wanted && fsItem.currentInvocation === "enabled") {
            disabled.push({ ...entry, toState: "disabled" });
        } else {
            // !wanted && currently disabled
            skipped.push({ ...entry, reason: "already-correct" });
        }
    }

    for (const p of input.presetItems) {
        const k = key(p.kind, p.identifier);
        if (!fsKeys.has(k)) {
            missing.push({ kind: p.kind, identifier: p.identifier });
        }
    }

    return { enabled, disabled, skipped, missing };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/presets && npx tsc --noEmit
cd ../..
```

Expected: No errors.

- [ ] **Step 3: Smoke verification — exercise the 5 branches**

```bash
cd packages/presets && npx tsx -e "
import('./src/diff.ts').then((m) => {
  const fs = [
    { kind: 'skill', identifier: 'a', currentInvocation: 'disabled', filePath: '/x' }, // in preset, disabled → ENABLE
    { kind: 'skill', identifier: 'b', currentInvocation: 'enabled',  filePath: '/x' }, // in preset, enabled  → SKIP already-correct
    { kind: 'skill', identifier: 'c', currentInvocation: 'enabled',  filePath: '/x' }, // not in preset, enabled  → DISABLE
    { kind: 'skill', identifier: 'd', currentInvocation: 'disabled', filePath: '/x' }, // not in preset, disabled → SKIP already-correct
    { kind: 'skill', identifier: 'e', currentInvocation: 'disabled', filePath: '/x' }, // pinned → SKIP pinned
  ];
  const preset = [{ kind:'skill', identifier:'a'},{kind:'skill', identifier:'b'},{kind:'skill', identifier:'e'},{kind:'skill', identifier:'gone'}];
  const pinned = [{ kind:'skill', identifier:'e' }];
  const out = m.computeApplyDiff({ presetItems: preset, pinnedItems: pinned, fsItems: fs });
  console.log(JSON.stringify(out, null, 2));
});
"
cd ../..
```

Expected output should show:
- enabled: `[{ identifier: 'a', toState: 'enabled', ... }]`
- disabled: `[{ identifier: 'c', toState: 'disabled', ... }]`
- skipped: `b (already-correct), d (already-correct), e (pinned)`
- missing: `[{ identifier: 'gone' }]`

- [ ] **Step 4: Commit**

```bash
git add packages/presets/src/diff.ts
git commit -m "Add pure computeApplyDiff — preset + pinned + fs state → diff"
```

---

### Task 8: Preset CRUD

**Files:**
- Create: `packages/presets/src/presets.ts`

- [ ] **Step 1: Write presets.ts**

```typescript
// packages/presets/src/presets.ts
import type Database from "better-sqlite3";
import { openDb } from "./db";
import type { Preset, PresetItem, ActiveState, ItemKind } from "./types";

type DbPresetRow = {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    color: string | null;
    archived_at: string | null;
    created_at: string;
    updated_at: string;
};

function rowToPreset(r: DbPresetRow): Preset {
    return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        color: r.color,
        archivedAt: r.archived_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    };
}

function nowIso(): string {
    return new Date().toISOString();
}

export type ListPresetsOptions = { status?: "active" | "archived" | "all" };

export function listPresets(opts: ListPresetsOptions = {}): Preset[] {
    const db = openDb();
    const status = opts.status ?? "active";
    let where = "";
    if (status === "active") where = "WHERE archived_at IS NULL";
    else if (status === "archived") where = "WHERE archived_at IS NOT NULL";
    const rows = db
        .prepare(
            `SELECT id, slug, name, description, color, archived_at, created_at, updated_at FROM presets ${where} ORDER BY updated_at DESC`,
        )
        .all() as DbPresetRow[];
    return rows.map(rowToPreset);
}

export function getPreset(id: number): Preset | null {
    const db = openDb();
    const row = db
        .prepare(
            `SELECT id, slug, name, description, color, archived_at, created_at, updated_at FROM presets WHERE id = ?`,
        )
        .get(id) as DbPresetRow | undefined;
    return row ? rowToPreset(row) : null;
}

export function getPresetBySlug(slug: string): Preset | null {
    const db = openDb();
    const row = db
        .prepare(
            `SELECT id, slug, name, description, color, archived_at, created_at, updated_at FROM presets WHERE slug = ?`,
        )
        .get(slug) as DbPresetRow | undefined;
    return row ? rowToPreset(row) : null;
}

export type CreatePresetInput = {
    slug: string;
    name: string;
    description?: string | null;
    color?: string | null;
};

export class SlugCollisionError extends Error {
    constructor(slug: string) {
        super(`Preset slug already exists: ${slug}`);
        this.name = "SlugCollisionError";
    }
}

export function createPreset(input: CreatePresetInput): Preset {
    const db = openDb();
    const existing = getPresetBySlug(input.slug);
    if (existing) throw new SlugCollisionError(input.slug);
    const ts = nowIso();
    const info = db
        .prepare(
            `INSERT INTO presets (slug, name, description, color, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
            input.slug,
            input.name,
            input.description ?? null,
            input.color ?? null,
            ts,
            ts,
        );
    const created = getPreset(Number(info.lastInsertRowid));
    if (!created) throw new Error("Failed to load created preset");
    return created;
}

export type UpdatePresetInput = {
    name?: string;
    description?: string | null;
    color?: string | null;
    slug?: string;
};

export function updatePreset(id: number, input: UpdatePresetInput): Preset {
    const db = openDb();
    const current = getPreset(id);
    if (!current) throw new Error(`Preset not found: ${id}`);
    if (current.archivedAt) throw new Error("Cannot edit an archived preset");
    if (input.slug && input.slug !== current.slug) {
        const collide = getPresetBySlug(input.slug);
        if (collide) throw new SlugCollisionError(input.slug);
    }
    const next = {
        slug: input.slug ?? current.slug,
        name: input.name ?? current.name,
        description:
            input.description === undefined ? current.description : input.description,
        color: input.color === undefined ? current.color : input.color,
        updated_at: nowIso(),
    };
    db.prepare(
        `UPDATE presets SET slug = ?, name = ?, description = ?, color = ?, updated_at = ? WHERE id = ?`,
    ).run(next.slug, next.name, next.description, next.color, next.updated_at, id);
    return getPreset(id)!;
}

export function archivePreset(id: number): Preset {
    const db = openDb();
    const current = getPreset(id);
    if (!current) throw new Error(`Preset not found: ${id}`);
    if (current.archivedAt) return current;
    const ts = nowIso();
    db.transaction(() => {
        db.prepare(`UPDATE presets SET archived_at = ?, updated_at = ? WHERE id = ?`).run(
            ts,
            ts,
            id,
        );
        // If this preset is active, clear active_preset
        db.prepare(
            `UPDATE active_preset SET preset_id = NULL, activated_at = ? WHERE preset_id = ?`,
        ).run(ts, id);
    })();
    return getPreset(id)!;
}

export function unarchivePreset(id: number): Preset {
    const db = openDb();
    const current = getPreset(id);
    if (!current) throw new Error(`Preset not found: ${id}`);
    if (!current.archivedAt) return current;
    const ts = nowIso();
    db.prepare(`UPDATE presets SET archived_at = NULL, updated_at = ? WHERE id = ?`).run(
        ts,
        id,
    );
    return getPreset(id)!;
}

// preset_items

type DbPresetItemRow = {
    preset_id: number;
    kind: ItemKind;
    identifier: string;
    added_at: string;
};

function rowToItem(r: DbPresetItemRow): PresetItem {
    return {
        presetId: r.preset_id,
        kind: r.kind,
        identifier: r.identifier,
        addedAt: r.added_at,
    };
}

export function listPresetItems(presetId: number): PresetItem[] {
    const db = openDb();
    const rows = db
        .prepare(
            `SELECT preset_id, kind, identifier, added_at FROM preset_items WHERE preset_id = ? ORDER BY kind, identifier`,
        )
        .all(presetId) as DbPresetItemRow[];
    return rows.map(rowToItem);
}

export function addItem(
    presetId: number,
    kind: ItemKind,
    identifier: string,
): PresetItem {
    const db = openDb();
    const preset = getPreset(presetId);
    if (!preset) throw new Error(`Preset not found: ${presetId}`);
    if (preset.archivedAt) throw new Error("Cannot edit an archived preset");
    const ts = nowIso();
    db.prepare(
        `INSERT OR IGNORE INTO preset_items (preset_id, kind, identifier, added_at) VALUES (?, ?, ?, ?)`,
    ).run(presetId, kind, identifier, ts);
    db.prepare(`UPDATE presets SET updated_at = ? WHERE id = ?`).run(ts, presetId);
    return {
        presetId,
        kind,
        identifier,
        addedAt: ts,
    };
}

export function removeItem(
    presetId: number,
    kind: ItemKind,
    identifier: string,
): void {
    const db = openDb();
    const preset = getPreset(presetId);
    if (!preset) throw new Error(`Preset not found: ${presetId}`);
    if (preset.archivedAt) throw new Error("Cannot edit an archived preset");
    const ts = nowIso();
    db.prepare(
        `DELETE FROM preset_items WHERE preset_id = ? AND kind = ? AND identifier = ?`,
    ).run(presetId, kind, identifier);
    db.prepare(`UPDATE presets SET updated_at = ? WHERE id = ?`).run(ts, presetId);
}

// active_preset

export function getActiveState(): ActiveState {
    const db = openDb();
    const row = db
        .prepare(`SELECT preset_id, activated_at FROM active_preset WHERE id = 1`)
        .get() as { preset_id: number | null; activated_at: string } | undefined;
    if (!row) return { presetId: null, activatedAt: null };
    return { presetId: row.preset_id, activatedAt: row.activated_at };
}

export function setActiveState(db: Database.Database, presetId: number | null): void {
    const ts = nowIso();
    db.prepare(
        `INSERT INTO active_preset (id, preset_id, activated_at) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET preset_id = excluded.preset_id, activated_at = excluded.activated_at`,
    ).run(presetId, ts);
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/presets && npx tsc --noEmit
cd ../..
```

Expected: No errors.

- [ ] **Step 3: Smoke verification — create + list + archive + unarchive**

```bash
cd packages/presets && SKILLS_LECTOR_PRESETS_DB=/tmp/lector-presets-smoke.db npx tsx -e "
import('./src/presets.ts').then((m) => {
  const p = m.createPreset({ slug: 'debugging', name: 'Debugging' });
  console.log('created:', p);
  m.addItem(p.id, 'skill', 'debug-mantra');
  m.addItem(p.id, 'command', 'commit');
  console.log('items:', m.listPresetItems(p.id));
  console.log('active list:', m.listPresets({ status: 'active' }));
  m.archivePreset(p.id);
  console.log('after archive — active list:', m.listPresets({ status: 'active' }));
  console.log('after archive — archived list:', m.listPresets({ status: 'archived' }));
  m.unarchivePreset(p.id);
  console.log('after unarchive — active list:', m.listPresets({ status: 'active' }));
  try { m.createPreset({ slug: 'debugging', name: 'Dup' }); } catch (e) { console.log('slug collision:', e.message); }
});
"
rm /tmp/lector-presets-smoke.db
cd ../..
```

Expected: create succeeds, items appear, archive moves preset out of active list, unarchive restores, slug collision throws `SlugCollisionError`.

- [ ] **Step 4: Commit**

```bash
git add packages/presets/src/presets.ts
git commit -m "Add preset CRUD — create/list/get/update/archive/unarchive + items + active state"
```

---

### Task 9: Pinned items CRUD

**Files:**
- Create: `packages/presets/src/pinned.ts`

- [ ] **Step 1: Write pinned.ts**

```typescript
// packages/presets/src/pinned.ts
import { openDb } from "./db";
import type { PinnedItem, ItemKind } from "./types";

type DbPinnedRow = {
    kind: ItemKind;
    identifier: string;
    pinned_at: string;
    reason: string | null;
    archived_at: string | null;
};

function rowToPinned(r: DbPinnedRow): PinnedItem {
    return {
        kind: r.kind,
        identifier: r.identifier,
        pinnedAt: r.pinned_at,
        reason: r.reason,
        archivedAt: r.archived_at,
    };
}

function nowIso(): string {
    return new Date().toISOString();
}

export type ListPinnedOptions = { status?: "active" | "archived" | "all" };

export function listPinned(opts: ListPinnedOptions = {}): PinnedItem[] {
    const db = openDb();
    const status = opts.status ?? "active";
    let where = "";
    if (status === "active") where = "WHERE archived_at IS NULL";
    else if (status === "archived") where = "WHERE archived_at IS NOT NULL";
    const rows = db
        .prepare(
            `SELECT kind, identifier, pinned_at, reason, archived_at FROM pinned_items ${where} ORDER BY kind, identifier`,
        )
        .all() as DbPinnedRow[];
    return rows.map(rowToPinned);
}

export function addPin(
    kind: ItemKind,
    identifier: string,
    reason?: string | null,
): PinnedItem {
    const db = openDb();
    const ts = nowIso();
    db.prepare(
        `INSERT INTO pinned_items (kind, identifier, pinned_at, reason)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(kind, identifier) DO UPDATE SET
           pinned_at = excluded.pinned_at,
           reason    = excluded.reason,
           archived_at = NULL`,
    ).run(kind, identifier, ts, reason ?? null);
    const row = db
        .prepare(
            `SELECT kind, identifier, pinned_at, reason, archived_at FROM pinned_items WHERE kind = ? AND identifier = ?`,
        )
        .get(kind, identifier) as DbPinnedRow;
    return rowToPinned(row);
}

export function archivePin(kind: ItemKind, identifier: string): void {
    const db = openDb();
    const ts = nowIso();
    db.prepare(
        `UPDATE pinned_items SET archived_at = ? WHERE kind = ? AND identifier = ?`,
    ).run(ts, kind, identifier);
}

export function unarchivePin(kind: ItemKind, identifier: string): void {
    const db = openDb();
    db.prepare(
        `UPDATE pinned_items SET archived_at = NULL WHERE kind = ? AND identifier = ?`,
    ).run(kind, identifier);
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/presets && npx tsc --noEmit
cd ../..
```

Expected: No errors.

- [ ] **Step 3: Smoke verification**

```bash
cd packages/presets && SKILLS_LECTOR_PRESETS_DB=/tmp/lector-pinned-smoke.db npx tsx -e "
import('./src/pinned.ts').then((m) => {
  m.addPin('skill', 'using-superpowers', 'always-on essentials');
  m.addPin('command', 'vendor-install', null);
  console.log('active pins:', m.listPinned());
  m.archivePin('skill', 'using-superpowers');
  console.log('after archive — active:', m.listPinned());
  console.log('after archive — archived:', m.listPinned({ status: 'archived' }));
  m.unarchivePin('skill', 'using-superpowers');
  console.log('after unarchive — active:', m.listPinned());
});
"
rm /tmp/lector-pinned-smoke.db
cd ../..
```

Expected: add succeeds, archive/unarchive flip the `archivedAt` field.

- [ ] **Step 4: Commit**

```bash
git add packages/presets/src/pinned.ts
git commit -m "Add pinned items CRUD with soft-delete semantics"
```

---

### Task 10: Apply orchestrator + log reader + event emitter

**Files:**
- Create: `packages/presets/src/events.ts`
- Create: `packages/presets/src/log.ts`
- Create: `packages/presets/src/activate.ts`

- [ ] **Step 1: Write events.ts (lightweight per-call emitter)**

```typescript
// packages/presets/src/events.ts
import type { ApplyEvent } from "./types";

export type EventListener = (e: ApplyEvent) => void;

export class ApplyEventBus {
    private listeners: Set<EventListener> = new Set();
    emit(e: ApplyEvent): void {
        for (const fn of this.listeners) {
            try {
                fn(e);
            } catch {
                // listener errors are swallowed — they must not affect the apply
            }
        }
    }
    on(fn: EventListener): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
}
```

- [ ] **Step 2: Write log.ts**

```typescript
// packages/presets/src/log.ts
import { openDb } from "./db";
import type { ApplyLog, ApplyLogItem, ItemKind, ApplyAction } from "./types";

type DbLogRow = {
    id: number;
    ts: string;
    from_preset_id: number | null;
    to_preset_id: number | null;
    enabled_count: number;
    disabled_count: number;
    skipped_count: number;
    error_count: number;
    duration_ms: number;
    status: "success" | "partial" | "failed";
};

function rowToLog(r: DbLogRow): ApplyLog {
    return {
        id: r.id,
        ts: r.ts,
        fromPresetId: r.from_preset_id,
        toPresetId: r.to_preset_id,
        enabledCount: r.enabled_count,
        disabledCount: r.disabled_count,
        skippedCount: r.skipped_count,
        errorCount: r.error_count,
        durationMs: r.duration_ms,
        status: r.status,
    };
}

export type ListLogOptions = {
    limit?: number;
    offset?: number;
    presetId?: number;
};

export function listApplyLog(opts: ListLogOptions = {}): ApplyLog[] {
    const db = openDb();
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    let sql = `SELECT id, ts, from_preset_id, to_preset_id, enabled_count, disabled_count, skipped_count, error_count, duration_ms, status FROM apply_log`;
    const params: unknown[] = [];
    if (opts.presetId !== undefined) {
        sql += ` WHERE from_preset_id = ? OR to_preset_id = ?`;
        params.push(opts.presetId, opts.presetId);
    }
    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const rows = db.prepare(sql).all(...params) as DbLogRow[];
    return rows.map(rowToLog);
}

type DbLogItemRow = {
    log_id: number;
    kind: ItemKind;
    identifier: string;
    action: ApplyAction;
    message: string | null;
};

export function getApplyLogItems(logId: number): ApplyLogItem[] {
    const db = openDb();
    const rows = db
        .prepare(
            `SELECT log_id, kind, identifier, action, message FROM apply_log_items WHERE log_id = ? ORDER BY kind, identifier`,
        )
        .all(logId) as DbLogItemRow[];
    return rows.map((r) => ({
        logId: r.log_id,
        kind: r.kind,
        identifier: r.identifier,
        action: r.action,
        message: r.message,
    }));
}
```

- [ ] **Step 3: Write activate.ts**

```typescript
// packages/presets/src/activate.ts
import { openDb } from "./db";
import { computeApplyDiff } from "./diff";
import { ApplyEventBus } from "./events";
import { writeInvocation } from "./frontmatter";
import { listPersonalItems, resolveItemPath } from "./identity";
import {
    getActiveState,
    getPreset,
    listPresetItems,
    setActiveState,
} from "./presets";
import { listPinned } from "./pinned";
import type {
    ApplyDiffEntry,
    ApplyOptions,
    ApplyResult,
} from "./types";

const ENABLED_REMOVES_KEY = true; // documentation marker; see frontmatter.writeInvocation

export type ApplyDeps = {
    bus?: ApplyEventBus;
};

export function applyPreset(
    presetId: number,
    opts: ApplyOptions = {},
    deps: ApplyDeps = {},
): ApplyResult {
    const bus = deps.bus;
    const start = Date.now();
    const preset = getPreset(presetId);
    if (!preset) throw new Error(`Preset not found: ${presetId}`);
    if (preset.archivedAt) throw new Error("Cannot activate an archived preset");

    bus?.emit({ phase: "scanning" });
    const fsItems = listPersonalItems({ force: true });
    const presetItems = listPresetItems(presetId);
    const pinnedItems = listPinned({ status: "active" });

    const diff = computeApplyDiff({ presetItems, pinnedItems, fsItems });
    bus?.emit({ phase: "diff", diff });

    // Early no-op exit
    if (
        diff.enabled.length === 0 &&
        diff.disabled.length === 0 &&
        !opts.force &&
        !opts.dryRun
    ) {
        // Still set this as active so the user sees the "active" badge
        const db = openDb();
        const noopLogId = writeLog(db, {
            fromPresetId: getActiveState().presetId,
            toPresetId: presetId,
            diff,
            errors: [],
            durationMs: Date.now() - start,
            status: "success",
        });
        bus?.emit({
            phase: "done",
            result: {
                ...diff,
                status: "success",
                logId: noopLogId,
                errors: [],
                durationMs: Date.now() - start,
            },
        });
        return {
            ...diff,
            status: "success",
            logId: noopLogId,
            errors: [],
            durationMs: Date.now() - start,
        };
    }

    if (opts.dryRun) {
        const result: ApplyResult = {
            ...diff,
            status: "success",
            logId: null,
            errors: [],
            durationMs: Date.now() - start,
        };
        bus?.emit({ phase: "done", result });
        return result;
    }

    // Apply per-file, sequential. Touch enables first so user-pinned tools come
    // up before anything else gets disabled.
    const errors: ApplyDiffEntry[] = [];
    const enabledTotal = diff.enabled.length;
    const disabledTotal = diff.disabled.length;
    let ei = 0;
    for (const item of diff.enabled) {
        ei += 1;
        bus?.emit({
            phase: "enabling",
            current: ei,
            total: enabledTotal,
            currentItem: { kind: item.kind, identifier: item.identifier },
        });
        try {
            const path = resolveItemPath(item.kind, item.identifier);
            writeInvocation(path, "enabled");
        } catch (err) {
            errors.push({
                kind: item.kind,
                identifier: item.identifier,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    let di = 0;
    for (const item of diff.disabled) {
        di += 1;
        bus?.emit({
            phase: "disabling",
            current: di,
            total: disabledTotal,
            currentItem: { kind: item.kind, identifier: item.identifier },
        });
        try {
            const path = resolveItemPath(item.kind, item.identifier);
            writeInvocation(path, "disabled");
        } catch (err) {
            errors.push({
                kind: item.kind,
                identifier: item.identifier,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }

    bus?.emit({ phase: "logging" });
    const db = openDb();
    const status: ApplyResult["status"] = errors.length === 0
        ? "success"
        : errors.length === enabledTotal + disabledTotal
            ? "failed"
            : "partial";
    const logId = writeLog(db, {
        fromPresetId: getActiveState().presetId,
        toPresetId: presetId,
        diff,
        errors,
        durationMs: Date.now() - start,
        status,
    });

    // Invalidate scanner cache so the next catalog read reflects new state.
    // The scanner caches per-process for 8s; force-bypass on next call by reading
    // with { force: true } from API routes. The cache itself has no public reset
    // hook — but listPersonalItems uses { force: true } so any future readers
    // hit fresh data once they pass force themselves. Documented in CLAUDE.md.

    const result: ApplyResult = {
        ...diff,
        status,
        logId,
        errors,
        durationMs: Date.now() - start,
    };
    bus?.emit({ phase: "done", result });
    return result;
}

type WriteLogInput = {
    fromPresetId: number | null;
    toPresetId: number;
    diff: { enabled: ApplyDiffEntry[]; disabled: ApplyDiffEntry[]; skipped: ApplyDiffEntry[]; missing: ApplyDiffEntry[] };
    errors: ApplyDiffEntry[];
    durationMs: number;
    status: "success" | "partial" | "failed";
};

function writeLog(db: ReturnType<typeof openDb>, input: WriteLogInput): number {
    return db.transaction(() => {
        const ts = new Date().toISOString();
        const info = db
            .prepare(
                `INSERT INTO apply_log (ts, from_preset_id, to_preset_id, enabled_count, disabled_count, skipped_count, error_count, duration_ms, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
                ts,
                input.fromPresetId,
                input.toPresetId,
                input.diff.enabled.length - countErrors(input.errors, input.diff.enabled),
                input.diff.disabled.length - countErrors(input.errors, input.diff.disabled),
                input.diff.skipped.length,
                input.errors.length,
                input.durationMs,
                input.status,
            );
        const logId = Number(info.lastInsertRowid);

        const insertItem = db.prepare(
            `INSERT OR IGNORE INTO apply_log_items (log_id, kind, identifier, action, message) VALUES (?, ?, ?, ?, ?)`,
        );

        // Build a quick lookup of failed identifiers
        const errorSet = new Set(input.errors.map((e) => `${e.kind}::${e.identifier}`));

        for (const e of input.diff.enabled) {
            const k = `${e.kind}::${e.identifier}`;
            if (errorSet.has(k)) {
                const err = input.errors.find((x) => `${x.kind}::${x.identifier}` === k);
                insertItem.run(logId, e.kind, e.identifier, "error", err?.message ?? null);
            } else {
                insertItem.run(logId, e.kind, e.identifier, "enabled", null);
            }
        }
        for (const d of input.diff.disabled) {
            const k = `${d.kind}::${d.identifier}`;
            if (errorSet.has(k)) {
                const err = input.errors.find((x) => `${x.kind}::${x.identifier}` === k);
                insertItem.run(logId, d.kind, d.identifier, "error", err?.message ?? null);
            } else {
                insertItem.run(logId, d.kind, d.identifier, "disabled", null);
            }
        }
        for (const s of input.diff.skipped) {
            insertItem.run(logId, s.kind, s.identifier, "skipped", s.reason ?? null);
        }
        for (const m of input.diff.missing) {
            insertItem.run(logId, m.kind, m.identifier, "missing", null);
        }

        setActiveState(db, input.toPresetId);
        return logId;
    })();
}

function countErrors(errors: ApplyDiffEntry[], pool: ApplyDiffEntry[]): number {
    const poolKeys = new Set(pool.map((p) => `${p.kind}::${p.identifier}`));
    return errors.filter((e) => poolKeys.has(`${e.kind}::${e.identifier}`)).length;
}
```

- [ ] **Step 4: Typecheck**

```bash
cd packages/presets && npx tsc --noEmit
cd ../..
```

Expected: No errors.

- [ ] **Step 5: Smoke verification (end-to-end without UI)**

This is the most important smoke gate. Set up a fake `~/.claude` somewhere safe, populate two skills, run a dry-run apply, then a real apply, then read the log.

```bash
# Bash:
TMPHOME=/tmp/lector-e2e
rm -rf $TMPHOME
mkdir -p $TMPHOME/skills/foo-skill $TMPHOME/skills/bar-skill $TMPHOME/commands
cat > $TMPHOME/skills/foo-skill/SKILL.md <<'EOF'
---
name: foo-skill
description: a foo skill
---
# Foo
EOF
cat > $TMPHOME/skills/bar-skill/SKILL.md <<'EOF'
---
name: bar-skill
description: a bar skill
disable-model-invocation: true
---
# Bar
EOF
cat > $TMPHOME/commands/hello.md <<'EOF'
---
description: hello
---
say hi
EOF

cd packages/presets && \
  SKILLS_LECTOR_PRESETS_DB=/tmp/lector-e2e.db \
  SKILLS_LECTOR_PERSONAL_ROOT=$TMPHOME \
  npx tsx -e "
import('./src/presets.ts').then(async (P) => {
  const { addItem, createPreset } = P;
  const { applyPreset } = await import('./src/activate.ts');
  const { listApplyLog, getApplyLogItems } = await import('./src/log.ts');
  const p = createPreset({ slug: 'work', name: 'Work' });
  addItem(p.id, 'skill', 'foo-skill');
  addItem(p.id, 'skill', 'bar-skill');
  addItem(p.id, 'command', 'hello');
  addItem(p.id, 'skill', 'does-not-exist');
  console.log('--- dry run ---');
  console.log(applyPreset(p.id, { dryRun: true }));
  console.log('--- real apply ---');
  console.log(applyPreset(p.id));
  console.log('--- log ---');
  const logs = listApplyLog();
  console.log(logs);
  console.log(getApplyLogItems(logs[0].id));
});
"
echo '--- foo-skill (should NOT have disable-model-invocation):'
cat $TMPHOME/skills/foo-skill/SKILL.md
echo '--- bar-skill (should NOT have disable-model-invocation any more):'
cat $TMPHOME/skills/bar-skill/SKILL.md
rm -rf $TMPHOME /tmp/lector-e2e.db
cd ../..
```

Expected:
- Dry-run shows `enabled: [bar-skill]` (it was disabled, now will be enabled), no real change
- Real apply succeeds, log has correct counts, missing includes `does-not-exist`
- After apply, both `foo-skill/SKILL.md` and `bar-skill/SKILL.md` have no `disable-model-invocation:` line

On Windows PowerShell, adapt env-var syntax and use `$env:TEMP` for the tmp dir.

- [ ] **Step 6: Commit**

```bash
git add packages/presets/src/events.ts packages/presets/src/log.ts packages/presets/src/activate.ts
git commit -m "Add applyPreset orchestrator + ApplyEventBus + log reader"
```

---

## Phase 3 — API routes

### Task 11: Install zod + TanStack Query in apps/web; add Providers wrapper

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/app/providers.tsx`
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Install dependencies**

```bash
cd apps/web && npm install zod@^3.23.8 @tanstack/react-query@^5.59.0 && npm install --save-dev @tanstack/react-query-devtools@^5.59.0
cd ../..
```

- [ ] **Step 2: Write providers.tsx**

```tsx
// apps/web/app/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useState } from "react";

function makeQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                refetchOnWindowFocus: false,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
    if (typeof window === "undefined") {
        // Server: always make a fresh client (per-request)
        return makeQueryClient();
    }
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
    const [client] = useState(getQueryClient);
    return (
        <QueryClientProvider client={client}>
            {children}
            {process.env.NODE_ENV === "development" ? (
                <ReactQueryDevtools initialIsOpen={false} />
            ) : null}
        </QueryClientProvider>
    );
}
```

- [ ] **Step 3: Modify layout.tsx**

Read `apps/web/app/layout.tsx` and wrap the existing body content inside `<Providers>...</Providers>`. Preserve all existing classes / theme / nav components. Add the import:

```tsx
import { Providers } from "./providers";
```

Wrap whatever is currently rendered inside `<body>` so it becomes:

```tsx
<body className={...}>
    <Providers>
        {/* existing content */}
    </Providers>
</body>
```

- [ ] **Step 4: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

Expected: build succeeds. The Providers component is loaded but no client uses queries yet.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/package-lock.json apps/web/app/providers.tsx apps/web/app/layout.tsx
git commit -m "Add TanStack Query Providers + zod for upcoming /presets routes"
```

---

### Task 12: API routes — preset CRUD

**Files:**
- Create: `apps/web/app/api/presets/route.ts`
- Create: `apps/web/app/api/presets/[id]/route.ts`
- Create: `apps/web/app/api/presets/[id]/archive/route.ts`
- Create: `apps/web/app/api/presets/[id]/unarchive/route.ts`

For each route below, follow the established pattern of `apps/web/app/api/skills/route.ts` (read it first to match the response envelope shape, error handling, and content type).

- [ ] **Step 1: Read existing API route for style reference**

```bash
```

Read `apps/web/app/api/skills/route.ts`, `apps/web/app/api/commands/route.ts` to confirm:
- Response shape (`return Response.json(data)` vs `NextResponse.json(...)`)
- Whether routes use `export const dynamic = "force-dynamic"`
- How errors are surfaced (status code + body shape)

Match those conventions in all preset routes.

- [ ] **Step 2: Write `apps/web/app/api/presets/route.ts`**

```typescript
// apps/web/app/api/presets/route.ts
import { z } from "zod";
import {
    createPreset,
    getActiveState,
    listPresets,
    SlugCollisionError,
} from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const CreateBody = z.object({
    slug: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1).max(120),
    description: z.string().max(500).nullable().optional(),
    color: z.string().max(32).nullable().optional(),
});

const ListQuery = z.object({
    status: z.enum(["active", "archived", "all"]).optional(),
});

export async function GET(request: Request) {
    const url = new URL(request.url);
    const parsed = ListQuery.safeParse({
        status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
        return Response.json({ error: "invalid_query", detail: parsed.error.format() }, { status: 400 });
    }
    const presets = listPresets({ status: parsed.data.status });
    const active = getActiveState();
    return Response.json({ presets, active });
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = CreateBody.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: "invalid_body", detail: parsed.error.format() }, { status: 400 });
    }
    try {
        const preset = createPreset(parsed.data);
        return Response.json({ preset }, { status: 201 });
    } catch (err) {
        if (err instanceof SlugCollisionError) {
            return Response.json({ error: "slug_collision", slug: parsed.data.slug }, { status: 409 });
        }
        return Response.json({ error: "internal", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
```

- [ ] **Step 3: Write `apps/web/app/api/presets/[id]/route.ts`**

```typescript
// apps/web/app/api/presets/[id]/route.ts
import { z } from "zod";
import {
    getPreset,
    listPresetItems,
    SlugCollisionError,
    updatePreset,
} from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const UpdateBody = z.object({
    slug: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/).optional(),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    color: z.string().max(32).nullable().optional(),
});

function parseId(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return Response.json({ error: "invalid_id" }, { status: 400 });
    const preset = getPreset(id);
    if (!preset) return Response.json({ error: "not_found" }, { status: 404 });
    const items = listPresetItems(id);
    return Response.json({ preset, items });
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return Response.json({ error: "invalid_id" }, { status: 400 });
    const body = await request.json().catch(() => null);
    const parsed = UpdateBody.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: "invalid_body", detail: parsed.error.format() }, { status: 400 });
    }
    try {
        const preset = updatePreset(id, parsed.data);
        return Response.json({ preset });
    } catch (err) {
        if (err instanceof SlugCollisionError) {
            return Response.json({ error: "slug_collision" }, { status: 409 });
        }
        return Response.json({ error: "internal", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
```

- [ ] **Step 4: Write archive/unarchive routes**

`apps/web/app/api/presets/[id]/archive/route.ts`:

```typescript
import { archivePreset, getPreset } from "@lector/presets/presets";

export const dynamic = "force-dynamic";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
        return Response.json({ error: "invalid_id" }, { status: 400 });
    }
    const preset = getPreset(id);
    if (!preset) return Response.json({ error: "not_found" }, { status: 404 });
    const updated = archivePreset(id);
    return Response.json({ preset: updated });
}
```

`apps/web/app/api/presets/[id]/unarchive/route.ts`:

```typescript
import { getPreset, unarchivePreset } from "@lector/presets/presets";

export const dynamic = "force-dynamic";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
        return Response.json({ error: "invalid_id" }, { status: 400 });
    }
    const preset = getPreset(id);
    if (!preset) return Response.json({ error: "not_found" }, { status: 404 });
    const updated = unarchivePreset(id);
    return Response.json({ preset: updated });
}
```

- [ ] **Step 5: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

Expected: build succeeds.

- [ ] **Step 6: Smoke verification — exercise the routes**

```bash
cd apps/web && npm run dev &
sleep 8
# Create
curl -s -X POST http://localhost:4317/api/presets -H 'Content-Type: application/json' -d '{"slug":"test","name":"Test"}' | head -c 500; echo
# List active
curl -s http://localhost:4317/api/presets?status=active | head -c 500; echo
# Get
curl -s http://localhost:4317/api/presets/1 | head -c 500; echo
# PATCH
curl -s -X PATCH http://localhost:4317/api/presets/1 -H 'Content-Type: application/json' -d '{"name":"Test Renamed"}' | head -c 500; echo
# Archive
curl -s -X POST http://localhost:4317/api/presets/1/archive | head -c 500; echo
# List active again (should be empty)
curl -s http://localhost:4317/api/presets?status=active | head -c 500; echo
# Unarchive
curl -s -X POST http://localhost:4317/api/presets/1/unarchive | head -c 500; echo
# Slug collision
curl -s -X POST http://localhost:4317/api/presets -H 'Content-Type: application/json' -d '{"slug":"test","name":"Dup"}' | head -c 500; echo
# Kill dev server
kill %1 2>/dev/null
cd ../..
```

Expected: all calls succeed except the collision call which returns 409 with `{"error":"slug_collision","slug":"test"}`. The created DB row persists in `~/.skills-lector/presets.db` — delete that file if you want to start fresh.

On Windows PowerShell, replace `&` with `Start-Process` or open a second terminal.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/api/presets
git commit -m "Add preset CRUD API routes (list, get, create, update, archive, unarchive)"
```

---

### Task 13: API routes — preset items

**Files:**
- Create: `apps/web/app/api/presets/[id]/items/route.ts`

- [ ] **Step 1: Write the route**

```typescript
// apps/web/app/api/presets/[id]/items/route.ts
import { z } from "zod";
import { addItem, getPreset, removeItem } from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const ItemBody = z.object({
    kind: z.enum(["skill", "command"]),
    identifier: z.string().min(1).max(256),
});

function parseId(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return Response.json({ error: "invalid_id" }, { status: 400 });
    const preset = getPreset(id);
    if (!preset) return Response.json({ error: "not_found" }, { status: 404 });
    const body = await request.json().catch(() => null);
    const parsed = ItemBody.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: "invalid_body", detail: parsed.error.format() }, { status: 400 });
    }
    try {
        const item = addItem(id, parsed.data.kind, parsed.data.identifier);
        return Response.json({ item }, { status: 201 });
    } catch (err) {
        return Response.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return Response.json({ error: "invalid_id" }, { status: 400 });
    const preset = getPreset(id);
    if (!preset) return Response.json({ error: "not_found" }, { status: 404 });
    const url = new URL(request.url);
    const parsed = ItemBody.safeParse({
        kind: url.searchParams.get("kind"),
        identifier: url.searchParams.get("identifier"),
    });
    if (!parsed.success) {
        return Response.json({ error: "invalid_query", detail: parsed.error.format() }, { status: 400 });
    }
    try {
        removeItem(id, parsed.data.kind, parsed.data.identifier);
        return Response.json({ ok: true });
    } catch (err) {
        return Response.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/presets/[id]/items
git commit -m "Add preset items API route (add/remove)"
```

---

### Task 14: API routes — activate (JSON + SSE)

**Files:**
- Create: `apps/web/app/api/presets/[id]/activate/route.ts`
- Create: `apps/web/app/api/presets/[id]/activate/stream/route.ts`

- [ ] **Step 1: Write the JSON activate route**

```typescript
// apps/web/app/api/presets/[id]/activate/route.ts
import { z } from "zod";
import { applyPreset } from "@lector/presets/activate";
import { getPreset } from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const Query = z.object({
    dryRun: z.enum(["0", "1"]).optional(),
    force: z.enum(["0", "1"]).optional(),
});

function parseId(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return Response.json({ error: "invalid_id" }, { status: 400 });
    const url = new URL(request.url);
    const parsed = Query.safeParse({
        dryRun: url.searchParams.get("dryRun") ?? undefined,
        force: url.searchParams.get("force") ?? undefined,
    });
    if (!parsed.success) {
        return Response.json({ error: "invalid_query", detail: parsed.error.format() }, { status: 400 });
    }
    const preset = getPreset(id);
    if (!preset) return Response.json({ error: "not_found" }, { status: 404 });
    if (preset.archivedAt) {
        return Response.json({ error: "archived_preset" }, { status: 400 });
    }
    try {
        const result = applyPreset(id, {
            dryRun: parsed.data.dryRun === "1",
            force: parsed.data.force === "1",
        });
        return Response.json({ result });
    } catch (err) {
        return Response.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
```

- [ ] **Step 2: Write the SSE stream route**

```typescript
// apps/web/app/api/presets/[id]/activate/stream/route.ts
import { z } from "zod";
import { applyPreset } from "@lector/presets/activate";
import { ApplyEventBus } from "@lector/presets/events";
import { getPreset } from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const Query = z.object({
    force: z.enum(["0", "1"]).optional(),
});

function parseId(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function sseChunk(payload: unknown): string {
    return `data: ${JSON.stringify(payload)}\n\n`;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return Response.json({ error: "invalid_id" }, { status: 400 });
    const url = new URL(request.url);
    const parsed = Query.safeParse({
        force: url.searchParams.get("force") ?? undefined,
    });
    if (!parsed.success) {
        return Response.json({ error: "invalid_query" }, { status: 400 });
    }
    const preset = getPreset(id);
    if (!preset) return Response.json({ error: "not_found" }, { status: 404 });
    if (preset.archivedAt) {
        return Response.json({ error: "archived_preset" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const bus = new ApplyEventBus();
            const unsubscribe = bus.on((event) => {
                controller.enqueue(encoder.encode(sseChunk(event)));
                if (event.phase === "done" || event.phase === "error") {
                    unsubscribe();
                    controller.close();
                }
            });
            // Run apply synchronously — better-sqlite3 + fs are sync. Wrap in
            // try so any thrown error becomes an error event.
            try {
                applyPreset(id, { force: parsed.data.force === "1" }, { bus });
            } catch (err) {
                bus.emit({
                    phase: "error",
                    message: err instanceof Error ? err.message : String(err),
                });
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            Connection: "keep-alive",
        },
    });
}
```

- [ ] **Step 3: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

- [ ] **Step 4: Smoke (dry run via JSON route — full end-to-end exercised in Task 24)**

Start the dev server and run:
```bash
curl -s -X POST 'http://localhost:4317/api/presets/1/activate?dryRun=1' | head -c 500
```
Expected: JSON with `result.enabled`, `result.disabled`, etc. (counts depend on local state).

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/presets/[id]/activate
git commit -m "Add activate API routes (JSON dry-run + SSE progress stream)"
```

---

### Task 15: API routes — pinned + log

**Files:**
- Create: `apps/web/app/api/presets/pin/route.ts`
- Create: `apps/web/app/api/presets/pin/[kind]/[id]/archive/route.ts`
- Create: `apps/web/app/api/presets/pin/[kind]/[id]/unarchive/route.ts`
- Create: `apps/web/app/api/presets/log/route.ts`

- [ ] **Step 1: pin/route.ts**

```typescript
// apps/web/app/api/presets/pin/route.ts
import { z } from "zod";
import { addPin, listPinned } from "@lector/presets/pinned";

export const dynamic = "force-dynamic";

const ListQuery = z.object({
    status: z.enum(["active", "archived", "all"]).optional(),
});

const PinBody = z.object({
    kind: z.enum(["skill", "command"]),
    identifier: z.string().min(1).max(256),
    reason: z.string().max(200).nullable().optional(),
});

export async function GET(request: Request) {
    const url = new URL(request.url);
    const parsed = ListQuery.safeParse({
        status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
        return Response.json({ error: "invalid_query" }, { status: 400 });
    }
    const pinned = listPinned({ status: parsed.data.status });
    return Response.json({ pinned });
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = PinBody.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: "invalid_body", detail: parsed.error.format() }, { status: 400 });
    }
    try {
        const item = addPin(parsed.data.kind, parsed.data.identifier, parsed.data.reason ?? null);
        return Response.json({ item }, { status: 201 });
    } catch (err) {
        return Response.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
```

- [ ] **Step 2: pin/[kind]/[id]/archive/route.ts**

```typescript
import { archivePin } from "@lector/presets/pinned";

export const dynamic = "force-dynamic";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ kind: string; id: string }> },
) {
    const { kind, id } = await params;
    if (kind !== "skill" && kind !== "command") {
        return Response.json({ error: "invalid_kind" }, { status: 400 });
    }
    try {
        archivePin(kind, decodeURIComponent(id));
        return Response.json({ ok: true });
    } catch (err) {
        return Response.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
```

- [ ] **Step 3: pin/[kind]/[id]/unarchive/route.ts**

```typescript
import { unarchivePin } from "@lector/presets/pinned";

export const dynamic = "force-dynamic";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ kind: string; id: string }> },
) {
    const { kind, id } = await params;
    if (kind !== "skill" && kind !== "command") {
        return Response.json({ error: "invalid_kind" }, { status: 400 });
    }
    try {
        unarchivePin(kind, decodeURIComponent(id));
        return Response.json({ ok: true });
    } catch (err) {
        return Response.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
```

- [ ] **Step 4: log/route.ts**

```typescript
// apps/web/app/api/presets/log/route.ts
import { z } from "zod";
import { getApplyLogItems, listApplyLog } from "@lector/presets/log";

export const dynamic = "force-dynamic";

const Query = z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    presetId: z.coerce.number().int().min(1).optional(),
    logId: z.coerce.number().int().min(1).optional(),
});

export async function GET(request: Request) {
    const url = new URL(request.url);
    const parsed = Query.safeParse({
        limit: url.searchParams.get("limit") ?? undefined,
        offset: url.searchParams.get("offset") ?? undefined,
        presetId: url.searchParams.get("presetId") ?? undefined,
        logId: url.searchParams.get("logId") ?? undefined,
    });
    if (!parsed.success) {
        return Response.json({ error: "invalid_query", detail: parsed.error.format() }, { status: 400 });
    }
    if (parsed.data.logId) {
        const items = getApplyLogItems(parsed.data.logId);
        return Response.json({ items });
    }
    const logs = listApplyLog({
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        presetId: parsed.data.presetId,
    });
    return Response.json({ logs });
}
```

- [ ] **Step 5: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/presets/pin apps/web/app/api/presets/log
git commit -m "Add pinned + apply-log API routes"
```

---

## Phase 4 — Client query layer

### Task 16: TanStack Query hooks

**Files:**
- Create: `apps/web/components/presets/use-preset-queries.ts`

- [ ] **Step 1: Write the hooks file**

```typescript
// apps/web/components/presets/use-preset-queries.ts
"use client";

import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import type {
    ApplyDiff,
    ApplyResult,
    ItemKind,
    PinnedItem,
    Preset,
    PresetItem,
    ApplyLog,
    ActiveState,
} from "@lector/presets/types";

// Query keys (single source of truth — used by both useQuery and invalidations)
export const qk = {
    presets: (status: "active" | "archived" | "all" = "active") =>
        ["presets", { status }] as const,
    preset: (id: number) => ["preset", id] as const,
    activeState: () => ["active-preset"] as const,
    pinned: (status: "active" | "archived" | "all" = "active") =>
        ["pinned", { status }] as const,
    applyLog: (presetId?: number) => ["apply-log", { presetId }] as const,
    applyLogItems: (logId: number) => ["apply-log-items", logId] as const,
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, init);
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

// --- Queries ---

export function usePresetsList(status: "active" | "archived" | "all" = "active") {
    return useQuery({
        queryKey: qk.presets(status),
        queryFn: () =>
            jsonFetch<{ presets: Preset[]; active: ActiveState }>(
                `/api/presets?status=${status}`,
            ),
    });
}

export function usePreset(id: number) {
    return useQuery({
        queryKey: qk.preset(id),
        queryFn: () =>
            jsonFetch<{ preset: Preset; items: PresetItem[] }>(`/api/presets/${id}`),
    });
}

export function usePinnedList(status: "active" | "archived" | "all" = "active") {
    return useQuery({
        queryKey: qk.pinned(status),
        queryFn: () => jsonFetch<{ pinned: PinnedItem[] }>(`/api/presets/pin?status=${status}`),
    });
}

export function useApplyLog(presetId?: number) {
    return useQuery({
        queryKey: qk.applyLog(presetId),
        queryFn: () => {
            const qs = presetId ? `?presetId=${presetId}` : "";
            return jsonFetch<{ logs: ApplyLog[] }>(`/api/presets/log${qs}`);
        },
    });
}

// --- Mutations ---

type CreatePresetVars = {
    slug: string;
    name: string;
    description?: string | null;
    color?: string | null;
};

export function useCreatePreset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: CreatePresetVars) =>
            jsonFetch<{ preset: Preset }>(`/api/presets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(vars),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["presets"] });
        },
    });
}

type UpdatePresetVars = {
    id: number;
    name?: string;
    description?: string | null;
    color?: string | null;
    slug?: string;
};

export function useUpdatePreset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...rest }: UpdatePresetVars) =>
            jsonFetch<{ preset: Preset }>(`/api/presets/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rest),
            }),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: qk.preset(vars.id) });
            qc.invalidateQueries({ queryKey: ["presets"] });
        },
    });
}

export function useArchivePreset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            jsonFetch<{ preset: Preset }>(`/api/presets/${id}/archive`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["presets"] });
            qc.invalidateQueries({ queryKey: ["active-preset"] });
        },
    });
}

export function useUnarchivePreset() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) =>
            jsonFetch<{ preset: Preset }>(`/api/presets/${id}/unarchive`, { method: "POST" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["presets"] });
        },
    });
}

export function useAddPresetItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { presetId: number; kind: ItemKind; identifier: string }) =>
            jsonFetch<{ item: PresetItem }>(`/api/presets/${vars.presetId}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ kind: vars.kind, identifier: vars.identifier }),
            }),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: qk.preset(vars.presetId) });
        },
    });
}

export function useRemovePresetItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { presetId: number; kind: ItemKind; identifier: string }) =>
            jsonFetch<{ ok: true }>(
                `/api/presets/${vars.presetId}/items?kind=${vars.kind}&identifier=${encodeURIComponent(vars.identifier)}`,
                { method: "DELETE" },
            ),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: qk.preset(vars.presetId) });
        },
    });
}

export function useActivatePresetJson() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { id: number; dryRun?: boolean; force?: boolean }) => {
            const qs = new URLSearchParams();
            if (vars.dryRun) qs.set("dryRun", "1");
            if (vars.force) qs.set("force", "1");
            return jsonFetch<{ result: ApplyResult }>(
                `/api/presets/${vars.id}/activate?${qs.toString()}`,
                { method: "POST" },
            );
        },
        onSuccess: (_data, vars) => {
            if (vars.dryRun) return;
            qc.invalidateQueries({ queryKey: ["presets"] });
            qc.invalidateQueries({ queryKey: ["active-preset"] });
            qc.invalidateQueries({ queryKey: ["apply-log"] });
            qc.invalidateQueries({ queryKey: qk.preset(vars.id) });
        },
    });
}

export function useAddPin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { kind: ItemKind; identifier: string; reason?: string | null }) =>
            jsonFetch<{ item: PinnedItem }>(`/api/presets/pin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(vars),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pinned"] });
        },
    });
}

export function useArchivePin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { kind: ItemKind; identifier: string }) =>
            jsonFetch<{ ok: true }>(
                `/api/presets/pin/${vars.kind}/${encodeURIComponent(vars.identifier)}/archive`,
                { method: "POST" },
            ),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pinned"] });
        },
    });
}

export function useUnarchivePin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (vars: { kind: ItemKind; identifier: string }) =>
            jsonFetch<{ ok: true }>(
                `/api/presets/pin/${vars.kind}/${encodeURIComponent(vars.identifier)}/unarchive`,
                { method: "POST" },
            ),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["pinned"] });
        },
    });
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/presets/use-preset-queries.ts
git commit -m "Add TanStack Query hooks for preset CRUD, items, pins, activation, log"
```

---

## Phase 5 — UI

These tasks are the largest. Each task creates a focused component + page. Style follows the existing catalog explorers (read `apps/web/components/skills-explorer.tsx` and `apps/web/app/page.tsx` first to match conventions: `rounded-none` cards, shadcn Sheet/Dialog primitives, sticky TOCs where used, etc.).

### Task 17: i18n + nav scaffolding (do this before pages so they can use translations)

**Files:**
- Modify: `apps/web/lib/i18n/dictionaries/en.ts`
- Modify: `apps/web/lib/i18n/dictionaries/th.ts`
- Modify: `apps/web/components/main-nav.tsx`

- [ ] **Step 1: Read the existing dictionary structure to understand the `Dictionary` shape**

Read `apps/web/lib/i18n/dictionaries/en.ts` end-to-end. The TS structure determines what TH must mirror (`type Dictionary = typeof en;` style). Find:
- where `nav: { ... }` is declared
- where the page-specific sections live (e.g. `hooksPage`, `discoverPage`)
- the convention for headings / subtitles / button labels

- [ ] **Step 2: Add `nav.presets` and `presetsPage` to `en.ts`**

Append the new content in the same shape used for existing pages. The minimum required surface (a full content set; expand later if needed):

```typescript
// inside the nav object:
presets: "Presets",

// new top-level section:
presetsPage: {
    title: "Presets",
    subtitle: "Bundle skills and commands for different types of daily work.",
    newPreset: "New preset",
    rescan: "Refresh",
    activeCard: {
        active: "Active",
        itemsCount: (n: number) => `${n} items`,
        activated: (ago: string) => `activated ${ago}`,
        viewDetail: "View detail",
        reapply: "Re-apply",
    },
    tabs: {
        active: (n: number) => `Active (${n})`,
        archived: (n: number) => `Archived (${n})`,
    },
    pinnedPanel: {
        title: "Pinned (always on)",
        manage: "Manage",
        empty: "No pinned items yet.",
        add: "Add pinned",
    },
    empty: {
        heading: "Welcome — let's create your first preset.",
        body: "A preset is a bundle of skills and commands you want enabled for a type of work. Switching presets toggles each item's model-invocation flag — no other side effects.",
    },
    wizard: {
        stepName: "Name your workflow",
        stepItems: "Pick items",
        stepReview: "Review",
        namePlaceholder: "debugging",
        slugLabel: "Slug (URL-safe)",
        descPlaceholder: "What's this preset for?",
        cancel: "Cancel",
        next: "Next",
        back: "Back",
        save: "Save",
        saveAndActivate: "Save & Activate",
        review: {
            enabled: (n: number) => `Will enable (${n})`,
            disabled: (n: number) => `Will disable (${n})`,
            skipped: (n: number) => `Will skip (${n})`,
            missing: (n: number) => `Missing on disk (${n})`,
        },
    },
    detail: {
        edit: "Edit",
        activate: "Activate",
        archive: "Archive",
        unarchive: "Unarchive",
        addItem: "Add from catalog",
        skills: "Skills",
        commands: "Commands",
        recentActivations: "Recent activations",
        archivedBanner: "This preset is archived — read-only. Unarchive to edit or activate.",
        missingBadge: "missing on disk",
    },
    activate: {
        title: (name: string) => `Switch to "${name}"?`,
        cancel: "Cancel",
        apply: "Apply changes",
        progressTitle: (name: string) => `Activating "${name}"`,
        phaseScanning: "Scanning personal items…",
        phaseEnabling: (n: number, t: number, what: string) => `Enabling ${what} (${n} of ${t})…`,
        phaseDisabling: (n: number, t: number, what: string) => `Disabling ${what} (${n} of ${t})…`,
        phaseLogging: "Writing log…",
        toastSuccess: (e: number, d: number) => `Switched (${e} enabled, ${d} disabled)`,
        toastPartial: (errors: number) => `Applied with ${errors} errors — see log`,
        restartNote: "Restart Claude Code sessions to pick up the change. Existing sessions keep their current skills loaded.",
    },
    log: {
        title: "Apply history",
        empty: "No activations yet.",
        status: { success: "success", partial: "partial", failed: "failed" },
        cols: { ts: "When", from: "From", to: "To", enabled: "Enabled", disabled: "Disabled", skipped: "Skipped", errors: "Errors", status: "Status" },
    },
    errors: {
        slugCollision: (slug: string) => `Slug "${slug}" is already in use (active or archived).`,
        archivedActivate: "Cannot activate an archived preset. Unarchive first.",
        archivedEdit: "Cannot edit an archived preset.",
        generic: "Something went wrong.",
    },
},
```

(Adapt to match the existing convention — if other pages use `() => string` function-typed strings or plain strings, follow suit.)

- [ ] **Step 3: Mirror everything in `th.ts`**

Same structure, Thai translations. The shape must match exactly — the TS compiler enforces parity via `Dictionary = typeof en`. (You can leave Thai short and tighten copy later, but every key must exist.)

Sample Thai for top-level section:

```typescript
presets: "พรีเซ็ต",

presetsPage: {
    title: "พรีเซ็ต",
    subtitle: "รวม skills และ commands เป็นชุดสำหรับงานแต่ละแบบ",
    newPreset: "สร้างใหม่",
    rescan: "รีเฟรช",
    // ... (full mirror — every key in en.ts must exist here)
},
```

- [ ] **Step 4: Add nav link**

Read `apps/web/components/main-nav.tsx`. Find the `LINKS` array (or equivalent), and add an entry between Hooks and Discover:

```typescript
{ href: "/presets", labelKey: "presets" as const, /* match existing entry shape */ },
```

(Match the icon convention if other entries set one — pick a Lucide icon like `Layers` or `LayoutPanelTop`.)

- [ ] **Step 5: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

Expected: build succeeds. If TS errors complain about missing keys in `th.ts`, add them — the shape enforcement is intentional.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/i18n/dictionaries apps/web/components/main-nav.tsx
git commit -m "Add Presets nav link and i18n dictionary entries (EN + TH)"
```

---

### Task 18: `/presets` list page with empty-state wizard

**Files:**
- Create: `apps/web/app/presets/page.tsx`
- Create: `apps/web/components/presets/presets-explorer.tsx`
- Create: `apps/web/components/presets/preset-card.tsx`
- Create: `apps/web/components/presets/preset-wizard.tsx`
- Create: `apps/web/components/presets/preset-item-picker.tsx`

This is the largest UI task. Break it into sub-steps but commit only after the whole thing builds and renders.

- [ ] **Step 1: Read style references**

Read `apps/web/app/page.tsx`, `apps/web/components/skills-explorer.tsx`, and `apps/web/app/hooks/page.tsx` to confirm:
- The Server-Component-with-prefetch pattern
- shadcn primitives in use (Card, Sheet, Dialog, Button — exact import paths)
- Tailwind class conventions (`rounded-none`, spacing, typography)
- How `getServerI18n()` is used in Server Components

- [ ] **Step 2: Write `apps/web/app/presets/page.tsx`**

```tsx
// apps/web/app/presets/page.tsx
import {
    HydrationBoundary,
    QueryClient,
    dehydrate,
} from "@tanstack/react-query";
import { getActiveState, listPresets } from "@lector/presets/presets";
import { listPinned } from "@lector/presets/pinned";
import { qk } from "@/components/presets/use-preset-queries";
import { PresetsExplorer } from "@/components/presets/presets-explorer";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PresetsPage() {
    const { t } = await getServerI18n();
    const queryClient = new QueryClient();
    // Prefetch what the explorer will read on first paint
    queryClient.setQueryData(qk.presets("active"), {
        presets: listPresets({ status: "active" }),
        active: getActiveState(),
    });
    queryClient.setQueryData(qk.presets("archived"), {
        presets: listPresets({ status: "archived" }),
        active: getActiveState(),
    });
    queryClient.setQueryData(qk.pinned("active"), {
        pinned: listPinned({ status: "active" }),
    });

    return (
        <div className="space-y-6 px-5 py-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t.presetsPage.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t.presetsPage.subtitle}</p>
            </div>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <PresetsExplorer />
            </HydrationBoundary>
        </div>
    );
}
```

- [ ] **Step 3: Write `preset-card.tsx`**

```tsx
// apps/web/components/presets/preset-card.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Preset } from "@lector/presets/types";

export function PresetCard({
    preset,
    isActive,
    itemsCountLabel,
}: {
    preset: Preset;
    isActive: boolean;
    itemsCountLabel: string;
}) {
    return (
        <Link href={`/presets/${preset.id}`} className="block">
            <Card className="rounded-none transition-colors hover:bg-accent/40">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base font-semibold">{preset.name}</CardTitle>
                        {isActive ? <Badge variant="default">● ACTIVE</Badge> : null}
                        {preset.archivedAt ? <Badge variant="secondary">archived</Badge> : null}
                    </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                    {itemsCountLabel}
                    {preset.description ? <p className="mt-1 line-clamp-2">{preset.description}</p> : null}
                </CardContent>
            </Card>
        </Link>
    );
}
```

(If `apps/web/components/ui/badge.tsx` does not exist, add it via shadcn: `cd apps/web && npx shadcn@latest add badge`.)

- [ ] **Step 4: Write `preset-item-picker.tsx`**

```tsx
// apps/web/components/presets/preset-item-picker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ItemKind } from "@lector/presets/types";

type AvailableItem = {
    kind: ItemKind;
    identifier: string;
    name: string;
    description?: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (chosen: AvailableItem[]) => void;
    title: string;
    initiallySelected?: Array<{ kind: ItemKind; identifier: string }>;
};

export function PresetItemPicker({ open, onOpenChange, onConfirm, title, initiallySelected = [] }: Props) {
    const [items, setItems] = useState<AvailableItem[] | null>(null);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!open) return;
        setSelected(new Set(initiallySelected.map((s) => `${s.kind}::${s.identifier}`)));
        // Fetch personal-scope items from existing catalog endpoints
        Promise.all([
            fetch("/api/skills").then((r) => r.json()),
            fetch("/api/commands").then((r) => r.json()),
        ]).then(([skillsRes, commandsRes]) => {
            const skills = (skillsRes.skills ?? skillsRes.result?.skills ?? []) as Array<{
                name: string;
                scope: string;
                description?: string;
            }>;
            const commands = (commandsRes.commands ?? commandsRes.result?.commands ?? []) as Array<{
                name: string;
                scope: string;
                description?: string;
            }>;
            const merged: AvailableItem[] = [];
            for (const s of skills) {
                if (s.scope !== "personal") continue;
                merged.push({ kind: "skill", identifier: s.name, name: s.name, description: s.description });
            }
            for (const c of commands) {
                if (c.scope !== "personal") continue;
                merged.push({ kind: "command", identifier: c.name, name: c.name, description: c.description });
            }
            setItems(merged);
        });
    }, [open, initiallySelected]);

    const filtered = useMemo(() => {
        if (!items) return [];
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (i) => i.name.toLowerCase().includes(q) || (i.description?.toLowerCase().includes(q) ?? false),
        );
    }, [items, search]);

    function toggle(item: AvailableItem) {
        const k = `${item.kind}::${item.identifier}`;
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }

    function confirm() {
        if (!items) return;
        const chosen = items.filter((i) => selected.has(`${i.kind}::${i.identifier}`));
        onConfirm(chosen);
        onOpenChange(false);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3">
                    <Input
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="max-h-[60vh] overflow-y-auto rounded-none border">
                        {!items ? (
                            <p className="p-4 text-sm text-muted-foreground">Loading…</p>
                        ) : filtered.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">No items in personal scope.</p>
                        ) : (
                            <ul className="divide-y">
                                {filtered.map((i) => {
                                    const k = `${i.kind}::${i.identifier}`;
                                    return (
                                        <li key={k} className="flex items-start gap-3 p-3">
                                            <Checkbox
                                                checked={selected.has(k)}
                                                onCheckedChange={() => toggle(i)}
                                                id={k}
                                            />
                                            <label htmlFor={k} className="min-w-0 cursor-pointer">
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    {i.kind}
                                                </div>
                                                <div className="text-sm font-medium">{i.name}</div>
                                                {i.description ? (
                                                    <div className="text-xs text-muted-foreground line-clamp-2">
                                                        {i.description}
                                                    </div>
                                                ) : null}
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirm}>Confirm ({selected.size})</Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
```

If any shadcn primitives are missing, add them: `cd apps/web && npx shadcn@latest add sheet input button checkbox`.

- [ ] **Step 5: Write `preset-wizard.tsx`**

```tsx
// apps/web/components/presets/preset-wizard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    useActivatePresetJson,
    useAddPresetItem,
    useCreatePreset,
} from "./use-preset-queries";
import { PresetItemPicker } from "./preset-item-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ApplyResult, ItemKind } from "@lector/presets/types";

type Step = "name" | "items" | "review";

function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

export function PresetWizard({ onDone }: { onDone?: () => void }) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("name");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [items, setItems] = useState<Array<{ kind: ItemKind; identifier: string; name: string }>>([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [preview, setPreview] = useState<ApplyResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const create = useCreatePreset();
    const addItem = useAddPresetItem();
    const activate = useActivatePresetJson();

    async function saveOnly(activateAfter: boolean) {
        setError(null);
        try {
            const { preset } = await create.mutateAsync({
                slug: slug || slugify(name),
                name,
                description: description || null,
            });
            for (const item of items) {
                await addItem.mutateAsync({
                    presetId: preset.id,
                    kind: item.kind,
                    identifier: item.identifier,
                });
            }
            if (activateAfter) {
                // Use SSE stream for visible progress when many items will change
                // Caller wires up the stream modal — for now, fall back to JSON
                await activate.mutateAsync({ id: preset.id });
            }
            onDone?.();
            router.push(`/presets/${preset.id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }

    async function loadReview() {
        // To show a preview we need a real preset row. Create as a draft first,
        // run dry-run, then keep it (no DB-side draft concept in v1). If the
        // user cancels at review, they end up with an empty draft preset which
        // they can archive. This trade-off is documented in CLAUDE.md.
        setError(null);
        try {
            const { preset } = await create.mutateAsync({
                slug: slug || slugify(name),
                name,
                description: description || null,
            });
            for (const item of items) {
                await addItem.mutateAsync({
                    presetId: preset.id,
                    kind: item.kind,
                    identifier: item.identifier,
                });
            }
            const dry = await activate.mutateAsync({ id: preset.id, dryRun: true });
            setPreview(dry.result);
            // We have committed to creating the preset at this point; subsequent
            // "Save & Activate" or "Save" will redirect to the detail page
            router.push(`/presets/${preset.id}?reviewPreview=1`);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    }

    return (
        <div className="space-y-4">
            {error ? (
                <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            {step === "name" ? (
                <div className="space-y-3 rounded-none border p-4">
                    <h2 className="text-base font-semibold">Step 1 of 3 — Name your workflow</h2>
                    <Input
                        placeholder="debugging"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (!slug || slug === slugify(name)) setSlug(slugify(e.target.value));
                        }}
                    />
                    <Input
                        placeholder="slug (auto from name)"
                        value={slug}
                        onChange={(e) => setSlug(slugify(e.target.value))}
                    />
                    <Textarea
                        placeholder="What's this preset for?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <Button onClick={() => setStep("items")} disabled={!name.trim()}>
                            Next →
                        </Button>
                    </div>
                </div>
            ) : null}

            {step === "items" ? (
                <div className="space-y-3 rounded-none border p-4">
                    <h2 className="text-base font-semibold">Step 2 of 3 — Pick items</h2>
                    <p className="text-sm text-muted-foreground">
                        {items.length === 0 ? "No items selected yet." : `${items.length} items selected.`}
                    </p>
                    <Button variant="outline" onClick={() => setPickerOpen(true)}>
                        {items.length === 0 ? "Choose from catalog" : "Edit selection"}
                    </Button>
                    {items.length > 0 ? (
                        <ul className="divide-y rounded-none border text-sm">
                            {items.map((i) => (
                                <li key={`${i.kind}::${i.identifier}`} className="flex items-center justify-between p-2">
                                    <span>
                                        <span className="mr-2 font-mono text-xs text-muted-foreground">{i.kind}</span>
                                        {i.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    <PresetItemPicker
                        open={pickerOpen}
                        onOpenChange={setPickerOpen}
                        onConfirm={(chosen) => setItems(chosen)}
                        title="Pick skills and commands"
                        initiallySelected={items}
                    />
                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep("name")}>
                            ← Back
                        </Button>
                        <Button onClick={() => setStep("review")} disabled={items.length === 0}>
                            Next →
                        </Button>
                    </div>
                </div>
            ) : null}

            {step === "review" ? (
                <div className="space-y-3 rounded-none border p-4">
                    <h2 className="text-base font-semibold">Step 3 of 3 — Review</h2>
                    <p className="text-sm text-muted-foreground">
                        You can save and stay on this preset, or save and activate it right away.
                    </p>
                    <div className="flex flex-wrap justify-between gap-2">
                        <Button variant="outline" onClick={() => setStep("items")}>
                            ← Back
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => saveOnly(false)}>
                                Save
                            </Button>
                            <Button onClick={() => saveOnly(true)}>Save & Activate</Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
```

- [ ] **Step 6: Write `presets-explorer.tsx`**

```tsx
// apps/web/components/presets/presets-explorer.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePresetsList } from "./use-preset-queries";
import { PresetCard } from "./preset-card";
import { PresetWizard } from "./preset-wizard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function PresetsExplorer() {
    const active = usePresetsList("active");
    const archived = usePresetsList("archived");
    const [tab, setTab] = useState<"active" | "archived">("active");

    const list = tab === "active" ? active : archived;
    const presets = list.data?.presets ?? [];
    const activeState = list.data?.active;
    const isEmpty = active.data?.presets.length === 0 && archived.data?.presets.length === 0;

    if (active.isLoading || archived.isLoading) {
        return <p className="text-sm text-muted-foreground">Loading…</p>;
    }

    if (isEmpty) {
        return (
            <div className="space-y-4 rounded-none border p-6">
                <h2 className="text-lg font-semibold">Welcome — let's create your first preset.</h2>
                <p className="text-sm text-muted-foreground">
                    A preset is a bundle of skills and commands you want enabled for a type of work.
                    Switching presets toggles each item's model-invocation flag — no other side effects.
                </p>
                <PresetWizard />
            </div>
        );
    }

    const activePreset = presets.find((p) => p.id === activeState?.presetId);

    return (
        <div className="space-y-6">
            {activePreset ? (
                <div className="rounded-none border bg-secondary/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground">Active</div>
                            <div className="text-lg font-semibold">● {activePreset.name}</div>
                            <div className="text-xs text-muted-foreground">
                                activated {activeState?.activatedAt ?? ""}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/presets/${activePreset.id}`}>
                                <Button variant="outline">View detail</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="flex items-center justify-between">
                <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "archived")}>
                    <TabsList>
                        <TabsTrigger value="active">Active ({active.data?.presets.length ?? 0})</TabsTrigger>
                        <TabsTrigger value="archived">Archived ({archived.data?.presets.length ?? 0})</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Link href="/presets/new">
                    <Button>+ New preset</Button>
                </Link>
            </div>

            <Tabs value={tab}>
                <TabsContent value="active">
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {presets.map((p) => (
                            <PresetCard
                                key={p.id}
                                preset={p}
                                isActive={p.id === activeState?.presetId}
                                itemsCountLabel="—"
                            />
                        ))}
                    </div>
                </TabsContent>
                <TabsContent value="archived">
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {presets.map((p) => (
                            <PresetCard
                                key={p.id}
                                preset={p}
                                isActive={false}
                                itemsCountLabel="—"
                            />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
```

(If `tabs` shadcn primitive missing: `cd apps/web && npx shadcn@latest add tabs`.)

- [ ] **Step 7: Verify build + manual render**

```bash
cd apps/web && npm run build && npm run dev
# In another terminal: open http://localhost:4317/presets
```

Expected: page loads. With an empty DB, the wizard is inline. After creating a preset, the grid appears.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/presets/page.tsx apps/web/components/presets
git commit -m "Add /presets list page with empty-state wizard and explorer"
```

---

### Task 19: `/presets/new` standalone wizard page

**Files:**
- Create: `apps/web/app/presets/new/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// apps/web/app/presets/new/page.tsx
import { PresetWizard } from "@/components/presets/preset-wizard";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewPresetPage() {
    const { t } = await getServerI18n();
    return (
        <div className="space-y-6 px-5 py-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t.presetsPage.newPreset}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t.presetsPage.subtitle}</p>
            </div>
            <PresetWizard />
        </div>
    );
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/presets/new/page.tsx
git commit -m "Add /presets/new standalone wizard page"
```

---

### Task 20: `/presets/[id]` detail page

**Files:**
- Create: `apps/web/app/presets/[id]/page.tsx`
- Create: `apps/web/components/presets/preset-detail-client.tsx`
- Create: `apps/web/components/presets/activate-confirm-dialog.tsx`
- Create: `apps/web/components/presets/activate-progress-modal.tsx`

- [ ] **Step 1: Write `activate-confirm-dialog.tsx`**

```tsx
// apps/web/components/presets/activate-confirm-dialog.tsx
"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ApplyResult } from "@lector/presets/types";

export function ActivateConfirmDialog({
    open,
    presetName,
    preview,
    onCancel,
    onConfirm,
}: {
    open: boolean;
    presetName: string;
    preview: ApplyResult | null;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Switch to "{presetName}"?</DialogTitle>
                </DialogHeader>
                {!preview ? (
                    <p className="text-sm text-muted-foreground">Computing diff…</p>
                ) : (
                    <div className="space-y-3 text-sm">
                        <DiffSection label="Will enable" items={preview.enabled} />
                        <DiffSection label="Will disable" items={preview.disabled} />
                        <DiffSection label="Will skip" items={preview.skipped} />
                        <DiffSection label="Missing on disk" items={preview.missing} />
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={onConfirm} disabled={!preview}>Apply changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DiffSection({ label, items }: { label: string; items: Array<{ kind: string; identifier: string; reason?: string }> }) {
    if (items.length === 0) return null;
    return (
        <div>
            <div className="text-xs font-semibold text-muted-foreground">
                {label} ({items.length})
            </div>
            <ul className="mt-1 max-h-32 overflow-y-auto rounded-none border bg-secondary/30 p-2 text-xs">
                {items.map((i) => (
                    <li key={`${i.kind}::${i.identifier}`} className="font-mono">
                        [{i.kind}] {i.identifier}
                        {i.reason ? <span className="text-muted-foreground"> — {i.reason}</span> : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}
```

(If `dialog` shadcn primitive missing: `cd apps/web && npx shadcn@latest add dialog`.)

- [ ] **Step 2: Write `activate-progress-modal.tsx`**

```tsx
// apps/web/components/presets/activate-progress-modal.tsx
"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApplyEvent, ApplyResult } from "@lector/presets/types";

export function ActivateProgressModal({
    open,
    presetId,
    presetName,
    onDone,
}: {
    open: boolean;
    presetId: number;
    presetName: string;
    onDone: (result: ApplyResult | null) => void;
}) {
    const qc = useQueryClient();
    const [events, setEvents] = useState<ApplyEvent[]>([]);
    const [done, setDone] = useState<ApplyResult | null>(null);

    useEffect(() => {
        if (!open) {
            setEvents([]);
            setDone(null);
            return;
        }
        const controller = new AbortController();
        (async () => {
            const res = await fetch(`/api/presets/${presetId}/activate/stream`, {
                method: "POST",
                signal: controller.signal,
            });
            if (!res.body) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            while (true) {
                const { done: streamDone, value } = await reader.read();
                if (streamDone) break;
                buf += decoder.decode(value, { stream: true });
                const parts = buf.split("\n\n");
                buf = parts.pop() ?? "";
                for (const chunk of parts) {
                    const line = chunk.split("\n").find((l) => l.startsWith("data: "));
                    if (!line) continue;
                    try {
                        const event: ApplyEvent = JSON.parse(line.slice(6));
                        setEvents((prev) => [...prev, event]);
                        if (event.phase === "done") {
                            setDone(event.result);
                            qc.invalidateQueries({ queryKey: ["presets"] });
                            qc.invalidateQueries({ queryKey: ["active-preset"] });
                            qc.invalidateQueries({ queryKey: ["apply-log"] });
                            qc.invalidateQueries({ queryKey: ["preset", presetId] });
                            setTimeout(() => onDone(event.result), 600); // brief pause to show "done"
                        }
                        if (event.phase === "error") {
                            setTimeout(() => onDone(null), 600);
                        }
                    } catch {
                        // ignore malformed chunks
                    }
                }
            }
        })();
        return () => controller.abort();
    }, [open, presetId, qc, onDone]);

    const last = events[events.length - 1];

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Activating "{presetName}"</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 font-mono text-xs">
                    {events.map((e, i) => (
                        <div key={i} className="text-muted-foreground">
                            {phaseLabel(e)}
                        </div>
                    ))}
                    {!done && last ? (
                        <ProgressBar event={last} />
                    ) : null}
                    {done ? (
                        <div className="rounded-none border border-green-500 bg-green-500/10 p-2 text-foreground">
                            Done — {done.enabled.length} enabled, {done.disabled.length} disabled, {done.errors.length} errors.
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function phaseLabel(e: ApplyEvent): string {
    switch (e.phase) {
        case "scanning":
            return "✓ Scanned personal items";
        case "diff":
            return `✓ Computed diff (${e.diff.enabled.length}+${e.diff.disabled.length} changes)`;
        case "enabling":
            return `⠋ Enabling ${e.currentItem.identifier} (${e.current} of ${e.total})…`;
        case "disabling":
            return `⠋ Disabling ${e.currentItem.identifier} (${e.current} of ${e.total})…`;
        case "logging":
            return "⠋ Writing apply log…";
        case "done":
            return "✓ Done";
        case "error":
            return `✗ Error: ${e.message}`;
    }
}

function ProgressBar({ event }: { event: ApplyEvent }) {
    let pct = 0;
    if (event.phase === "enabling" || event.phase === "disabling") {
        pct = event.total === 0 ? 100 : Math.round((event.current / event.total) * 100);
    }
    return (
        <div className="h-2 w-full overflow-hidden rounded-none bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
    );
}
```

- [ ] **Step 3: Write `preset-detail-client.tsx`**

```tsx
// apps/web/components/presets/preset-detail-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    useActivatePresetJson,
    useAddPresetItem,
    useArchivePreset,
    usePreset,
    useRemovePresetItem,
    useUnarchivePreset,
} from "./use-preset-queries";
import { PresetItemPicker } from "./preset-item-picker";
import { ActivateConfirmDialog } from "./activate-confirm-dialog";
import { ActivateProgressModal } from "./activate-progress-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ApplyResult, ItemKind } from "@lector/presets/types";

const STREAM_THRESHOLD = 4;

export function PresetDetailClient({ presetId }: { presetId: number }) {
    const router = useRouter();
    const detail = usePreset(presetId);
    const addItem = useAddPresetItem();
    const removeItem = useRemovePresetItem();
    const activate = useActivatePresetJson();
    const archive = useArchivePreset();
    const unarchive = useUnarchivePreset();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [confirm, setConfirm] = useState<{ open: boolean; preview: ApplyResult | null }>({ open: false, preview: null });
    const [progress, setProgress] = useState(false);

    if (detail.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
    if (detail.error) return <p className="text-sm text-destructive">{String(detail.error)}</p>;
    if (!detail.data) return null;
    const { preset, items } = detail.data;

    const skills = items.filter((i) => i.kind === "skill");
    const commands = items.filter((i) => i.kind === "command");

    async function onActivate() {
        const dry = await activate.mutateAsync({ id: presetId, dryRun: true });
        setConfirm({ open: true, preview: dry.result });
    }

    async function onConfirmApply() {
        const totalChanges =
            (confirm.preview?.enabled.length ?? 0) + (confirm.preview?.disabled.length ?? 0);
        setConfirm({ open: false, preview: null });
        if (totalChanges >= STREAM_THRESHOLD) {
            setProgress(true);
        } else {
            await activate.mutateAsync({ id: presetId });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{preset.name}</h1>
                        {preset.archivedAt ? <Badge variant="secondary">archived</Badge> : null}
                    </div>
                    {preset.description ? (
                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                    ) : null}
                </div>
                <div className="flex gap-2">
                    {preset.archivedAt ? (
                        <Button onClick={() => unarchive.mutate(presetId)}>Unarchive</Button>
                    ) : (
                        <>
                            <Button onClick={onActivate}>Activate</Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (confirm.preview === null) {
                                        // confirm dialog reused for archive — could split if you prefer
                                    }
                                    archive.mutate(presetId, {
                                        onSuccess: () => router.push("/presets"),
                                    });
                                }}
                            >
                                Archive
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Skills ({skills.length})</h2>
                    {!preset.archivedAt ? (
                        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                            + Add from catalog
                        </Button>
                    ) : null}
                </div>
                <ItemList
                    items={skills}
                    onRemove={(kind, id) => removeItem.mutate({ presetId, kind, identifier: id })}
                    disabled={!!preset.archivedAt}
                />
            </section>

            <section className="space-y-2">
                <h2 className="text-base font-semibold">Commands ({commands.length})</h2>
                <ItemList
                    items={commands}
                    onRemove={(kind, id) => removeItem.mutate({ presetId, kind, identifier: id })}
                    disabled={!!preset.archivedAt}
                />
            </section>

            <PresetItemPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onConfirm={async (chosen) => {
                    const existing = new Set(items.map((i) => `${i.kind}::${i.identifier}`));
                    for (const c of chosen) {
                        const key = `${c.kind}::${c.identifier}`;
                        if (!existing.has(key)) {
                            await addItem.mutateAsync({ presetId, kind: c.kind, identifier: c.identifier });
                        }
                    }
                }}
                title="Add items to preset"
                initiallySelected={items.map((i) => ({ kind: i.kind, identifier: i.identifier }))}
            />

            <ActivateConfirmDialog
                open={confirm.open}
                presetName={preset.name}
                preview={confirm.preview}
                onCancel={() => setConfirm({ open: false, preview: null })}
                onConfirm={onConfirmApply}
            />

            <ActivateProgressModal
                open={progress}
                presetId={presetId}
                presetName={preset.name}
                onDone={() => setProgress(false)}
            />
        </div>
    );
}

function ItemList({
    items,
    onRemove,
    disabled,
}: {
    items: Array<{ kind: ItemKind; identifier: string }>;
    onRemove: (kind: ItemKind, identifier: string) => void;
    disabled: boolean;
}) {
    if (items.length === 0) return <p className="text-sm text-muted-foreground">None yet.</p>;
    return (
        <ul className="divide-y rounded-none border text-sm">
            {items.map((i) => (
                <li key={`${i.kind}::${i.identifier}`} className="flex items-center justify-between p-2">
                    <span className="font-mono">{i.identifier}</span>
                    {!disabled ? (
                        <Button size="sm" variant="ghost" onClick={() => onRemove(i.kind, i.identifier)}>
                            ✕
                        </Button>
                    ) : null}
                </li>
            ))}
        </ul>
    );
}
```

- [ ] **Step 4: Write the page**

```tsx
// apps/web/app/presets/[id]/page.tsx
import { notFound } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getPreset, listPresetItems } from "@lector/presets/presets";
import { PresetDetailClient } from "@/components/presets/preset-detail-client";
import { qk } from "@/components/presets/use-preset-queries";

export const dynamic = "force-dynamic";

export default async function PresetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return notFound();
    const preset = getPreset(id);
    if (!preset) return notFound();
    const items = listPresetItems(id);

    const qc = new QueryClient();
    qc.setQueryData(qk.preset(id), { preset, items });

    return (
        <div className="space-y-6 px-5 py-0">
            <HydrationBoundary state={dehydrate(qc)}>
                <PresetDetailClient presetId={id} />
            </HydrationBoundary>
        </div>
    );
}
```

- [ ] **Step 5: Verify build + render**

```bash
cd apps/web && npm run build && npm run dev
# Open http://localhost:4317/presets/1 (assuming a preset exists from earlier smoke tests)
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/presets/[id] apps/web/components/presets/preset-detail-client.tsx apps/web/components/presets/activate-confirm-dialog.tsx apps/web/components/presets/activate-progress-modal.tsx
git commit -m "Add /presets/[id] detail page with activate confirm + SSE progress"
```

---

### Task 21: `/presets/log` apply-history page

**Files:**
- Create: `apps/web/app/presets/log/page.tsx`
- Create: `apps/web/components/presets/apply-log-table.tsx`

- [ ] **Step 1: Write `apply-log-table.tsx`**

```tsx
// apps/web/components/presets/apply-log-table.tsx
"use client";

import { useState } from "react";
import { useApplyLog } from "./use-preset-queries";
import type { ApplyLogItem } from "@lector/presets/types";

export function ApplyLogTable() {
    const { data, isLoading } = useApplyLog();
    const [expanded, setExpanded] = useState<number | null>(null);
    const [items, setItems] = useState<Record<number, ApplyLogItem[] | "loading">>({});

    if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
    if (!data || data.logs.length === 0) {
        return <p className="text-sm text-muted-foreground">No activations yet.</p>;
    }

    async function loadItems(id: number) {
        setItems((prev) => ({ ...prev, [id]: "loading" }));
        const res = await fetch(`/api/presets/log?logId=${id}`).then((r) => r.json());
        setItems((prev) => ({ ...prev, [id]: res.items ?? [] }));
    }

    function toggle(id: number) {
        if (expanded === id) {
            setExpanded(null);
        } else {
            setExpanded(id);
            if (!items[id]) loadItems(id);
        }
    }

    return (
        <div className="rounded-none border">
            <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-xs">
                    <tr>
                        <th className="p-2 text-left">When</th>
                        <th className="p-2 text-left">From → To</th>
                        <th className="p-2 text-right">Enabled</th>
                        <th className="p-2 text-right">Disabled</th>
                        <th className="p-2 text-right">Skipped</th>
                        <th className="p-2 text-right">Errors</th>
                        <th className="p-2 text-left">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {data.logs.map((log) => (
                        <>
                            <tr
                                key={log.id}
                                className="cursor-pointer border-t hover:bg-accent/30"
                                onClick={() => toggle(log.id)}
                            >
                                <td className="p-2 font-mono text-xs">{log.ts}</td>
                                <td className="p-2 font-mono text-xs">
                                    {log.fromPresetId ?? "—"} → {log.toPresetId ?? "—"}
                                </td>
                                <td className="p-2 text-right">{log.enabledCount}</td>
                                <td className="p-2 text-right">{log.disabledCount}</td>
                                <td className="p-2 text-right">{log.skippedCount}</td>
                                <td className="p-2 text-right">{log.errorCount}</td>
                                <td className="p-2">{log.status}</td>
                            </tr>
                            {expanded === log.id ? (
                                <tr key={`${log.id}-detail`} className="border-t bg-secondary/20">
                                    <td colSpan={7} className="p-2">
                                        {items[log.id] === "loading" ? (
                                            <p className="text-xs text-muted-foreground">Loading items…</p>
                                        ) : items[log.id] ? (
                                            <ul className="space-y-1 font-mono text-xs">
                                                {(items[log.id] as ApplyLogItem[]).map((i, idx) => (
                                                    <li key={idx}>
                                                        [{i.action}] [{i.kind}] {i.identifier}
                                                        {i.message ? (
                                                            <span className="text-muted-foreground"> — {i.message}</span>
                                                        ) : null}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : null}
                                    </td>
                                </tr>
                            ) : null}
                        </>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
```

- [ ] **Step 2: Write the page**

```tsx
// apps/web/app/presets/log/page.tsx
import { ApplyLogTable } from "@/components/presets/apply-log-table";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PresetLogPage() {
    const { t } = await getServerI18n();
    return (
        <div className="space-y-6 px-5 py-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t.presetsPage.log.title}</h1>
            </div>
            <ApplyLogTable />
        </div>
    );
}
```

- [ ] **Step 3: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/presets/log apps/web/components/presets/apply-log-table.tsx
git commit -m "Add /presets/log apply-history page with expandable detail rows"
```

---

### Task 22: Pinned panel on `/presets`

**Files:**
- Create: `apps/web/components/presets/pinned-panel.tsx`
- Modify: `apps/web/components/presets/presets-explorer.tsx` (mount the panel)

- [ ] **Step 1: Write `pinned-panel.tsx`**

```tsx
// apps/web/components/presets/pinned-panel.tsx
"use client";

import { useState } from "react";
import {
    useAddPin,
    useArchivePin,
    usePinnedList,
    useUnarchivePin,
} from "./use-preset-queries";
import { PresetItemPicker } from "./preset-item-picker";
import { Button } from "@/components/ui/button";

export function PinnedPanel() {
    const active = usePinnedList("active");
    const archived = usePinnedList("archived");
    const addPin = useAddPin();
    const archivePin = useArchivePin();
    const unarchivePin = useUnarchivePin();
    const [pickerOpen, setPickerOpen] = useState(false);

    if (active.isLoading) return <p className="text-sm text-muted-foreground">Loading pinned…</p>;

    return (
        <details className="rounded-none border">
            <summary className="cursor-pointer p-3 text-sm font-semibold">
                Pinned (always on, {active.data?.pinned.length ?? 0})
            </summary>
            <div className="space-y-3 p-3">
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                        + Add pinned
                    </Button>
                </div>
                {active.data && active.data.pinned.length > 0 ? (
                    <ul className="divide-y rounded-none border text-sm">
                        {active.data.pinned.map((p) => (
                            <li
                                key={`${p.kind}::${p.identifier}`}
                                className="flex items-center justify-between p-2"
                            >
                                <span className="font-mono">
                                    [{p.kind}] {p.identifier}
                                    {p.reason ? (
                                        <span className="ml-2 text-xs text-muted-foreground">— {p.reason}</span>
                                    ) : null}
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        archivePin.mutate({ kind: p.kind, identifier: p.identifier })
                                    }
                                >
                                    Archive
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No pinned items yet.</p>
                )}

                {archived.data && archived.data.pinned.length > 0 ? (
                    <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground">
                            Archived pins ({archived.data.pinned.length})
                        </summary>
                        <ul className="mt-2 divide-y rounded-none border text-sm">
                            {archived.data.pinned.map((p) => (
                                <li
                                    key={`${p.kind}::${p.identifier}`}
                                    className="flex items-center justify-between p-2"
                                >
                                    <span className="font-mono text-muted-foreground">
                                        [{p.kind}] {p.identifier}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            unarchivePin.mutate({ kind: p.kind, identifier: p.identifier })
                                        }
                                    >
                                        Unarchive
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </details>
                ) : null}

                <PresetItemPicker
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    title="Pick items to pin"
                    initiallySelected={active.data?.pinned.map((p) => ({ kind: p.kind, identifier: p.identifier })) ?? []}
                    onConfirm={async (chosen) => {
                        const existing = new Set(
                            (active.data?.pinned ?? []).map((p) => `${p.kind}::${p.identifier}`),
                        );
                        for (const c of chosen) {
                            const k = `${c.kind}::${c.identifier}`;
                            if (!existing.has(k)) {
                                await addPin.mutateAsync({ kind: c.kind, identifier: c.identifier });
                            }
                        }
                    }}
                />
            </div>
        </details>
    );
}
```

- [ ] **Step 2: Mount in `presets-explorer.tsx`**

Add inside the explorer's return (below the preset grid):

```tsx
import { PinnedPanel } from "./pinned-panel";
// ...
<PinnedPanel />
```

- [ ] **Step 3: Verify build**

```bash
cd apps/web && npm run build
cd ../..
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/presets/pinned-panel.tsx apps/web/components/presets/presets-explorer.tsx
git commit -m "Add pinned-items panel to /presets"
```

---

## Phase 6 — Docs and release

### Task 23: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a new section**

Insert after the existing "Hook scan pipeline" section, before "Discover manifest reader":

```markdown
### Preset engine — `packages/presets/src/`

`packages/presets` is the **only mutating surface** in the project; `packages/core` stays pure read.
`applyPreset()` reads SQLite for preset definitions + pinned items, scans personal-scope items via `packages/core`, computes a diff with the pure `computeApplyDiff()`, then writes each item's `disable-model-invocation` frontmatter atomically (temp file + rename — exFAT-safe). The apply is logged in `apply_log` / `apply_log_items`, and `active_preset` (a singleton row, `CHECK(id=1)`) is updated.

Storage location: `~/.skills-lector/presets.db` by default. Overridable via `SKILLS_LECTOR_PRESETS_DB` env var or `dbPath` in `skills-lector.config.json`. Personal-scope apply target overridable via `SKILLS_LECTOR_PERSONAL_ROOT` (defaults to `~/.claude`). The DB file and its parent directory are auto-created on first open. Schema migrations live in `packages/presets/src/migrations/`; forward-only, idempotent at the version level, each wrapped in BEGIN/COMMIT.

Apply behaviour is partial-success — per-file errors are logged in `apply_log_items.action='error'` and do not abort the apply; status is set to `partial`. There is no global fs+DB transaction: on server crash mid-apply, the next apply re-scans the filesystem (the source of truth) and converges. Pinned items override preset membership (an item that is both pinned and in the new preset stays enabled; an item that is pinned but not in the new preset also stays enabled). The `enable` write removes the `disable-model-invocation` key entirely rather than setting it to `false`, to keep the file as close to its original default as possible.

Relationship to the `set-model-invocation` skill (under `.claude/skills/`): both manipulate the same frontmatter field, but the skill is per-item / authoring-time and the preset engine is bulk / runtime. Either path is valid; they share no code.
```

- [ ] **Step 2: Update the build commands section if relevant**

If the existing "Commands" section lists scripts, no change is needed since `install:all` already covers `packages/presets` after Task 2. Just verify the description still reads correctly.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Document preset engine in CLAUDE.md"
```

---

### Task 24: Update README, CHANGELOG, ROADMAP, version bump

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `ROADMAP.md`
- Modify: `package.json`, `apps/web/package.json`, `packages/core/package.json`, `packages/presets/package.json`

- [ ] **Step 1: README.md — feature bullet + short section**

In the existing "What it does" / features section, add a bullet:

```markdown
- **Skills + Commands presets** — bundle skills and commands per workflow ("debugging", "frontend-design", ...). Activating a preset toggles each item's `disable-model-invocation` frontmatter in the personal scope. See `/presets` in the app.
```

Optionally add a short subsection later in the README pointing to the onboarding wizard.

- [ ] **Step 2: CHANGELOG.md — 0.5.0 entry**

Add at the top, just below `## [Unreleased]`:

```markdown
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
- **`Presets` nav link** added between `Hooks` and `Discover`. Bilingual
  `nav.presets` + full `presetsPage` content in `en` and `th` dictionaries.

### Architecture

- New `packages/presets` package consumed by `apps/web` via TS path
  alias `@lector/presets/*`. `packages/core` stays read-only.
- New env-var overrides: `SKILLS_LECTOR_PRESETS_DB` (DB file path),
  `SKILLS_LECTOR_PERSONAL_ROOT` (apply target root). Both also overridable
  via `skills-lector.config.json`.
- Crash recovery is implicit — fs is the source of truth; the next apply
  recomputes the diff from current state and converges.

### Documentation

- `CLAUDE.md` documents the preset engine pipeline alongside the skill,
  command, and hook pipelines.
- `docs/superpowers/specs/2026-05-23-skills-commands-preset-design.md` is
  the design spec.
```

Also update the bottom version-compare links to add `[0.5.0]`.

- [ ] **Step 3: ROADMAP.md — note the shipped feature**

Replace the "Current state" sentence:

```markdown
**Current state** — milestones v0.1.0 through v0.5.0 have shipped to
`main` (see the [changelog](CHANGELOG.md)). No further milestone is currently
in flight; the items below are candidates for the next planning round.
```

Add a candidate line if relevant (e.g. "Hard-delete escape hatch for presets" — judgment call, optional).

- [ ] **Step 4: Bump versions**

Update `"version": "0.4.0"` → `"version": "0.5.0"` in all four package.json files:
- `package.json`
- `apps/web/package.json`
- `packages/core/package.json`
- `packages/presets/package.json` (already at 0.5.0 — verify)

- [ ] **Step 5: Verify build one more time**

```bash
cd apps/web && npm run build
cd ../..
```

- [ ] **Step 6: Commit**

```bash
git add README.md CHANGELOG.md ROADMAP.md package.json apps/web/package.json packages/core/package.json packages/presets/package.json
git commit -m "Release v0.5.0: ship Skills + Commands preset engine"
```

---

### Task 25: Manual verification checklist run

**Files:** None new — this is the smoke gate before merging.

Walk through every item from the spec's Verification checklist. **Do not skip any.** If any item fails, file a follow-up commit fixing it, then re-run the failing item.

- [ ] **Setup**
    - [ ] Delete any existing `~/.skills-lector/presets.db` (Windows: `Remove-Item $env:USERPROFILE\.skills-lector\presets.db -ErrorAction SilentlyContinue`). Restart the dev server.
    - [ ] Open http://localhost:4317/presets — confirm the inline onboarding wizard renders.
    - [ ] After creating a preset, confirm `~/.skills-lector/presets.db` exists and has `schema_version` row = 1.

- [ ] **Create / edit / archive**
    - [ ] Create a preset via the 3-step wizard.
    - [ ] Edit name / description on the detail page.
    - [ ] Try a duplicate slug → inline error shows.
    - [ ] Archive the active preset → confirm it leaves the Active tab and active state clears.
    - [ ] Unarchive → returns to Active tab.

- [ ] **Activate**
    - [ ] Click Activate → dry-run diff dialog renders correctly.
    - [ ] Confirm → fs frontmatter changes (verify with `cat ~/.claude/skills/<name>/SKILL.md`).
    - [ ] With ≥ 4 changes pending, confirm the progress modal renders the SSE phases.
    - [ ] Toast / banner appears with restart note.
    - [ ] Hit `/api/skills?force=1` and confirm `disableModelInvocation` flags reflect the new state.

- [ ] **Pinned**
    - [ ] Pin an item → switch preset → item stays enabled (verify in fs).
    - [ ] Unpin → switch preset again → item respects new preset.

- [ ] **Edge cases**
    - [ ] Reference a removed skill in a preset → apply succeeds, shows `missing` badge in the log.
    - [ ] Two browser tabs activate simultaneously → second tab sees fresh state after refetch.
    - [ ] Kill dev server mid-apply (Ctrl+C during a long apply) → restart → next apply converges.

- [ ] **UI**
    - [ ] Switch EN/TH — every label translates.
    - [ ] Dark theme — preset cards readable.

- [ ] **Final commit (optional — fixes only)**

If you found and fixed any small issues during the smoke pass, commit them:

```bash
git add -A
git commit -m "Smoke fixes after v0.5.0 verification pass"
```

---

## Self-review

After writing this plan I checked it against the spec section-by-section:

| Spec requirement | Plan coverage |
|---|---|
| `packages/presets` package isolated from `packages/core` | Task 1, Task 2 |
| SQLite schema v1 (presets, preset_items, pinned_items, active_preset, apply_log, apply_log_items, schema_version) with soft-delete + singleton active row + FK relationships | Task 4 |
| Forward-only migrations + atomic per-file + idempotent at version level | Task 4 (`db.ts`) |
| Identifier convention (kebab path / `:` namespace) + personal-scope filter | Task 5 |
| Atomic frontmatter write (tmp + rename, removes key on enable) | Task 6 |
| Pure `computeApplyDiff` with 5 branches + pinned override + missing | Task 7 |
| Preset CRUD with slug uniqueness across active + archived | Task 8 (SlugCollisionError throws for any existing slug) |
| Archive auto-deactivates active preset | Task 8 (archivePreset txn clears active_preset row) |
| Pinned CRUD with soft delete | Task 9 |
| applyPreset orchestrator — early no-op, dryRun, sequential apply, partial-success, single-tx log write | Task 10 |
| Apply event bus for SSE | Task 10 (`events.ts`) |
| Apply log reader | Task 10 (`log.ts`) |
| API routes for all CRUD + activate JSON + activate SSE + items + pin + log | Tasks 12, 13, 14, 15 |
| Zod input validation at every API boundary | Tasks 12-15 |
| TanStack Query provider + per-request server client + hooks + key conventions + invalidation policy | Task 11, Task 16 |
| `/presets` list with active card, tabs, empty-state wizard, pinned panel | Task 18 + Task 22 |
| `/presets/new` standalone wizard | Task 19 |
| `/presets/[id]` detail with edit/archive/activate, dry-run dialog, SSE progress modal | Task 20 |
| `/presets/log` apply history with per-item detail | Task 21 |
| Nav link + i18n (EN + TH) | Task 17 |
| CLAUDE.md documentation section | Task 23 |
| README + CHANGELOG + ROADMAP + version bump | Task 24 |
| Verification checklist run | Task 25 |
| Crash recovery via fs-as-truth + no global txn | Task 10 (algorithm comment) + Task 23 (CLAUDE.md) |
| Pinned overrides preset | Task 7 (diff rule) + Task 10 (skipped("pinned")) |
| Soft delete only — no hard-delete API | Tasks 12-15 do not expose DELETE for presets or pins |

**Known limitations / honest caveats:**

1. The wizard's "Review" step creates a real DB row to compute the dry-run (no DB-side draft concept in v1). If the user cancels at review, an empty draft preset is left behind. This is acceptable for v1 and documented in the wizard component comment. Future work: in-memory dry-run path that doesn't require the row to exist.
2. The apply doesn't reset the per-process scanner cache from inside `packages/presets` (no public reset hook in `packages/core`). API routes that hit `applyPreset` are unaffected because the very next read is `force: true`. Catalog reads from the browser may see slightly-stale flags for up to 8 seconds; users can hit the existing Rescan button to bust it.
3. Field names on scanner result types (`disableModelInvocation`, etc.) in `identity.ts` are written based on probable conventions and **must be verified against `packages/core/src/types.ts` in Task 5 Step 1**. The plan calls this out explicitly.
4. Verification is manual (no automated test suite) — the smoke gate in Task 25 is the entire safety net for v1.
