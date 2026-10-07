import { DomainError } from "@/lib/domain/errors";
import type { AuthenticatedUser } from "@/lib/auth/types";
import type { ActorContext } from "@/lib/domain/types";
import type { McpCredential, PublicMcpCredential } from "@/lib/auth/mcp-types";
import { generateMcpCredentialSecret, hashMcpCredentialSecret, looksLikeMcpCredentialSecret, mcpCredentialPrefix } from "@/lib/auth/mcp-credential";
import { getLeadRepository, getMcpCredentialRepository } from "@/lib/repositories";
import { AGENT_SCOPES } from "@/lib/auth/scopes";

const DEFAULT_SCOPES = AGENT_SCOPES;

function publicCredential(credential: McpCredential): PublicMcpCredential {
  const { tokenHash: _tokenHash, ...safe } = credential;
  return safe;
}

function userActor(user: AuthenticatedUser): ActorContext {
  return { type: "USER", id: user.id, name: user.name, role: user.role };
}

async function audit(user: AuthenticatedUser, action: string, input: Record<string, unknown>, result: Record<string, unknown> = {}) {
  await getLeadRepository().addAudit({ actor: userActor(user), action, input, result });
}

export async function listOwnMcpCredentials(user: AuthenticatedUser) {
  return (await getMcpCredentialRepository().listForUser(user.id)).map(publicCredential);
}

export async function createOwnMcpCredential(user: AuthenticatedUser, input: { name: string }) {
  const name = input.name.trim();
  if (!name) throw new DomainError("Credential name is required", "MCP_CREDENTIAL_NAME_REQUIRED", 422);
  if (name.length > 120) throw new DomainError("Credential name is too long", "MCP_CREDENTIAL_NAME_TOO_LONG", 422);

  const secret = generateMcpCredentialSecret();
  const credential = await getMcpCredentialRepository().create({
    userId: user.id,
    name,
    tokenHash: hashMcpCredentialSecret(secret),
    tokenPrefix: mcpCredentialPrefix(secret),
    scopes: [...DEFAULT_SCOPES],
  });

  await audit(user, "MCP_CREDENTIAL_CREATED", { name, scopes: credential.scopes }, {
    credentialId: credential.id,
    tokenPrefix: credential.tokenPrefix,
  });

  return { credential: publicCredential(credential), secret };
}

export async function revokeOwnMcpCredential(user: AuthenticatedUser, credentialId: string) {
  const credential = await getMcpCredentialRepository().revoke(credentialId, user.id);
  if (!credential) throw new DomainError("MCP credential not found", "MCP_CREDENTIAL_NOT_FOUND", 404);

  await audit(user, "MCP_CREDENTIAL_REVOKED", { credentialId }, { tokenPrefix: credential.tokenPrefix });
  return publicCredential(credential);
}

export async function revokeAllMcpCredentialsForUser(userId: string) {
  return getMcpCredentialRepository().revokeAllForUser(userId);
}

export async function resolveMcpCredentialSecret(secret: string) {
  if (!looksLikeMcpCredentialSecret(secret)) throw new DomainError("Invalid MCP credential", "MCP_CREDENTIAL_INVALID", 403);

  const resolved = await getMcpCredentialRepository().findActiveByTokenHash(hashMcpCredentialSecret(secret));
  if (!resolved || !resolved.user.active) throw new DomainError("Invalid MCP credential", "MCP_CREDENTIAL_INVALID", 403);

  if (resolved.credential.expiresAt && new Date(resolved.credential.expiresAt) <= new Date()) {
    throw new DomainError("Invalid MCP credential", "MCP_CREDENTIAL_INVALID", 403);
  }

  await getMcpCredentialRepository().touchLastUsed(resolved.credential.id);
  return resolved;
}
