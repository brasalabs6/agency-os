import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const dataDriver = process.env.DATA_DRIVER ?? "mock";

  if (dataDriver === "postgres") {
    try {
      await getDb().execute(sql`select 1 as ok`);
    } catch (error) {
      console.error("Database health check failed", error);
      return NextResponse.json(
        { ok: false, service: "agencyos-leads", dataDriver, database: "error", timestamp: new Date().toISOString() },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    service: "agencyos-leads",
    dataDriver,
    database: dataDriver === "postgres" ? "ok" : "not_applicable",
    timestamp: new Date().toISOString(),
  });
}
