"use client";

import { Activity, PlayCircle, StopCircle, Webhook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { HookScanResult } from "@lector/core/types";
import { useT } from "@/lib/i18n/context";

export function HookStatCards({ result }: { result: HookScanResult }) {
    const t = useT();
    const { hooks, roots } = result;

    const preToolUse = hooks.filter((h) => h.event === "PreToolUse").length;
    const postToolUse = hooks.filter((h) => h.event === "PostToolUse").length;
    const sessionEvents = hooks.filter(
        (h) =>
            h.event === "UserPromptSubmit" ||
            h.event === "Notification" ||
            h.event === "Stop" ||
            h.event === "SubagentStop" ||
            h.event === "SessionStart" ||
            h.event === "SessionEnd" ||
            h.event === "PreCompact",
    ).length;

    const cards = [
        {
            label: t.stats.totalHooks,
            value: hooks.length,
            sub: t.stats.acrossSettingsFiles(roots.length),
            Icon: Webhook,
        },
        {
            label: t.stats.preToolUseCount,
            value: preToolUse,
            sub: t.stats.preToolUseSub,
            Icon: PlayCircle,
        },
        {
            label: t.stats.postToolUseCount,
            value: postToolUse,
            sub: t.stats.postToolUseSub,
            Icon: StopCircle,
        },
        {
            label: t.stats.sessionEventsCount,
            value: sessionEvents,
            sub: t.stats.sessionEventsSub,
            Icon: Activity,
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
