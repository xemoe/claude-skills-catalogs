import { cn } from "@/lib/utils";
import type { SkillType } from "@/lib/types";
import { SKILL_TYPE_META } from "@/components/skill-type";

export function SkillTypeBadge({
  type,
  className,
}: {
  type: SkillType;
  className?: string;
}) {
  const meta = SKILL_TYPE_META[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none border px-2 py-0.5 text-xs font-medium",
        meta.badge,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
