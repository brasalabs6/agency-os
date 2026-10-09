import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import type { ActorContext } from "@/lib/domain/types";
import { getAutomationRepository } from "@/lib/repositories";
import { createChannelConnection } from "@/lib/services/communications";
import { updateContractSignature } from "@/lib/services/sales-automation";
import { getAutomationBundle } from "@/lib/services/intelligence";
import { POST as signatureWebhook } from "@/app/api/integrations/signatures/status/route";

const actor: ActorContext = {
  type: "USER",
  id: "00000000-0000-4000-8000-000000000001",
  name: "Security reviewer",
  role: "ADMIN",
  scopes: ["approvals.approve"],
};

const original = {
  driver: process.env.DATA_DRIVER,
  flag: process.env.AI_COMMERCIAL_AUTOMATION_ENABLED,
  signature: process.env.SIGNATURE_WEBHOOK_TOKEN,
  environment: process.env.NODE_ENV,
};

afterEach(() => {
  for (const [key, value] of Object.entries({
    DATA_DRIVER: original.driver,
    AI_COMMERCIAL_AUTOMATION_ENABLED: original.flag,
    SIGNATURE_WEBHOOK_TOKEN: original.signature,
    NODE_ENV: original.environment,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("safe merge and rollout guards", () => {
  it("does not widen scopes of previously issued MCP credentials in migration 0008", () => {
    const sql = readFileSync("drizzle/0008_ai_commercial_automation.sql", "utf8");
    expect(sql).not.toMatch(/UPDATE\s+(?:public\.)?mcp_credentials\b/i);
    expect(sql).toContain("Existing per-user MCP credentials intentionally retain");
  });

  it("creates a disconnected read-only WhatsApp registration until gateway verified", async () => {
    process.env.DATA_DRIVER = "mock";
    const connection = await createChannelConnection({
      accountLabel: "Unverified " + randomUUID(),
      capabilities: ["READ", "SEND"],
    }, actor);
    expect(connection.status).toBe("DISCONNECTED");
    expect(connection.capabilities).toEqual(["READ"]);
  });

  it("rejects production signature domain transitions without a provider verifier", async () => {
    process.env.DATA_DRIVER = "mock";
    process.env.NODE_ENV = "production";
    await expect(updateContractSignature(randomUUID(), {
      status: "SIGNED",
      externalSignatureId: "unverified",
      signedArtifactRef: "user-provided-data",
    }, actor)).rejects.toMatchObject({
      code: "SIGNATURE_VERIFICATION_REQUIRED",
      status: 403,
    });
  });

  it("rejects even authenticated provider callbacks until a verifier exists", async () => {
    process.env.SIGNATURE_WEBHOOK_TOKEN = "test-callback-secret";
    const response = await signatureWebhook(new Request("https://example.test/api/integrations/signatures/status", {
      method: "POST",
      headers: {
        "authorization": "Bearer test-callback-secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contractId: randomUUID(), status: "SIGNED", externalSignatureId: "sig",
      }),
    }));
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error.code).toBe("SIGNATURE_PROVIDER_NOT_VERIFIED");
  });

  it("does not access new PostgreSQL tables when the feature is disabled", async () => {
    process.env.DATA_DRIVER = "postgres";
    delete process.env.AI_COMMERCIAL_AUTOMATION_ENABLED;
    expect(() => getAutomationRepository()).toThrowError(
      expect.objectContaining({ code: "AI_COMMERCIAL_AUTOMATION_DISABLED" }),
    );
    const bundle = await getAutomationBundle(randomUUID());
    expect(bundle.diagnostics).toEqual([]);
    expect(bundle.projects).toEqual([]);
  });
});
