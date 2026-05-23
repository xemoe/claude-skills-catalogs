// apps/web/app/presets/[id]/page.tsx
import { notFound } from "next/navigation";
import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { getPreset, listPresetItems } from "@lector/presets/presets";
import { PresetDetailClient } from "@/components/presets/preset-detail-client";
import { qk } from "@/components/presets/preset-query-keys";

export const dynamic = "force-dynamic";

export default async function PresetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return notFound();
    const preset = getPreset(id);
    if (!preset) return notFound();
    const items = listPresetItems(id);

    const qc = new QueryClient();
    qc.setQueryData(qk.preset(id), { preset, items });

    return (
        <div className="space-y-6 px-5 py-0">
            <HydrationBoundary state={dehydrate(qc)}>
                <PresetDetailClient presetId={id} />
            </HydrationBoundary>
        </div>
    );
}
