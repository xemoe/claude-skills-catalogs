"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, Package, Search } from "lucide-react";
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

export function SkillsExplorer({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("updated");

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search skills, plugins, sources…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Tabs
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
                {t.label}
                <span className="rounded bg-foreground/10 px-1 text-[10px] tabular-nums">
                  {counts[t.key]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
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

      <div className="rounded-xl border">
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
              filtered.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => router.push(`/skills/${s.id}`)}
                >
                  <TableCell>
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

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {skills.length} skills
      </p>
    </div>
  );
}
