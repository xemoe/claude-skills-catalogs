import type { SkillType } from "@lector/core/types";

/**
 * Per-type colour treatment. The display label lives in the i18n dictionary
 * (`t.skillTypes`) so it can be localized.
 *
 * - `badge` — full tinted pill (border + bg + text) for the type label.
 * - `dot` — solid swatch colour for a bare colour dot.
 * - `text` — text colour only, for tinting a count next to a filter tab.
 * - `glow` — neon halo (layered box-shadow) in the type's colour for the dot.
 */
export const SKILL_TYPE_META: Record<
    SkillType,
    { badge: string; dot: string; text: string; glow: string, border: string }
> = {
    personal: {
        badge:
            "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300",
        dot: "bg-blue-500",
        text: "text-blue-600 dark:text-blue-300",
        glow: "shadow-[0_0_3px_#3b82f6,0_0_8px_#3b82f680]",
        border: "border-blue-500"
    },
    plugin: {
        badge:
            "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-400/30 dark:bg-purple-400/10 dark:text-purple-300",
        dot: "bg-purple-500",
        text: "text-purple-600 dark:text-purple-300",
        glow: "shadow-[0_0_3px_#a855f7,0_0_8px_#a855f780]",
        border: "border-purple-500"
    },
    project: {
        badge:
            "border-green-200 bg-green-50 text-green-700 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-300",
        dot: "bg-green-500",
        text: "text-green-600 dark:text-green-300",
        glow: "shadow-[0_0_3px_#22c55e,0_0_8px_#22c55e80]",
        border: "border-green-500"
    },
    local: {
        badge:
            "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-400/30 dark:bg-slate-400/10 dark:text-slate-300",
        dot: "bg-slate-400",
        text: "text-slate-600 dark:text-slate-300",
        glow: "shadow-[0_0_3px_#94a3b8,0_0_8px_#94a3b880]",
        border: "border-slate-500"
    },
};
