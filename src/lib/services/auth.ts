import { createHash, randomBytes } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AppUser, AuthenticatedUser, PublicUser } from "@/lib/auth/types";
import type { ActorContext } from "@/lib/domain/types";
import { getAuthRepository, getLeadRepository } from "@/lib/repositories";

const attempts = new Map<string, { count: number; resetAt: number }>();
const SYSTEM_ACTOR: ActorContext = { type: "SYSTEM", id: "auth", name: "Authentication" };

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const sessionTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const publicUser = (user: AppUser): PublicUser => ({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, lastLoginAt: user.lastLoginAt ?? null });

async function authAudit(actor: ActorContext, action: string, input: Record<string, unknown> = {}, result: Record<string, unknown> = {}) {
  await getLeadRepository().addAudit({ actor, action, input, result });
}

function rateLimitKeys(email: string, ip?: string | null) { return [`email:${normalizeEmail(email)}`, `ip:${ip ?? "unknown"}`]; }
function assertRateLimit(keys: string[]) {
  const now = Date.now();
  for (const key of keys) {
    const item = attempts.get(key);
    if (!item || item.resetAt <= now) { attempts.set(key, { count: 0, resetAt: now + 15 * 60_000 }); continue; }
    if (item.count >= 8) throw new DomainError("Too many login attempts. Try again later.", "AUTH_RATE_LIMITED", 429);
  }
}
function noteFailure(keys: string[]) {
  const now = Date.now();
  for (const key of keys) {
    const item = attempts.get(key);
    if (!item || item.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    else item.count += 1;
  }
}

export async function signIn(emailRaw: string, password: string, ip?: string | null) {
  const email = normalizeEmail(emailRaw); const keys = rateLimitKeys(email, ip); assertRateLimit(keys);
  const user = await getAuthRepository().findUserByEmail(email);
  const valid = Boolean(user?.active && await verifyPassword(password, user.passwordHash));
  if (!valid || !user) {
    noteFailure(keys);
    await authAudit(SYSTEM_ACTOR, "AUTH_LOGIN_FAILURE", { email });
    throw new DomainError("Invalid email or password", "INVALID_CREDENTIALS", 401);
  }
  for (const key of keys) attempts.delete(key);
  const token = randomBytes(32).toString("base64url");
  const configuredTtl = Number(process.env.SESSION_TTL_DAYS ?? 30);
  const ttlDays = Number.isFinite(configuredTtl) ? Math.max(1, Math.min(90, configuredTtl)) : 30;
  const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();
  const session = await getAuthRepository().createSession({ userId: user.id, tokenHash: sessionTokenHash(token), expiresAt });
  const updated = await getAuthRepository().updateUser(user.id, { lastLoginAt: new Date().toISOString() }) ?? user;
  await authAudit({ type: "USER", id: user.id, name: user.name }, "AUTH_LOGIN_SUCCESS", {}, { sessionId: session.id });
  return { token, expiresAt, user: publicUser(updated), sessionId: session.id };
}

export async function resolveSessionToken(token: string): Promise<AuthenticatedUser | null> {
  const result = await getAuthRepository().getSessionByTokenHash(sessionTokenHash(token));
  if (!result) return null;
  if (!result.user.active) { await getAuthRepository().revokeSession(result.session.id); return null; }
  void getAuthRepository().touchSession(result.session.id);
  return { ...publicUser(result.user), sessionId: result.session.id };
}

export async function signOutToken(token?: string | null) {
  if (!token) return;
  const result = await getAuthRepository().getSessionByTokenHash(sessionTokenHash(token));
  if (!result) return;
  await getAuthRepository().revokeSession(result.session.id);
  await authAudit({ type: "USER", id: result.user.id, name: result.user.name }, "AUTH_LOGOUT", {}, { sessionId: result.session.id });
}

export async function changeOwnPassword(user: AuthenticatedUser, currentPassword: string, newPassword: string) {
  const stored = await getAuthRepository().getUserById(user.id);
  if (!stored || !stored.active) throw new DomainError("Authentication required", "AUTH_REQUIRED", 401);
  if (!(await verifyPassword(currentPassword, stored.passwordHash))) throw new DomainError("Current password is invalid", "INVALID_CURRENT_PASSWORD", 422);
  const passwordHash = await hashPassword(newPassword);
  await getAuthRepository().updateUser(user.id, { passwordHash });
  await getAuthRepository().revokeSessionsForUser(user.id, user.sessionId ?? undefined);
  await authAudit({ type: "USER", id: user.id, name: user.name }, "AUTH_PASSWORD_CHANGED");
}

export async function bootstrapAdmin(name: string, emailRaw: string, password: string) {
  const email = normalizeEmail(emailRaw); const passwordHash = await hashPassword(password);
  const existing = await getAuthRepository().findUserByEmail(email);
  const user = existing
    ? await getAuthRepository().updateUser(existing.id, { name: name.trim(), passwordHash, role: "ADMIN", active: true })
    : await getAuthRepository().createUser({ name: name.trim(), email, passwordHash, role: "ADMIN", active: true });
  if (!user) throw new DomainError("Could not create admin", "USER_NOT_FOUND", 500);
  await authAudit(SYSTEM_ACTOR, "USER_BOOTSTRAP_ADMIN", { email }, { userId: user.id });
  return publicUser(user);
}

export async function updateOwnProfile(user: AuthenticatedUser, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError("Name is required", "INVALID_USER_NAME", 422);
  const updated = await getAuthRepository().updateUser(user.id, { name: trimmed });
  if (!updated) throw new DomainError("User not found", "USER_NOT_FOUND", 404);
  await authAudit({ type: "USER", id: user.id, name: user.name }, "USER_PROFILE_UPDATED", { name: trimmed });
  return publicUser(updated);
}
