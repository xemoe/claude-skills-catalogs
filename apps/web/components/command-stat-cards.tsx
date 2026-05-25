"use client";

import { Bot, Package, SquareSlash, SquareTerminal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Command } from "@lector/core/types";
import { useT } from "@/lib/i18n/context";

export function CommandStatCards({
    commands,
    rootsCount,
}: {
    commands: Command[];
    rootsCount: number;
}) {
    const t = useT();

    const pluginCommands = commands.filter((c) => c.scope === "plugin");
    const distinctPlugins = new Set(
        commands.filter((c) => c.plugin).map((c) => c.plugin!.name),
    ).size;
    const modelInvocableCommands = commands.filter(
        (c) => !c.disableModelInvocation,
    );
    const slashOnlyCommands = commands.filter((c) => c.disableModelInvocation);

    const cards = [
        {
            label: t.stats.totalCommands,
            value: commands.length,
            sub: t.stats.acrossLocations(rootsCount),
            Icon: SquareTerminal,
        },
        {
            label: t.stats.fromPlugins,
            value: pluginCommands.length,
            sub: t.stats.pluginsShort(distinctPlugins),
            Icon: Package,
        },
        {
            label: t.explorer.invocationModel,
            value: modelInvocableCommands.length,
            sub: t.stats.modelInvocableSub,
            Icon: Bot,
        },
        {
            label: t.explorer.invocationSlashOnly,
            value: slashOnlyCommands.length,
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
