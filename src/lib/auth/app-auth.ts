import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActorContext } from "@/lib/domain/types";

const COOKIE_NAME = "agencyos_session";

function secret() {
  return process.env.SESSION_SECRET ?? "development-only-session-secret-change-me";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionValue(actor: ActorContext): string {
  const payload = Buffer.from(JSON.stringify({ ...actor, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function parseSession(value?: string): ActorContext | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ActorContext & { exp: number };
    if (!parsed.exp || parsed.exp < Date.now()) return null;
    return { type: parsed.type, id: parsed.id, name: parsed.name, scopes: parsed.scopes };
  } catch {
    return null;
  }
}

export async function getAppActor(): Promise<ActorContext | null> {
  if (process.env.APP_AUTH_DISABLED !== "false") {
    return { type: "USER", id: "00000000-0000-4000-8000-000000000001", name: "Guilherme", scopes: ["leads.read", "leads.write"] };
  }
  const store = await cookies();
  return parseSession(store.get(COOKIE_NAME)?.value);
}

export async function requireAppActor(): Promise<ActorContext> {
  const actor = await getAppActor();
  if (!actor) redirect("/login");
  return actor;
}

export async function verifyAppPassword(password: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setAppSession(actor: ActorContext) {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionValue(actor), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAppSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
