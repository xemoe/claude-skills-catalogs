import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { RelationGraph } from "@/components/relation-graph";
import { InlineCode } from "@/components/inline-code";
import { buildRelationGraph } from "@/lib/relations";
import { getActiveState, getPreset } from "@lector/presets/presets";
import { getServerI18n } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export const dynamic = "force-dynamic";

function EmptyState({ t }: { t: Dictionary }) {
    return (
        <div className="rounded-none border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">{t.graphPage.emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {t.graphPage.empty1}
                <InlineCode>{t.actions.rescan}</InlineCode>
                {t.graphPage.empty2}
            </p>
        </div>
    );
}

function NoActivePresetState({ t }: { t: Dictionary }) {
    return (
        <div className="rounded-none border border-dashed p-12 text-center">
            <h3 className="text-base font-medium">{t.graphPage.noActivePresetTitle}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                {t.graphPage.noActivePresetDesc}
            </p>
            <Link
                href="/presets"
                className="mt-4 inline-flex items-center gap-1.5 border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
                {t.graphPage.noActivePresetCta}
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    );
}

function readActivePreset() {
    try {
        const active = getActiveState();
        if (active.presetId == null) return null;
        const preset = getPreset(active.presetId);
        if (!preset || preset.archivedAt) return null;
        return preset;
    } catch {
        // Preset DB unavailable — render the no-active-preset CTA rather than
        // falling back to the heavy all-skills graph.
        return null;
    }
}

export default async function GraphPage() {
    const { t, locale } = await getServerI18n();
    const activePreset = readActivePreset();
    const graph = buildRelationGraph({
        locale,
        presetId: activePreset?.id ?? null,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {t.graphPage.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {t.graphPage.subtitle}
                    </p>
                    {activePreset && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Layers className="h-3.5 w-3.5" />
                            <span>{t.graphPage.activePresetLabel}</span>
                            <Link
                                href={`/presets/${activePreset.id}`}
                                className="font-semibold text-foreground hover:underline"
                            >
                                {activePreset.name}
                            </Link>
                        </p>
                    )}
                </div>
                {activePreset && (
                    <p className="tabular-nums text-xs text-muted-foreground">
                        {t.graphPage.statsLine(
                            graph.stats.skills,
                            graph.stats.commands,
                            graph.stats.clusters,
                            graph.stats.references,
                        )}
                    </p>
                )}
            </div>

            {!activePreset ? (
                <NoActivePresetState t={t} />
            ) : graph.nodes.length === 0 ? (
                <EmptyState t={t} />
            ) : (
                <RelationGraph graph={graph} />
            )}
        </div>
    );
}
