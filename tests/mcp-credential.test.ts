import { describe, expect, it } from "vitest";
import { generateMcpCredentialSecret, hashMcpCredentialSecret, looksLikeMcpCredentialSecret, mcpCredentialPrefix } from "@/lib/auth/mcp-credential";

describe("MCP credential secrets", () => {
  it("generates a prefixed high-entropy secret and stores only a hash", () => {
    const secret = generateMcpCredentialSecret();
    const hash = hashMcpCredentialSecret(secret);
    expect(secret.startsWith("agmcp_")).toBe(true);
    expect(secret.length).toBeGreaterThan(45);
    expect(looksLikeMcpCredentialSecret(secret)).toBe(true);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(secret);
    expect(mcpCredentialPrefix(secret)).toBe(secret.slice(0, 14));
  });

  it("rejects obviously invalid secret shapes", () => {
    expect(looksLikeMcpCredentialSecret("short")).toBe(false);
    expect(looksLikeMcpCredentialSecret("agmcp_short")).toBe(false);
  });
});
