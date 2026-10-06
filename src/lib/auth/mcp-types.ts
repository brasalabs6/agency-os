import type { AppUser } from "@/lib/auth/types";

export interface McpCredential {
  id: string;
  userId: string;
  name: string;
  tokenHash: string;
  tokenPrefix: string;
  scopes: string[];
  active: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
  expiresAt?: string | null;
}

export type PublicMcpCredential = Omit<McpCredential, "tokenHash">;

export interface ResolvedMcpCredential {
  credential: McpCredential;
  user: AppUser;
}
