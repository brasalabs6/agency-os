import { NextResponse } from "next/server";
import { asDomainError, DomainError } from "@/lib/domain/errors";
import { getAppActor } from "@/lib/auth/app-auth";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export function errorResponse(error: unknown) {
  const err = asDomainError(error);
  return NextResponse.json({ error: { code: err.code, message: err.message, details: err.details } }, { status: err.status });
}

export async function apiActor() {
  const actor = await getAppActor();
  if (!actor) throw new DomainError("Authentication required", "UNAUTHORIZED", 401);
  return actor;
}
