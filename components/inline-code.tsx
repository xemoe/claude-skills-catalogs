import { cn } from "@/lib/utils";

/** Inline <code> styled to match the app's code treatment. */
export function InlineCode({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "rounded-none bg-secondary px-1.5 py-0.5 text-xs",
        className,
      )}
    >
      {children}
    </code>
  );
}
