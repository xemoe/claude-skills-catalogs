"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Bell,
  Boxes,
  CalendarDays,
  CircleSlash,
  Clock,
  SquareTerminal,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge } from "@/components/count-badge";
import { UsageHeatmap } from "@/components/usage-heatmap";
import type {
  ActivityWindow,
  Analytics,
  CatalogGap,
  UsageStat,
} from "@/lib/analytics";

const WINDOWS: { key: ActivityWindow; label: string; long: string }[] = [
  { key: "4h", label: "4 Hours", long: "the last 4 hours" },
  { key: "1d", label: "24 Hours", long: "the last 24 hours" },
  { key: "1w", label: "7 Days", long: "the last 7 days" },
  { key: "all", label: "All Time", long: "all recorded history" },
];

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
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-none bg-secondary p-2.5">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold tabular-nums">{value}</div>
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
  const max = items.reduce((m, s) => Math.max(m, s.windows[win]), 0);
  return (
    <Card>
      <CardContent className="p-5">
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
                      title={`last used ${s.lastUsedLabel}`}
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
  return (
    <Card>
      <CardContent className="p-5">
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
            {items.map((g) => (
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
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {g.origin}
                  </span>
                  {showLastUsed && (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {g.lastUsedLabel}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsExplorer({ analytics }: { analytics: Analytics }) {
  const [win, setWin] = useState<ActivityWindow>("1d");
  const windowMeta = WINDOWS.find((w) => w.key === win) ?? WINDOWS[1];

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
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tracked Invocations"
          value={analytics.totalEvents}
          sub={
            analytics.totalEvents > 0
              ? `across ${analytics.transcriptFiles} transcripts`
              : "no activity recorded yet"
          }
          Icon={Activity}
        />
        <StatCard
          label="Never Used"
          value={analytics.neverUsed.length}
          sub={`${neverSkills} skills · ${neverCommands} commands`}
          Icon={CircleSlash}
        />
        <StatCard
          label="Idle 7+ Days"
          value={analytics.idle.length}
          sub={`${idleSkills} skills · ${idleCommands} commands`}
          Icon={Clock}
        />
        <StatCard
          label="Catalog Coverage"
          value={`${coverage}%`}
          sub={`${usedCatalog}/${catalogTotal} ever invoked`}
          Icon={Target}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Most Used</h2>
            <p className="text-xs text-muted-foreground">
              {winCount} invocation{winCount === 1 ? "" : "s"} in{" "}
              {windowMeta.long}
            </p>
          </div>
          <Tabs value={win} onValueChange={(v) => setWin(v as ActivityWindow)}>
            <TabsList>
              {WINDOWS.map((w) => (
                <TabsTrigger key={w.key} value={w.key}>
                  {w.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TopList
            title="Top Skills"
            Icon={Boxes}
            items={topSkills}
            win={win}
            emptyLabel={`No skills used in ${windowMeta.long}.`}
          />
          <TopList
            title="Top Commands"
            Icon={SquareTerminal}
            items={topCommands}
            win={win}
            emptyLabel={`No commands used in ${windowMeta.long}.`}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <h2 className="text-base font-semibold">Activity Heatmap</h2>
          <span className="text-xs text-muted-foreground">
            last {analytics.heatDays.length} days
          </span>
        </div>
        <Card>
          <CardContent className="p-5">
            <UsageHeatmap days={analytics.heatDays} rows={analytics.heatRows} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <h2 className="text-base font-semibold">Reminders</h2>
          <span className="text-xs text-muted-foreground">
            skills &amp; commands worth a fresh look
          </span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <GapList
            title="Never Used"
            Icon={CircleSlash}
            items={analytics.neverUsed}
            emptyLabel="Every deployed skill and command has been used at least once."
            showLastUsed={false}
          />
          <GapList
            title="Idle 7+ Days"
            Icon={Clock}
            items={analytics.idle}
            emptyLabel="Nothing has gone cold — everything was used recently."
            showLastUsed
          />
        </div>
      </div>
    </div>
  );
}
