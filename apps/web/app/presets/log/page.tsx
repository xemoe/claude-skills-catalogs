// apps/web/app/presets/log/page.tsx
import { ApplyLogTable } from "@/components/presets/apply-log-table";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PresetLogPage() {
    const { t } = await getServerI18n();
    return (
        <div className="space-y-6 px-5 py-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t.presetsPage.log.title}</h1>
            </div>
            <ApplyLogTable />
        </div>
    );
}
