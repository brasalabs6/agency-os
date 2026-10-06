import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mcpCredentials, users } from "@/lib/db/schema";
import type { AppUser } from "@/lib/auth/types";
import type { McpCredential } from "@/lib/auth/mcp-types";
import type { CreateMcpCredentialInput, McpCredentialRepository } from "./mcp-credential-repository";

const iso = (value: Date | null | undefined) => value ? value.toISOString() : null;

function mapCredential(row: typeof mcpCredentials.$inferSelect): McpCredential {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    tokenHash: row.tokenHash,
    tokenPrefix: row.tokenPrefix,
    scopes: row.scopes,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: iso(row.lastUsedAt),
    revokedAt: iso(row.revokedAt),
    expiresAt: iso(row.expiresAt),
  };
}

function mapUser(row: typeof users.$inferSelect): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    active: row.active,
    lastLoginAt: iso(row.lastLoginAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PostgresMcpCredentialRepository implements McpCredentialRepository {
  async listForUser(userId: string) {
    const rows = await getDb().select().from(mcpCredentials)
      .where(eq(mcpCredentials.userId, userId))
      .orderBy(desc(mcpCredentials.createdAt));
    return rows.map(mapCredential);
  }

  async create(input: CreateMcpCredentialInput) {
    const rows = await getDb().insert(mcpCredentials).values({
      userId: input.userId,
      name: input.name,
      tokenHash: input.tokenHash,
      tokenPrefix: input.tokenPrefix,
      scopes: input.scopes,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    }).returning();
    return mapCredential(rows[0]);
  }

  async findActiveByTokenHash(tokenHash: string) {
    const rows = await getDb()
      .select({ credential: mcpCredentials, user: users })
      .from(mcpCredentials)
      .innerJoin(users, eq(mcpCredentials.userId, users.id))
      .where(and(
        eq(mcpCredentials.tokenHash, tokenHash),
        eq(mcpCredentials.active, true),
        isNull(mcpCredentials.revokedAt),
        or(isNull(mcpCredentials.expiresAt), gt(mcpCredentials.expiresAt, new Date())),
      ))
      .limit(1);
    const row = rows[0];
    return row ? { credential: mapCredential(row.credential), user: mapUser(row.user) } : null;
  }

  async revoke(credentialId: string, userId: string) {
    const rows = await getDb().update(mcpCredentials)
      .set({ active: false, revokedAt: new Date() })
      .where(and(eq(mcpCredentials.id, credentialId), eq(mcpCredentials.userId, userId)))
      .returning();
    return rows[0] ? mapCredential(rows[0]) : null;
  }

  async revokeAllForUser(userId: string) {
    const rows = await getDb().update(mcpCredentials)
      .set({ active: false, revokedAt: new Date() })
      .where(and(eq(mcpCredentials.userId, userId), eq(mcpCredentials.active, true)))
      .returning({ id: mcpCredentials.id });
    return rows.length;
  }

  async touchLastUsed(credentialId: string) {
    await getDb().update(mcpCredentials)
      .set({ lastUsedAt: new Date() })
      .where(eq(mcpCredentials.id, credentialId));
  }
}

export const postgresMcpCredentialRepository = new PostgresMcpCredentialRepository();
