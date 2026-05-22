"use client";

import { Bot, SquareSlash, type LucideIcon } from "lucide-react";
import type { SkillType } from "@lector/core/types";
import { CopyButton } from "@/components/copy-button";
import { ModelInvocationBadge } from "@/components/model-invocation-badge";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

/**
 * The "Model invocation" card for a skill/command detail page — the current
 * setting plus copy-pasteable `/model-invocation` commands to enable or disable
 * it. Personal and project items are addressed by name, bundled (local) ones by
 * file path. Plugin items render nothing — the plugin owns the file, so a plugin
 * update would revert any change made here.
 */
export function ModelInvocationExamples({
    name,
    filePath,
    type,
    disabled,
}: {
    name: string;
    filePath: string;
    type: SkillType;
    disabled?: boolean;
}) {
    const t = useT();
    if (type === "plugin") return null;

    const byName = type === "personal" || type === "project";
    const raw = byName ? name : filePath;
    const arg = byName && !/\s/.test(raw) ? raw : `"${raw}"`;

    return (
        <Card className={'rounded-sm'}>
            {/*<CardHeader>*/}
            {/*    <CardTitle className="text-base">*/}
            {/*        {t.detail.modelInvocation}*/}
            {/*    </CardTitle>*/}
            {/*</CardHeader>*/}
            <CardContent className="space-y-3 pt-0">
                <div className="flex items-start gap-2 text-sm">
                    <ModelInvocationBadge
                        disabled={disabled}
                        className="shrink-0"
                    />
                    <span className="text-muted-foreground">
                        {disabled
                            ? t.explorer.invocationSlashOnlyHint
                            : t.explorer.invocationModelHint}
                    </span>
                </div>

                <p className="text-xs text-muted-foreground">
                    {t.detail.modelInvocationHint}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <CommandExample
                        icon={Bot}
                        accentClass="text-teal-700 dark:text-teal-300"
                        label={t.detail.modelInvocationEnable}
                        command={`/model-invocation ${arg} on`}
                    />
                    <CommandExample
                        icon={SquareSlash}
                        accentClass="text-amber-700 dark:text-amber-300"
                        label={t.detail.modelInvocationDisable}
                        command={`/model-invocation ${arg} off`}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

function CommandExample({
    icon: Icon,
    accentClass,
    label,
    command,
}: {
    icon: LucideIcon;
    accentClass: string;
    label: string;
    command: string;
}) {
    return (
        <div className="min-w-0 space-y-1">
            <p
                className={cn(
                    "flex items-center gap-1.5 text-xs font-medium",
                    accentClass,
                )}
            >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
            </p>
            <div className="flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded-none bg-secondary p-2 font-mono text-xs">
                    {command}
                </code>
                <CopyButton value={command} />
            </div>
        </div>
    );
}
