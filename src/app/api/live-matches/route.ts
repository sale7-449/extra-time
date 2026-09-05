import { NextResponse } from "next/server";
import { getLiveMatches } from "@/lib/services/matches.service";
import { safeResolve } from "@/lib/errors";

export async function GET() {
  const result = await safeResolve(getLiveMatches(), { matches: [], unavailable: true }, "api/live-matches");

  if (result.unavailable) {
    return NextResponse.json({ error: "تعذّر تحديث المباريات المباشرة الآن." }, { status: 502 });
  }

  return NextResponse.json({ matches: result.matches, fetchedAt: new Date().toISOString() });
}
