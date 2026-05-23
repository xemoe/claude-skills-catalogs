// apps/web/app/api/presets/[id]/activate/stream/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPreset } from "@lector/presets/activate";
import { ApplyEventBus } from "@lector/presets/events";
import { getPreset } from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const Query = z.object({
    force: z.enum(["0", "1"]).optional(),
});

function parseId(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function sseChunk(payload: unknown): string {
    return `data: ${JSON.stringify(payload)}\n\n`;
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
        force: url.searchParams.get("force") ?? undefined,
    });
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }
    const preset = getPreset(id);
    if (!preset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (preset.archivedAt) {
        return NextResponse.json({ error: "archived_preset" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const bus = new ApplyEventBus();
            const unsubscribe = bus.on((event) => {
                controller.enqueue(encoder.encode(sseChunk(event)));
                if (event.phase === "done" || event.phase === "error") {
                    unsubscribe();
                    controller.close();
                }
            });
            // Run apply synchronously — better-sqlite3 + fs are sync. Wrap in
            // try so any thrown error becomes an error event.
            try {
                applyPreset(id, { force: parsed.data.force === "1" }, { bus });
            } catch (err) {
                bus.emit({
                    phase: "error",
                    message: err instanceof Error ? err.message : String(err),
                });
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-store",
            Connection: "keep-alive",
        },
    });
}
