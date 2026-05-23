// apps/web/app/presets/page.tsx
import {
    HydrationBoundary,
    QueryClient,
    dehydrate,
} from "@tanstack/react-query";
import { getActiveState, listPresets } from "@lector/presets/presets";
import { listPinned } from "@lector/presets/pinned";
import { qk } from "@/components/presets/preset-query-keys";
import { PresetsExplorer } from "@/components/presets/presets-explorer";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PresetsPage() {
    const { t } = await getServerI18n();
    const queryClient = new QueryClient();

    // Prefetch what the explorer will read on first paint
    queryClient.setQueryData(qk.presets("active"), {
        presets: listPresets({ status: "active" }),
        active: getActiveState(),
    });
    queryClient.setQueryData(qk.presets("archived"), {
        presets: listPresets({ status: "archived" }),
        active: getActiveState(),
    });
    queryClient.setQueryData(qk.pinned("active"), {
        pinned: listPinned({ status: "active" }),
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {t.presetsPage.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t.presetsPage.subtitle}
                </p>
            </div>
            <HydrationBoundary state={dehydrate(queryClient)}>
                <PresetsExplorer />
            </HydrationBoundary>
        </div>
    );
}
