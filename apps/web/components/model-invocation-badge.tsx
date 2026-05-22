"use client";

import { Bot, SquareSlash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

/**
 * Status indicator for the `disable-model-invocation` frontmatter of a skill or
 * command. "Slash-only" stays an amber labelled pill so the restriction reads
 * loudly; the default state is a teal bot icon — Claude invokes it on its own —
 * kept icon-only so the common case does not shout on every row.
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
        "inline-flex items-center gap-1 rounded-none border py-0.5 text-xs font-medium";

    if (disabled === true) {
        return (
            <span
                title={t.explorer.invocationSlashOnlyHint}
                className={cn(
                    chip,
                    "px-2 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300",
                    className,
                )}
            >
                <SquareSlash className="h-3 w-3 shrink-0" />
                {t.explorer.invocationSlashOnly}
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
