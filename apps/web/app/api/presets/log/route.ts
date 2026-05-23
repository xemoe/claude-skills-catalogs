// apps/web/app/api/presets/log/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApplyLogItems, listApplyLog } from "@lector/presets/log";

export const dynamic = "force-dynamic";

const Query = z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    presetId: z.coerce.number().int().min(1).optional(),
    logId: z.coerce.number().int().min(1).optional(),
});

export async function GET(request: Request) {
    const url = new URL(request.url);
    const parsed = Query.safeParse({
        limit: url.searchParams.get("limit") ?? undefined,
        offset: url.searchParams.get("offset") ?? undefined,
        presetId: url.searchParams.get("presetId") ?? undefined,
        logId: url.searchParams.get("logId") ?? undefined,
    });
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid_query", detail: parsed.error.format() }, { status: 400 });
    }
    if (parsed.data.logId) {
        const items = getApplyLogItems(parsed.data.logId);
        return NextResponse.json({ items });
    }
    const logs = listApplyLog({
        limit: parsed.data.limit,
        offset: parsed.data.offset,
        presetId: parsed.data.presetId,
    });
    return NextResponse.json({ logs });
}
