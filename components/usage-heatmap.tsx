import { Boxes, SquareTerminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeatRow } from "@/lib/analytics";

const BUCKET_BG = [
  "bg-muted",
  "bg-emerald-200",
  "bg-emerald-400",
  "bg-emerald-600",
  "bg-emerald-800",
];
const BUCKET_FG = [
  "text-transparent",
  "text-emerald-950",
  "text-emerald-950",
  "text-white",
  "text-white",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function bucket(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
}

/** "5/14" style short label for a YYYY-MM-DD day. */
function dayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function weekdayOf(iso: string): string {
  return WEEKDAYS[new Date(`${iso}T00:00:00`).getDay()];
}

/** Recent-activity grid: one row per skill/command, one column per day. */
export function UsageHeatmap({
  days,
  rows,
  emptyLabel,
}: {
  days: string[];
  rows: HeatRow[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-none border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyLabel ?? `No activity in the last ${days.length} days.`}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="w-fit">
          <div className="flex">
            <div className="w-44 shrink-0" />
            {days.map((d) => {
              const wd = weekdayOf(d);
              const weekend = wd === "Sun" || wd === "Sat";
              return (
                <div
                  key={d}
                  className={cn(
                    "w-8 shrink-0 text-center text-[10px] leading-tight",
                    weekend ? "font-medium text-foreground/80" : "text-muted-foreground",
                  )}
                >
                  <div>{wd[0]}</div>
                  <div className="tabular-nums">{dayLabel(d)}</div>
                </div>
              );
            })}
          </div>
          {rows.map((row) => (
            <div key={`${row.kind}:${row.name}`} className="flex items-center">
              <div className="flex w-44 shrink-0 items-center gap-1.5 pr-2">
                {row.kind === "skill" ? (
                  <Boxes className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <SquareTerminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate text-xs" title={row.name}>
                  {row.name}
                </span>
              </div>
              {row.cells.map((count, i) => {
                const b = bucket(count);
                return (
                  <div key={i} className="p-0.5">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center text-[10px] font-medium tabular-nums",
                        BUCKET_BG[b],
                        BUCKET_FG[b],
                      )}
                      title={`${row.name} — ${days[i]}: ${count} use${count === 1 ? "" : "s"}`}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span>Less</span>
        {BUCKET_BG.map((bg, i) => (
          <span key={i} className={cn("h-3 w-3", bg)} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
