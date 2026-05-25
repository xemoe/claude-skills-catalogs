"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Activity,
    Bell,
    Boxes,
    CalendarDays,
    CircleSlash,
    Clock,
    Folder,
    Layers,
    SquareTerminal,
    Target,
    type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge } from "@/components/count-badge";
import { UsageHeatmap } from "@/components/usage-heatmap";
import { useT } from "@/lib/i18n/context";
import type {
    ActivityWindow,
    Analytics,
    CatalogGap,
    UsageStat,
} from "@/lib/analytics";
import type { SkillType } from "@lector/core/types";
import type { Preset } from "@lector/presets/types";

type PresetFilter = {
    presets: Preset[];
    initialPresetId: number | null;
};

const WINDOW_KEYS: ActivityWindow[] = ["4h", "1d", "1w", "all"];

function StatCard({
    label,
    value,
    sub,
    Icon,
}: {
    label: string;
    value: string | number;
    sub: string;
    Icon: LucideIcon;
}) {
    return (
        <Card>
            <CardContent className="flex items-center gap-5 p-2 px-5">
                <div className="rounded-none bg-secondary p-2.5">
                    <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                    <div className="text-4xl font-bold tabular-nums">{value}</div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-muted-foreground">{sub}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function TopList({
    title,
    Icon,
    items,
    win,
    emptyLabel,
}: {
    title: string;
    Icon: LucideIcon;
    items: UsageStat[];
    win: ActivityWindow;
    emptyLabel: string;
}) {
    const t = useT();
    const max = items.reduce((m, s) => Math.max(m, s.windows[win]), 0);
    return (
        <Card>
            <CardContent className="p-5 py-2">
                <div className="mb-4 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <CountBadge>{items.length}</CountBadge>
                </div>
                {items.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                        {emptyLabel}
                    </p>
                ) : (
                    <ol className="space-y-2.5">
                        {items.map((s, i) => {
                            const count = s.windows[win];
                            const pct = max > 0 ? Math.max((count / max) * 100, 3) : 0;
                            return (
                                <li key={s.name} className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                        <span className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                            {i + 1}
                                        </span>
                                        <span
                                            className="min-w-0 flex-1 truncate text-xs font-medium"
                                            title={s.name}
                                        >
                                            {s.name}
                                        </span>
                                        <span
                                            className="shrink-0 text-xs tabular-nums text-muted-foreground"
                                            title={t.analytics.lastUsedTooltip(s.lastUsedLabel)}
                                        >
                                            {count}&times;
                                        </span>
                                    </div>
                                    <div className="ml-6 h-1.5 bg-muted">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </CardContent>
        </Card>
    );
}

function GapList({
    title,
    Icon,
    items,
    emptyLabel,
    showLastUsed,
}: {
    title: string;
    Icon: LucideIcon;
    items: CatalogGap[];
    emptyLabel: string;
    showLastUsed: boolean;
}) {
    const t = useT();
    const nameCounts = new Map<string, number>();
    for (const g of items) {
        const key = `${g.kind}:${g.name}`;
        nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
    }
    return (
        <Card>
            <CardContent className="p-5 py-2">
                <div className="mb-3 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <CountBadge>{items.length}</CountBadge>
                </div>
                {items.length === 0 ? (
                    <p className="py-8 text-center text-xs text-muted-foreground">
                        {emptyLabel}
                    </p>
                ) : (
                    <ul className="max-h-80 space-y-0.5 overflow-y-auto">
                        {items.map((g) => {
                            const duplicated =
                                (nameCounts.get(`${g.kind}:${g.name}`) ?? 0) > 1;
                            return (
                                <li key={g.href}>
                                    <Link
                                        href={g.href}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent"
                                    >
                                        {g.kind === "skill" ? (
                                            <Boxes className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        ) : (
                                            <SquareTerminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        )}
                                        <span
                                            className="min-w-0 flex-1 truncate text-xs font-medium"
                                            title={g.name}
                                        >
                                            {g.name}
                                        </span>
                                        {duplicated && g.source && (
                                            <span
                                                className="max-w-[8rem] shrink-0 truncate rounded-none bg-secondary px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
                                                title={t.analytics.fromSourceTooltip(g.source)}
                                            >
                                                {g.source}
                                            </span>
                                        )}
                                        <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {t.skillTypes[g.origin as SkillType]}
                                        </span>
                                        {showLastUsed && (
                                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                                {g.lastUsedLabel}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

export function AnalyticsExplorer({
    analytics,
    projects,
    selectedProject,
    presetFilter,
}: {
    analytics: Analytics;
    projects: string[];
    selectedProject: string;
    presetFilter?: PresetFilter;
}) {
    const t = useT();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [win, setWin] = useState<ActivityWindow>("1d");
    const windowMeta = t.analytics.windows[win];
    const projectValue = projects.includes(selectedProject)
        ? selectedProject
        : "all";
    const presetValue =
        presetFilter && presetFilter.initialPresetId != null
            ? String(presetFilter.initialPresetId)
            : "all";

    const pushFilters = (nextProject: string, nextPreset: string) => {
        const params = new URLSearchParams();
        if (nextProject !== "all") params.set("project", nextProject);
        if (nextPreset !== "all") params.set("preset", nextPreset);
        const qs = params.toString();
        startTransition(() => {
            router.push(qs ? `/analytic?${qs}` : "/analytic");
        });
    };

    const onProjectChange = (value: string) => {
        pushFilters(value, presetValue);
    };

    const onPresetChange = (value: string) => {
        pushFilters(projectValue, value);
    };

    const rank = (a: UsageStat, b: UsageStat) =>
        b.windows[win] - a.windows[win] || b.lastUsed - a.lastUsed;
    const topSkills = analytics.stats
        .filter((s) => s.kind === "skill" && s.windows[win] > 0)
        .sort(rank)
        .slice(0, 10);
    const topCommands = analytics.stats
        .filter((s) => s.kind === "command" && s.windows[win] > 0)
        .sort(rank)
        .slice(0, 10);

    const neverSkills = analytics.neverUsed.filter((g) => g.kind === "skill").length;
    const neverCommands = analytics.neverUsed.length - neverSkills;
    const idleSkills = analytics.idle.filter((g) => g.kind === "skill").length;
    const idleCommands = analytics.idle.length - idleSkills;
    const catalogTotal = analytics.skillsTotal + analytics.commandsTotal;
    const usedCatalog = catalogTotal - analytics.neverUsed.length;
    const coverage =
        catalogTotal > 0 ? Math.round((usedCatalog / catalogTotal) * 100) : 0;
    const winCount = analytics.windowTotals[win];

    return (
        <div
            className={`space-y-6 transition-opacity ${isPending ? "opacity-60" : ""}`}
        >
            {(projects.length > 0 ||
                (presetFilter && presetFilter.presets.length > 0)) && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {presetFilter && presetFilter.presets.length > 0 && (
                        <Select value={presetValue} onValueChange={onPresetChange}>
                            <SelectTrigger
                                className="gap-1.5 lg:w-[200px]"
                                aria-label={t.explorer.filterPreset}
                            >
                                <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t.explorer.presetAll}
                                </SelectItem>
                                {presetFilter.presets.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    {projects.length > 0 && (
                        <Select value={projectValue} onValueChange={onProjectChange}>
                            <SelectTrigger
                                className="gap-1.5 lg:w-[220px]"
                                aria-label={t.common.filterByProject}
                            >
                                <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    {t.common.allProjects}
                                </SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {p}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label={t.analytics.trackedInvocations}
                    value={winCount}
                    sub={
                        analytics.totalEvents === 0
                            ? t.analytics.noActivityYet
                            : `${windowMeta.long} · ${t.analytics.acrossTranscripts(analytics.transcriptFiles)}`
                    }
                    Icon={Activity}
                />
                <StatCard
                    label={t.analytics.neverUsed}
                    value={analytics.neverUsed.length}
                    sub={t.analytics.skillsCommandsBreakdown(neverSkills, neverCommands)}
                    Icon={CircleSlash}
                />
                <StatCard
                    label={t.analytics.idle}
                    value={analytics.idle.length}
                    sub={t.analytics.skillsCommandsBreakdown(idleSkills, idleCommands)}
                    Icon={Clock}
                />
                <StatCard
                    label={t.analytics.catalogCoverage}
                    value={`${coverage}%`}
                    sub={t.analytics.coverageSub(usedCatalog, catalogTotal)}
                    Icon={Target}
                />
            </div>

            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold">{t.analytics.mostUsed}</h2>
                        <p className="text-xs text-muted-foreground">
                            {t.analytics.invocationsIn(winCount, windowMeta.long)}
                        </p>
                    </div>
                    <Tabs value={win} onValueChange={(v) => setWin(v as ActivityWindow)}>
                        <TabsList>
                            {WINDOW_KEYS.map((key) => (
                                <TabsTrigger key={key} value={key}>
                                    {t.analytics.windows[key].label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <TopList
                        title={t.analytics.topSkills}
                        Icon={Boxes}
                        items={topSkills}
                        win={win}
                        emptyLabel={t.analytics.noSkillsIn(windowMeta.long)}
                    />
                    <TopList
                        title={t.analytics.topCommands}
                        Icon={SquareTerminal}
                        items={topCommands}
                        win={win}
                        emptyLabel={t.analytics.noCommandsIn(windowMeta.long)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <h2 className="text-base font-semibold">
                        {t.analytics.activityHeatmap}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                        {t.analytics.lastDays(analytics.heatDays.length)}
                    </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardContent className="p-5 py-2">
                            <div className="mb-4 flex items-center gap-2">
                                <Boxes className="h-4 w-4" />
                                <h3 className="text-sm font-semibold">{t.analytics.skills}</h3>
                                <CountBadge>{analytics.heatSkillRows.length}</CountBadge>
                            </div>
                            <UsageHeatmap
                                days={analytics.heatDays}
                                rows={analytics.heatSkillRows}
                                emptyLabel={t.analytics.noSkillActivity(
                                    analytics.heatDays.length,
                                )}
                            />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-5 py-2">
                            <div className="mb-4 flex items-center gap-2">
                                <SquareTerminal className="h-4 w-4" />
                                <h3 className="text-sm font-semibold">
                                    {t.analytics.commands}
                                </h3>
                                <CountBadge>{analytics.heatCommandRows.length}</CountBadge>
                            </div>
                            <UsageHeatmap
                                days={analytics.heatDays}
                                rows={analytics.heatCommandRows}
                                emptyLabel={t.analytics.noCommandActivity(
                                    analytics.heatDays.length,
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <h2 className="text-base font-semibold">{t.analytics.reminders}</h2>
                    <span className="text-xs text-muted-foreground">
                        {t.analytics.remindersSub}
                    </span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <GapList
                        title={t.analytics.neverUsed}
                        Icon={CircleSlash}
                        items={analytics.neverUsed}
                        emptyLabel={t.analytics.neverUsedEmpty}
                        showLastUsed={false}
                    />
                    <GapList
                        title={t.analytics.idle}
                        Icon={Clock}
                        items={analytics.idle}
                        emptyLabel={t.analytics.idleEmpty}
                        showLastUsed
                    />
                </div>
            </div>
        </div>
    );
}
