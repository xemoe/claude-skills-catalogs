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
import type { Skill, SkillType } from "@/lib/types";

type SortKey = "updated" | "name" | "usage";
type TypeFilter = "all" | SkillType;

const TABS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "plugin", label: "Plugin" },
  { key: "personal", label: "Personal" },
  { key: "project", label: "Project" },
  { key: "local", label: "Local" },
];

const PAGE_SIZE = 10;

export function SkillsExplorer({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<TypeFilter, number> = {
      all: skills.length,
      personal: 0,
      plugin: 0,
      project: 0,
      local: 0,
    };
    for (const s of skills) c[s.type]++;
    return c;
  }, [skills]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = skills.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.plugin?.name.toLowerCase().includes(q) ?? false) ||
        s.source.label.toLowerCase().includes(q)
      );
    });
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "usage")
        return (b.usage?.usageCount ?? 0) - (a.usage?.usageCount ?? 0);
      return Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
    });
  }, [skills, query, typeFilter, sort]);

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
            placeholder="Search skills, plugins, sources…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Tabs
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v as TypeFilter);
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
            <SelectItem value="usage">Most used</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[260px]">Skill</TableHead>
              <TableHead className="w-[96px]">Type</TableHead>
              <TableHead className="min-w-[180px]">Source</TableHead>
              <TableHead className="w-[150px]">Last updated</TableHead>
              <TableHead className="w-[80px] text-right">Used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No skills match your filters.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => router.push(`/skills/${s.id}`)}
                >
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
                  <TableCell>
                    <SkillTypeBadge type={s.type} />
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    {s.plugin && s.source.kind === "local" ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm"
                        title={`Plugin: ${s.plugin.name}`}
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
            ? `Showing ${rangeStart}–${rangeEnd} of ${filtered.length} skills`
            : `0 of ${skills.length} skills`}
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
