// apps/web/components/presets/presets-explorer.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePresetsList } from "./use-preset-queries";
import { PresetCard } from "./preset-card";
import { PresetWizard } from "./preset-wizard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PinnedPanel } from "./pinned-panel";

export function PresetsExplorer() {
    const active = usePresetsList("active");
    const archived = usePresetsList("archived");
    const [tab, setTab] = useState<"active" | "archived">("active");

    const activeStateData =
        active.data?.active ?? archived.data?.active ?? null;

    // Show empty state only when both tabs have loaded and are empty
    const isEmpty =
        !active.isLoading &&
        !archived.isLoading &&
        (active.data?.presets.length ?? 0) === 0 &&
        (archived.data?.presets.length ?? 0) === 0;

    if (active.isLoading || archived.isLoading) {
        return (
            <p className="text-sm text-muted-foreground">Loading…</p>
        );
    }

    if (isEmpty) {
        return (
            <div className="space-y-4 rounded-none border p-6">
                <h2 className="text-lg font-semibold">
                    Welcome — let&apos;s create your first preset.
                </h2>
                <p className="text-sm text-muted-foreground">
                    A preset is a bundle of skills and commands you want enabled
                    for a type of work. Switching presets toggles each
                    item&apos;s model-invocation flag — no other side effects.
                </p>
                <PresetWizard />
            </div>
        );
    }

    // Find the currently active preset (from either tab's active state)
    const activePresetId = activeStateData?.presetId ?? null;
    // The active preset is always in the "active" tab's list
    const activePreset =
        active.data?.presets.find((p) => p.id === activePresetId) ?? null;
    const activatedAt = activeStateData?.activatedAt ?? null;

    return (
        <div className="space-y-6">
            {activePreset ? (
                <div className="rounded-none border bg-secondary/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground">
                                Active
                            </div>
                            <div className="text-lg font-semibold">
                                ● {activePreset.name}
                            </div>
                            {activatedAt ? (
                                <div className="text-xs text-muted-foreground">
                                    activated {activatedAt}
                                </div>
                            ) : null}
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/presets/${activePreset.id}`}>
                                <Button variant="outline">View detail</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            ) : null}

            <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as "active" | "archived")}
            >
                <div className="flex items-center justify-between gap-3 mb-4">
                    <TabsList>
                        <TabsTrigger value="active">
                            Active ({active.data?.presets.length ?? 0})
                        </TabsTrigger>
                        <TabsTrigger value="archived">
                            Archived ({archived.data?.presets.length ?? 0})
                        </TabsTrigger>
                    </TabsList>
                    <Link href="/presets/new">
                        <Button>+ New preset</Button>
                    </Link>
                </div>

                <TabsContent value="active">
                    {active.data?.presets.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No active presets. Create one with the button above.
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {(active.data?.presets ?? []).map((p) => (
                                <PresetCard
                                    key={p.id}
                                    preset={p}
                                    isActive={p.id === activePresetId}
                                    itemsCountLabel="—"
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="archived">
                    {archived.data?.presets.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No archived presets.
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {(archived.data?.presets ?? []).map((p) => (
                                <PresetCard
                                    key={p.id}
                                    preset={p}
                                    isActive={false}
                                    itemsCountLabel="—"
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            <PinnedPanel />
        </div>
    );
}
