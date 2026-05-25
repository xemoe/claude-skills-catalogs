"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInvalidateScannerQueries } from "@/components/scanner/use-scanner-queries";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export function RescanButton() {
    const router = useRouter();
    const t = useT();
    const invalidateScanner = useInvalidateScannerQueries();
    const [isPending, startTransition] = useTransition();
    const [fetching, setFetching] = useState(false);
    const busy = isPending || fetching;

    async function rescan() {
        setFetching(true);
        // Promise.allSettled never rejects; a failed fetch just surfaces on the page after refresh.
        // The force=1 calls repopulate the 8s in-process cache so the follow-up reads are fresh.
        await Promise.allSettled([
            fetch("/api/skills?force=1", { cache: "no-store" }),
            fetch("/api/commands?force=1", { cache: "no-store" }),
            fetch("/api/hooks?force=1", { cache: "no-store" }),
            fetch("/api/activity?force=1", { cache: "no-store" }),
            fetch("/api/discover?force=1", { cache: "no-store" }),
        ]);
        // Pull fresh skills/commands into the TanStack-driven explorers.
        await invalidateScanner();
        setFetching(false);
        // Re-render server components (hooks/activity/discover pages, page metadata, etc.).
        startTransition(() => router.refresh());
    }

    return (
        <Button className={'rounded-sm'} variant="outline" size="sm" onClick={rescan} disabled={busy}>
            <RefreshCw className={cn(busy && "animate-spin")} />
            {busy ? t.actions.scanning : t.actions.rescan}
        </Button>
    );
}
