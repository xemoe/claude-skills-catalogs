"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    Search,
    Webhook,
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
import { CountBadge } from "@/components/count-badge";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { Hook, HookEvent, HookScope } from "@lector/core/types";

type SortKey = "updated" | "event";
type ScopeFilter = "all" | HookScope;
type EventFilter = "all" | HookEvent;

const TAB_KEYS: ScopeFilter[] = ["all", "plugin", "personal", "project", "local"];

const EVENTS: HookEvent[] = [
    "PreToolUse",
    "PostToolUse",
    "UserPromptSubmit",
    "Notification",
    "Stop",
    "SubagentStop",
    "SessionStart",
    "SessionEnd",
    "PreCompact",
];

const PAGE_SIZE = 10;

/** Cross-platform basename — Node's `path.basename` on the client uses POSIX semantics and never splits on backslashes. */
function basename(p: string): string {
    const segments = p.split(/[\\/]/);
    return segments[segments.length - 1] || p;
}

export function HooksExplorer({ hooks }: { hooks: Hook[] }) {
    const router = useRouter();
    const t = useT();
    const [query, setQuery] = useState("");
    const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
    const [eventFilter, setEventFilter] = useState<EventFilter>("all");
    const [sort, setSort] = useState<SortKey>("updated");
    const [page, setPage] = useState(1);

    const counts = useMemo(() => {
        const c: Record<ScopeFilter, number> = {
            all: hooks.length,
            personal: 0,
            plugin: 0,
            project: 0,
            local: 0,
        };
        for (const h of hooks) c[h.scope]++;
        return c;
    }, [hooks]);

    const eventCounts = useMemo(() => {
        const c: Record<HookEvent, number> = {
            PreToolUse: 0,
            PostToolUse: 0,
            UserPromptSubmit: 0,
            Notification: 0,
            Stop: 0,
            SubagentStop: 0,
            SessionStart: 0,
            SessionEnd: 0,
            PreCompact: 0,
        };
        for (const h of hooks) c[h.event]++;
        return c;
    }, [hooks]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = hooks.filter((h) => {
            if (scopeFilter !== "all" && h.scope !== scopeFilter) return false;
            if (eventFilter !== "all" && h.event !== eventFilter) return false;
            if (!q) return true;
            return (
                h.event.toLowerCase().includes(q) ||
                h.matcher.toLowerCase().includes(q) ||
                h.command.toLowerCase().includes(q) ||
                h.sourcePath.toLowerCase().includes(q) ||
                (h.plugin?.name.toLowerCase().includes(q) ?? false) ||
                (h.project?.name.toLowerCase().includes(q) ?? false)
            );
        });
        return list.sort((a, b) => {
            if (sort === "event") {
                const ev = a.event.localeCompare(b.event);
                if (ev !== 0) return ev;
                return a.matcher.localeCompare(b.matcher);
            }
            return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
        });
    }, [hooks, query, scopeFilter, eventFilter, sort]);

    const sortLabel: Record<SortKey, string> = {
        updated: t.explorer.sortRecent,
        event: t.explorer.sortEvent,
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
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative lg:max-w-xs lg:flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t.explorer.searchHooks}
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
                <Select
                    value={eventFilter}
                    onValueChange={(v) => {
                        setEventFilter(v as EventFilter);
                        setPage(1);
                    }}
                >
                    <SelectTrigger
                        className="gap-1.5 lg:w-[200px]"
                        aria-label={t.explorer.filterEvent}
                    >
                        <Webhook className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t.explorer.allEvents}</SelectItem>
                        {EVENTS.map((ev) => (
                            <SelectItem key={ev} value={ev} disabled={eventCounts[ev] === 0}>
                                {ev}
                                <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                                    {eventCounts[ev]}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                    <SelectContent>
                        <SelectItem value="updated">{t.explorer.sortRecent}</SelectItem>
                        <SelectItem value="event">{t.explorer.sortEvent}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="ring-1 ring-foreground/10">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[80px] text-center">
                                {t.explorer.colScope}
                            </TableHead>
                            <TableHead className="w-[160px]">
                                {t.explorer.colEvent}
                            </TableHead>
                            <TableHead className="w-[140px]">
                                {t.explorer.colMatcher}
                            </TableHead>
                            <TableHead className="min-w-[260px]">
                                {t.explorer.colHookCommand}
                            </TableHead>
                            <TableHead className="min-w-[160px]">
                                {t.explorer.colSourceFile}
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
                                    colSpan={6}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {t.explorer.noHooksMatch}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paged.map((h) => (
                                <TableRow
                                    key={h.id}
                                    className="cursor-pointer hover:bg-accent"
                                    onClick={() => router.push(`/hooks/${h.id}`)}
                                >
                                    <TableCell className="text-center">
                                        <SkillTypeDot type={h.scope} />
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/hooks/${h.id}`}
                                            className="font-mono text-xs font-medium hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {h.event}
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        {h.matcher ? (
                                            <span className="font-mono text-xs">{h.matcher}</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                {t.hooksPage.unnamedMatcher}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[320px]">
                                        <code className="line-clamp-1 block font-mono text-xs">
                                            {h.command}
                                        </code>
                                    </TableCell>
                                    <TableCell className="max-w-[200px]">
                                        <span
                                            className="block truncate font-mono text-xs text-muted-foreground"
                                            title={h.sourcePath}
                                        >
                                            {basename(h.sourcePath)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                                        {formatDate(h.lastUpdated)}
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
                        ? t.explorer.showingHooks(rangeStart, rangeEnd, filtered.length)
                        : t.explorer.emptyHooks(hooks.length)}
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
