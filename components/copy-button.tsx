"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  className,
  size = "icon-sm",
}: {
  value: string;
  className?: string;
  size?: "icon-sm" | "icon-xs";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Button
      variant="ghost"
      size={size}
      className={className}
      onClick={copy}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="text-green-600" />
      ) : (
        <Copy />
      )}
    </Button>
  );
}
