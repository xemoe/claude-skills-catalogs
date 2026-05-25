import { AlertTriangle } from "lucide-react";
import { StatCards } from "@/components/stat-cards";
import { SkillsExplorer } from "@/components/skills-explorer";
import { InlineCode } from "@/components/inline-code";
import { scanSkills } from "@lector/core/scanner";
import { loadPresetMembership } from "@lector/presets/membership";
import { parsePresetId } from "@/lib/preset-query";
import { formatDate } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function EmptyState({ claudeHome, t }: { claudeHome: string; t: Dictionary }) {
    return (
        <div className="rounded-none border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">{t.dashboard.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {t.dashboard.empty1}
                <InlineCode>{claudeHome}</InlineCode>
                {t.dashboard.empty2}
                <InlineCode>extraRoots</InlineCode>
                {t.dashboard.empty3}
                <InlineCode>skills-lector.config.json</InlineCode>
                {t.dashboard.empty4}
            </p>
        </div>
    );
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ preset?: string }>;
}) {
    const { t } = await getServerI18n();
    const { preset: presetParam } = await searchParams;
    const result = scanSkills();
    const membership = loadPresetMembership();
    const rawPresetId = parsePresetId(presetParam);
    const initialPresetId =
        rawPresetId != null && membership.presets.some((p) => p.id === rawPresetId)
            ? rawPresetId
            : null;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t.dashboard.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t.dashboard.subtitle}
                    </p>
                </div>
                <p className="tabular-nums text-xs text-muted-foreground">
                    {t.scan.line(
                        formatDate(result.scannedAt),
                        result.durationMs,
                        result.platform,
                    )}
                </p>
            </div>

            {result.skills.length === 0 ? (
                <>
                    <StatCards skills={[]} rootsCount={result.roots.length} />
                    <EmptyState claudeHome={result.claudeHome} t={t} />
                </>
            ) : (
                <SkillsExplorer
                    skills={result.skills}
                    rootsCount={result.roots.length}
                    presetFilter={{
                        presets: membership.presets,
                        initialPresetId,
                        itemsByPreset: membership.itemsByPreset,
                    }}
                />
            )}

            {result.errors.length > 0 && (
                <details className="rounded-none border border-amber-300 bg-amber-50 p-3 text-xs">
                    <summary className="flex cursor-pointer items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t.scan.errors(result.errors.length)}
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
