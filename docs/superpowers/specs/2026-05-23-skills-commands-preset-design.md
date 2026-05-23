# Skills + Commands Presets — Design

| | |
|---|---|
| **Status** | Draft (awaiting user review) |
| **Date** | 2026-05-23 |
| **Target release** | v0.5.0 |
| **Author** | Claude (brainstormed with @Teerapong) |

## Summary

Add a **preset system** to Skills Lector so users can bundle skills + commands
per workflow ("debugging", "frontend-design", "pr-review", ...) and switch
between them in one click. Switching toggles each skill/command's
`disable-model-invocation` frontmatter — same mechanism as the existing
`set-model-invocation` skill — for the personal scope only.

Presets are stored in a SQLite database at `~/.skills-lector/presets.db`.
The store keeps preset definitions plus a full apply audit trail, but no
filesystem snapshots — current filesystem state is the single source of
truth.

This is the first **mutating** feature in a previously read-only project,
so the design isolates the mutation surface into a new `packages/presets`
package and keeps existing catalogs untouched.

## Goals

- Match different types of daily work by switching whole-bundle "what
  Claude can invoke" sets, instead of toggling skills one-by-one.
- Keep the existing catalog (`/skills`, `/commands`, `/hooks`,
  `/discover`) read-only — preset UX lives on a separate `/presets` page.
- Preserve `packages/core` as a pure filesystem reader — all mutation
  lives in `packages/presets`.
- Provide an audit trail (which preset was applied when, what changed)
  for debugging and confidence.
- Safe by default: dry-run preview before every apply, atomic per-file
  writes, soft delete only, pinned-items escape hatch.

## Non-goals

- Export / import presets across machines.
- Multi-machine sync.
- Preset scheduling or auto-switch by time of day.
- Filesystem snapshots / per-item content undo.
- Migration of existing catalog pages to TanStack Query.
- CLI bindings — presets are web-only in v1.
- A general settings.json editor (the ROADMAP "edit hooks from the web
  app" candidate stays separate).
- An automated test suite — that remains a ROADMAP candidate item.

## Decisions taken during brainstorm

| # | Question | Decision |
|---|---|---|
| 1 | What does activating a preset *do*? | Toggle `disable-model-invocation` frontmatter — same mechanism as `set-model-invocation` skill. |
| 2 | Switch semantics? | **Exclusive** — 1 active preset at a time; switching enables items in the new preset and disables items not in it. **Pinned items** act as an always-on escape hatch. |
| 3 | Which scopes get toggled? | **Personal only** — `~/.claude/skills/` and `~/.claude/commands/`. Plugin / project / local scopes are never written. |
| 4 | What is in the DB? | **Preset definitions + apply history** (audit trail). No filesystem snapshots. No scan-result cache. |
| 5 | Ship starter presets? | **No** — empty + onboarding wizard. Users curate their own to avoid opinion bias. |
| 6 | Catalog integration? | **None** — `/presets` is a standalone page. Catalog stays read-only. |
| 7 | SQLite driver? | **`better-sqlite3`** — sync API matches Server Components, native binary, no symlinks (exFAT safe). |
| 8 | DB location? | **`~/.skills-lector/presets.db`** — bound to user, not install. Overridable via config + env var. |
| 9 | Delete policy? | **Soft delete only** — `archived_at` column, Active/Archived tabs in UI, no hard-delete API in v1. |
| 10 | Save flow in wizard? | **Two buttons** — `Save` and `Save & Activate`. The latter shows a progress modal. |
| 11 | Client state library? | **TanStack Query** — only in `/presets/*`. Initial state via Server Component + `HydrationBoundary`. |
| 12 | Activate progress feedback? | **SSE** when ≥ 4 items will change; simple spinner otherwise. |
| 13 | Error policy during apply? | **Partial success** — record per-file errors in `apply_log_items`, do not abort the whole apply. |
| 14 | Crash recovery? | **Self-heal** — no global fs+DB transaction; filesystem is truth; next apply recomputes diff and converges. |

## Architecture

### New package: `packages/presets`

```
packages/presets/
  package.json
  tsconfig.json                 (extends ../../tsconfig.base.json)
  src/
    db.ts                       Open SQLite, run migrations on startup
    schema.sql                  DDL — presets / preset_items / pinned_items / active_preset / apply_log / apply_log_items
    migrations/
      001_initial.sql           Initial v1 schema (single file for v1)
    presets.ts                  CRUD: createPreset, listPresets, getPreset, updatePreset, archivePreset, unarchivePreset
    pinned.ts                   CRUD: listPinned, addPin, archivePin, unarchivePin
    activate.ts                 applyPreset(presetId, opts) — diff + write + log
    diff.ts                     Pure: computeApplyDiff({ presetItems, pinnedItems, fsItems })
    frontmatter.ts              Read/write SKILL.md & command .md frontmatter (re-uses lenient parser from core)
    identity.ts                 Resolve preset_item identifier ↔ on-disk file path
    log.ts                      Read apply history (latest N, filter by preset)
    types.ts                    Preset, PresetItem, PinnedItem, ApplyLog, ApplyResult, ApplyDiff
```

`apps/web` consumes via TypeScript path alias `@lector/presets/*` (same
pattern as `@lector/core/*`). `apps/web/tsconfig.json` adds the new
mapping; no npm workspaces (exFAT constraint).

Rationale for splitting from `packages/core`:
- `core` invariant: pure filesystem read, no mutation. v0.1.0-v0.4.0 keep
  this property. Mixing mutating code into `core` breaks the contract.
- Test/audit isolation: `packages/presets` is the only place that opens
  SQLite or writes frontmatter — easy to review the blast radius.
- Removable: if the feature is rolled back, drop `packages/presets/` and
  `apps/web/app/presets/` together.

### API routes

```
apps/web/app/api/presets/
  route.ts                                  GET (list), POST (create)
  [id]/
    route.ts                                GET (detail), PATCH (update)
    archive/route.ts                        POST
    unarchive/route.ts                      POST
    activate/route.ts                       POST  (?dryRun=1 / ?stream=1)
    items/route.ts                          POST (add), DELETE (remove)
  pin/
    route.ts                                GET (list), POST (add)
    [kind]/[id]/
      archive/route.ts                      POST
      unarchive/route.ts                    POST
  log/route.ts                              GET (paged apply history)
```

All routes parse request bodies with Zod schemas defined alongside the
route handler. Response envelopes use the same shape as existing
`/api/skills` (plain JSON, no error class).

### UI pages

```
apps/web/app/presets/
  layout.tsx                                QueryClientProvider scope (or share at root)
  page.tsx                                  /presets — list + active card + pinned panel
  new/page.tsx                              /presets/new — wizard (Name → Items → Review)
  [id]/page.tsx                             /presets/[id] — detail + edit + activate
  log/page.tsx                              /presets/log — apply history

apps/web/components/presets/
  presets-explorer.tsx                      Client — list + filters + tabs (Active / Archived)
  preset-card.tsx                           List item with active badge, archive button
  preset-detail.tsx                         Detail page client component
  preset-wizard.tsx                         3-step wizard (shared by /new + empty state in /)
  preset-item-picker.tsx                    Sheet — multi-select from catalog
  activate-confirm-dialog.tsx               Dry-run diff dialog
  activate-progress-modal.tsx               SSE-driven progress (>= 4 items)
  pinned-panel.tsx                          List + add + archive pinned items
  apply-log-table.tsx                       Apply history with expandable rows
```

### Navigation

`apps/web/components/main-nav.tsx` — add `Presets` link between `Hooks`
and `Discover`. Bilingual label via `nav.presets`.

No header pill, no active-preset indicator outside `/presets`
(per decision #6).

## Data model

```sql
-- presets: the user's saved bundles
CREATE TABLE presets (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  slug         TEXT    NOT NULL UNIQUE,
  name         TEXT    NOT NULL,
  description  TEXT,
  color        TEXT,
  archived_at  TEXT,                              -- NULL = active
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL
);
CREATE INDEX idx_presets_archived ON presets(archived_at);

-- preset_items: skills + commands in each preset
CREATE TABLE preset_items (
  preset_id    INTEGER NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  kind         TEXT    NOT NULL CHECK (kind IN ('skill','command')),
  identifier   TEXT    NOT NULL,                  -- relative path under personal root
  added_at     TEXT    NOT NULL,
  PRIMARY KEY (preset_id, kind, identifier)
);
CREATE INDEX idx_preset_items_by_identity ON preset_items(kind, identifier);

-- pinned_items: always-on regardless of active preset
CREATE TABLE pinned_items (
  kind         TEXT    NOT NULL CHECK (kind IN ('skill','command')),
  identifier   TEXT    NOT NULL,
  pinned_at    TEXT    NOT NULL,
  reason       TEXT,
  archived_at  TEXT,                              -- NULL = active
  PRIMARY KEY (kind, identifier)
);

-- active_preset: 0 or 1 row (singleton)
CREATE TABLE active_preset (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  preset_id     INTEGER REFERENCES presets(id) ON DELETE SET NULL,
  activated_at  TEXT    NOT NULL
);

-- apply_log: every activation attempt (audit trail)
CREATE TABLE apply_log (
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

-- apply_log_items: per-item detail
CREATE TABLE apply_log_items (
  log_id       INTEGER NOT NULL REFERENCES apply_log(id) ON DELETE CASCADE,
  kind         TEXT    NOT NULL,
  identifier   TEXT    NOT NULL,
  action       TEXT    NOT NULL CHECK (action IN ('enabled','disabled','skipped','error','missing')),
  message      TEXT,
  PRIMARY KEY (log_id, kind, identifier)
);
CREATE INDEX idx_apply_log_items_log ON apply_log_items(log_id);

-- schema_version: for future migrations
CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
INSERT INTO schema_version(version) VALUES (1);
```

### Migration policy

- **Forward-only** — no down migrations. Each new schema version is a
  new file under `migrations/` (e.g. `002_add_X.sql`) wrapped in
  `BEGIN`/`COMMIT`.
- **Idempotent at the version level** — the runner checks
  `schema_version` and only runs files for versions greater than the
  current value.
- **Atomic per migration** — fail mid-file → rollback that file, abort
  startup, leave previous version intact.
- **Backup before upgrade is the user's responsibility** — documented in
  CLAUDE.md.

### Identifier convention

`identifier` is the path **relative to the personal scope root**, without
the file extension and without trailing `SKILL.md`:

- Skill at `~/.claude/skills/debug-mantra/SKILL.md` → identifier
  `debug-mantra`
- Command at `~/.claude/commands/vendor-install.md` → identifier
  `vendor-install`
- Namespaced command at `~/.claude/commands/git/commit.md` → identifier
  `git:commit` (matches existing scanner convention where `/` becomes `:`)

This keeps identifiers human-readable, stable across machines that share
a `~/.claude` layout, and easy to grep in apply logs.

## Apply algorithm

`applyPreset(presetId, opts?)` is the central mutating function.

```ts
type ApplyOptions = {
  dryRun?: boolean;       // returns ApplyResult without writing fs or log
  force?: boolean;        // skip the "no-op" early exit
};

type ApplyResult = {
  status: "success" | "partial" | "failed";
  logId: number | null;   // null when dryRun
  enabled:  Array<{ kind, identifier, fromState, toState }>;
  disabled: Array<{ kind, identifier, fromState, toState }>;
  skipped:  Array<{ kind, identifier, reason }>;
  missing:  Array<{ kind, identifier }>;
  errors:   Array<{ kind, identifier, message }>;
  durationMs: number;
};
```

Steps:

1. **Load state**
   - `presetItems` = items in preset (active, not archived)
   - `pinnedItems` = all non-archived pinned items
   - `currentActive` = active_preset row
   - `fsItems` = personal-scope items derived from `packages/core`
     scanners. The scanners return all scopes; `identity.ts` filters the
     result to `scope === 'personal'` and projects each entry to
     `{ kind, identifier, currentInvocation, filePath }`. Same scan for
     skills and commands; preset and pinned items both join against this
     unified list.

2. **Compute diff** (pure function in `diff.ts`)
   - `targetEnabled = presetItems ∪ pinnedItems`
   - Per fsItem:
     - in pinned → `skipped("pinned")`
     - in preset, currently enabled → `skipped("already-correct")`
     - in preset, currently disabled → `ENABLE`
     - not in preset, currently enabled → `DISABLE`
     - not in preset, currently disabled → `skipped("already-correct")`
   - Per presetItem absent from fsItems → `missing(item)`

3. **Early exit** — if `enabled + disabled` is empty and `!force`,
   return success no-op (still updates `active_preset` row).

4. **Dry-run gate** — if `opts.dryRun`, return `ApplyResult` now.

5. **Apply per file, sequential**
   ```ts
   for (const item of [...enabled, ...disabled]) {
     try {
       const fm = readFrontmatter(item.filePath);
       if (item shouldBeEnabled) delete fm["disable-model-invocation"];
       else fm["disable-model-invocation"] = true;
       writeFileAtomic(item.filePath, fm);   // write tmp → rename
     } catch (err) {
       errors.push({ ...item, message: err.message });
     }
   }
   ```

6. **Write log** (single SQLite transaction)
   ```sql
   BEGIN IMMEDIATE;
   INSERT INTO apply_log(...) RETURNING id;
   INSERT INTO apply_log_items(...) for each item;
   UPDATE active_preset SET preset_id = ?, activated_at = ?
     ON CONFLICT(id=1) DO UPDATE ...;
   COMMIT;
   ```

7. **Invalidate scanner cache** — bust `packages/core` in-process scan
   cache so the next catalog read reflects the new state.

### Key properties

- **Pinned overrides preset** — if an item is in the preset (to disable)
  and pinned (to keep on), pinned wins, action `skipped("pinned")`.
- **Missing ≠ error** — preset references a removed item → log as
  `missing`, do not block other items.
- **Frontmatter "enable" semantics** — remove the
  `disable-model-invocation` key entirely (not set to `false`) to leave
  the file as close to its original default as possible.
- **Atomic file write** — `fs.writeFile(tmp); fs.rename(tmp, real);` —
  exFAT supports `rename` (it's `symlink` that fails).
- **Sequential, not parallel** — disk-bound; sequential simplifies error
  correlation. Apply size is bounded (personal scope items, typically
  < 100).
- **No global fs+DB transaction** — if the server crashes between fs
  writes and the SQLite commit, fs state is partially mutated and DB log
  may be missing. The next apply uses fs state as truth, computes diff
  from current state, and converges. Audit trail for the lost run is
  unrecoverable — accepted trade-off.

## UI flow

### `/presets` — list page

- **Header**: `Presets`, subtitle, `[+ New preset]` button.
- **Active card** (when active_preset is set): preset name, item count,
  `activated_at` relative time, `[View detail]` `[Re-apply]` actions.
  No "switch off" link — to clear the active state the user activates
  another preset, or archives the current one (which auto-clears
  active_preset).
- **Tabs**: `Active (N)` | `Archived (M)` — default Active.
- **Preset grid**: card per preset (name, item count, active badge).
- **Pinned section**: collapsible list of pinned items + `[Manage]` link.

### Empty state

When `listPresets({status: 'active'}).length === 0`, render the wizard
inline instead of the grid. Same wizard component as `/presets/new`.

### `/presets/new` — wizard

Three steps, each in its own card:

1. **Name your workflow** — `name`, `description`, optional `color`.
   Validates slug (auto-derived from name, editable). Slug collision
   check against active + archived presets.
2. **Pick items** — Sheet with checkboxes over personal-scope skills
   and commands. Reuses search/filter logic from `skills-explorer.tsx`
   (extracted into a shared hook).
3. **Review** — calls `applyPreset(newPresetId, { dryRun: true })` and
   shows the diff (will enable / will disable / will skip / missing).
   Two buttons: `[Save]` and `[Save & Activate]`.

### `/presets/[id]` — detail + edit

- Header: name, description, `[Activate]` `[Edit]` `[Archive]` actions.
  When archived: `[Unarchive]` `[View only]`, all mutation disabled.
- Skills section: list, add via `[+ Add from catalog]`, remove inline.
  Each row shows current state (✓ enabled, ✗ disabled, ⚠ missing).
- Commands section: same.
- Recent activations: last 5 apply_log rows filtered by this preset.

### Activate UX

1. Click `[Activate]` → `POST /api/presets/[id]/activate?dryRun=1`
2. Show `activate-confirm-dialog`:
   ```
   Switch to "debugging"?
   
   Will enable (3):  debug-mantra, find-bugs, systematic-debugging
   Will disable (5): frontend-design, design-system, ux-copy, ...
   Will skip (4):    using-superpowers (pinned), vendor-install (pinned), ...
   Missing (1):      legacy-skill (in preset but not installed)
   
   [Cancel]  [Apply changes]
   ```
3. Click `Apply changes`:
   - If total `enabled + disabled` < 4 → simple POST + toast on success.
   - Otherwise → open `activate-progress-modal`, subscribe to SSE stream
     `POST /api/presets/[id]/activate?stream=1`, render phase stepper +
     progress bar.
4. On `done` event:
   - Toast `Switched to debugging (3 enabled, 5 disabled)`.
   - Call `queryClient.invalidateQueries({ queryKey: ['presets'] })`,
     `['active-preset']`, `['apply-log']`.
   - Banner in `/presets`: *Restart Claude Code sessions to pick up the
     change. Existing sessions keep their current skills loaded.*

### Save & Activate progress modal

```
┌─────────────────────────────────────────────┐
│  Activating "debugging"                     │
│                                             │
│  ✓ Created preset                            │
│  ✓ Scanned 47 personal items                 │
│  ⠋ Enabling debug-mantra (3 of 8)…           │
│  ○ Updating apply log                        │
│                                             │
│  [▰▰▰▰▰▰░░░░░] 60%                          │
└─────────────────────────────────────────────┘
```

SSE phases: `creating | scanning | enabling | disabling | logging | done`.
Each event carries `current` / `total` / `currentItem?`.

### Pinned items

Managed in the **`/presets` index page** as a collapsible panel below
the preset grid. Add via the same catalog picker Sheet. Archive = soft
hide; unarchive restores. List defaults to non-archived. No separate
page in v1.

### Apply log

`/presets/log` shows paged history. Each row: `ts`, `from → to`,
summary counts, status badge. Expand row → `apply_log_items` table
(action, identifier, message). Used for "why did X not enable?"
debugging.

## Client state (TanStack Query)

### Provider setup

```tsx
// apps/web/app/providers.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Wrap in `apps/web/app/layout.tsx`. Provider lives at the root so it
covers `/presets/*` nested routes; existing catalog pages are not
required to use it (they ignore it).

### Server-prefetch pattern

```tsx
// apps/web/app/presets/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

export const dynamic = "force-dynamic";

export default async function PresetsPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["presets", { status: "active" }],
    queryFn: () => listPresetsWithActive({ status: "active" }),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PresetsExplorer />
    </HydrationBoundary>
  );
}
```

### Query keys

| Key | Description |
|---|---|
| `['presets', { status }]` | List of presets, status = active / archived / all |
| `['preset', id]` | Single preset detail |
| `['active-preset']` | Current active preset id + activated_at |
| `['pinned']` | All non-archived pinned items |
| `['apply-log', { presetId? }]` | Apply history (paged via cursor) |
| `['apply-diff', presetId]` | Dry-run result for an upcoming activate (fresh per call, no cache) |

### Mutations

`useMutation` for create / update / archive / unarchive / addItem /
removeItem / activate / pin / unpin. Each `onSuccess` invalidates the
right query keys. Optimistic updates for low-risk operations
(item add/remove, pin/unpin).

### Scope

TanStack Query is used **only in `/presets/*`** in v1. Existing catalog
pages keep their current Server Component + plain client component
pattern. A future migration of catalog pages is out of scope.

## Error handling

| Category | Policy | UI |
|---|---|---|
| DB unreadable (corrupt, perm, disk full) | Boot-time check; fail loud | Full-page error in `/presets` with DB path + recovery hint |
| Schema migration fail | Abort startup, rollback | Error page + migration log |
| Personal dirs missing (`~/.claude/skills/`) | Treat as empty scope (no-op apply); only create dirs when an item must be written | Soft warning: "No personal skills found yet" |
| Permission denied / EBUSY on write | Per-file error → `errors[]`, continue | Toast "Applied with N errors" + log detail |
| File disappeared mid-apply | Treat as `missing` (not error) | Log entry only |
| Frontmatter malformed | Lenient parser recovers; if not, error | Per-file error in log |
| Slug collision | UNIQUE constraint → 409 | Inline form error |
| Delete (archive) active preset | Require explicit confirm (UI), API auto-deactivates | Dialog: "Will deactivate first. Continue?" |
| Activate archived preset | 400 error | Disabled button + tooltip "Unarchive first" |
| Concurrent activate (2 tabs) | `BEGIN IMMEDIATE` SQLite lock; second tab loses | Second tab toast "Preset state changed" + auto-refetch |
| Crash mid-apply | No recovery code; next apply self-heals from fs state | (no UI — invisible) |

## Configuration

New optional config keys in `apps/web/skills-lector.config.json`
(template + git-ignored real file):

```json
{
  "dbPath": "~/.skills-lector/presets.db",
  "personalRoot": "~/.claude"
}
```

Plus env var overrides for testability:
- `SKILLS_LECTOR_PRESETS_DB` — DB file path
- `SKILLS_LECTOR_PERSONAL_ROOT` — apply target root

Both override config; config overrides defaults.

## Verification checklist

Run before merging the implementation PR. No automated tests in v1 —
this is the manual smoke gate.

**Setup**

- [ ] Fresh install (no DB) → `/presets` shows onboarding wizard
- [ ] DB created at `~/.skills-lector/presets.db` after first preset
- [ ] `schema_version` row = 1 after migration

**Create / edit / archive**

- [ ] Create preset via 3-step wizard
- [ ] Edit name / description / items on detail page
- [ ] Slug collision shows inline error (against active + archived)
- [ ] Archive active preset → confirm dialog deactivates first
- [ ] Unarchive → preset returns to Active tab

**Activate**

- [ ] Click `Activate` → dry-run diff dialog matches expectations
- [ ] Confirm → fs frontmatter changes (verify with `cat SKILL.md`)
- [ ] Save & Activate progress modal animates correctly (test with
      ≥ 4 items)
- [ ] Toast shows correct counts
- [ ] `/api/skills` returns updated invocation flag (cache busted)

**Pinned**

- [ ] Pin item → switch preset → item stays enabled
- [ ] Unpin → switch preset → item respects new preset

**Edge cases**

- [ ] Preset references removed skill → apply succeeds, shows `missing`
      badge
- [ ] Two browser tabs activate simultaneously → second tab refetches
      and shows warning
- [ ] Kill dev server mid-apply (Ctrl+C) → restart → next apply converges
      correctly
- [ ] Permission denied (`chmod 444 SKILL.md` on macOS — Windows: ACL) →
      status `partial`, error logged in apply_log_items

**UI**

- [ ] Bilingual (EN/TH) — every label translates
- [ ] Dark theme — preset cards readable
- [ ] Empty state shows wizard inline in `/presets`

## Documentation deliverables

- `README.md` — feature bullet + short "Skills + Commands presets"
  section pointing to `/presets` onboarding
- `CLAUDE.md` — new section "Preset engine — `packages/presets/src/`"
  after the "Hook scan pipeline" section. Document SQLite location, env
  var overrides, apply algorithm summary, relationship to catalog
  (read-only) and to `set-model-invocation` skill (alternative path)
- `CHANGELOG.md` — `## [0.5.0] - YYYY-MM-DD` entry with Added /
  Architecture / Documentation sections (style matches 0.4.0)
- `ROADMAP.md` — note the shipped feature; remove no candidates (this
  was a new request, not a planned candidate)
- `apps/web/lib/i18n/dictionaries/en.ts` + `th.ts` — `nav.presets` plus
  full `presetsPage` content section. `Dictionary` shape enforces parity

## Open questions

None at design-finalize time. All architectural questions resolved
during brainstorm.

## Implementation notes (for the upcoming plan)

- `better-sqlite3` install on Windows uses pre-gyp prebuilds — no native
  compile expected. Document the fallback path if the prebuild fetch
  fails.
- `better-sqlite3` is a CommonJS module; verify it loads cleanly in a
  Next.js Route Handler (it does as of recent versions).
- SSE: Next.js Route Handlers support streaming responses via `Response`
  with a `ReadableStream`. `Cache-Control: no-store` and
  `Content-Type: text/event-stream` are required.
- Atomic write on Windows: `fs.rename` over an existing destination
  works on NTFS and exFAT for files (not directories). Confirm in
  manual smoke.
- Identifier resolution: identifiers don't include the extension, so
  `identity.ts` joins `personalRoot + kind-dir + identifier + suffix`
  where suffix is `/SKILL.md` for skills and `.md` for commands
  (replacing `:` with `/` for namespaced commands).
