// apps/web/app/api/presets/[id]/activate/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPreset } from "@lector/presets/activate";
import { getPreset } from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const Query = z.object({
    dryRun: z.enum(["0", "1"]).optional(),
    force: z.enum(["0", "1"]).optional(),
});

function parseId(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const url = new URL(request.url);
    const parsed = Query.safeParse({
        dryRun: url.searchParams.get("dryRun") ?? undefined,
        force: url.searchParams.get("force") ?? undefined,
    });
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid_query", detail: parsed.error.format() }, { status: 400 });
    }
    const preset = getPreset(id);
    if (!preset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (preset.archivedAt) {
        return NextResponse.json({ error: "archived_preset" }, { status: 400 });
    }
    try {
        const result = applyPreset(id, {
            dryRun: parsed.data.dryRun === "1",
            force: parsed.data.force === "1",
        });
        return NextResponse.json({ result });
    } catch (err) {
        return NextResponse.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
