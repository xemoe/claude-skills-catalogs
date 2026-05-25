"use client";

import { Bot, Boxes, Package, SquareSlash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Skill } from "@lector/core/types";
import { useT } from "@/lib/i18n/context";

export function StatCards({
    skills,
    rootsCount,
}: {
    skills: Skill[];
    rootsCount: number;
}) {
    const t = useT();

    const pluginSkills = skills.filter((s) => s.type === "plugin");
    const distinctPlugins = new Set(
        skills.filter((s) => s.plugin).map((s) => s.plugin!.name),
    ).size;
    const modelInvocableSkills = skills.filter((s) => !s.disableModelInvocation);
    const slashOnlySkills = skills.filter((s) => s.disableModelInvocation);

    const cards = [
        {
            label: t.stats.totalSkills,
            value: skills.length,
            sub: t.stats.acrossLocations(rootsCount),
            Icon: Boxes,
        },
        {
            label: t.stats.fromPlugins,
            value: pluginSkills.length,
            sub: t.stats.pluginsInstalled(distinctPlugins),
            Icon: Package,
        },
        {
            label: t.explorer.invocationModel,
            value: modelInvocableSkills.length,
            sub: t.stats.modelInvocableSub,
            Icon: Bot,
        },
        {
            label: t.explorer.invocationSlashOnly,
            value: slashOnlySkills.length,
            sub: t.stats.slashOnlySub,
            Icon: SquareSlash,
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ label, value, sub, Icon }) => (
                <Card key={label}>
                    <CardContent className="flex items-center gap-5 p-2 px-5">
                        <div className="rounded-none bg-secondary p-2.5">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-4xl font-bold tabular-nums">{value}</div>
                            <div className="text-sm font-medium">{label}</div>
                            <div className="truncate text-xs text-muted-foreground">{sub}</div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
