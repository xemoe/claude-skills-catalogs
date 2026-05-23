import { NextResponse } from "next/server";
import { archivePin } from "@lector/presets/pinned";

export const dynamic = "force-dynamic";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ kind: string; id: string }> },
) {
    const { kind, id } = await params;
    if (kind !== "skill" && kind !== "command") {
        return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }
    try {
        archivePin(kind, decodeURIComponent(id));
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json(
            { error: "internal", message: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
