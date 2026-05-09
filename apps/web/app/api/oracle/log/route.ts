import { NextRequest, NextResponse } from "next/server";
import { getOracleLog } from "@/lib/oracle-log";

export async function GET(req: NextRequest) {
  const limit = Math.min(
    100,
    parseInt(req.nextUrl.searchParams.get("limit") ?? "50")
  );
  const events = await getOracleLog(limit);
  return NextResponse.json(events, {
    headers: { "Cache-Control": "no-store" },
  });
}
