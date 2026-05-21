import { cn } from "@/lib/utils";
import type { SkillType } from "@/lib/types";

const STYLES: Record<SkillType, string> = {
  personal: "border-blue-200 bg-blue-50 text-blue-700",
  plugin: "border-purple-200 bg-purple-50 text-purple-700",
  project: "border-green-200 bg-green-50 text-green-700",
  local: "border-slate-300 bg-slate-100 text-slate-600",
};

const LABELS: Record<SkillType, string> = {
  personal: "Personal",
  plugin: "Plugin",
  project: "Project",
  local: "Local",
};

export function SkillTypeBadge({
  type,
  className,
}: {
  type: SkillType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        STYLES[type],
        className,
      )}
    >
      {LABELS[type]}
    </span>
  );
}
