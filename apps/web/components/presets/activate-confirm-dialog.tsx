// apps/web/components/presets/activate-confirm-dialog.tsx
"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ApplyResult } from "@lector/presets/types";

export function ActivateConfirmDialog({
    open,
    presetName,
    preview,
    onCancel,
    onConfirm,
}: {
    open: boolean;
    presetName: string;
    preview: ApplyResult | null;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Switch to &ldquo;{presetName}&rdquo;?</DialogTitle>
                </DialogHeader>
                {!preview ? (
                    <p className="text-sm text-muted-foreground">Computing diff&hellip;</p>
                ) : (
                    <div className="space-y-3 text-sm">
                        <DiffSection label="Will enable" items={preview.enabled} />
                        <DiffSection label="Will disable" items={preview.disabled} />
                        <DiffSection label="Will skip" items={preview.skipped} />
                        <DiffSection label="Missing on disk" items={preview.missing} />
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={onConfirm} disabled={!preview}>Apply changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DiffSection({ label, items }: { label: string; items: Array<{ kind: string; identifier: string; reason?: string }> }) {
    if (items.length === 0) return null;
    return (
        <div>
            <div className="text-xs font-semibold text-muted-foreground">
                {label} ({items.length})
            </div>
            <ul className="mt-1 max-h-32 overflow-y-auto rounded-none border bg-secondary/30 p-2 text-xs">
                {items.map((i) => (
                    <li key={`${i.kind}::${i.identifier}`} className="font-mono">
                        [{i.kind}] {i.identifier}
                        {i.reason ? <span className="text-muted-foreground"> &mdash; {i.reason}</span> : null}
                    </li>
                ))}
            </ul>
        </div>
    );
}
