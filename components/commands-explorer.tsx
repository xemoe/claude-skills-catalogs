"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Search,
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
import { SkillTypeBadge } from "@/components/skill-type-badge";
import { SourceBadge } from "@/components/source-badge";
import { CountBadge } from "@/components/count-badge";
import { formatDate } from "@/lib/utils";
import type { Command, CommandScope } from "@/lib/types";

type SortKey = "updated" | "name";
type ScopeFilter = "all" | CommandScope;

const TABS: { key: ScopeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "plugin", label: "Plugin" },
  { key: "personal", label: "Personal" },
  { key: "project", label: "Project" },
];

const PAGE_SIZE = 10;

export function CommandsExplorer({ commands }: { commands: Command[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = commands.filter((c) => {
      if (scopeFilter !== "all" && c.scope !== scopeFilter) return false;
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
  }, [commands, query, scopeFilter, sort]);

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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search commands, plugins, sources…"
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
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                {t.label}
                <CountBadge>{counts[t.key]}</CountBadge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
            <SelectItem value="updated">Recently updated</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[260px]">Command</TableHead>
              <TableHead className="w-[96px]">Scope</TableHead>
              <TableHead className="min-w-[180px]">Source</TableHead>
              <TableHead className="w-[150px]">Last updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No commands match your filters.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => router.push(`/commands/${c.id}`)}
                >
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
                  <TableCell>
                    <SkillTypeBadge type={c.scope} />
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    {c.plugin && c.source.kind === "local" ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm"
                        title={`Plugin: ${c.plugin.name}`}
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
            ? `Showing ${rangeStart}–${rangeEnd} of ${filtered.length} commands`
            : `0 of ${commands.length} commands`}
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
              Previous
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
