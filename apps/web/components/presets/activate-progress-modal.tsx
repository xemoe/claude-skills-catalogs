// apps/web/components/presets/activate-progress-modal.tsx
"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApplyEvent, ApplyResult } from "@lector/presets/types";

export function ActivateProgressModal({
    open,
    presetId,
    presetName,
    onDone,
}: {
    open: boolean;
    presetId: number;
    presetName: string;
    onDone: (result: ApplyResult | null) => void;
}) {
    const qc = useQueryClient();
    const [events, setEvents] = useState<ApplyEvent[]>([]);
    const [done, setDone] = useState<ApplyResult | null>(null);

    useEffect(() => {
        if (!open) {
            setEvents([]);
            setDone(null);
            return;
        }
        const controller = new AbortController();
        (async () => {
            const res = await fetch(`/api/presets/${presetId}/activate/stream`, {
                method: "POST",
                signal: controller.signal,
            });
            if (!res.body) return;
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            while (true) {
                const { done: streamDone, value } = await reader.read();
                if (streamDone) break;
                buf += decoder.decode(value, { stream: true });
                const parts = buf.split("\n\n");
                buf = parts.pop() ?? "";
                for (const chunk of parts) {
                    const line = chunk.split("\n").find((l) => l.startsWith("data: "));
                    if (!line) continue;
                    try {
                        const event: ApplyEvent = JSON.parse(line.slice(6));
                        setEvents((prev) => [...prev, event]);
                        if (event.phase === "done") {
                            setDone(event.result);
                            qc.invalidateQueries({ queryKey: ["presets"] });
                            qc.invalidateQueries({ queryKey: ["active-preset"] });
                            qc.invalidateQueries({ queryKey: ["apply-log"] });
                            qc.invalidateQueries({ queryKey: ["preset", presetId] });
                            setTimeout(() => onDone(event.result), 600); // brief pause to show "done"
                        }
                        if (event.phase === "error") {
                            setTimeout(() => onDone(null), 600);
                        }
                    } catch {
                        // ignore malformed chunks
                    }
                }
            }
        })();
        return () => controller.abort();
    }, [open, presetId, qc, onDone]);

    const last = events[events.length - 1];

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Activating &ldquo;{presetName}&rdquo;</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 font-mono text-xs">
                    {events.map((e, i) => (
                        <div key={i} className="text-muted-foreground">
                            {phaseLabel(e)}
                        </div>
                    ))}
                    {!done && last ? (
                        <ProgressBar event={last} />
                    ) : null}
                    {done ? (
                        <div className="rounded-none border border-green-500 bg-green-500/10 p-2 text-foreground">
                            Done &mdash; {done.enabled.length} enabled, {done.disabled.length} disabled, {done.errors.length} errors.
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function phaseLabel(e: ApplyEvent): string {
    switch (e.phase) {
        case "scanning":
            return "✓ Scanned personal items";
        case "diff":
            return `✓ Computed diff (${e.diff.enabled.length}+${e.diff.disabled.length} changes)`;
        case "enabling":
            return `⠋ Enabling ${e.currentItem.identifier} (${e.current} of ${e.total})…`;
        case "disabling":
            return `⠋ Disabling ${e.currentItem.identifier} (${e.current} of ${e.total})…`;
        case "logging":
            return "⠋ Writing apply log…";
        case "done":
            return "✓ Done";
        case "error":
            return `✗ Error: ${e.message}`;
    }
}

function ProgressBar({ event }: { event: ApplyEvent }) {
    let pct = 0;
    if (event.phase === "enabling" || event.phase === "disabling") {
        pct = event.total === 0 ? 100 : Math.round((event.current / event.total) * 100);
    }
    return (
        <div className="h-2 w-full overflow-hidden rounded-none bg-secondary">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
    );
}
