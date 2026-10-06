import { randomUUID } from "node:crypto";
import type { McpCredential, ResolvedMcpCredential } from "@/lib/auth/mcp-types";
import { mockAuthRepository } from "./mock-auth-repository";
import type { CreateMcpCredentialInput, McpCredentialRepository } from "./mcp-credential-repository";

const clone = <T>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();

export class MockMcpCredentialRepository implements McpCredentialRepository {
  private credentials: McpCredential[] = [];

  async listForUser(userId: string) {
    return clone(this.credentials.filter((item) => item.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async create(input: CreateMcpCredentialInput) {
    if (this.credentials.some((item) => item.tokenHash === input.tokenHash)) throw new Error("MCP_TOKEN_HASH_CONFLICT");
    const credential: McpCredential = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      tokenHash: input.tokenHash,
      tokenPrefix: input.tokenPrefix,
      scopes: [...input.scopes],
      active: true,
      createdAt: now(),
      lastUsedAt: null,
      revokedAt: null,
      expiresAt: input.expiresAt ?? null,
    };
    this.credentials.push(credential);
    return clone(credential);
  }

  async findActiveByTokenHash(tokenHash: string): Promise<ResolvedMcpCredential | null> {
    const credential = this.credentials.find((item) =>
      item.tokenHash === tokenHash &&
      item.active &&
      !item.revokedAt &&
      (!item.expiresAt || new Date(item.expiresAt) > new Date())
    );
    if (!credential) return null;
    const user = await mockAuthRepository.getUserById(credential.userId);
    return user ? clone({ credential, user }) : null;
  }

  async revoke(credentialId: string, userId: string) {
    const credential = this.credentials.find((item) => item.id === credentialId && item.userId === userId);
    if (!credential) return null;
    if (credential.active) {
      credential.active = false;
      credential.revokedAt = now();
    }
    return clone(credential);
  }

  async revokeAllForUser(userId: string) {
    let count = 0;
    for (const credential of this.credentials) {
      if (credential.userId === userId && credential.active) {
        credential.active = false;
        credential.revokedAt = now();
        count += 1;
      }
    }
    return count;
  }

  async touchLastUsed(credentialId: string) {
    const credential = this.credentials.find((item) => item.id === credentialId);
    if (credential) credential.lastUsedAt = now();
  }
}

export const mockMcpCredentialRepository = new MockMcpCredentialRepository();
