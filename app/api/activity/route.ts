import { type NextRequest, NextResponse } from "next/server";
import { buildAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** GET /api/activity — returns usage analytics as JSON. Pass ?force=1 to bypass the cache. */
export function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "1";
  const analytics = buildAnalytics({ force });
  return NextResponse.json(analytics, {
    headers: { "Cache-Control": "no-store" },
  });
}
