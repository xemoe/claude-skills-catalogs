// apps/web/components/presets/preset-item-card.tsx
"use client";

import Link from "next/link";
import { FolderOpen, GitBranch, Github, Package, X } from "lucide-react";
import {
    Card,
    CardAction,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillTypeDot } from "@/components/skill-type-dot";
import { ModelInvocationBadge } from "@/components/model-invocation-badge";
import { formatDate } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { SkillSource, SkillType } from "@lector/core/types";
import type { EnrichedPresetItem } from "@lector/presets/enrich";
import {SKILL_TYPE_META} from "@/components/skill-type";

type Props = {
    item: EnrichedPresetItem;
    presetId: number;
    onRemove: () => void;
    disabled: boolean;
};

const borderByType = {
    'personal': '',
    'plugin': '',
    'project': '',
    'local': ''
}

export function PresetItemCard({ item, presetId, onRemove, disabled }: Props) {
    const t = useT();

    if (item.missing) {
        return (
            <Card className="rounded-md shadow-none opacity-60 border-dashed">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                            {item.kind}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                            {t.presetsPage.detail.missingBadge}
                        </Badge>
                    </div>
                    {!disabled && (
                        <CardAction>
                            <RemoveButton
                                onRemove={onRemove}
                                label={t.presetsPage.detail.removeItem}
                            />
                        </CardAction>
                    )}
                </CardHeader>
                <CardContent className="pt-0 text-sm">
                    <code className="font-mono">{item.identifier}</code>
                </CardContent>
            </Card>
        );
    }

    const href =
        item.kind === "skill"
            ? `/skills/${item.skill.id}?preset=${presetId}`
            : `/commands/${item.command.id}?preset=${presetId}`;
    const srLabel =
        item.kind === "skill"
            ? t.presetsPage.detail.openSkill
            : t.presetsPage.detail.openCommand;
    const name = item.kind === "skill" ? item.skill.name : `/${item.command.name}`;
    const description =
        item.kind === "skill" ? item.skill.description : item.command.description;
    const type = item.kind === "skill" ? item.skill.type : item.command.scope;
    const disableModelInvocation =
        item.kind === "skill"
            ? item.skill.disableModelInvocation
            : item.command.disableModelInvocation;
    const source = item.kind === "skill" ? item.skill.source : item.command.source;
    const plugin = item.kind === "skill" ? item.skill.plugin : item.command.plugin;
    const lastUpdated = item.kind === "skill" ? item.skill.lastUpdated : item.command.lastUpdated;
    const typeBorder = SKILL_TYPE_META[type].border;

    return (
        <Link href={href} className="block">
            <span className="sr-only">{srLabel}</span>
            <Card className={`rounded-sm shadow-none transition-colors hover:bg-accent/40 border-t-2 ${typeBorder}`}>
                <CardHeader className="pb-0">
                    <div className="flex items-center">
                        <ModelInvocationBadge disabled={disableModelInvocation} />
                    </div>
                    {!disabled && (
                        <CardAction>
                            <RemoveButton
                                onRemove={onRemove}
                                label={t.presetsPage.detail.removeItem}
                            />
                        </CardAction>
                    )}
                </CardHeader>
                <CardContent className="space-y-1 pt-0">
                    <p className="text-sm font-medium">{name}</p>
                    {description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                            {description}
                        </p>
                    )}
                    <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                        {plugin && source.kind === "local" ? (
                            <span className="inline-flex min-w-0 items-center gap-1">
                                <Package className="h-3 w-3 shrink-0 text-purple-600" />
                                <span className="truncate">{plugin.name}</span>
                            </span>
                        ) : (
                            <SourceLabel source={source} />
                        )}
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">{formatDate(lastUpdated)}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

function SourceLabel({ source }: { source: SkillSource }) {
    const Icon =
        source.kind === "github"
            ? Github
            : source.kind === "git"
              ? GitBranch
              : FolderOpen;
    return (
        <span
            title={source.label}
            className="inline-flex min-w-0 items-center gap-1.5"
        >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{source.label}</span>
        </span>
    );
}

function RemoveButton({
    onRemove,
    label,
}: {
    onRemove: () => void;
    label: string;
}) {
    return (
        <Button
            size="icon-xs"
            variant="ghost"
            aria-label={label}
            title={label}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
            }}
        >
            <X className="h-3.5 w-3.5" />
        </Button>
    );
}
