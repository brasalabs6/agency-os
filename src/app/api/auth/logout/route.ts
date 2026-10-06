import { NextRequest, NextResponse } from "next/server";
import { clearAppSession } from "@/lib/auth/app-auth";
import { assertSameOrigin } from "@/lib/services/http";
export async function POST(request: NextRequest) {
  assertSameOrigin(request);
  await clearAppSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
