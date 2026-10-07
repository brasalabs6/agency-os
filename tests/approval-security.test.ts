import { afterEach, describe, expect, it } from "vitest";
import type { ActorContext } from "@/lib/domain/types";
import {
  approveRequest,
  createApprovalRequest,
  executeApprovedWhatsapp,
} from "@/lib/services/communications";

const previousDriver = process.env.DATA_DRIVER;
const previousSendMode = process.env.WHATSAPP_SEND_MODE;

afterEach(() => {
  if (previousDriver === undefined) delete process.env.DATA_DRIVER;
  else process.env.DATA_DRIVER = previousDriver;
  if (previousSendMode === undefined) delete process.env.WHATSAPP_SEND_MODE;
  else process.env.WHATSAPP_SEND_MODE = previousSendMode;
});

const agent: ActorContext = { type: "AGENT", id: "agent-test", name: "Agent", scopes: [] };
const human: ActorContext = { type: "USER", id: "human-test", name: "Human", role: "ADMIN", scopes: ["approvals.approve"] };

describe("approval security", () => {
  it("does not let an agent approve its own external action", async () => {
    process.env.DATA_DRIVER = "mock";
    const approval = await createApprovalRequest({
      actionType: "OTHER",
      payload: { operation: "external" },
      preview: "External action",
    }, agent);

    await expect(
      approveRequest(approval.id, { expectedVersion: approval.version }, agent),
    ).rejects.toMatchObject({ code: "HUMAN_APPROVAL_REQUIRED", status: 403 });
  });

  it("does not let a non-admin human approve external action", async () => {
    process.env.DATA_DRIVER = "mock";
    const member: ActorContext = { type: "USER", id: "member-test", name: "Member", role: "MEMBER", scopes: [] };
    const approval = await createApprovalRequest({
      actionType: "OTHER",
      payload: { operation: "external" },
      preview: "External action",
    }, agent);
    await expect(
      approveRequest(approval.id, { expectedVersion: approval.version }, member),
    ).rejects.toMatchObject({ code: "APPROVAL_PERMISSION_REQUIRED", status: 403 });
  });

  it("does not execute WhatsApp before approval", async () => {
    process.env.DATA_DRIVER = "mock";
    process.env.WHATSAPP_SEND_MODE = "mock";
    const approval = await createApprovalRequest({
      actionType: "WHATSAPP_SEND",
      payload: { to: "+5561999999999", text: "Olá" },
      preview: "Olá",
    }, agent);

    await expect(executeApprovedWhatsapp(approval.id, agent))
      .rejects.toMatchObject({ code: "APPROVAL_NOT_APPROVED", status: 409 });
  });

  it("executes the exact approved WhatsApp payload in mock mode", async () => {
    process.env.DATA_DRIVER = "mock";
    process.env.WHATSAPP_SEND_MODE = "mock";
    const pending = await createApprovalRequest({
      actionType: "WHATSAPP_SEND",
      payload: { to: "+5561999999999", text: "Mensagem aprovada" },
      preview: "Mensagem aprovada",
    }, agent);
    const approved = await approveRequest(
      pending.id,
      { expectedVersion: pending.version },
      human,
    );
    const executed = await executeApprovedWhatsapp(approved.id, agent);
    expect(executed.approval.status).toBe("EXECUTED");
    expect(executed.result).toMatchObject({ provider: "mock", status: "sent" });
  });
});
