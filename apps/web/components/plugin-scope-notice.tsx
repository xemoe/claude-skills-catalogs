"use client";

import { useEffect, useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { useT } from "@/lib/i18n/context";

type Props = {
    /** When set, banner shows "N plugin items hidden". When omitted, generic copy. */
    count?: number;
    /**
     * When set, the banner is dismissible and persists the dismissal in
     * localStorage under `skills-lector.dismissed.<dismissKey>`. Omit for
     * context-bound banners (picker, explorer filters) that should reappear
     * every time their context appears.
     */
    dismissKey?: string;
};

const VENDOR_INSTALL_CMD = "/vendor-install <name>";

export function PluginScopeNotice({ count, dismissKey }: Props) {
    const t = useT();
    const [dismissed, setDismissed] = useState(false);

    // Read persisted dismissal on mount. SSR renders the banner; the client
    // hides it on mount if it was previously dismissed. Small flicker is OK.
    useEffect(() => {
        if (!dismissKey) return;
        try {
            const v = window.localStorage.getItem(
                `skills-lector.dismissed.${dismissKey}`,
            );
            if (v === "1") setDismissed(true);
        } catch {
            /* storage blocked; render the banner */
        }
    }, [dismissKey]);

    if (dismissed) return null;

    const header =
        typeof count === "number"
            ? t.pluginScopeNotice.headerWithCount(count)
            : t.pluginScopeNotice.headerGeneric;

    function onDismiss() {
        if (!dismissKey) return;
        try {
            window.localStorage.setItem(
                `skills-lector.dismissed.${dismissKey}`,
                "1",
            );
        } catch {
            /* storage blocked */
        }
        setDismissed(true);
    }

    return (
        <div className="relative rounded-sm border border-amber-400  dark:border-amber-300 bg-amber-100/30 dark:bg-amber-400 p-3 text-sm text-black dark:text-black/90">
            {dismissKey ? (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute right-1 top-1"
                    onClick={onDismiss}
                    title={t.pluginScopeNotice.dismiss}
                >
                    <X />
                </Button>
            ) : null}
            <div className="flex items-start gap-2 pr-7">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground dark:text-black/90" />
                <div className="space-y-1">
                    <p className="font-medium">{header}</p>
                    <p className="text-muted-foreground dark:text-black/90">
                        {t.pluginScopeNotice.body}
                    </p>
                    <details className="mt-2 text-xs">
                        <summary className="cursor-pointer select-none text-muted-foreground dark:text-black/90 hover:text-foreground">
                            {t.pluginScopeNotice.showSteps}
                        </summary>
                        <div className="mt-2 space-y-2 border-l-2 pl-3">
                            <p>{t.pluginScopeNotice.stepsIntro}</p>
                            <div>
                                <p className="font-medium">
                                    {t.pluginScopeNotice.stepVendoredLabel}
                                </p>
                                <div className="mt-1 flex items-center gap-1">
                                    <code className="rounded-none bg-background px-1.5 py-0.5 font-mono">
                                        {VENDOR_INSTALL_CMD}
                                    </code>
                                    <CopyButton
                                        value={VENDOR_INSTALL_CMD}
                                        size="icon-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="font-medium">
                                    {t.pluginScopeNotice.stepPluginLabel}
                                </p>
                                <p className="mt-1 text-muted-foreground dark:text-black/90">
                                    {t.pluginScopeNotice.stepPluginBody}
                                </p>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>
    );
}
