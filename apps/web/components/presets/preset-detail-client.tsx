// apps/web/components/presets/preset-detail-client.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    useActivatePresetJson,
    useAddPresetItem,
    useArchivePreset,
    usePreset,
    useRemovePresetItem,
    useUnarchivePreset,
} from "./use-preset-queries";
import { PresetItemPicker } from "./preset-item-picker";
import { ActivateConfirmDialog } from "./activate-confirm-dialog";
import { ActivateProgressModal } from "./activate-progress-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ApplyResult, ItemKind } from "@lector/presets/types";
import { PresetItemCard } from "./preset-item-card";
import type { EnrichedPresetItem } from "@lector/presets/enrich";

const STREAM_THRESHOLD = 4;

export function PresetDetailClient({ presetId }: { presetId: number }) {
    const router = useRouter();
    const detail = usePreset(presetId);
    const addItem = useAddPresetItem();
    const removeItem = useRemovePresetItem();
    const activate = useActivatePresetJson();
    const archive = useArchivePreset();
    const unarchive = useUnarchivePreset();

    const [pickerOpen, setPickerOpen] = useState(false);
    const [confirm, setConfirm] = useState<{ open: boolean; preview: ApplyResult | null }>({ open: false, preview: null });
    const [progress, setProgress] = useState(false);

    if (detail.isLoading) return <p className="text-sm text-muted-foreground">Loading&hellip;</p>;
    if (detail.error) return <p className="text-sm text-destructive">{String(detail.error)}</p>;
    if (!detail.data) return null;
    const { preset, items } = detail.data;

    const skills = items.filter((i): i is EnrichedPresetItem => i.kind === "skill");
    const commands = items.filter((i): i is EnrichedPresetItem => i.kind === "command");

    async function onActivate() {
        const dry = await activate.mutateAsync({ id: presetId, dryRun: true });
        setConfirm({ open: true, preview: dry.result });
    }

    async function onConfirmApply() {
        const totalChanges =
            (confirm.preview?.enabled.length ?? 0) + (confirm.preview?.disabled.length ?? 0);
        setConfirm({ open: false, preview: null });
        if (totalChanges >= STREAM_THRESHOLD) {
            setProgress(true);
        } else {
            await activate.mutateAsync({ id: presetId });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{preset.name}</h1>
                        {preset.archivedAt ? <Badge variant="secondary">archived</Badge> : null}
                    </div>
                    {preset.description ? (
                        <p className="text-sm text-muted-foreground">{preset.description}</p>
                    ) : null}
                </div>
                <div className="flex gap-2">
                    {preset.archivedAt ? (
                        <Button onClick={() => unarchive.mutate(presetId)}>Unarchive</Button>
                    ) : (
                        <>
                            <Button className="rounded-sm" onClick={onActivate}>Activate</Button>
                            <Button
                                variant="outline"
                                className="rounded-xs"
                                onClick={() => {
                                    archive.mutate(presetId, {
                                        onSuccess: () => router.push("/presets"),
                                    });
                                }}
                            >
                                Archive
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <section className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Skills ({skills.length})</h2>
                    {!preset.archivedAt ? (
                        <Button variant="outline" size="sm" className="rounded-sm" onClick={() => setPickerOpen(true)}>
                            + Add from catalog
                        </Button>
                    ) : null}
                </div>
                <PresetItemGrid
                    items={skills}
                    presetId={presetId}
                    onRemove={(kind, id) => removeItem.mutate({ presetId, kind, identifier: id })}
                    disabled={!!preset.archivedAt}
                />
            </section>

            <section className="space-y-2">
                <h2 className="text-base font-semibold">Commands ({commands.length})</h2>
                <PresetItemGrid
                    items={commands}
                    presetId={presetId}
                    onRemove={(kind, id) => removeItem.mutate({ presetId, kind, identifier: id })}
                    disabled={!!preset.archivedAt}
                />
            </section>

            <PresetItemPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onConfirm={async (chosen) => {
                    const existing = new Set(items.map((i) => `${i.kind}::${i.identifier}`));
                    for (const c of chosen) {
                        const key = `${c.kind}::${c.identifier}`;
                        if (!existing.has(key)) {
                            await addItem.mutateAsync({ presetId, kind: c.kind, identifier: c.identifier });
                        }
                    }
                }}
                title="Add items to preset"
                initiallySelected={items.map((i) => ({ kind: i.kind, identifier: i.identifier }))}
            />

            <ActivateConfirmDialog
                open={confirm.open}
                presetName={preset.name}
                preview={confirm.preview}
                onCancel={() => setConfirm({ open: false, preview: null })}
                onConfirm={onConfirmApply}
            />

            <ActivateProgressModal
                open={progress}
                presetId={presetId}
                presetName={preset.name}
                onDone={() => setProgress(false)}
            />
        </div>
    );
}

function PresetItemGrid({
    items,
    presetId,
    onRemove,
    disabled,
}: {
    items: EnrichedPresetItem[];
    presetId: number;
    onRemove: (kind: ItemKind, identifier: string) => void;
    disabled: boolean;
}) {
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">None yet.</p>;
    }
    return (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {items.map((i) => (
                <PresetItemCard
                    key={`${i.kind}::${i.identifier}`}
                    item={i}
                    presetId={presetId}
                    onRemove={() => onRemove(i.kind, i.identifier)}
                    disabled={disabled}
                />
            ))}
        </div>
    );
}
