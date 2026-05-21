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

function bucket(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
}

/** Recent-activity grid: one row per skill/command, one cell per day. */
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
    <div className="space-y-2">
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={`${row.kind}:${row.name}`} className="flex items-center gap-2">
            <div className="flex w-32 shrink-0 items-center gap-1.5">
              {row.kind === "skill" ? (
                <Boxes className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <SquareTerminal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate text-xs" title={row.name}>
                {row.name}
              </span>
            </div>
            <div className="flex flex-1 gap-0.5">
              {row.cells.map((count, i) => {
                const b = bucket(count);
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex h-5 min-w-0 max-w-[2rem] flex-1 items-center justify-center overflow-hidden text-[9px] font-medium tabular-nums",
                      BUCKET_BG[b],
                      BUCKET_FG[b],
                    )}
                    title={`${row.name} — ${days[i]}: ${count} use${count === 1 ? "" : "s"}`}
                  >
                    {count > 0 ? count : ""}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
