"use client";

import { cn } from "@/lib/utils";
import type { SkillType } from "@lector/core/types";
import { SKILL_TYPE_META } from "@/components/skill-type";
import { useT } from "@/lib/i18n/context";

export function SkillTypeBadge({
    type,
    className,
}: {
    type: SkillType;
    className?: string;
}) {
    const t = useT();
    const meta = SKILL_TYPE_META[type];
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-xs border px-2 py-0.5 text-xs font-medium",
                meta.badge,
                className,
            )}
        >
            {t.skillTypes[type]}
        </span>
    );
}
