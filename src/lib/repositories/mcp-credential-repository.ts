import type { McpCredential, ResolvedMcpCredential } from "@/lib/auth/mcp-types";

export interface CreateMcpCredentialInput {
  userId: string;
  name: string;
  tokenHash: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt?: string | null;
}

export interface McpCredentialRepository {
  listForUser(userId: string): Promise<McpCredential[]>;
  create(input: CreateMcpCredentialInput): Promise<McpCredential>;
  findActiveByTokenHash(tokenHash: string): Promise<ResolvedMcpCredential | null>;
  revoke(credentialId: string, userId: string): Promise<McpCredential | null>;
  revokeAllForUser(userId: string): Promise<number>;
  touchLastUsed(credentialId: string): Promise<void>;
}
