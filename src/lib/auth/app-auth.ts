import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import { humanScopesForRole } from "@/lib/auth/scopes";
import type { AuthenticatedUser } from "./types";
import { resolveSessionToken, signOutToken } from "@/lib/services/auth";

export const APP_SESSION_COOKIE = "agencyos_session";

function authDisabled() {
  const disabled = process.env.APP_AUTH_DISABLED !== "false";
  if (disabled && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") throw new DomainError("APP_AUTH_DISABLED cannot be enabled in production", "INSECURE_AUTH_CONFIGURATION", 500);
  return disabled;
}

function demoUser(): AuthenticatedUser {
  return { id: "00000000-0000-4000-8000-000000000001", name: "Guilherme", email: "guilherme@agency.local", role: "ADMIN", active: true, sessionId: null };
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  if (authDisabled()) return demoUser();
  const store = await cookies();
  const token = store.get(APP_SESSION_COOKIE)?.value;
  return token ? resolveSessionToken(token) : null;
}

export async function requireCurrentUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminUser(): Promise<AuthenticatedUser> {
  const user = await requireCurrentUser();
  if (user.role !== "ADMIN") redirect("/settings/profile?forbidden=1");
  return user;
}

export async function requireAppActor(): Promise<ActorContext> {
  const user = await requireCurrentUser();
  return { type: "USER", id: user.id, name: user.name, role: user.role, scopes: humanScopesForRole(user.role) };
}

export async function setAppSessionToken(token: string, expiresAt: string) {
  const store = await cookies();
  store.set(APP_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt),
    path: "/",
  });
}

export async function clearAppSession() {
  const store = await cookies();
  const token = store.get(APP_SESSION_COOKIE)?.value;
  await signOutToken(token);
  store.delete(APP_SESSION_COOKIE);
}
