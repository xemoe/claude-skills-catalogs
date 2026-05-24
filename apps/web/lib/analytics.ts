import { scanActivity } from "@lector/core/activity";
import { scanCommands } from "@lector/core/command-scanner";
import { scanSkills } from "@lector/core/scanner";
import { listPresetItems } from "@lector/presets/presets";
import { formatRelativeTime } from "./utils";
import { type Locale, DEFAULT_LOCALE } from "./i18n/config";
import { getDictionary } from "./i18n/dictionaries";

export type ActivityWindow = "4h" | "1d" | "1w" | "all";
export type ActivityKind = "skill" | "command";

export interface UsageStat {
    /** Display name — bare for skills, "/name" for commands. */
    name: string;
    kind: ActivityKind;
    /** Invocation counts per time window. */
    windows: Record<ActivityWindow, number>;
    /** Newest invocation, epoch ms. */
    lastUsed: number;
    /** Human "x ago" label for lastUsed. */
    lastUsedLabel: string;
}

export interface HeatRow {
    name: string;
    kind: ActivityKind;
    /** Per-day counts, aligned with Analytics.heatDays. */
    cells: number[];
    /** Sum of cells. */
    total: number;
}

export interface CatalogGap {
    name: string;
    kind: ActivityKind;
    /** Epoch ms of last use, or null when never used. */
    lastUsed: number | null;
    lastUsedLabel: string;
    /** Deployment type/scope, e.g. "plugin" or "personal". */
    origin: string;
    /** Project or plugin name this copy is deployed from — "" for personal/local. */
    source: string;
    /** Detail-page href. */
    href: string;
}

export interface Analytics {
    /** One row per distinct skill/command that has been invoked. */
    stats: UsageStat[];
    windowTotals: Record<ActivityWindow, number>;
    totalEvents: number;
    /** ISO YYYY-MM-DD per heatmap column, oldest → newest. */
    heatDays: string[];
    /** Heatmap rows for skills, busiest first. */
    heatSkillRows: HeatRow[];
    /** Heatmap rows for commands, busiest first. */
    heatCommandRows: HeatRow[];
    skillsTotal: number;
    commandsTotal: number;
    /** Catalog items with no recorded use. */
    neverUsed: CatalogGap[];
    /** Catalog items used before, but not in the last 7 days. */
    idle: CatalogGap[];
    /** Epoch ms of the earliest recorded event, 0 if none. */
    firstEventAt: number;
    transcriptFiles: number;
    scannedAt: string;
    /** Distinct project names across the full catalog, for the project filter. */
    projects: string[];
}

const CACHE_TTL_MS = 8000;
const HEATMAP_DAYS = 14;
/** Cap on heatmap rows per kind. */
const HEATMAP_ROW_LIMIT = 24;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 7 * DAY;

let cache: {
    analytics: Analytics;
    at: number;
    locale: Locale;
    project: string;
    presetId: number | null;
} | null = null;

/** Skill identity — the last namespace segment, lowercased (plugin prefix dropped). */
function skillId(name: string): string {
    return name.toLowerCase().replace(/^\/+/, "").split(/[:/]/).pop()?.trim() ?? "";
}

/** Command identity — the bare name, lowercased, namespace kept. */
function cmdId(name: string): string {
    return name.toLowerCase().replace(/^\/+/, "").trim();
}

/** Disambiguating label for a catalog entry — its project or plugin name, else "". */
function sourceLabel(
    project?: { name: string },
    plugin?: { name: string },
): string {
    return project?.name ?? plugin?.name ?? "";
}

/** Local-time YYYY-MM-DD for an epoch timestamp. */
function dayKey(ts: number): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function emptyWindows(): Record<ActivityWindow, number> {
    return { "4h": 0, "1d": 0, "1w": 0, all: 0 };
}

interface Group {
    name: string;
    kind: ActivityKind;
    windows: Record<ActivityWindow, number>;
    lastUsed: number;
    /** Per-dayKey counts, used to build the heatmap. */
    days: Map<string, number>;
}

/**
 * Aggregates transcript activity against the deployed catalog: windowed top
 * lists, a recent-activity heatmap, and which skills/commands have gone unused.
 */
export function buildAnalytics(
    opts: {
        force?: boolean;
        locale?: Locale;
        project?: string;
        presetId?: number | null;
    } = {},
): Analytics {
    const locale = opts.locale ?? DEFAULT_LOCALE;
    const project = opts.project ?? "";
    const presetId = opts.presetId ?? null;
    if (
        !opts.force &&
        cache &&
        cache.locale === locale &&
        cache.project === project &&
        cache.presetId === presetId &&
        Date.now() - cache.at < CACHE_TTL_MS
    ) {
        return cache.analytics;
    }

    const t = getDictionary(locale);
    const activity = scanActivity(opts);
    const allSkills = scanSkills(opts).skills;
    const allCommands = scanCommands(opts).commands;
    const now = Date.now();

    // Distinct project names across the whole catalog — drives the filter UI.
    const projects = [
        ...new Set(
            [...allSkills, ...allCommands]
                .map((item) => item.project?.name)
                .filter((name): name is string => !!name),
        ),
    ].sort((a, b) => a.localeCompare(b));

    // Preset filter — restrict the catalog to items that belong to the preset.
    // Presets target personal-scope by identifier; we match against the catalog
    // entry's `name` (the same field stored in preset_items.identifier).
    let presetSkillNames: Set<string> | null = null;
    let presetCommandNames: Set<string> | null = null;
    if (presetId != null) {
        try {
            const items = listPresetItems(presetId);
            presetSkillNames = new Set();
            presetCommandNames = new Set();
            for (const item of items) {
                if (item.kind === "skill") presetSkillNames.add(item.identifier);
                else presetCommandNames.add(item.identifier);
            }
        } catch {
            // Preset DB is unavailable — fall back to no preset filter rather
            // than crash the analytics page.
            presetSkillNames = null;
            presetCommandNames = null;
        }
    }

    // When a project is selected, only that project's catalog entries — and the
    // activity that resolves to them — feed the aggregation. Preset filter
    // composes on top of the project filter.
    let skills = project
        ? allSkills.filter((s) => s.project?.name === project)
        : allSkills;
    if (presetSkillNames) {
        const set = presetSkillNames;
        skills = skills.filter((s) => set.has(s.name));
    }
    let commands = project
        ? allCommands.filter((c) => c.project?.name === project)
        : allCommands;
    if (presetCommandNames) {
        const set = presetCommandNames;
        commands = commands.filter((c) => set.has(c.name));
    }

    // Catalog lookup keys — let a slash invocation resolve to skill vs command.
    const skillKeySet = new Set(skills.map((s) => skillId(s.name)));
    const commandKeySet = new Set(commands.map((c) => cmdId(c.name)));

    const groups = new Map<string, Group>();
    /** Most recent use per catalog key — drives never-used / idle detection. */
    const usedSkill = new Map<string, number>();
    const usedCommand = new Map<string, number>();

    for (const ev of activity.events) {
        let kind: ActivityKind;
        if (ev.via === "skill-tool") {
            kind = "skill";
        } else if (commandKeySet.has(cmdId(ev.name))) {
            kind = "command";
        } else if (skillKeySet.has(skillId(ev.name))) {
            kind = "skill";
        } else {
            kind = "command";
        }

        const matchKey = kind === "skill" ? skillId(ev.name) : cmdId(ev.name);
        if (!matchKey) continue;
        // With a project or preset filter active, drop activity that doesn't
        // resolve to one of the filtered catalog entries.
        if (project || presetId != null) {
            const inScope =
                kind === "skill"
                    ? skillKeySet.has(matchKey)
                    : commandKeySet.has(matchKey);
            if (!inScope) continue;
        }
        const display = kind === "skill" ? matchKey : `/${matchKey}`;
        const identity = `${kind}\u0000${matchKey}`;

        let g = groups.get(identity);
        if (!g) {
            g = {
                name: display,
                kind,
                windows: emptyWindows(),
                lastUsed: 0,
                days: new Map(),
            };
            groups.set(identity, g);
        }

        const age = now - ev.ts;
        g.windows.all++;
        if (age <= WEEK) g.windows["1w"]++;
        if (age <= DAY) g.windows["1d"]++;
        if (age <= 4 * HOUR) g.windows["4h"]++;
        if (ev.ts > g.lastUsed) g.lastUsed = ev.ts;
        const dk = dayKey(ev.ts);
        g.days.set(dk, (g.days.get(dk) ?? 0) + 1);

        const usedMap = kind === "skill" ? usedSkill : usedCommand;
        if (ev.ts > (usedMap.get(matchKey) ?? 0)) usedMap.set(matchKey, ev.ts);
    }

    const stats: UsageStat[] = [...groups.values()]
        .map((g) => ({
            name: g.name,
            kind: g.kind,
            windows: g.windows,
            lastUsed: g.lastUsed,
            lastUsedLabel: g.lastUsed ? formatRelativeTime(g.lastUsed, locale) : t.common.never,
        }))
        .sort((a, b) => b.windows.all - a.windows.all || b.lastUsed - a.lastUsed);

    const windowTotals = emptyWindows();
    for (const g of groups.values()) {
        windowTotals["4h"] += g.windows["4h"];
        windowTotals["1d"] += g.windows["1d"];
        windowTotals["1w"] += g.windows["1w"];
        windowTotals.all += g.windows.all;
    }

    // --- Heatmap: the last HEATMAP_DAYS calendar days ----------------------
    const heatDays: string[] = [];
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) heatDays.push(dayKey(now - i * DAY));
    const dayIndex = new Map(heatDays.map((d, i) => [d, i] as const));

    const heatRows: HeatRow[] = [];
    for (const g of groups.values()) {
        const cells: number[] = new Array(HEATMAP_DAYS).fill(0);
        let total = 0;
        for (const [dk, count] of g.days) {
            const idx = dayIndex.get(dk);
            if (idx !== undefined) {
                cells[idx] += count;
                total += count;
            }
        }
        if (total > 0) heatRows.push({ name: g.name, kind: g.kind, cells, total });
    }
    heatRows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
    const heatSkillRows = heatRows
        .filter((r) => r.kind === "skill")
        .slice(0, HEATMAP_ROW_LIMIT);
    const heatCommandRows = heatRows
        .filter((r) => r.kind === "command")
        .slice(0, HEATMAP_ROW_LIMIT);

    // --- Catalog coverage: never-used and idle items -----------------------
    const neverUsed: CatalogGap[] = [];
    const idle: CatalogGap[] = [];
    const classify = (
        name: string,
        kind: ActivityKind,
        lastUsed: number | undefined,
        origin: string,
        source: string,
        href: string,
    ) => {
        if (lastUsed === undefined) {
            neverUsed.push({
                name,
                kind,
                lastUsed: null,
                lastUsedLabel: t.common.never,
                origin,
                source,
                href,
            });
        } else if (now - lastUsed > WEEK) {
            idle.push({
                name,
                kind,
                lastUsed,
                lastUsedLabel: formatRelativeTime(lastUsed, locale),
                origin,
                source,
                href,
            });
        }
    };

    for (const s of skills) {
        classify(
            s.name,
            "skill",
            usedSkill.get(skillId(s.name)),
            s.type,
            sourceLabel(s.project, s.plugin),
            `/skills/${s.id}`,
        );
    }
    for (const c of commands) {
        classify(
            `/${c.name}`,
            "command",
            usedCommand.get(cmdId(c.name)),
            c.scope,
            sourceLabel(c.project, c.plugin),
            `/commands/${c.id}`,
        );
    }
    neverUsed.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
    idle.sort((a, b) => (a.lastUsed ?? 0) - (b.lastUsed ?? 0));

    const analytics: Analytics = {
        stats,
        windowTotals,
        totalEvents: windowTotals.all,
        heatDays,
        heatSkillRows,
        heatCommandRows,
        skillsTotal: skills.length,
        commandsTotal: commands.length,
        neverUsed,
        idle,
        firstEventAt: activity.events.length ? activity.events[0].ts : 0,
        transcriptFiles: activity.fileCount,
        scannedAt: new Date().toISOString(),
        projects,
    };

    cache = { analytics, at: Date.now(), locale, project, presetId };
    return analytics;
}
