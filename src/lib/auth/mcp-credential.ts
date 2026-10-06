import { createHash, randomBytes } from "node:crypto";

export const MCP_CREDENTIAL_PREFIX = "agmcp_";

export function generateMcpCredentialSecret() {
  return MCP_CREDENTIAL_PREFIX + randomBytes(32).toString("base64url");
}

export function hashMcpCredentialSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function mcpCredentialPrefix(secret: string) {
  return secret.slice(0, MCP_CREDENTIAL_PREFIX.length + 8);
}

export function looksLikeMcpCredentialSecret(secret: string) {
  return secret.startsWith(MCP_CREDENTIAL_PREFIX) && secret.length >= MCP_CREDENTIAL_PREFIX.length + 40;
}
