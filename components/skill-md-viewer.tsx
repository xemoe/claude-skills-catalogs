"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEWS = [
  ["preview", "Preview"],
  ["raw", "Raw"],
] as const;

export function SkillMdViewer({
  preview,
  raw,
}: {
  // Pre-rendered on the server so react-markdown stays out of the client bundle.
  preview: React.ReactNode;
  raw: string;
}) {
  const [view, setView] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);

  async function copyRaw() {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex border bg-muted p-0.5">
          {VIEWS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                view === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          onClick={copyRaw}
          title="Copy raw SKILL.md to clipboard"
          aria-label="Copy raw SKILL.md to clipboard"
        >
          {copied ? (
            <>
              <Check className="text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy />
              Copy
            </>
          )}
        </Button>
      </div>
      <div className="mt-3">
        {view === "preview" ? (
          preview
        ) : (
          <pre className="overflow-x-auto rounded border bg-secondary/60 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
            {raw}
          </pre>
        )}
      </div>
    </>
  );
}
