"use client";

import { Boxes, FolderOpen, Github, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ScanResult } from "@lector/core/types";
import { useT } from "@/lib/i18n/context";

export function StatCards({ result }: { result: ScanResult }) {
    const t = useT();
    const { skills, roots } = result;

    const pluginSkills = skills.filter((s) => s.type === "plugin");
    const distinctPlugins = new Set(
        skills.filter((s) => s.plugin).map((s) => s.plugin!.name),
    ).size;
    const githubSkills = skills.filter((s) => s.source.kind === "github");
    const distinctRepos = new Set(githubSkills.map((s) => s.source.label)).size;
    const localSkills = skills.filter((s) => s.source.kind === "local");

    const cards = [
        {
            label: t.stats.totalSkills,
            value: skills.length,
            sub: t.stats.acrossLocations(roots.length),
            Icon: Boxes,
        },
        {
            label: t.stats.fromPlugins,
            value: pluginSkills.length,
            sub: t.stats.pluginsInstalled(distinctPlugins),
            Icon: Package,
        },
        {
            label: t.stats.fromGitHub,
            value: githubSkills.length,
            sub: t.stats.repositories(distinctRepos),
            Icon: Github,
        },
        {
            label: t.stats.localOnly,
            value: localSkills.length,
            sub: t.stats.notTrackedInGit,
            Icon: FolderOpen,
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
