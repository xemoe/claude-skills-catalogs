# Plugin-Scope Explainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app explainer telling users that plugin-scope skills/commands cannot be added to presets, why, and how to re-install them into personal scope.

**Architecture:** One new presentational client component (`PluginScopeNotice`) rendered in four places: the Preset Item Picker (with a hidden-count), the Skills explorer when filtering by `plugin` scope, the Commands explorer when filtering by `plugin` scope, and the Presets index page (with a dismissible flag). All copy lives in `lib/i18n/dictionaries/{en,th}.ts`. No changes to `packages/presets/` or `packages/core/`.

**Tech Stack:** Next.js (App Router), React client components, Tailwind CSS v4, native `<details>`/`<summary>`, existing `CopyButton` (`apps/web/components/copy-button.tsx`), existing `useT()` i18n context. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-23-plugin-scope-explainer-design.md](../specs/2026-05-23-plugin-scope-explainer-design.md)

**Repo conventions to honor:**
- No test suite. Type check = `npm run build`; functional check = `npm run dev` + manual.
- Single-component files live flat in `apps/web/components/` (e.g. `copy-button.tsx`). The spec's `components/preset-explainer/plugin-scope-notice.tsx` is reshaped to `apps/web/components/plugin-scope-notice.tsx` for consistency.
- `Dictionary = typeof en`, so `en.ts` and `th.ts` must be edited **in the same commit** or `npm run build` fails.
- exFAT volume — use `npm`, not `pnpm`. Build with `--turbopack` only (already wired in `apps/web` scripts).
- All user-visible strings go through `useT()` / `t.<namespace>.<key>` — no inline string literals.

---

## File map

| Path | Action | Purpose |
|---|---|---|
| `apps/web/lib/i18n/dictionaries/en.ts` | edit | Add `pluginScopeNotice` namespace |
| `apps/web/lib/i18n/dictionaries/th.ts` | edit | Add the same namespace, Thai copy |
| `apps/web/components/plugin-scope-notice.tsx` | create | The shared banner component |
| `apps/web/components/presets/preset-item-picker.tsx` | edit | Count hidden plugin items; render banner above search |
| `apps/web/components/skills-explorer.tsx` | edit | Render banner when `typeFilter === "plugin"` |
| `apps/web/components/commands-explorer.tsx` | edit | Render banner when `scopeFilter === "plugin"` |
| `apps/web/app/presets/page.tsx` | edit | Render dismissible banner above `<PresetsExplorer />` |

---

## Task 1: Add `pluginScopeNotice` i18n keys (EN + TH together)

**Files:**
- Modify: `apps/web/lib/i18n/dictionaries/en.ts` (insert new top-level namespace after `viewer:`, before the closing `};` at line 643)
- Modify: `apps/web/lib/i18n/dictionaries/th.ts` (insert the matching namespace in the same position)

Both files must be updated in the same commit — `Dictionary = typeof en` enforces the shape, so half-applied changes break the type check.

- [ ] **Step 1: Add the EN namespace**

Open `apps/web/lib/i18n/dictionaries/en.ts`. Find this block at the end (around line 636–643):

```ts
    viewer: {
        preview: "Preview",
        raw: "Raw",
        copy: "Copy",
        copied: "Copied",
        copyRaw: (file: string) => `Copy raw ${file} to clipboard`,
    },
};
```

Insert a new namespace `pluginScopeNotice` between the `viewer` block's closing `},` and the dictionary's closing `};`. The result should read:

```ts
    viewer: {
        preview: "Preview",
        raw: "Raw",
        copy: "Copy",
        copied: "Copied",
        copyRaw: (file: string) => `Copy raw ${file} to clipboard`,
    },

    pluginScopeNotice: {
        headerWithCount: (count: number) =>
            `${count} plugin-scope item${count === 1 ? "" : "s"} hidden — they can't be added to presets.`,
        headerGeneric: "Plugin-scope items can't be added to presets.",
        body: "Preset apply writes to ~/.claude/skills/ only. Plugin frontmatter would be overwritten by the next plugin update.",
        showSteps: "Show install steps",
        stepsIntro: "To make a skill selectable in presets, install it into personal scope:",
        stepVendoredLabel: "Vendored skill (in this repo's vendor/):",
        stepPluginLabel: "Plugin skill from a marketplace:",
        stepPluginBody:
            "Copy ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/skills/<name>/ to ~/.claude/skills/<name>/ , then click Rescan.",
        dismiss: "Dismiss",
        emptyPickerWithHidden: (count: number) =>
            `No personal-scope items yet — ${count} plugin item${count === 1 ? " is" : "s are"} hidden above.`,
    },
};
```

- [ ] **Step 2: Add the TH namespace**

Open `apps/web/lib/i18n/dictionaries/th.ts`. Find the matching `viewer` block near the end (around line 613–619) and the closing `};`. Insert the parallel block:

```ts
    viewer: {
        preview: "ตัวอย่าง",
        raw: "ต้นฉบับ",
        copy: "คัดลอก",
        copied: "คัดลอกแล้ว",
        copyRaw: (file) => `คัดลอก ${file} ต้นฉบับไปยังคลิปบอร์ด`,
    },

    pluginScopeNotice: {
        headerWithCount: (count) =>
            `รายการประเภท plugin ${count} รายการถูกซ่อน — เพิ่มเข้า preset ไม่ได้`,
        headerGeneric: "รายการประเภท plugin เพิ่มเข้า preset ไม่ได้",
        body: "Preset เขียนข้อมูลที่ ~/.claude/skills/ เท่านั้น ถ้าแก้ frontmatter ของ plugin อัปเดต plugin ครั้งถัดไปจะเขียนทับ",
        showSteps: "ดูวิธีติดตั้ง",
        stepsIntro: "ติดตั้ง skill เข้า personal scope เพื่อให้เลือกใน preset ได้:",
        stepVendoredLabel: "Skill ใน vendor/ ของรีโพนี้:",
        stepPluginLabel: "Skill จาก plugin marketplace:",
        stepPluginBody:
            "คัดลอก ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/skills/<name>/ ไปวางที่ ~/.claude/skills/<name>/ แล้วกด Rescan",
        dismiss: "ปิด",
        emptyPickerWithHidden: (count) =>
            `ยังไม่มีรายการ personal scope — มี ${count} รายการ plugin ถูกซ่อนอยู่ด้านบน`,
    },
};
```

> Note on TH function signatures: existing TH functions in this file omit explicit parameter types (e.g. `(count) => …`) because the `Dictionary` type already constrains them. Match that style — don't add `: number` annotations.

- [ ] **Step 3: Verify the type check passes**

Run from the repo root:

```
npm run build
```

Expected: build completes; no TS errors. If TS complains that the shape of TH doesn't match EN, you missed a key. The shape is enforced by `export const th: Dictionary = { … }` at the top of `th.ts`.

> If the build is slow on first run, you may instead invoke `npx tsc --noEmit -p apps/web` for a faster type-only check. But `npm run build` is the canonical check defined in `CLAUDE.md`.

- [ ] **Step 4: Commit**

```
git add apps/web/lib/i18n/dictionaries/en.ts apps/web/lib/i18n/dictionaries/th.ts
git commit -m "$(cat <<'EOF'
feat(i18n): add pluginScopeNotice namespace (en, th)

Strings for the upcoming plugin-scope explainer banner — header
(with/without count), body, collapsible install steps, dismiss
label, and an empty-state line for the picker when only plugin
items exist.
EOF
)"
```

---

## Task 2: Create `PluginScopeNotice` component

**Files:**
- Create: `apps/web/components/plugin-scope-notice.tsx`

The component is pure presentation. It reads from i18n, optionally counts the hidden items, and optionally persists a dismissal in `localStorage`.

- [ ] **Step 1: Write the component**

Create `apps/web/components/plugin-scope-notice.tsx` with this exact content:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { useT } from "@/lib/i18n/context";

type Props = {
    /** When set, banner shows "N plugin items hidden". When omitted, generic copy. */
    count?: number;
    /**
     * When set, the banner is dismissible and persists the dismissal in
     * localStorage under `skills-lector.dismissed.<dismissKey>`. Omit for
     * context-bound banners (picker, explorer filters) that should reappear
     * every time their context appears.
     */
    dismissKey?: string;
};

const VENDOR_INSTALL_CMD = "/vendor-install <name>";

export function PluginScopeNotice({ count, dismissKey }: Props) {
    const t = useT();
    const [dismissed, setDismissed] = useState(false);

    // Read persisted dismissal on mount. SSR renders the banner; the client
    // hides it on mount if it was previously dismissed. Small flicker is OK.
    useEffect(() => {
        if (!dismissKey) return;
        try {
            const v = window.localStorage.getItem(
                `skills-lector.dismissed.${dismissKey}`,
            );
            if (v === "1") setDismissed(true);
        } catch {
            /* storage blocked; render the banner */
        }
    }, [dismissKey]);

    if (dismissed) return null;

    const header =
        typeof count === "number"
            ? t.pluginScopeNotice.headerWithCount(count)
            : t.pluginScopeNotice.headerGeneric;

    function onDismiss() {
        if (!dismissKey) return;
        try {
            window.localStorage.setItem(
                `skills-lector.dismissed.${dismissKey}`,
                "1",
            );
        } catch {
            /* storage blocked */
        }
        setDismissed(true);
    }

    return (
        <div className="relative rounded-none border bg-muted/40 p-3 text-sm">
            {dismissKey ? (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1"
                    onClick={onDismiss}
                    title={t.pluginScopeNotice.dismiss}
                >
                    <X />
                </Button>
            ) : null}
            <div className="flex items-start gap-2 pr-7">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                    <p className="font-medium">{header}</p>
                    <p className="text-muted-foreground">
                        {t.pluginScopeNotice.body}
                    </p>
                    <details className="mt-2 text-xs">
                        <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                            {t.pluginScopeNotice.showSteps}
                        </summary>
                        <div className="mt-2 space-y-2 border-l-2 pl-3">
                            <p>{t.pluginScopeNotice.stepsIntro}</p>
                            <div>
                                <p className="font-medium">
                                    {t.pluginScopeNotice.stepVendoredLabel}
                                </p>
                                <div className="mt-1 flex items-center gap-1">
                                    <code className="rounded-none bg-background px-1.5 py-0.5 font-mono">
                                        {VENDOR_INSTALL_CMD}
                                    </code>
                                    <CopyButton
                                        value={VENDOR_INSTALL_CMD}
                                        size="icon-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="font-medium">
                                    {t.pluginScopeNotice.stepPluginLabel}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    {t.pluginScopeNotice.stepPluginBody}
                                </p>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Verify the build still passes**

```
npm run build
```

Expected: build completes. The component is not yet imported anywhere, so the only thing the type check verifies here is that the new file itself compiles (i18n keys resolve, lucide icons import correctly, `CopyButton` `size` prop accepts `"icon-xs"`).

> If `Button` complains that `size="icon-sm"` is not assignable, open `apps/web/components/ui/button.tsx` and confirm the size variant exists; it's used elsewhere (see `CopyButton`) so it should be present.

- [ ] **Step 3: Commit**

```
git add apps/web/components/plugin-scope-notice.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add PluginScopeNotice banner component

Shared banner for the plugin-scope explainer. Header switches on
optional count prop; collapsible <details> reveals install steps
for vendored and marketplace plugins with a copy button for the
vendor-install slash command. Optional dismissKey persists the
dismissal in localStorage.
EOF
)"
```

---

## Task 3: Wire the banner into the Preset Item Picker

**Files:**
- Modify: `apps/web/components/presets/preset-item-picker.tsx`

The picker fetches `/api/skills` and `/api/commands`, then filters to personal items. We need to also count plugin items, render the banner above the search input when count > 0, and replace the empty-state line when only plugin items exist.

- [ ] **Step 1: Add the count + import**

Open `apps/web/components/presets/preset-item-picker.tsx`. Add the import for the new component near the existing imports (after the `Checkbox` import on line 13):

```tsx
import { PluginScopeNotice } from "@/components/plugin-scope-notice";
import { useT } from "@/lib/i18n/context";
```

Add a state slot for `hiddenCount`. After the existing `const [selected, setSelected] = useState<Set<string>>(new Set());` (line 40), insert:

```tsx
    const [hiddenCount, setHiddenCount] = useState(0);
    const t = useT();
```

- [ ] **Step 2: Count plugin items inside the fetch handler**

In the `useEffect` (currently lines 42–95), the `.then(([skillsRes, commandsRes]) => { … })` callback iterates skills and commands. Modify the iteration to count plugin/non-personal items.

Locate this section (around lines 72–92):

```tsx
            const merged: AvailableItem[] = [];
            for (const s of skills) {
                // Skills use "type" field; personal type = "personal"
                if (s.type !== "personal") continue;
                merged.push({
                    kind: "skill",
                    identifier: s.name,
                    name: s.name,
                    description: s.description,
                });
            }
            for (const c of commands) {
                if (c.scope !== "personal") continue;
                merged.push({
                    kind: "command",
                    identifier: c.name,
                    name: c.name,
                    description: c.description,
                });
            }
            setItems(merged);
```

Replace it with:

```tsx
            const merged: AvailableItem[] = [];
            let hidden = 0;
            for (const s of skills) {
                if (s.type === "plugin") {
                    hidden += 1;
                    continue;
                }
                if (s.type !== "personal") continue;
                merged.push({
                    kind: "skill",
                    identifier: s.name,
                    name: s.name,
                    description: s.description,
                });
            }
            for (const c of commands) {
                if (c.scope === "plugin") {
                    hidden += 1;
                    continue;
                }
                if (c.scope !== "personal") continue;
                merged.push({
                    kind: "command",
                    identifier: c.name,
                    name: c.name,
                    description: c.description,
                });
            }
            setItems(merged);
            setHiddenCount(hidden);
```

- [ ] **Step 3: Render the banner above the search input**

Locate the JSX inside `<SheetContent>` (around lines 128–145). Find this block:

```tsx
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3 px-4">
                    <Input
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
```

Insert the banner between `<div className="mt-4 space-y-3 px-4">` and `<Input …/>`:

```tsx
                <div className="mt-4 space-y-3 px-4">
                    {hiddenCount > 0 ? (
                        <PluginScopeNotice count={hiddenCount} />
                    ) : null}
                    <Input
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
```

- [ ] **Step 4: Replace the empty-state line when only plugin items exist**

Find the empty-state branch (around lines 144–148):

```tsx
                        ) : filtered.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">
                                No items in personal scope.
                            </p>
                        ) : (
```

Replace it with:

```tsx
                        ) : filtered.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">
                                {hiddenCount > 0
                                    ? t.pluginScopeNotice.emptyPickerWithHidden(hiddenCount)
                                    : "No items in personal scope."}
                            </p>
                        ) : (
```

> The "No items in personal scope." literal stays English for now — the rest of this component still uses inline literals (e.g. `"Search…"`, `"Loading…"`). Migrating those to i18n is out of scope for this plan; only the new branch uses `t.pluginScopeNotice.emptyPickerWithHidden`.

- [ ] **Step 5: Verify the build passes**

```
npm run build
```

Expected: build completes. If `t.pluginScopeNotice` is `undefined`, Task 1 was not committed before this task — go back and check.

- [ ] **Step 6: Commit**

```
git add apps/web/components/presets/preset-item-picker.tsx
git commit -m "$(cat <<'EOF'
feat(presets): show PluginScopeNotice in the item picker

Plugin-scope skills/commands stay hidden (preset apply only writes
personal scope), but the picker now counts them and renders the
explainer banner above the search input so the user knows what is
missing and how to fix it. Empty-state line also tells the user
about the hidden items when no personal items exist.
EOF
)"
```

---

## Task 4: Wire the banner into the Skills explorer

**Files:**
- Modify: `apps/web/components/skills-explorer.tsx`

Render the banner above the table when the active `typeFilter === "plugin"`. No count needed — the table itself shows the items.

- [ ] **Step 1: Add the import**

Open `apps/web/components/skills-explorer.tsx`. Add this import after the existing component imports (after the `ModelInvocationBadge` import on line 37):

```tsx
import { PluginScopeNotice } from "@/components/plugin-scope-notice";
```

- [ ] **Step 2: Render the banner above the table**

The component returns a single root `<div className="space-y-4">` (line 114). Inside it, the filter bar is the first child (`<div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">`, line 116), and the table wrapper (`<div className="ring-1 ring-foreground/10">`, line 223) is the next sibling.

Insert the banner between the filter bar's closing `</div>` (line 221) and the table wrapper's opening `<div className="ring-1 ring-foreground/10">` (line 223):

```tsx
                </Select>
            </div>

            {typeFilter === "plugin" ? <PluginScopeNotice /> : null}

            <div className="ring-1 ring-foreground/10">
                <Table>
```

The banner appears only when the user is filtering by `plugin`. Switching to any other tab hides it; no dismissal needed (context-bound).

- [ ] **Step 3: Verify the build passes**

```
npm run build
```

Expected: build completes; no TS errors.

- [ ] **Step 4: Commit**

```
git add apps/web/components/skills-explorer.tsx
git commit -m "$(cat <<'EOF'
feat(skills): show PluginScopeNotice when filtering by plugin scope

Renders the explainer banner above the table whenever the type
filter is "plugin", so users browsing plugin skills understand why
they can't add them to a preset.
EOF
)"
```

---

## Task 5: Wire the banner into the Commands explorer

**Files:**
- Modify: `apps/web/components/commands-explorer.tsx`

Mirrors Task 4 against the commands scope filter.

- [ ] **Step 1: Add the import**

Open `apps/web/components/commands-explorer.tsx`. Add this import after the `ModelInvocationBadge` import on line 37:

```tsx
import { PluginScopeNotice } from "@/components/plugin-scope-notice";
```

- [ ] **Step 2: Render the banner above the table**

Locate the same structural seam — between the filter bar's closing `</div>` (around line 217) and the table wrapper's opening `<div className="ring-1 ring-foreground/10">` (line 219):

```tsx
                </Select>
            </div>

            {scopeFilter === "plugin" ? <PluginScopeNotice /> : null}

            <div className="ring-1 ring-foreground/10">
                <Table>
```

- [ ] **Step 3: Verify the build passes**

```
npm run build
```

Expected: build completes; no TS errors.

- [ ] **Step 4: Commit**

```
git add apps/web/components/commands-explorer.tsx
git commit -m "$(cat <<'EOF'
feat(commands): show PluginScopeNotice when filtering by plugin scope

Mirrors the Skills explorer change — renders the explainer banner
above the table whenever the scope filter is "plugin".
EOF
)"
```

---

## Task 6: Wire the banner into the Presets index page

**Files:**
- Modify: `apps/web/app/presets/page.tsx`

Render the dismissible banner near the top of the page, above `<PresetsExplorer />`. This is the only surface that uses `dismissKey` — a user who has read it on the index shouldn't see it every refresh.

- [ ] **Step 1: Add the import + render**

Open `apps/web/app/presets/page.tsx`. Add the import near the existing imports (after the `getServerI18n` import on line 11):

```tsx
import { PluginScopeNotice } from "@/components/plugin-scope-notice";
```

Then find the JSX return (currently lines 32–46):

```tsx
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {t.presetsPage.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t.presetsPage.subtitle}
                </p>
            </div>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <PresetsExplorer />
            </HydrationBoundary>
        </div>
    );
```

Insert the banner between the title block's closing `</div>` and the `<HydrationBoundary>`:

```tsx
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {t.presetsPage.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t.presetsPage.subtitle}
                </p>
            </div>
            <PluginScopeNotice dismissKey="presets-index" />
            <HydrationBoundary state={dehydrate(queryClient)}>
                <PresetsExplorer />
            </HydrationBoundary>
        </div>
    );
```

> `PluginScopeNotice` is `"use client"` — Next.js handles importing a client component inside a server component fine. No `"use client"` directive needed on `page.tsx`.

- [ ] **Step 2: Verify the build passes**

```
npm run build
```

Expected: build completes; no TS errors.

- [ ] **Step 3: Commit**

```
git add apps/web/app/presets/page.tsx
git commit -m "$(cat <<'EOF'
feat(presets): show dismissible PluginScopeNotice on /presets

Generic explainer banner at the top of the Presets index, with
localStorage-backed dismissal (key: presets-index) so it doesn't
nag users who have already read it.
EOF
)"
```

---

## Task 7: Manual verification

The repo has no automated tests, so the design's behaviors must be exercised in the browser. This task does not produce a commit — it confirms the work.

- [ ] **Step 1: Start the dev server**

```
npm run dev
```

Wait until the server logs `Ready` on port 4317. Open `http://localhost:4317/`.

- [ ] **Step 2: Verify the Skills explorer banner**

- The page renders `Personal`, `Plugin`, `Project`, `Local` tabs with counts.
- Click the **Plugin** tab.
- **Expected:** the explainer banner appears immediately above the table, showing the generic header (no count). Body line is visible. `Show install steps` expands to reveal the two install paths and a copy button next to `/vendor-install <name>`.
- Click **Personal** — banner disappears.
- Click the **Copy** button next to `/vendor-install <name>` — paste somewhere to confirm the text was copied; the icon flips to a green check for ~1.5s.

- [ ] **Step 3: Verify the Commands explorer banner**

- Open `/commands`.
- Click the **Plugin** tab.
- **Expected:** the same banner appears above the table.
- Click **Personal** — banner disappears.

- [ ] **Step 4: Verify the picker banner**

- Open `/presets/new`.
- Fill in any name (e.g. `test-banner`) and click **Next**.
- Click **Choose from catalog**.
- **Expected:** the sheet opens with a banner at the top reading `N plugin-scope items hidden — they can't be added to presets.` where N matches the plugin count shown on the Skills tab plus the plugin count on the Commands tab.
- If the user has zero personal items: the list area shows `No personal-scope items yet — N plugin items are hidden above.`
- Close the sheet without confirming; cancel out of the wizard.

- [ ] **Step 5: Verify the Presets index banner + dismissal**

- Open `/presets`.
- **Expected:** the dismissible banner appears between the page subtitle and the presets explorer, with a small `×` button in its top-right corner.
- Click the `×`.
- **Expected:** the banner disappears.
- Reload the page (`Ctrl+R` / `Cmd+R`).
- **Expected:** the banner stays hidden (localStorage persisted the dismissal).
- Open DevTools → Application → Local Storage → `http://localhost:4317`, delete the entry `skills-lector.dismissed.presets-index`, reload.
- **Expected:** the banner reappears.

- [ ] **Step 6: Verify Thai translations**

- Switch language to Thai via the top-right language toggle.
- Visit `/`, `/commands`, `/presets/new` → `Choose from catalog`, and `/presets`.
- **Expected:** every visible string in every banner (header, body, summary, steps, dismiss tooltip) renders in Thai.
- Switch back to English; everything reverts.

- [ ] **Step 7: Final type check**

Stop the dev server (`Ctrl+C`). Run:

```
npm run build
```

Expected: build completes; no TS errors; turbopack finishes without warnings related to the new files.

---

## Self-Review notes

- **Spec coverage:** all six design sections (shared component, picker, Skills explorer, Commands explorer, Presets index, i18n) have a task. Non-goals (engine changes, Preset Detail banner, "Convert to personal" button, new `<Alert>` primitive) are explicitly absent.
- **Placeholder scan:** every step has exact code or exact commands. No "TBD", no "implement later", no "add appropriate error handling" without a specific case.
- **Type consistency:** `pluginScopeNotice.headerWithCount(count: number) => string` and `emptyPickerWithHidden(count: number) => string` are the only callable keys; everything else is a string. Confirmed signatures match across EN and TH and across the component + picker call sites.
- **Path consistency:** `apps/web/components/plugin-scope-notice.tsx` is referenced by the same `@/components/plugin-scope-notice` import in Tasks 3, 4, 5, 6.
- **Scope check:** single implementation plan, ~7 small tasks, ~6 commits, one new file + six edits. Right size for one engineer in one session.
