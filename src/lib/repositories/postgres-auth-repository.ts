import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { userSessions, users } from "@/lib/db/schema";
import type { AppUser, CreateUserInput, UpdateUserInput, UserSession } from "@/lib/auth/types";
import type { AuthRepository, CreateSessionInput } from "./auth-repository";

const iso = (value: Date | null | undefined) => value ? value.toISOString() : null;

function mapUser(row: typeof users.$inferSelect): AppUser {
  return {
    id: row.id, name: row.name, email: row.email, passwordHash: row.passwordHash, role: row.role,
    active: row.active, lastLoginAt: iso(row.lastLoginAt), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSession(row: typeof userSessions.$inferSelect): UserSession {
  return {
    id: row.id, userId: row.userId, tokenHash: row.tokenHash, expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(), lastSeenAt: row.lastSeenAt.toISOString(), revokedAt: iso(row.revokedAt),
  };
}

export class PostgresAuthRepository implements AuthRepository {
  async findUserByEmail(email: string) {
    const rows = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async getUserById(id: string) {
    const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async listUsers(includeInactive = false) {
    const rows = includeInactive
      ? await getDb().select().from(users)
      : await getDb().select().from(users).where(eq(users.active, true));
    return rows.map(mapUser);
  }

  async createUser(input: CreateUserInput) {
    const rows = await getDb().insert(users).values({
      name: input.name, email: input.email, passwordHash: input.passwordHash, role: input.role, active: input.active ?? true,
    }).returning();
    return mapUser(rows[0]);
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const patch: Partial<typeof users.$inferInsert> = {
      name: input.name, email: input.email, passwordHash: input.passwordHash, role: input.role, active: input.active,
      lastLoginAt: input.lastLoginAt === undefined ? undefined : input.lastLoginAt ? new Date(input.lastLoginAt) : null,
      updatedAt: new Date(),
    };
    const rows = await getDb().update(users).set(patch).where(eq(users.id, id)).returning();
    return rows[0] ? mapUser(rows[0]) : null;
  }

  async countActiveAdmins() {
    const rows = await getDb().select({ count: sql<number>`count(*)::int` }).from(users).where(and(eq(users.active, true), eq(users.role, "ADMIN")));
    return rows[0]?.count ?? 0;
  }

  async createSession(input: CreateSessionInput) {
    const rows = await getDb().insert(userSessions).values({
      userId: input.userId, tokenHash: input.tokenHash, expiresAt: new Date(input.expiresAt),
    }).returning();
    return mapSession(rows[0]);
  }

  async getSessionByTokenHash(tokenHash: string) {
    const rows = await getDb().select({ session: userSessions, user: users }).from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(and(eq(userSessions.tokenHash, tokenHash), isNull(userSessions.revokedAt)))
      .limit(1);
    const row = rows[0];
    if (!row || row.session.expiresAt <= new Date()) return null;
    return { session: mapSession(row.session), user: mapUser(row.user) };
  }

  async touchSession(id: string) { await getDb().update(userSessions).set({ lastSeenAt: new Date() }).where(eq(userSessions.id, id)); }
  async revokeSession(id: string) { await getDb().update(userSessions).set({ revokedAt: new Date() }).where(and(eq(userSessions.id, id), isNull(userSessions.revokedAt))); }

  async revokeSessionsForUser(userId: string, exceptSessionId?: string) {
    const where = exceptSessionId
      ? and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt), ne(userSessions.id, exceptSessionId))
      : and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt));
    await getDb().update(userSessions).set({ revokedAt: new Date() }).where(where);
  }
}

export const postgresAuthRepository = new PostgresAuthRepository();
