import { randomBytes, randomUUID } from "node:crypto";
import { hashPasswordSync } from "@/lib/auth/password";
import type { AppUser, CreateUserInput, UpdateUserInput, UserSession } from "@/lib/auth/types";
import { DEMO_USERS } from "@/lib/mock/seed-data";
import type { AuthRepository, CreateSessionInput } from "./auth-repository";

const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

function defaultUsers(): AppUser[] {
  const createdAt = now();
  return DEMO_USERS.slice(0, 2).map((summary, index) => ({
    id: summary.id,
    name: summary.name,
    email: summary.email ?? `user${index + 1}@agency.local`,
    passwordHash: hashPasswordSync(index === 0 ? (process.env.DEV_ADMIN_PASSWORD ?? "admin-agencyos-2026") : (process.env.DEV_MEMBER_PASSWORD ?? "partner-agencyos-2026"), randomBytes(16)),
    role: index === 0 ? "ADMIN" : "MEMBER",
    active: true,
    lastLoginAt: null,
    createdAt,
    updatedAt: createdAt,
  }));
}

export class MockAuthRepository implements AuthRepository {
  private users = defaultUsers();
  private sessions: UserSession[] = [];

  private syncSummary(user: AppUser) {
    const summary = DEMO_USERS.find((item) => item.id === user.id);
    if (summary) Object.assign(summary, { name: user.name, email: user.email, role: user.role, active: user.active });
  }

  async findUserByEmail(email: string) { return clone(this.users.find((user) => user.email === email) ?? null); }
  async getUserById(id: string) { return clone(this.users.find((user) => user.id === id) ?? null); }
  async listUsers(includeInactive = false) { return clone(this.users.filter((user) => includeInactive || user.active)); }

  async createUser(input: CreateUserInput) {
    if (this.users.some((user) => user.email === input.email)) throw new Error("EMAIL_ALREADY_EXISTS");
    const stamp = now();
    const user: AppUser = { id: randomUUID(), ...input, active: input.active ?? true, lastLoginAt: null, createdAt: stamp, updatedAt: stamp };
    this.users.push(user);
    DEMO_USERS.push({ id: user.id, name: user.name, email: user.email, role: user.role, active: user.active });
    return clone(user);
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const index = this.users.findIndex((user) => user.id === id);
    if (index < 0) return null;
    if (input.email && this.users.some((user) => user.id !== id && user.email === input.email)) throw new Error("EMAIL_ALREADY_EXISTS");
    this.users[index] = { ...this.users[index], ...input, updatedAt: now() };
    this.syncSummary(this.users[index]);
    return clone(this.users[index]);
  }

  async countActiveAdmins() { return this.users.filter((user) => user.active && user.role === "ADMIN").length; }

  async createSession(input: CreateSessionInput) {
    const stamp = now();
    const session: UserSession = { id: randomUUID(), ...input, createdAt: stamp, lastSeenAt: stamp, revokedAt: null };
    this.sessions.push(session);
    return clone(session);
  }

  async getSessionByTokenHash(tokenHash: string) {
    const session = this.sessions.find((item) => item.tokenHash === tokenHash && !item.revokedAt);
    if (!session || new Date(session.expiresAt) <= new Date()) return null;
    const user = this.users.find((item) => item.id === session.userId);
    return user ? clone({ session, user }) : null;
  }

  async touchSession(id: string) {
    const session = this.sessions.find((item) => item.id === id);
    if (session) session.lastSeenAt = now();
  }

  async revokeSession(id: string) {
    const session = this.sessions.find((item) => item.id === id);
    if (session) session.revokedAt = now();
  }

  async revokeSessionsForUser(userId: string, exceptSessionId?: string) {
    for (const session of this.sessions) if (session.userId === userId && session.id !== exceptSessionId && !session.revokedAt) session.revokedAt = now();
  }
}

export const mockAuthRepository = new MockAuthRepository();
