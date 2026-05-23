// apps/web/app/api/presets/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import {
    getPreset,
    listPresetItems,
    SlugCollisionError,
    updatePreset,
} from "@lector/presets/presets";

export const dynamic = "force-dynamic";

const UpdateBody = z.object({
    slug: z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9][a-z0-9-]*$/)
        .optional(),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    color: z.string().max(32).nullable().optional(),
});

function parseId(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const preset = getPreset(id);
    if (!preset) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const items = listPresetItems(id);
    return NextResponse.json({ preset, items });
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: idStr } = await params;
    const id = parseId(idStr);
    if (!id) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
    const body = await request.json().catch(() => null);
    const parsed = UpdateBody.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "invalid_body", detail: parsed.error.format() },
            { status: 400 },
        );
    }
    const current = getPreset(id);
    if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try {
        const preset = updatePreset(id, parsed.data);
        return NextResponse.json({ preset });
    } catch (err) {
        if (err instanceof SlugCollisionError) {
            return NextResponse.json({ error: "slug_collision" }, { status: 409 });
        }
        return NextResponse.json(
            {
                error: "internal",
                message: err instanceof Error ? err.message : String(err),
            },
            { status: 500 },
        );
    }
}
