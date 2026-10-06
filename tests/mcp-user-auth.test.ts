import { afterEach, describe, expect, it } from "vitest";
import { authorizeMcpRequest } from "@/lib/auth/mcp-auth";
import { generateMcpCredentialSecret, hashMcpCredentialSecret, mcpCredentialPrefix } from "@/lib/auth/mcp-credential";
import { mockAuthRepository } from "@/lib/repositories/mock-auth-repository";
import { mockMcpCredentialRepository } from "@/lib/repositories/mock-mcp-credential-repository";

const previousDriver = process.env.DATA_DRIVER;
const previousMode = process.env.MCP_AUTH_MODE;

afterEach(() => {
  if (previousDriver === undefined) delete process.env.DATA_DRIVER;
  else process.env.DATA_DRIVER = previousDriver;
  if (previousMode === undefined) delete process.env.MCP_AUTH_MODE;
  else process.env.MCP_AUTH_MODE = previousMode;
});

describe("per-user MCP query authentication", () => {
  it("resolves a credential to an AGENT linked to its AgencyOS user", async () => {
    process.env.DATA_DRIVER = "mock";
    process.env.MCP_AUTH_MODE = "user_query_token";

    const user = (await mockAuthRepository.listUsers())[0];
    const secret = generateMcpCredentialSecret();
    const credential = await mockMcpCredentialRepository.create({
      userId: user.id,
      name: "ChatGPT Personal",
      tokenHash: hashMcpCredentialSecret(secret),
      tokenPrefix: mcpCredentialPrefix(secret),
      scopes: ["leads.read", "leads.write"],
    });

    const actor = await authorizeMcpRequest(new Request(`https://agency.example/mcp?key=${encodeURIComponent(secret)}`));

    expect(actor.type).toBe("AGENT");
    expect(actor.id).toBe(`mcp:${credential.id}`);
    expect(actor.principalUserId).toBe(user.id);
    expect(actor.credentialId).toBe(credential.id);
    expect(actor.name).toBe(`ChatGPT · ${user.name}`);

    await mockMcpCredentialRepository.revoke(credential.id, user.id);
    await expect(authorizeMcpRequest(new Request(`https://agency.example/mcp?key=${encodeURIComponent(secret)}`)))
      .rejects.toMatchObject({ code: "MCP_CREDENTIAL_INVALID", status: 403 });
  });

  it("does not let one user's revocation break another credential", async () => {
    process.env.DATA_DRIVER = "mock";
    process.env.MCP_AUTH_MODE = "user_query_token";

    const [userA, userB] = await mockAuthRepository.listUsers();
    const secretA = generateMcpCredentialSecret();
    const secretB = generateMcpCredentialSecret();

    const credentialA = await mockMcpCredentialRepository.create({
      userId: userA.id, name: "A", tokenHash: hashMcpCredentialSecret(secretA), tokenPrefix: mcpCredentialPrefix(secretA), scopes: ["leads.read"],
    });
    await mockMcpCredentialRepository.create({
      userId: userB.id, name: "B", tokenHash: hashMcpCredentialSecret(secretB), tokenPrefix: mcpCredentialPrefix(secretB), scopes: ["leads.read"],
    });

    await mockMcpCredentialRepository.revoke(credentialA.id, userA.id);

    const actorB = await authorizeMcpRequest(new Request(`https://agency.example/mcp?key=${encodeURIComponent(secretB)}`));
    expect(actorB.principalUserId).toBe(userB.id);
  });
});
