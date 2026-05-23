// apps/web/components/presets/preset-card.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Preset } from "@lector/presets/types";

export function PresetCard({
    preset,
    isActive,
    itemsCountLabel,
}: {
    preset: Preset;
    isActive: boolean;
    itemsCountLabel: string;
}) {
    return (
        <Link href={`/presets/${preset.id}`} className="block">
            <Card className="rounded-none transition-colors hover:bg-accent/40">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base font-semibold">
                            {preset.name}
                        </CardTitle>
                        {isActive ? (
                            <Badge variant="default">● ACTIVE</Badge>
                        ) : null}
                        {preset.archivedAt ? (
                            <Badge variant="secondary">archived</Badge>
                        ) : null}
                    </div>
                </CardHeader>
                <CardContent className="pt-0 text-xs text-muted-foreground">
                    {itemsCountLabel}
                    {preset.description ? (
                        <p className="mt-1 line-clamp-2">{preset.description}</p>
                    ) : null}
                </CardContent>
            </Card>
        </Link>
    );
}
