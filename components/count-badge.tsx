import { cn } from "@/lib/utils";

/** Small tinted pill for a numeric count — e.g. next to a tab or nav heading. */
export function CountBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none bg-foreground/10 px-1.5 py-0.5 text-[11px] leading-none tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
