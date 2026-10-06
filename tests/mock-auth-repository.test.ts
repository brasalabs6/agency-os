import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MockAuthRepository } from "@/lib/repositories/mock-auth-repository";

describe("MockAuthRepository", () => {
  it("creates, resolves and revokes a session", async () => {
    const repo = new MockAuthRepository();
    const users = await repo.listUsers();
    const user = users[0];
    const tokenHash = createHash("sha256").update("token").digest("hex");
    const session = await repo.createSession({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60_000).toISOString() });
    expect((await repo.getSessionByTokenHash(tokenHash))?.user.id).toBe(user.id);
    await repo.revokeSession(session.id);
    expect(await repo.getSessionByTokenHash(tokenHash)).toBeNull();
  });

  it("rejects expired sessions and counts active admins", async () => {
    const repo = new MockAuthRepository();
    const user = (await repo.listUsers())[0];
    await repo.createSession({ userId: user.id, tokenHash: "expired", expiresAt: new Date(Date.now() - 1_000).toISOString() });
    expect(await repo.getSessionByTokenHash("expired")).toBeNull();
    expect(await repo.countActiveAdmins()).toBeGreaterThanOrEqual(1);
  });
});
