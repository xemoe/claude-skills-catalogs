import { AlertTriangle } from "lucide-react";
import { AnalyticsExplorer } from "@/components/analytics-explorer";
import { buildAnalytics } from "@/lib/analytics";
import { formatDate } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AnalyticPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { t, locale } = await getServerI18n();
  const { project: projectParam } = await searchParams;
  const project = typeof projectParam === "string" ? projectParam : "";
  const analytics = buildAnalytics({ locale, project });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.analyticsPage.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.analyticsPage.subtitle}
          </p>
        </div>
        <p className="tabular-nums text-xs text-muted-foreground">
          {t.scan.transcripts(
            formatDate(analytics.scannedAt),
            analytics.transcriptFiles,
          )}
        </p>
      </div>

      <AnalyticsExplorer
        analytics={analytics}
        projects={analytics.projects}
        selectedProject={project}
      />

      {analytics.totalEvents === 0 && (
        <div className="flex items-start gap-2 rounded-none border border-dashed p-4 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t.analyticsPage.empty}</span>
        </div>
      )}
    </div>
  );
}
