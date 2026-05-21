"use client";

import { ExternalLink, FolderOpen, GitBranch, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillSource } from "@/lib/types";

export function SourceBadge({
  source,
  className,
}: {
  source: SkillSource;
  className?: string;
}) {
  if (source.kind === "github" && source.url) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={source.url}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm hover:underline",
          className,
        )}
      >
        <Github className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{source.label}</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
      </a>
    );
  }

  if (source.kind === "git") {
    return (
      <span
        title={source.label}
        className={cn("inline-flex items-center gap-1.5 text-sm", className)}
      >
        <GitBranch className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{source.label}</span>
      </span>
    );
  }

  return (
    <span
      title={source.label}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{source.label}</span>
    </span>
  );
}
