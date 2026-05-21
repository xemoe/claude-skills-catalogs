import { AlertTriangle } from "lucide-react";
import { AnalyticsExplorer } from "@/components/analytics-explorer";
import { buildAnalytics } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function AnalyticPage() {
  const analytics = buildAnalytics();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Which skills and commands you actually reach for — and which you have
            forgotten. Reconstructed from your Claude Code session transcripts.
          </p>
        </div>
        <p className="tabular-nums text-xs text-muted-foreground">
          Scanned {formatDate(analytics.scannedAt)} · {analytics.transcriptFiles}{" "}
          transcripts
        </p>
      </div>

      <AnalyticsExplorer analytics={analytics} />

      {analytics.totalEvents === 0 && (
        <div className="flex items-start gap-2 rounded-none border border-dashed p-4 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No skill or command invocations were found in any session
            transcript yet. Use a few skills and slash commands in Claude Code,
            then press Rescan.
          </span>
        </div>
      )}
    </div>
  );
}
