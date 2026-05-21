"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RescanButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fetching, setFetching] = useState(false);
  const busy = isPending || fetching;

  async function rescan() {
    setFetching(true);
    try {
      await fetch("/api/skills?force=1", { cache: "no-store" });
    } catch {
      /* surfaced on the page after refresh */
    }
    setFetching(false);
    startTransition(() => router.refresh());
  }

  return (
    <Button variant="outline" size="sm" onClick={rescan} disabled={busy}>
      <RefreshCw className={cn(busy && "animate-spin")} />
      {busy ? "Scanning…" : "Rescan"}
    </Button>
  );
}
