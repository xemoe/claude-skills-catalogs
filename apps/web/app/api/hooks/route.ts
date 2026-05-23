import { type NextRequest, NextResponse } from "next/server";
import { scanHooks } from "@lector/core/hook-scanner";

export const dynamic = "force-dynamic";

/** GET /api/hooks — returns the full hook scan result as JSON. Pass ?force=1 to bypass the cache. */
export function GET(request: NextRequest) {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const result = scanHooks({ force });
    return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
    });
}
