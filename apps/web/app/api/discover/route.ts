import { type NextRequest, NextResponse } from "next/server";
import { readDiscoverManifest } from "@lector/core/discover";

export const dynamic = "force-dynamic";

/** GET /api/discover — returns the discover manifest as JSON. Pass ?force=1 to bypass the cache. */
export function GET(request: NextRequest) {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const result = readDiscoverManifest({ force });
    return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
    });
}
