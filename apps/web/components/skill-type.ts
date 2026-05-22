import type { SkillType } from "@lector/core/types";

/**
 * Per-type colour treatment. The display label lives in the i18n dictionary
 * (`t.skillTypes`) so it can be localized.
 */
export const SKILL_TYPE_META: Record<SkillType, { badge: string; dot: string }> =
    {
        personal: {
            badge:
                "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300",
            dot: "bg-blue-500",
        },
        plugin: {
            badge:
                "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-400/30 dark:bg-purple-400/10 dark:text-purple-300",
            dot: "bg-purple-500",
        },
        project: {
            badge:
                "border-green-200 bg-green-50 text-green-700 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-300",
            dot: "bg-green-500",
        },
        local: {
            badge:
                "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300",
            dot: "bg-slate-400",
        },
    };
