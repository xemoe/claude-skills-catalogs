import { AlertTriangle } from "lucide-react";
import { CommandStatCards } from "@/components/command-stat-cards";
import { CommandsExplorer } from "@/components/commands-explorer";
import { InlineCode } from "@/components/inline-code";
import { scanCommands } from "@/lib/command-scanner";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function EmptyState({ claudeHome }: { claudeHome: string }) {
  return (
    <div className="rounded-none border border-dashed p-12 text-center">
      <h3 className="text-base font-medium">No commands found</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        No slash-command <InlineCode>.md</InlineCode> files were discovered
        under <InlineCode>{claudeHome}</InlineCode>, installed plugins, or known
        project <InlineCode>.claude/commands</InlineCode> directories. Add a
        command file and press Rescan.
      </p>
    </div>
  );
}

export default function CommandsPage() {
  const result = scanCommands();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Deployed Commands
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every Claude Code slash command discovered on this machine — where
            it lives, where it came from, and when it last changed.
          </p>
        </div>
        <p className="tabular-nums text-xs text-muted-foreground">
          Scanned {formatDate(result.scannedAt)} · {result.durationMs} ms ·{" "}
          {result.platform}
        </p>
      </div>

      <CommandStatCards result={result} />

      {result.commands.length === 0 ? (
        <EmptyState claudeHome={result.claudeHome} />
      ) : (
        <CommandsExplorer commands={result.commands} />
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
