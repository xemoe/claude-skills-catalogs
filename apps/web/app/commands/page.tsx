import { AlertTriangle } from "lucide-react";
import { CommandStatCards } from "@/components/command-stat-cards";
import { CommandsExplorer } from "@/components/commands-explorer";
import { InlineCode } from "@/components/inline-code";
import { scanCommands } from "@lector/core/command-scanner";
import { loadPresetMembership } from "@lector/presets/membership";
import { parsePresetId } from "@/lib/preset-query";
import { formatDate } from "@/lib/utils";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function EmptyState({ claudeHome, t }: { claudeHome: string; t: Dictionary }) {
    return (
        <div className="rounded-none border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">{t.commandsPage.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {t.commandsPage.empty1}
                <InlineCode>.md</InlineCode>
                {t.commandsPage.empty2}
                <InlineCode>{claudeHome}</InlineCode>
                {t.commandsPage.empty3}
                <InlineCode>.claude/commands</InlineCode>
                {t.commandsPage.empty4}
            </p>
        </div>
    );
}

export default async function CommandsPage({
    searchParams,
}: {
    searchParams: Promise<{ preset?: string }>;
}) {
    const { t } = await getServerI18n();
    const { preset: presetParam } = await searchParams;
    const result = scanCommands();
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
                        {t.commandsPage.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t.commandsPage.subtitle}
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

            {result.commands.length === 0 ? (
                <>
                    <CommandStatCards
                        commands={[]}
                        rootsCount={result.roots.length}
                    />
                    <EmptyState claudeHome={result.claudeHome} t={t} />
                </>
            ) : (
                <CommandsExplorer
                    commands={result.commands}
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
