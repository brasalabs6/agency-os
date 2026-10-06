import { NextRequest, NextResponse } from "next/server";
import { setAppSessionToken } from "@/lib/auth/app-auth";
import { signIn } from "@/lib/services/auth";
import { assertSameOrigin } from "@/lib/services/http";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await request.formData();
    const email = String(body.get("email") ?? "");
    const password = String(body.get("password") ?? "");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const session = await signIn(email, password, ip);
    await setAppSessionToken(session.token, session.expiresAt);
    return NextResponse.redirect(new URL("/", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }
}
