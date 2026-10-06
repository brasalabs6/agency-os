import { describe, expect, it } from "vitest";
import { MockMcpCredentialRepository } from "@/lib/repositories/mock-mcp-credential-repository";
import { mockAuthRepository } from "@/lib/repositories/mock-auth-repository";

describe("MockMcpCredentialRepository", () => {
  it("isolates credentials by user and revokes one without affecting another", async () => {
    const repo = new MockMcpCredentialRepository();
    const users = await mockAuthRepository.listUsers();
    const [a, b] = users;

    const credentialA = await repo.create({ userId: a.id, name: "ChatGPT A", tokenHash: "a".repeat(64), tokenPrefix: "agmcp_A", scopes: ["leads.read", "leads.write"] });
    const credentialB = await repo.create({ userId: b.id, name: "ChatGPT B", tokenHash: "b".repeat(64), tokenPrefix: "agmcp_B", scopes: ["leads.read", "leads.write"] });

    expect((await repo.findActiveByTokenHash(credentialA.tokenHash))?.user.id).toBe(a.id);
    expect((await repo.findActiveByTokenHash(credentialB.tokenHash))?.user.id).toBe(b.id);

    await repo.revoke(credentialA.id, a.id);
    expect(await repo.findActiveByTokenHash(credentialA.tokenHash)).toBeNull();
    expect((await repo.findActiveByTokenHash(credentialB.tokenHash))?.user.id).toBe(b.id);
  });

  it("revokes all credentials for only the target user", async () => {
    const repo = new MockMcpCredentialRepository();
    const users = await mockAuthRepository.listUsers();
    const [a, b] = users;

    await repo.create({ userId: a.id, name: "A1", tokenHash: "c".repeat(64), tokenPrefix: "agmcp_C", scopes: ["leads.read"] });
    await repo.create({ userId: a.id, name: "A2", tokenHash: "d".repeat(64), tokenPrefix: "agmcp_D", scopes: ["leads.read"] });
    const other = await repo.create({ userId: b.id, name: "B1", tokenHash: "e".repeat(64), tokenPrefix: "agmcp_E", scopes: ["leads.read"] });

    expect(await repo.revokeAllForUser(a.id)).toBe(2);
    expect((await repo.listForUser(a.id)).every((item) => !item.active)).toBe(true);
    expect((await repo.findActiveByTokenHash(other.tokenHash))?.user.id).toBe(b.id);
  });
});
