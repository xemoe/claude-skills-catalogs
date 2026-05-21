import { AlertTriangle } from "lucide-react";
import { StatCards } from "@/components/stat-cards";
import { SkillsExplorer } from "@/components/skills-explorer";
import { InlineCode } from "@/components/inline-code";
import { scanSkills } from "@/lib/scanner";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function EmptyState({ claudeHome }: { claudeHome: string }) {
  return (
    <div className="rounded-none border border-dashed p-12 text-center">
      <h3 className="text-base font-medium">No skills found</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        Nothing was discovered under{" "}
        <InlineCode>{claudeHome}</InlineCode> or the other default scan
        locations. Point the scanner at a directory by adding an{" "}
        <InlineCode>extraRoots</InlineCode> entry to{" "}
        <InlineCode>skills-catalog.config.json</InlineCode>, then press Rescan.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const result = scanSkills();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deployed Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every Claude Skill discovered on this machine — where it lives,
            where it came from, and when it last changed.
          </p>
        </div>
        <p className="tabular-nums text-xs text-muted-foreground">
          Scanned {formatDate(result.scannedAt)} · {result.durationMs} ms ·{" "}
          {result.platform}
        </p>
      </div>

      <StatCards result={result} />

      {result.skills.length === 0 ? (
        <EmptyState claudeHome={result.claudeHome} />
      ) : (
        <SkillsExplorer skills={result.skills} />
      )}

      {result.errors.length > 0 && (
        <details className="rounded-none border border-amber-300 bg-amber-50 p-3 text-xs">
          <summary className="flex cursor-pointer items-center gap-2 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {result.errors.length} path(s) could not be read during the scan
          </summary>
          <ul className="mt-2 space-y-1 font-mono text-muted-foreground">
            {result.errors.slice(0, 30).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
