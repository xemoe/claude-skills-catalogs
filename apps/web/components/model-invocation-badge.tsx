"use client";

import { Bot, SquareSlash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

/**
 * Status indicator for the `disable-model-invocation` frontmatter of a skill or
 * command. Both states are icon-only pills: an amber slash icon when the skill
 * is slash-only, a teal bot icon when Claude can invoke it on its own.
 */
export function ModelInvocationBadge({
    disabled,
    className,
}: {
    disabled?: boolean;
    className?: string;
}) {
    const t = useT();
    const chip =
        "inline-flex items-center gap-1 rounded-sm border py-1 text-xs font-medium";

    if (disabled === true) {
        return (
            <span
                role="img"
                aria-label={t.explorer.invocationSlashOnly}
                title={t.explorer.invocationSlashOnlyHint}
                className={cn(
                    chip,
                    "px-1.5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
                    className,
                )}
            >
                <SquareSlash className="h-4 w-4 shrink-0" />
            </span>
        );
    }

    return (
        <span
            role="img"
            aria-label={t.explorer.invocationModel}
            title={t.explorer.invocationModelHint}
            className={cn(
                chip,
                "px-1.5 border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300",
                className,
            )}
        >
            <Bot className="h-4 w-4 shrink-0" />
        </span>
    );
}
