// apps/web/components/presets/preset-item-picker.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ItemKind } from "@lector/presets/types";

type AvailableItem = {
    kind: ItemKind;
    identifier: string;
    name: string;
    description?: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (chosen: AvailableItem[]) => void;
    title: string;
    initiallySelected?: Array<{ kind: ItemKind; identifier: string }>;
};

export function PresetItemPicker({
    open,
    onOpenChange,
    onConfirm,
    title,
    initiallySelected = [],
}: Props) {
    const [items, setItems] = useState<AvailableItem[] | null>(null);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!open) return;
        setSelected(
            new Set(
                initiallySelected.map((s) => `${s.kind}::${s.identifier}`),
            ),
        );
        // Fetch personal-scope items from existing catalog endpoints
        Promise.all([
            fetch("/api/skills").then((r) => r.json()),
            fetch("/api/commands").then((r) => r.json()),
        ]).then(([skillsRes, commandsRes]) => {
            const skills = (
                skillsRes.skills ??
                skillsRes.result?.skills ??
                []
            ) as Array<{
                name: string;
                type?: string;
                description?: string;
            }>;
            const commands = (
                commandsRes.commands ??
                commandsRes.result?.commands ??
                []
            ) as Array<{
                name: string;
                scope?: string;
                description?: string;
            }>;
            const merged: AvailableItem[] = [];
            for (const s of skills) {
                // Skills use "type" field; personal type = "personal"
                if (s.type !== "personal") continue;
                merged.push({
                    kind: "skill",
                    identifier: s.name,
                    name: s.name,
                    description: s.description,
                });
            }
            for (const c of commands) {
                if (c.scope !== "personal") continue;
                merged.push({
                    kind: "command",
                    identifier: c.name,
                    name: c.name,
                    description: c.description,
                });
            }
            setItems(merged);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const filtered = useMemo(() => {
        if (!items) return [];
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (i) =>
                i.name.toLowerCase().includes(q) ||
                (i.description?.toLowerCase().includes(q) ?? false),
        );
    }, [items, search]);

    function toggle(item: AvailableItem) {
        const k = `${item.kind}::${item.identifier}`;
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(k)) next.delete(k);
            else next.add(k);
            return next;
        });
    }

    function confirm() {
        if (!items) return;
        const chosen = items.filter((i) =>
            selected.has(`${i.kind}::${i.identifier}`),
        );
        onConfirm(chosen);
        onOpenChange(false);
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-3 px-4">
                    <Input
                        placeholder="Search…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="max-h-[60vh] overflow-y-auto rounded-none border">
                        {!items ? (
                            <p className="p-4 text-sm text-muted-foreground">
                                Loading…
                            </p>
                        ) : filtered.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">
                                No items in personal scope.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {filtered.map((i) => {
                                    const k = `${i.kind}::${i.identifier}`;
                                    return (
                                        <li
                                            key={k}
                                            className="flex items-start gap-3 p-3"
                                        >
                                            <Checkbox
                                                checked={selected.has(k)}
                                                onCheckedChange={() => toggle(i)}
                                                id={k}
                                            />
                                            <label
                                                htmlFor={k}
                                                className="min-w-0 cursor-pointer"
                                            >
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    {i.kind}
                                                </div>
                                                <div className="text-sm font-medium">
                                                    {i.name}
                                                </div>
                                                {i.description ? (
                                                    <div className="line-clamp-2 text-xs text-muted-foreground">
                                                        {i.description}
                                                    </div>
                                                ) : null}
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={confirm}>
                            Confirm ({selected.size})
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
