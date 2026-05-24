"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type IconSelectTriggerProps = Omit<
    React.ComponentProps<typeof SelectPrimitive.Trigger>,
    "children"
> & {
    icon: React.ReactNode;
    label: string;
    currentValue?: string;
};

/**
 * Square icon-only Select trigger. The dropdown chevron is hidden; the tooltip
 * (label, plus the current value if provided) is the only visible cue when the
 * filter is collapsed.
 */
export function IconSelectTrigger({
    className,
    icon,
    label,
    currentValue,
    ...props
}: IconSelectTriggerProps) {
    const tooltip = currentValue ? `${label}: ${currentValue}` : label;
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <SelectPrimitive.Trigger
                    data-slot="select-trigger"
                    aria-label={label}
                    className={cn(
                        "inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-input bg-transparent text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
                        className,
                    )}
                    {...props}
                >
                    {icon}
                </SelectPrimitive.Trigger>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
    );
}
