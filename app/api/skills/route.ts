import { type NextRequest, NextResponse } from "next/server";
import { scanSkills } from "@/lib/scanner";

export const dynamic = "force-dynamic";

/** GET /api/skills — returns the full scan result as JSON. Pass ?force=1 to bypass the cache. */
export function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "1";
  const result = scanSkills({ force });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
