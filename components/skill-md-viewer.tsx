"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SkillMdViewer({
  preview,
  raw,
}: {
  // Pre-rendered on the server so react-markdown stays out of the client bundle.
  preview: React.ReactNode;
  raw: string;
}) {
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
    // Force column layout: the Tabs primitive's data-horizontal:flex-col
    // variant never matches radix's data-orientation attribute.
    <Tabs defaultValue="preview" className="flex-col">
      <div className="flex items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>
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
      <TabsContent value="preview">{preview}</TabsContent>
      <TabsContent value="raw">
        <pre className="overflow-x-auto rounded-none border bg-secondary/60 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
          {raw}
        </pre>
      </TabsContent>
    </Tabs>
  );
}
