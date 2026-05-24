# Plugin-Scope Explainer + Alternative Install Guidance — Design

**Status:** Approved — ready for implementation plan
**Date:** 2026-05-23
**Scope:** UI-only documentation/UX feature inside `apps/web/`. No changes to `packages/presets` or `packages/core`.

## Problem

The Skills Lector preset engine writes `disable-model-invocation` frontmatter only to **personal-scope** items (`~/.claude/skills/`, `~/.claude/commands/`). Plugin-scope items are filtered out at two layers:

- UI picker — [apps/web/components/presets/preset-item-picker.tsx:75,84](apps/web/components/presets/preset-item-picker.tsx:75) skips items with `type !== "personal"` / `scope !== "personal"`.
- Apply engine — [packages/presets/src/identity.ts:53,67](packages/presets/src/identity.ts:53) does the same; [resolveItemPath()](packages/presets/src/identity.ts:26) hardcodes the personal directory.

The exclusion is intentional: plugin files live under `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/…` — the version is in the path, so an update extracts a fresh copy and overwrites any frontmatter edits. Touching plugin files would let the active preset silently drift on every plugin update.

The cost of the design is **discoverability**. Users who installed skills through a marketplace (the default path on Windows) see a near-empty picker with no signal explaining why most skills are missing or how to fix it. The macOS user reporting the bug had installed via "copy to `~/.claude/skills/`" instead, which is why presets worked there.

This spec adds the UX layer that the design was missing: an explainer telling users what the limit is, why it exists, and how to install a skill so it becomes selectable. The engine's behavior does not change.

## Goals

- The Preset Item Picker shows a banner whenever it is hiding plugin items, with the hidden count.
- The Skills and Commands explorers show the same banner whenever the user is filtering by plugin scope.
- The Presets index page shows a generic, dismissible callout pointing at the limit.
- Each banner carries collapsible install steps so the user can copy a working command without leaving the page.
- All copy lives in the i18n dictionaries and is available in both English and Thai.

## Non-goals

- Engine behavior changes — plugin items remain unmodifiable.
- A "Convert to personal" action button — that crosses the same boundary the engine refuses to cross, so it stays out of scope.
- A new generic `<Alert>` primitive in `components/ui/`. The single component proposed below uses inline Tailwind classes consistent with the existing wizard error banner pattern.
- A banner on the Preset Detail page. The picker opened from that page covers the same surface.
- Telemetry on banner views or dismissals.

## Design

### 1. Shared component — `PluginScopeNotice`

**Location:** `apps/web/components/preset-explainer/plugin-scope-notice.tsx`

A single client component that renders the banner. It is the only new component the design introduces.

**Props:**

```ts
type Props = {
    /** When set, banner shows "N plugin items hidden". When omitted, generic copy. */
    count?: number;
    /** When set, banner is dismissible and remembers the dismissal in localStorage under this key. */
    dismissKey?: string;
};
```

**Visual:** `rounded-none border bg-muted/40 p-3 text-sm` — matches the muted banner pattern used elsewhere in the app. An `ⓘ` glyph sits at the start of the first line. Collapsible details use the native `<details>`/`<summary>` element so no new dependency is needed.

**Content (i18n keys under `pluginScopeNotice`):**

```
Header line:
  count set      → "{count} plugin-scope items are hidden — they can't be added to presets."
  count omitted  → "Plugin-scope items can't be added to presets."

Body (always shown):
  "Preset apply writes to ~/.claude/skills/ only. Plugin frontmatter would be
   overwritten by the next plugin update."

<details> summary: "Show install steps"
<details> body:
  "To make a skill selectable in presets, install it into personal scope:

   • Vendored skill (in this repo's vendor/):  /vendor-install <name>     [Copy]
   • Plugin skill from a marketplace:          copy
     ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/skills/<name>/
     to ~/.claude/skills/<name>/ , then click Rescan."
```

The `[Copy]` button next to the `/vendor-install` line uses the existing `copyToClipboard` action label already in the dictionaries.

**Dismissal:** Only honored when `dismissKey` is set. The component reads/writes `localStorage` under `skills-lector.dismissed.<dismissKey>`. Server-side render path: render the banner unconditionally; the client effect hides it on mount if dismissed. The flicker is acceptable for a banner this small.

### 2. Picker — `apps/web/components/presets/preset-item-picker.tsx`

- Keep the existing `type !== "personal"` / `scope !== "personal"` filters as-is — plugin items stay hidden.
- While iterating the fetched skills/commands, also count items with `type === "plugin"` and `scope === "plugin"`. Sum into `hiddenCount`.
- Render `<PluginScopeNotice count={hiddenCount} />` immediately above the search Input, only when `hiddenCount > 0`. No `dismissKey` — context-bound, the banner should reappear every time the picker opens.
- Update the empty-state message: when `items.length === 0 && hiddenCount > 0`, replace "No items in personal scope." with copy that points the user at the banner above. (New i18n key.)

### 3. Skills explorer — `apps/web/components/skills-explorer.tsx`

- Determine whether the user's current scope filter includes `"plugin"` (the explorer already owns scope-filter state).
- When it does, render `<PluginScopeNotice />` (no `count`, no `dismissKey`) directly above the skills list grid. The banner disappears as soon as the user removes the plugin filter — context-bound, no dismissal needed.

### 4. Commands explorer — `apps/web/components/commands-explorer.tsx`

Mirrors §3 against the commands scope filter. Same banner, same placement rule.

### 5. Presets index — `apps/web/app/presets/page.tsx`

- Render `<PluginScopeNotice dismissKey="presets-index" />` near the top of the page, above the presets grid.
- This is the only surface that gets `dismissKey` — a user who has read it on the index doesn't need to see it every time they open the page.

### 6. i18n — `apps/web/lib/i18n/dictionaries/{en,th}.ts`

Add a new top-level namespace `pluginScopeNotice` to both dictionaries, with the keys referenced in §1. English is canonical; Thai must match the same shape (enforced by `Dictionary = typeof en`).

Inline literal strings introduced anywhere in §2–§5 are forbidden — every user-visible string goes through `useT()` / the dictionary.

## Component layout summary

```
apps/web/
  components/
    preset-explainer/
      plugin-scope-notice.tsx          NEW — the shared banner
    presets/
      preset-item-picker.tsx           EDIT — count hidden, render banner
    skills-explorer.tsx                EDIT — conditional banner on plugin filter
    commands-explorer.tsx              EDIT — conditional banner on plugin filter
  app/
    presets/
      page.tsx                         EDIT — render dismissible banner
  lib/
    i18n/
      dictionaries/
        en.ts                          EDIT — add pluginScopeNotice namespace
        th.ts                          EDIT — add pluginScopeNotice namespace
```

## Data flow

`PluginScopeNotice` is pure presentation. No new server-side reads, no new API routes, no new fields on `Skill` / `Command`. The picker already fetches the full lists from `/api/skills` and `/api/commands`; the explorer pages already have the full scan result via their Server Component parents. All counts derive from data already on the client.

## Error handling

The component itself has no failure modes — it renders text. The only runtime concern is `localStorage` access for `dismissKey`. Wrap reads/writes in `try/catch` so that environments that block storage (privacy mode, iframes) still render the banner instead of crashing.

## Testing

There is no test suite in this monorepo (per `CLAUDE.md`: "`npm run build` is the type-correctness check"). Verification is manual:

1. `npm run dev`
2. Open `/`, filter scope to `plugin` — banner appears, collapsible expands, copy works.
3. Open `/commands`, same.
4. Open `/presets`, banner appears with dismiss; reload, dismissal persists; clear localStorage, banner reappears.
5. Open `/presets/new`, click "Choose from catalog" — banner shows hidden count matching the `plugin` count on `/`. Confirm the empty-state copy fires when only plugin items exist.
6. Switch language to Thai (top-right toggle), repeat — every string is in Thai.
7. `npm run build` — type check passes; the new `pluginScopeNotice` namespace is present in both dictionaries.

## Open questions

None. All three design forks were resolved during brainstorming:

- Picker treatment: hide + summary banner.
- Placement scope: picker + Skills explorer + Commands explorer + Presets index (not Preset Detail).
- Guidance depth: inline short + collapsible install steps with copy button.
