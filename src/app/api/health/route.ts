import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "agencyos-leads", dataDriver: process.env.DATA_DRIVER ?? "mock", timestamp: new Date().toISOString() });
}
