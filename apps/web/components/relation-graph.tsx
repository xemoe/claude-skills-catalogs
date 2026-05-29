"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FolderGit2, HardDrive, Maximize2, Minimize2, Package, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountBadge } from "@/components/count-badge";
import { RelationGraphScene } from "@/components/relation-graph-scene";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import { buildForceData, CLUSTER_KINDS, type GraphFilter } from "@/lib/relation-graph-data";
import type { RelationClusterKind, RelationGraph } from "@/lib/relations";

// Legend swatch styling — kept as theme-aware Tailwind classes so the chip
// reads correctly in both light and dark, independent of the WebGL palette.
const LEGEND_META: Record<
    RelationClusterKind,
    { icon: typeof Package; border: string; bg: string; text: string }
> = {
    plugin: { icon: Package, border: "border-purple-400", bg: "bg-purple-500/15", text: "text-purple-600 dark:text-purple-300" },
    project: { icon: FolderGit2, border: "border-green-400", bg: "bg-green-500/15", text: "text-green-600 dark:text-green-300" },
    personal: { icon: User, border: "border-blue-400", bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-300" },
    local: { icon: HardDrive, border: "border-slate-400", bg: "bg-slate-500/15", text: "text-slate-600 dark:text-slate-300" },
};

const MEMBERSHIP_SWATCH = "#94a3b8";
const REFERENCE_SWATCH = "#0e7490";

function Legend() {
    const t = useT();
    return (
        <div className="space-y-1.5 border bg-card/90 p-2.5 text-[11px] shadow-sm backdrop-blur">
            <p className="font-semibold text-foreground">{t.graph.legend}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {CLUSTER_KINDS.map((k) => {
                    const meta = LEGEND_META[k];
                    return (
                        <span key={k} className="flex items-center gap-1 text-muted-foreground">
                            <span className={cn("h-2.5 w-2.5 border", meta.border, meta.bg)} />
                            <span>{t.skillTypes[k]}</span>
                        </span>
                    );
                })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                <span className="flex items-center gap-1">
                    <svg width="22" height="6" aria-hidden>
                        <line x1="0" y1="3" x2="22" y2="3" stroke={MEMBERSHIP_SWATCH} strokeWidth="2.5" />
                    </svg>
                    {t.graph.bundledTogether}
                </span>
                <span className="flex items-center gap-1">
                    <svg width="22" height="6" aria-hidden>
                        <line x1="0" y1="3" x2="22" y2="3" stroke={REFERENCE_SWATCH} strokeWidth="2.5" />
                    </svg>
                    {t.graph.references}
                </span>
            </div>
        </div>
    );
}

interface GraphChromeProps {
    graph: RelationGraph;
    fullscreen: boolean;
    onToggleFullscreen: () => void;
}

function GraphChrome({ graph, fullscreen, onToggleFullscreen }: GraphChromeProps) {
    const t = useT();
    const [filter, setFilter] = useState<GraphFilter>("all");
    const data = useMemo(() => buildForceData(graph, filter), [graph, filter]);
    const fullscreenLabel = fullscreen ? t.graph.exitFullscreen : t.graph.enterFullscreen;

    return (
        <>
            <div className="absolute inset-0">
                <RelationGraphScene data={data} />
            </div>

            <div className="pointer-events-none absolute inset-0">
                <div className="pointer-events-auto absolute left-3 top-3">
                    <Tabs value={filter} onValueChange={(v) => setFilter(v as GraphFilter)}>
                        <TabsList>
                            <TabsTrigger value="all" className="gap-1.5">
                                {t.graph.all}
                                <CountBadge>{graph.stats.skills + graph.stats.commands}</CountBadge>
                            </TabsTrigger>
                            <TabsTrigger value="skill" className="gap-1.5">
                                {t.graph.skills}
                                <CountBadge>{graph.stats.skills}</CountBadge>
                            </TabsTrigger>
                            <TabsTrigger value="command" className="gap-1.5">
                                {t.graph.commands}
                                <CountBadge>{graph.stats.commands}</CountBadge>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <button
                    type="button"
                    onClick={onToggleFullscreen}
                    aria-label={fullscreenLabel}
                    title={fullscreenLabel}
                    aria-pressed={fullscreen}
                    className="pointer-events-auto absolute right-3 top-3 flex items-center gap-1.5 border bg-card/90 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {fullscreen ? (
                        <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                        <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    <span>{fullscreenLabel}</span>
                </button>

                <div className="pointer-events-auto absolute bottom-3 left-3">
                    <Legend />
                </div>

                <p className="pointer-events-none absolute bottom-3 right-3 select-none border bg-card/80 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
                    {t.graph.controlsHint}
                </p>
            </div>
        </>
    );
}

export function RelationGraph({ graph }: { graph: RelationGraph }) {
    // The 3D engine measures the DOM and pulls in WebGL, so it can only run in
    // the browser — gate it behind a mount flag to avoid a hydration mismatch.
    const t = useT();
    const [mounted, setMounted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    useEffect(() => setMounted(true), []);

    // While the graph fills the page, lock body scroll and let Escape close it.
    // The scene's own ResizeObserver re-fits the canvas to the new bounds.
    useEffect(() => {
        if (!fullscreen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setFullscreen(false);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [fullscreen]);

    const container = (
        <div
            className={cn(
                "relative w-full overflow-hidden border ring-1 ring-foreground/10",
                fullscreen
                    ? "h-[100dvh] border-0 bg-background ring-0"
                    : "h-[calc(100vh-15rem)] min-h-[600px]",
            )}
        >
            {mounted ? (
                <GraphChrome
                    graph={graph}
                    fullscreen={fullscreen}
                    onToggleFullscreen={() => setFullscreen((value) => !value)}
                />
            ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t.common.loadingGraph}
                </div>
            )}
        </div>
    );

    // In fullscreen, portal to <body> so the overlay escapes the app shell's
    // stacking context (the <main> backdrop-blur traps a plain `fixed` child)
    // and covers the whole browser viewport — site header included.
    if (fullscreen && mounted) {
        return createPortal(
            <div className="fixed inset-0 z-[100] bg-background">{container}</div>,
            document.body,
        );
    }

    return container;
}
