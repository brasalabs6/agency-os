import { describe, expect, it } from "vitest";
import { MockAutomationRepository } from "@/lib/repositories/mock-automation-repository";

describe("mock automation repository", () => {
  it("enforces optimistic version checks on approvals", async () => {
    const repo = new MockAutomationRepository();
    const approval = await repo.createApproval({
      leadId: null,
      actionType: "OTHER",
      payload: { value: 1 },
      payloadHash: "hash",
      preview: "preview",
      rationale: null,
      policyChecks: [],
      status: "PENDING",
      createdByType: "AGENT",
      createdById: "agent",
      approvedByUserId: null,
      approvedAt: null,
      rejectedByUserId: null,
      rejectedAt: null,
      executedAt: null,
      executionResult: {},
      expiresAt: null,
      version: 1,
    });
    const first = await repo.updateApproval(approval.id, 1, { status: "APPROVED" });
    expect(first?.version).toBe(2);
    const stale = await repo.updateApproval(approval.id, 1, { status: "REJECTED" });
    expect(stale).toBeNull();
  });

  it("enforces optimistic version on contract obligations", async () => {
    const repo = new MockAutomationRepository();
    const projectId = "00000000-0000-4000-8000-000000000015";
    const contractId = "00000000-0000-4000-8000-000000000016";
    const item = await repo.createObligation({
      projectId,
      sourceContractId: contractId,
      sourceKey: "deliverable:0",
      party: "AGENCY",
      kind: "DELIVERABLE",
      title: "Site",
      status: "TODO",
      description: null,
      dueAt: null,
      metadata: {},
    });
    expect(item.version).toBe(1);
    const updated = await repo.updateObligation(item.id, item.version, { status: "DOING" });
    expect(updated).toMatchObject({ version: 2, status: "DOING" });
    expect(await repo.updateObligation(item.id, item.version, { status: "DONE" })).toBeNull();
    expect((await repo.listObligations(projectId))[0].status).toBe("DOING");
  });

  it("looks up AI runs by idempotency key", async () => {
    const repo = new MockAutomationRepository();
    const run = await repo.createAiRun({
      skill: "lead-scoring",
      skillVersion: "1",
      leadId: null,
      status: "RUNNING",
      actorType: "AGENT",
      actorId: "agent",
      idempotencyKey: "lead-scoring:test",
      inputSummary: {},
      outputSummary: {},
      errorCode: null,
      errorMessage: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
    });
    expect((await repo.findAiRunByIdempotencyKey("lead-scoring:test"))?.id).toBe(run.id);
  });
});
