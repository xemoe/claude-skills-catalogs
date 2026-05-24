"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Folder,
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
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { Command, CommandScope } from "@lector/core/types";

type SortKey = "updated" | "name";
type ScopeFilter = "all" | CommandScope;
type InvocationFilter = "all" | "model" | "slash-only";

const TAB_KEYS: ScopeFilter[] = ["all", "plugin", "personal", "project"];

const PAGE_SIZE = 10;

export function CommandsExplorer({ commands }: { commands: Command[] }) {
    const router = useRouter();
    const t = useT();
    const [query, setQuery] = useState("");
    const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
    const [projectFilter, setProjectFilter] = useState("all");
    const [invocationFilter, setInvocationFilter] =
        useState<InvocationFilter>("all");
    const [sort, setSort] = useState<SortKey>("updated");
    const [page, setPage] = useState(1);

    const counts = useMemo(() => {
        const c: Record<ScopeFilter, number> = {
            all: commands.length,
            personal: 0,
            plugin: 0,
            project: 0,
        };
        for (const cmd of commands) c[cmd.scope]++;
        return c;
    }, [commands]);

    const projects = useMemo(() => {
        const set = new Set<string>();
        for (const c of commands) if (c.project?.name) set.add(c.project.name);
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [commands]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = commands.filter((c) => {
            if (scopeFilter !== "all" && c.scope !== scopeFilter) return false;
            if (projectFilter !== "all" && c.project?.name !== projectFilter)
                return false;
            if (invocationFilter === "model" && c.disableModelInvocation)
                return false;
            if (invocationFilter === "slash-only" && !c.disableModelInvocation)
                return false;
            if (!q) return true;
            return (
                c.name.toLowerCase().includes(q) ||
                c.description.toLowerCase().includes(q) ||
                (c.plugin?.name.toLowerCase().includes(q) ?? false) ||
                c.source.label.toLowerCase().includes(q)
            );
        });
        return list.sort((a, b) => {
            if (sort === "name") return a.name.localeCompare(b.name);
            return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
        });
    }, [commands, query, scopeFilter, projectFilter, invocationFilter, sort]);

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
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative lg:max-w-xs lg:flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t.explorer.searchCommands}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                        }}
                        className="pl-8"
                    />
                </div>
                <Tabs
                    value={scopeFilter}
                    onValueChange={(v) => {
                        setScopeFilter(v as ScopeFilter);
                        setPage(1);
                    }}
                >
                    <TabsList>
                        {TAB_KEYS.map((key) => (
                            <TabsTrigger key={key} value={key} className="gap-1.5">
                                {key === "all" ? t.explorer.tabAll : t.skillTypes[key]}
                                <CountBadge
                                    className={
                                        key === "all"
                                            ? undefined
                                            : SKILL_TYPE_META[key].text
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
                            className="gap-1.5 lg:w-[180px]"
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
                    <SelectTrigger
                        className="gap-1.5 lg:w-[180px]"
                        aria-label={t.explorer.filterInvocation}
                    >
                        <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                <Select
                    value={sort}
                    onValueChange={(v) => {
                        setSort(v as SortKey);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="gap-1.5 lg:w-[180px]">
                        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="updated">{t.explorer.sortRecent}</SelectItem>
                        <SelectItem value="name">{t.explorer.sortName}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {scopeFilter === "plugin" ? <PluginScopeNotice /> : null}

            <div className="ring-1 ring-foreground/10">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[80px] text-center">
                                {t.explorer.colScope}
                            </TableHead>
                            <TableHead className="w-[80px] text-center">
                                {t.explorer.colInvocation}
                            </TableHead>
                            <TableHead className="min-w-[260px]">
                                {t.explorer.colCommand}
                            </TableHead>
                            <TableHead className="min-w-[180px]">
                                {t.explorer.colSource}
                            </TableHead>
                            <TableHead className="w-[150px]">
                                {t.explorer.colUpdated}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell
                                    colSpan={5}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {t.explorer.noCommandsMatch}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paged.map((c) => (
                                <TableRow
                                    key={c.id}
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => router.push(`/commands/${c.id}`)}
                                >
                                    <TableCell className="text-center">
                                        <SkillTypeDot type={c.scope} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <ModelInvocationBadge
                                            disabled={c.disableModelInvocation}
                                        />
                                    </TableCell>
                                    <TableCell className="whitespace-normal">
                                        <Link
                                            href={`/commands/${c.id}`}
                                            className="font-mono text-sm font-medium hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            /{c.name}
                                        </Link>
                                        <p className="line-clamp-1 text-xs text-muted-foreground">
                                            {c.description}
                                        </p>
                                    </TableCell>
                                    <TableCell className="max-w-[240px]">
                                        {c.plugin && c.source.kind === "local" ? (
                                            <span
                                                className="inline-flex items-center gap-1.5 text-sm"
                                                title={t.explorer.pluginTitle(c.plugin.name)}
                                            >
                                                <Package className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                                                <span className="truncate">{c.plugin.name}</span>
                                            </span>
                                        ) : (
                                            <SourceBadge source={c.source} />
                                        )}
                                    </TableCell>
                                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                                        {formatDate(c.lastUpdated)}
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
                        ? t.explorer.showingCommands(rangeStart, rangeEnd, filtered.length)
                        : t.explorer.emptyCommands(commands.length)}
                </p>
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
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
                            variant="outline"
                            size="sm"
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
