import { NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await getDashboardSummary();
    return NextResponse.json({ ok: true, durationMs: Date.now() - startedAt });
  } catch (error) {
    console.error("Dashboard health check failed", error);
    return NextResponse.json(
      { ok: false, durationMs: Date.now() - startedAt },
      { status: 503 },
    );
  }
}
