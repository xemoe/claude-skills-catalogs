// apps/web/components/presets/preset-wizard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    useActivatePresetJson,
    useAddPresetItem,
    useCreatePreset,
} from "./use-preset-queries";
import { PresetItemPicker } from "./preset-item-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ItemKind } from "@lector/presets/types";

type Step = "name" | "items" | "review";

function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}

export function PresetWizard({ onDone }: { onDone?: () => void }) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("name");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [items, setItems] = useState<
        Array<{ kind: ItemKind; identifier: string; name: string }>
    >([]);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const create = useCreatePreset();
    const addItem = useAddPresetItem();
    const activate = useActivatePresetJson();

    async function saveOnly(activateAfter: boolean) {
        setError(null);
        setSaving(true);
        try {
            const { preset } = await create.mutateAsync({
                slug: slug || slugify(name),
                name,
                description: description || null,
            });
            for (const item of items) {
                await addItem.mutateAsync({
                    presetId: preset.id,
                    kind: item.kind,
                    identifier: item.identifier,
                });
            }
            if (activateAfter) {
                await activate.mutateAsync({ id: preset.id });
            }
            onDone?.();
            router.push(`/presets/${preset.id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-4">
            {error ? (
                <div className="rounded-none border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                </div>
            ) : null}

            {step === "name" ? (
                <div className="space-y-3 rounded-none border p-4">
                    <h2 className="text-base font-semibold">
                        Step 1 of 3 — Name your workflow
                    </h2>
                    <Input
                        placeholder="debugging"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (!slug || slug === slugify(name))
                                setSlug(slugify(e.target.value));
                        }}
                    />
                    <Input
                        placeholder="slug (auto from name)"
                        value={slug}
                        onChange={(e) => setSlug(slugify(e.target.value))}
                    />
                    <Textarea
                        placeholder="What's this preset for?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={() => setStep("items")}
                            disabled={!name.trim()}
                        >
                            Next →
                        </Button>
                    </div>
                </div>
            ) : null}

            {step === "items" ? (
                <div className="space-y-3 rounded-none border p-4">
                    <h2 className="text-base font-semibold">
                        Step 2 of 3 — Pick items
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {items.length === 0
                            ? "No items selected yet."
                            : `${items.length} items selected.`}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => setPickerOpen(true)}
                    >
                        {items.length === 0
                            ? "Choose from catalog"
                            : "Edit selection"}
                    </Button>
                    {items.length > 0 ? (
                        <ul className="divide-y rounded-none border text-sm">
                            {items.map((i) => (
                                <li
                                    key={`${i.kind}::${i.identifier}`}
                                    className="flex items-center justify-between p-2"
                                >
                                    <span>
                                        <span className="mr-2 font-mono text-xs text-muted-foreground">
                                            {i.kind}
                                        </span>
                                        {i.name}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    <PresetItemPicker
                        open={pickerOpen}
                        onOpenChange={setPickerOpen}
                        onConfirm={(chosen) => setItems(chosen)}
                        title="Pick skills and commands"
                        initiallySelected={items}
                    />
                    <div className="flex justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setStep("name")}
                        >
                            ← Back
                        </Button>
                        <Button
                            onClick={() => setStep("review")}
                            disabled={items.length === 0}
                        >
                            Next →
                        </Button>
                    </div>
                </div>
            ) : null}

            {step === "review" ? (
                <div className="space-y-3 rounded-none border p-4">
                    <h2 className="text-base font-semibold">
                        Step 3 of 3 — Review
                    </h2>
                    <div className="space-y-1 text-sm">
                        <div>
                            <span className="text-muted-foreground">Name: </span>
                            <span className="font-medium">{name}</span>
                        </div>
                        {description ? (
                            <div>
                                <span className="text-muted-foreground">
                                    Description:{" "}
                                </span>
                                <span>{description}</span>
                            </div>
                        ) : null}
                        <div>
                            <span className="text-muted-foreground">
                                Items:{" "}
                            </span>
                            <span className="font-medium">
                                {items.length}
                            </span>
                        </div>
                    </div>
                    <ul className="divide-y rounded-none border text-sm">
                        {items.map((i) => (
                            <li
                                key={`${i.kind}::${i.identifier}`}
                                className="flex items-center gap-2 p-2"
                            >
                                <span className="font-mono text-xs text-muted-foreground">
                                    {i.kind}
                                </span>
                                <span>{i.name}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="text-sm text-muted-foreground">
                        You can save and stay on this preset, or save and
                        activate it right away.
                    </p>
                    <div className="flex flex-wrap justify-between gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setStep("items")}
                            disabled={saving}
                        >
                            ← Back
                        </Button>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => saveOnly(false)}
                                disabled={saving}
                            >
                                Save
                            </Button>
                            <Button
                                onClick={() => saveOnly(true)}
                                disabled={saving}
                            >
                                Save &amp; Activate
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
