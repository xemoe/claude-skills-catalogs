import { type NextRequest, NextResponse } from "next/server";
import { scanCommands } from "@/lib/command-scanner";

export const dynamic = "force-dynamic";

/** GET /api/commands — returns the full command scan result as JSON. Pass ?force=1 to bypass the cache. */
export function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("force") === "1";
  const result = scanCommands({ force });
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
