import { NextRequest, NextResponse } from "next/server";
import { setAppSession, verifyAppPassword } from "@/lib/auth/app-auth";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const password = String(body.get("password") ?? "");
  if (!(await verifyAppPassword(password))) return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  await setAppSession({ type: "USER", id: "00000000-0000-4000-8000-000000000001", name: "Guilherme", scopes: ["leads.read", "leads.write"] });
  return NextResponse.redirect(new URL("/", request.url), 303);
}
