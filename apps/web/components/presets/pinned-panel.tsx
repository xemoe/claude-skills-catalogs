// apps/web/components/presets/pinned-panel.tsx
"use client";

import { useState } from "react";
import {
    useAddPin,
    useArchivePin,
    usePinnedList,
    useUnarchivePin,
} from "./use-preset-queries";
import { PresetItemPicker } from "./preset-item-picker";
import { Button } from "@/components/ui/button";

export function PinnedPanel() {
    const active = usePinnedList("active");
    const archived = usePinnedList("archived");
    const addPin = useAddPin();
    const archivePin = useArchivePin();
    const unarchivePin = useUnarchivePin();
    const [pickerOpen, setPickerOpen] = useState(false);

    if (active.isLoading) return <p className="text-sm text-muted-foreground">Loading pinned…</p>;

    return (
        <details className="rounded-none border">
            <summary className="cursor-pointer p-3 text-sm font-semibold">
                Pinned (always on, {active.data?.pinned.length ?? 0})
            </summary>
            <div className="space-y-3 p-3">
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                        + Add pinned
                    </Button>
                </div>
                {active.data && active.data.pinned.length > 0 ? (
                    <ul className="divide-y rounded-none border text-sm">
                        {active.data.pinned.map((p) => (
                            <li
                                key={`${p.kind}::${p.identifier}`}
                                className="flex items-center justify-between p-2"
                            >
                                <span className="font-mono">
                                    [{p.kind}] {p.identifier}
                                    {p.reason ? (
                                        <span className="ml-2 text-xs text-muted-foreground">— {p.reason}</span>
                                    ) : null}
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                        archivePin.mutate({ kind: p.kind, identifier: p.identifier })
                                    }
                                >
                                    Archive
                                </Button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No pinned items yet.</p>
                )}

                {archived.data && archived.data.pinned.length > 0 ? (
                    <details className="text-sm">
                        <summary className="cursor-pointer text-muted-foreground">
                            Archived pins ({archived.data.pinned.length})
                        </summary>
                        <ul className="mt-2 divide-y rounded-none border text-sm">
                            {archived.data.pinned.map((p) => (
                                <li
                                    key={`${p.kind}::${p.identifier}`}
                                    className="flex items-center justify-between p-2"
                                >
                                    <span className="font-mono text-muted-foreground">
                                        [{p.kind}] {p.identifier}
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            unarchivePin.mutate({ kind: p.kind, identifier: p.identifier })
                                        }
                                    >
                                        Unarchive
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </details>
                ) : null}

                <PresetItemPicker
                    open={pickerOpen}
                    onOpenChange={setPickerOpen}
                    title="Pick items to pin"
                    initiallySelected={active.data?.pinned.map((p) => ({ kind: p.kind, identifier: p.identifier })) ?? []}
                    onConfirm={async (chosen) => {
                        const existing = new Set(
                            (active.data?.pinned ?? []).map((p) => `${p.kind}::${p.identifier}`),
                        );
                        for (const c of chosen) {
                            const k = `${c.kind}::${c.identifier}`;
                            if (!existing.has(k)) {
                                await addPin.mutateAsync({ kind: c.kind, identifier: c.identifier });
                            }
                        }
                    }}
                />
            </div>
        </details>
    );
}
