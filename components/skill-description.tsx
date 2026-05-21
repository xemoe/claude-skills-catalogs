"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The SKILL.md frontmatter `description` is written for Claude's triggering
 * logic, not for humans — it tends to be one dense, comma-heavy block. Render
 * it as a readable callout: roomy line-height, clamped to a few lines, with a
 * toggle when it overflows.
 */
export function SkillDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      // While clamped, clientHeight is the line-clamp cap; once expanded it
      // equals scrollHeight, so only trust the measurement when collapsed.
      if (expanded) return;
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [description, expanded]);

  const showToggle = overflowing || expanded;

  return (
    <div className="rounded-none border bg-muted/60 px-4 py-3">
      <p
        id={textId}
        ref={textRef}
        className={cn(
          "whitespace-pre-line text-sm leading-relaxed text-foreground/80",
          !expanded && "line-clamp-4",
        )}
      >
        {description}
      </p>
      {showToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={textId}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          {expanded ? "Show less" : "Show more"}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      )}
    </div>
  );
}
