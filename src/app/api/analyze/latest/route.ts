// src/app/api/analyze/latest/route.ts
import { NextResponse } from "next/server";
import { getLatestAnalysisRun } from "@/lib/analysisStore";

export const runtime = "nodejs";

export async function GET() {
  const run = getLatestAnalysisRun();
  return NextResponse.json({ ok: true, run }, { status: 200 });
}
