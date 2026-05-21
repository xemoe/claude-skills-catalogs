import type { SkillType } from "@/lib/types";

/** Single source of truth for how each skill type is labelled and coloured. */
export const SKILL_TYPE_META: Record<
  SkillType,
  { label: string; badge: string; dot: string }
> = {
  personal: {
    label: "Personal",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  plugin: {
    label: "Plugin",
    badge: "border-purple-200 bg-purple-50 text-purple-700",
    dot: "bg-purple-500",
  },
  project: {
    label: "Project",
    badge: "border-green-200 bg-green-50 text-green-700",
    dot: "bg-green-500",
  },
  local: {
    label: "Local",
    badge: "border-slate-300 bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
};
