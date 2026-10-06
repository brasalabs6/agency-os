import { NextRequest, NextResponse } from "next/server";
import { clearAppSession } from "@/lib/auth/app-auth";
export async function POST(request: NextRequest) {
  await clearAppSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
