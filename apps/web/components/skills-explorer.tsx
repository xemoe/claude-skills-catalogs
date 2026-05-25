"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Folder,
    Layers,
    Package,
    Search,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IconSelectTrigger } from "@/components/icon-select-trigger";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SkillTypeDot } from "@/components/skill-type-dot";
import { SKILL_TYPE_META } from "@/components/skill-type";
import { SourceBadge } from "@/components/source-badge";
import { CountBadge } from "@/components/count-badge";
import { ModelInvocationBadge } from "@/components/model-invocation-badge";
import { PluginScopeNotice } from "@/components/plugin-scope-notice";
import { StatCards } from "@/components/stat-cards";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { Skill, SkillType } from "@lector/core/types";
import type { Preset } from "@lector/presets/types";

type SortKey = "updated" | "name" | "usage";
type TypeFilter = "all" | SkillType;
type InvocationFilter = "all" | "model" | "slash-only";

const TAB_KEYS: TypeFilter[] = ["all", "plugin", "personal", "project", "local"];

const PAGE_SIZE = 10;

type PresetFilter = {
    presets: Preset[];
    initialPresetId: number | null;
    itemsByPreset: Record<string, string[]>;
};

export function SkillsExplorer({
    skills,
    rootsCount,
    presetFilter,
}: {
    skills: Skill[];
    rootsCount: number;
    presetFilter?: PresetFilter;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useT();
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [invocationFilter, setInvocationFilter] =
        useState<InvocationFilter>("all");
    const [presetId, setPresetId] = useState<number | null>(
        presetFilter?.initialPresetId ?? null,
    );
    const [sort, setSort] = useState<SortKey>("updated");
    const [page, setPage] = useState(1);

    const membership = useMemo(() => {
        const map = new Map<number, Set<string>>();
        if (!presetFilter) return map;
        for (const [pid, keys] of Object.entries(presetFilter.itemsByPreset)) {
            map.set(Number(pid), new Set(keys));
        }
        return map;
    }, [presetFilter]);

    const projects = useMemo(() => {
        const set = new Set<string>();
        for (const s of skills) if (s.project?.name) set.add(s.project.name);
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [skills]);

    const prefilteredForTabs = useMemo(() => {
        const q = query.trim().toLowerCase();
        return skills.filter((s) => {
            if (projectFilter !== "all" && s.project?.name !== projectFilter)
                return false;
            if (invocationFilter === "model" && s.disableModelInvocation)
                return false;
            if (invocationFilter === "slash-only" && !s.disableModelInvocation)
                return false;
            if (presetId != null) {
                const set = membership.get(presetId);
                if (!set) return false;
                if (!set.has(`skill::${s.name}`)) return false;
            }
            if (!q) return true;
            return (
                s.name.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q) ||
                (s.plugin?.name.toLowerCase().includes(q) ?? false) ||
                s.source.label.toLowerCase().includes(q)
            );
        });
    }, [skills, query, projectFilter, invocationFilter, presetId, membership]);

    const counts = useMemo(() => {
        const c: Record<TypeFilter, number> = {
            all: prefilteredForTabs.length,
            personal: 0,
            plugin: 0,
            project: 0,
            local: 0,
        };
        for (const s of prefilteredForTabs) c[s.type]++;
        return c;
    }, [prefilteredForTabs]);

    const filtered = useMemo(() => {
        const list =
            typeFilter === "all"
                ? prefilteredForTabs
                : prefilteredForTabs.filter((s) => s.type === typeFilter);
        return [...list].sort((a, b) => {
            if (sort === "name") return a.name.localeCompare(b.name);
            if (sort === "usage")
                return (b.usage?.usageCount ?? 0) - (a.usage?.usageCount ?? 0);
            return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
        });
    }, [prefilteredForTabs, typeFilter, sort]);

    const invocationLabel: Record<InvocationFilter, string> = {
        all: t.explorer.invocationAll,
        model: t.explorer.invocationModel,
        "slash-only": t.explorer.invocationSlashOnly,
    };
    const sortLabel: Record<SortKey, string> = {
        updated: t.explorer.sortRecent,
        name: t.explorer.sortName,
        usage: t.explorer.sortUsage,
    };

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paged = useMemo(
        () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [filtered, currentPage],
    );
    const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

    return (
        <div className="space-y-4">
            <StatCards skills={filtered} rootsCount={rootsCount} />
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative lg:max-w-xs lg:flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t.explorer.searchSkills}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        className="pl-8 rounded-sm"
                    />
                </div>
                <Tabs
                    value={typeFilter}
                    onValueChange={(v) => {
                        setTypeFilter(v as TypeFilter);
                        setPage(1);
                    }}
                >
                    <TabsList className={'rounded-sm'}>
                        {TAB_KEYS.map((key) => (
                            <TabsTrigger key={key} value={key} className="gap-1.5">
                                {key === "all" ? t.explorer.tabAll : t.skillTypes[key]}
                                <CountBadge
                                    className={
                                        key === "all"
                                            ? 'text-lg'
                                            : `${SKILL_TYPE_META[key].text} text-lg`
                                    }
                                >
                                    {counts[key]}
                                </CountBadge>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                {projects.length > 0 && (
                    <Select
                        value={projectFilter}
                        onValueChange={(v) => {
                            setProjectFilter(v);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger
                            className="gap-1.5 lg:w-[180px] rounded-sm"
                            aria-label={t.common.filterByProject}
                        >
                            <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.common.allProjects}</SelectItem>
                            {projects.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {p}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Select
                    value={invocationFilter}
                    onValueChange={(v) => {
                        setInvocationFilter(v as InvocationFilter);
                        setPage(1);
                    }}
                >
                    <IconSelectTrigger
                        icon={<Sparkles />}
                        label={t.explorer.filterInvocation}
                        currentValue={invocationLabel[invocationFilter]}
                    />
                    <SelectContent position="popper">
                        <SelectItem value="all">
                            {t.explorer.invocationAll}
                        </SelectItem>
                        <SelectItem value="model">
                            {t.explorer.invocationModel}
                        </SelectItem>
                        <SelectItem value="slash-only">
                            {t.explorer.invocationSlashOnly}
                        </SelectItem>
                    </SelectContent>
                </Select>
                {presetFilter && presetFilter.presets.length > 0 && (
                    <Select
                        value={presetId == null ? "all" : String(presetId)}
                        onValueChange={(v) => {
                            const next = v === "all" ? null : Number(v);
                            setPresetId(next);
                            setPage(1);
                            const params = new URLSearchParams(searchParams.toString());
                            if (next == null) params.delete("preset");
                            else params.set("preset", String(next));
                            const qs = params.toString();
                            router.replace(qs ? `?${qs}` : "?", { scroll: false });
                        }}
                    >
                        <SelectTrigger
                            className="gap-1.5 lg:w-[180px] rounded-sm"
                            aria-label={t.explorer.filterPreset}
                        >
                            <Layers className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.explorer.presetAll}</SelectItem>
                            {presetFilter.presets.map((p) => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Select
                    value={sort}
                    onValueChange={(v) => {
                        setSort(v as SortKey);
                        setPage(1);
                    }}
                >
                    <IconSelectTrigger
                        icon={<ArrowUpDown />}
                        label={t.explorer.sortBy}
                        currentValue={sortLabel[sort]}
                    />
                    <SelectContent position="popper">
                        <SelectItem value="updated">{t.explorer.sortRecent}</SelectItem>
                        <SelectItem value="name">{t.explorer.sortName}</SelectItem>
                        <SelectItem value="usage">{t.explorer.sortUsage}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {typeFilter === "plugin" ? <PluginScopeNotice /> : null}

            <div className="ring-1 ring-foreground/10">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[80px] text-center">
                                {t.explorer.colType}
                            </TableHead>
                            <TableHead className="w-[80px] text-center">
                                {t.explorer.colInvocation}
                            </TableHead>
                            <TableHead className="min-w-[260px]">
                                {t.explorer.colSkill}
                            </TableHead>
                            <TableHead className="min-w-[180px]">
                                {t.explorer.colSource}
                            </TableHead>
                            <TableHead className="w-[150px]">
                                {t.explorer.colUpdated}
                            </TableHead>
                            <TableHead className="w-[80px] text-right">
                                {t.explorer.colUsed}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell
                                    colSpan={6}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {t.explorer.noSkillsMatch}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paged.map((s) => (
                                <TableRow
                                    key={s.id}
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => router.push(`/skills/${s.id}`)}
                                >
                                    <TableCell className="text-center">
                                        <SkillTypeDot type={s.type} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <ModelInvocationBadge
                                            disabled={s.disableModelInvocation}
                                        />
                                    </TableCell>
                                    <TableCell className="whitespace-normal">
                                        <Link
                                            href={`/skills/${s.id}`}
                                            className="font-medium hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {s.name}
                                        </Link>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">
                                            {s.description}
                                        </p>
                                    </TableCell>
                                    <TableCell className="max-w-[240px]">
                                        {s.plugin && s.source.kind === "local" ? (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-sm"
                                                title={t.explorer.pluginTitle(s.plugin.name)}
                                            >
                                                <Package className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                                                <span className="truncate">{s.plugin.name}</span>
                                            </span>
                                        ) : (
                                            <SourceBadge source={s.source} />
                                        )}
                                    </TableCell>
                                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                                        {formatDate(s.lastUpdated)}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-sm">
                                        {s.usage?.usageCount ?? "—"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    {filtered.length > 0
                        ? t.explorer.showingSkills(rangeStart, rangeEnd, filtered.length)
                        : t.explorer.emptySkills(skills.length)}
                </p>
                {totalPages > 1 && (
                    <div className="flex items-center gap-4">
                        <Button
                            size="sm"
                            variant="outline"
                            className={'rounded-sm'}
                            disabled={currentPage <= 1}
                            onClick={() => setPage(currentPage - 1)}
                        >
                            <ChevronLeft />
                            {t.actions.previous}
                        </Button>
                        <span className="text-xs tabular-nums text-muted-foreground">
                            {t.common.page(currentPage, totalPages)}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            className={'rounded-sm'}
                            disabled={currentPage >= totalPages}
                            onClick={() => setPage(currentPage + 1)}
                        >
                            {t.actions.next}
                            <ChevronRight />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
