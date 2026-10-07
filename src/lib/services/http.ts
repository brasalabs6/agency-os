import { NextResponse } from "next/server";
import { asDomainError, DomainError } from "@/lib/domain/errors";
import { getCurrentUser } from "@/lib/auth/app-auth";
import type { ActorContext } from "@/lib/domain/types";
import { HUMAN_APP_SCOPES } from "@/lib/auth/scopes";

export function ok(data: unknown, init?: ResponseInit) { return NextResponse.json(data, { status: 200, ...init }); }
export function created(data: unknown) { return NextResponse.json(data, { status: 201 }); }
export function errorResponse(error: unknown) {
  const err = asDomainError(error);
  return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status });
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(request.url);
  if (new URL(origin).host !== requestUrl.host) throw new DomainError("Invalid request origin", "CSRF_ORIGIN_MISMATCH", 403);
}

export async function apiUser() {
  const user = await getCurrentUser();
  if (!user) throw new DomainError("Authentication required", "AUTH_REQUIRED", 401);
  return user;
}

export async function apiActor(): Promise<ActorContext> {
  const user = await apiUser();
  return { type: "USER", id: user.id, name: user.name, role: user.role, scopes: [...HUMAN_APP_SCOPES] };
}
