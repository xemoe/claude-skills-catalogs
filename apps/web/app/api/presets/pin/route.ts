// apps/web/app/api/presets/pin/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { addPin, listPinned } from "@lector/presets/pinned";

export const dynamic = "force-dynamic";

const ListQuery = z.object({
    status: z.enum(["active", "archived", "all"]).optional(),
});

const PinBody = z.object({
    kind: z.enum(["skill", "command"]),
    identifier: z.string().min(1).max(256),
    reason: z.string().max(200).nullable().optional(),
});

export async function GET(request: Request) {
    const url = new URL(request.url);
    const parsed = ListQuery.safeParse({
        status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid_query" }, { status: 400 });
    }
    const pinned = listPinned({ status: parsed.data.status });
    return NextResponse.json({ pinned });
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);
    const parsed = PinBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "invalid_body", detail: parsed.error.format() }, { status: 400 });
    }
    try {
        const item = addPin(parsed.data.kind, parsed.data.identifier, parsed.data.reason ?? null);
        return NextResponse.json({ item }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
