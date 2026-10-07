import { randomUUID } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type { ApprovalActionType, ApprovalRequest, ChannelMessage, PolicyCheck } from "@/lib/domain/automation";
import { getAutomationRepository, getLeadRepository } from "@/lib/repositories";
import { getLead, moveLeadStage } from "./leads";
import {
  automationAudit,
  ensureApprovalNotExpired,
  hashPayload,
  nowIso,
  requireHumanActor,
  throwVersionConflict,
} from "./automation-utils";

const repo = () => getAutomationRepository();
const leadRepo = () => getLeadRepository();

export async function listChannelConnections() {
  return repo().listChannelConnections();
}

export async function createChannelConnection(
  input: {
    accountLabel: string;
    ownerUserId?: string | null;
    externalAccountId?: string | null;
    capabilities?: ("READ" | "SEND")[];
  },
  actor: ActorContext,
) {
  requireHumanActor(actor);
  const item = await repo().createChannelConnection({
    provider: "WHATSAPP",
    accountLabel: input.accountLabel,
    status: "CONNECTED",
    capabilities: input.capabilities ?? ["READ"],
    ownerUserId: input.ownerUserId ?? actor.id,
    externalAccountId: input.externalAccountId ?? null,
  });
  await automationAudit(actor, "channel_connection.create", "channel_connection", item.id, { provider: "WHATSAPP" });
  return item;
}

export async function ingestWhatsAppConversation(
  input: {
    connectionId: string;
    externalId: string;
    leadId?: string | null;
    contactAddress: string;
    contactDisplayName?: string | null;
    optOutDetected?: boolean;
    messages: Array<{
      externalId: string;
      direction: "INBOUND" | "OUTBOUND";
      sentAt: string;
      sender: string;
      text?: string | null;
      mediaType?: string | null;
      deliveryStatus?: string | null;
      rawMetadata?: Record<string, unknown>;
    }>;
  },
  actor: ActorContext,
  tool?: string,
) {
  const connection = await repo().getChannelConnection(input.connectionId);
  if (!connection) throw new DomainError("Channel connection not found", "CHANNEL_CONNECTION_NOT_FOUND", 404);
  const last = input.messages.at(-1)?.sentAt ?? null;
  const conversation = await repo().upsertConversation({
    connectionId: input.connectionId,
    externalId: input.externalId,
    leadId: input.leadId ?? null,
    contactAddress: input.contactAddress,
    contactDisplayName: input.contactDisplayName ?? null,
    lastMessageAt: last,
    optOutDetected: input.optOutDetected ?? false,
  });
  const messages: ChannelMessage[] = [];
  for (const message of input.messages) {
    messages.push(await repo().upsertMessage({
      conversationId: conversation.id,
      ...message,
      rawMetadata: message.rawMetadata ?? {},
    }));
  }
  if (input.leadId && input.optOutDetected) {
    const data = await getLead(input.leadId);
    if (data.lead.status !== "DO_NOT_CONTACT") {
      await moveLeadStage(input.leadId, "DO_NOT_CONTACT", actor, {
        reason: "Opt-out detected in WhatsApp conversation",
        tool,
      });
    }
  }
  await automationAudit(
    actor,
    "whatsapp.ingest",
    "conversation",
    conversation.id,
    { messageCount: messages.length, optOutDetected: conversation.optOutDetected },
    {},
    input.leadId,
    tool,
  );
  return { conversation, messages };
}

export async function listConversations(filters?: { leadId?: string; connectionId?: string; limit?: number }) {
  return repo().listConversations(filters);
}

export async function getConversation(id: string) {
  const conversation = await repo().getConversation(id);
  if (!conversation) throw new DomainError("Conversation not found", "CONVERSATION_NOT_FOUND", 404);
  return { conversation, messages: await repo().listMessages(id, 500) };
}

export async function linkConversation(
  id: string,
  leadId: string | null,
  optOutDetected: boolean | undefined,
  actor: ActorContext,
) {
  if (leadId) await getLead(leadId);
  const updated = await repo().linkConversation(id, leadId, optOutDetected);
  if (!updated) throw new DomainError("Conversation not found", "CONVERSATION_NOT_FOUND", 404);
  await automationAudit(actor, "conversation.link", "conversation", id, { leadId, optOutDetected }, {}, leadId);
  return updated;
}

async function defaultPolicyChecks(actionType: ApprovalActionType, leadId?: string | null): Promise<PolicyCheck[]> {
  const checks: PolicyCheck[] = [];
  if (leadId) {
    const { lead } = await getLead(leadId);
    checks.push({
      id: "not_dnc",
      passed: !lead.doNotContact && lead.status !== "DO_NOT_CONTACT",
      message: "Lead is allowed to receive contact.",
    });
  }
  if (actionType === "WHATSAPP_SEND") {
    checks.push({
      id: "human_approval",
      passed: true,
      message: "Human approval is mandatory before execution.",
    });
  }
  return checks;
}

export async function createApprovalRequest(
  input: {
    leadId?: string | null;
    actionType: ApprovalActionType;
    payload: Record<string, unknown>;
    preview: string;
    rationale?: string | null;
    policyChecks?: PolicyCheck[];
    expiresAt?: string | null;
  },
  actor: ActorContext,
  tool?: string,
) {
  if (input.leadId) await getLead(input.leadId);
  const checks = [
    ...(await defaultPolicyChecks(input.actionType, input.leadId)),
    ...(input.policyChecks ?? []),
  ];
  const item = await repo().createApproval({
    leadId: input.leadId ?? null,
    actionType: input.actionType,
    payload: input.payload,
    payloadHash: hashPayload(input.payload),
    preview: input.preview,
    rationale: input.rationale ?? null,
    policyChecks: checks,
    status: "PENDING",
    createdByType: actor.type,
    createdById: actor.id,
    approvedByUserId: null,
    approvedAt: null,
    rejectedByUserId: null,
    rejectedAt: null,
    executedAt: null,
    executionResult: {},
    expiresAt: input.expiresAt ?? null,
    version: 1,
  });
  await automationAudit(
    actor,
    "approval.create",
    "approval",
    item.id,
    { actionType: item.actionType },
    { status: item.status },
    item.leadId,
    tool,
  );
  return item;
}

export async function listApprovals(filters?: { leadId?: string; status?: string; limit?: number }) {
  return repo().listApprovals(filters);
}

export async function getApproval(id: string) {
  const approval = await repo().getApproval(id);
  if (!approval) throw new DomainError("Approval not found", "APPROVAL_NOT_FOUND", 404);
  return approval;
}

export async function approveRequest(
  id: string,
  input: { expectedVersion?: number; payload?: Record<string, unknown>; preview?: string },
  actor: ActorContext,
) {
  requireHumanActor(actor);
  const before = await getApproval(id);
  if (before.status !== "PENDING") {
    throw new DomainError("Approval is not pending", "APPROVAL_NOT_PENDING", 409);
  }
  ensureApprovalNotExpired(before);
  if (before.policyChecks.some((check) => !check.passed)) {
    throw new DomainError("Approval has failing policy checks", "POLICY_CHECK_FAILED", 403);
  }
  const payload = input.payload ?? before.payload;
  const updated = await repo().updateApproval(id, input.expectedVersion, {
    payload,
    payloadHash: hashPayload(payload),
    preview: input.preview ?? before.preview,
    status: "APPROVED",
    approvedByUserId: actor.id,
    approvedAt: nowIso(),
  });
  if (!updated) throwVersionConflict("Approval");
  await automationAudit(
    actor,
    "approval.approve",
    "approval",
    id,
    { edited: Boolean(input.payload || input.preview) },
    { status: "APPROVED" },
    before.leadId,
  );
  return updated;
}

export async function rejectRequest(
  id: string,
  expectedVersion: number | undefined,
  actor: ActorContext,
) {
  requireHumanActor(actor);
  const before = await getApproval(id);
  if (before.status !== "PENDING") {
    throw new DomainError("Approval is not pending", "APPROVAL_NOT_PENDING", 409);
  }
  const updated = await repo().updateApproval(id, expectedVersion, {
    status: "REJECTED",
    rejectedByUserId: actor.id,
    rejectedAt: nowIso(),
  });
  if (!updated) throwVersionConflict("Approval");
  await automationAudit(actor, "approval.reject", "approval", id, {}, { status: "REJECTED" }, before.leadId);
  return updated;
}

async function sendWhatsappPayload(payload: Record<string, unknown>) {
  const to = String(payload.to ?? "");
  const text = String(payload.text ?? "");
  if (!to || !text) {
    throw new DomainError(
      "Approved WhatsApp payload requires to and text",
      "INVALID_WHATSAPP_PAYLOAD",
      422,
    );
  }
  const url = process.env.WHATSAPP_SEND_WEBHOOK_URL;
  if (!url) {
    if (process.env.WHATSAPP_SEND_MODE === "mock") {
      return {
        provider: "mock",
        messageId: "mock_" + randomUUID(),
        status: "sent",
        sentAt: nowIso(),
      };
    }
    throw new DomainError(
      "WhatsApp send provider is not configured",
      "WHATSAPP_PROVIDER_NOT_CONFIGURED",
      503,
    );
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.WHATSAPP_API_TOKEN) {
    headers.authorization = "Bearer " + process.env.WHATSAPP_API_TOKEN;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ to, text, metadata: payload.metadata ?? {} }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new DomainError(
      "WhatsApp provider rejected the message",
      "WHATSAPP_SEND_FAILED",
      502,
      { status: response.status, body: body.slice(0, 1000) },
    );
  }
  let result: Record<string, unknown> = {
    status: "sent",
    providerStatus: response.status,
  };
  try {
    result = { ...result, ...(JSON.parse(body) as Record<string, unknown>) };
  } catch {
    result.raw = body.slice(0, 1000);
  }
  return result;
}

export async function executeApprovedWhatsapp(
  id: string,
  actor: ActorContext,
  tool?: string,
) {
  const approval = await getApproval(id);
  if (approval.actionType !== "WHATSAPP_SEND") {
    throw new DomainError("Approval is not a WhatsApp send", "INVALID_APPROVAL_ACTION", 422);
  }
  if (approval.status !== "APPROVED") {
    throw new DomainError(
      "Approval must be approved before execution",
      "APPROVAL_NOT_APPROVED",
      409,
    );
  }
  ensureApprovalNotExpired(approval);
  if (approval.payloadHash !== hashPayload(approval.payload)) {
    throw new DomainError(
      "Approved payload integrity check failed",
      "APPROVAL_PAYLOAD_MISMATCH",
      409,
    );
  }
  if (approval.policyChecks.some((check) => !check.passed)) {
    throw new DomainError("Approval has failing policy checks", "POLICY_CHECK_FAILED", 403);
  }
  if (approval.leadId) {
    const current = await getLead(approval.leadId);
    if (current.lead.doNotContact || current.lead.status === "DO_NOT_CONTACT") {
      throw new DomainError("Lead is now do-not-contact", "DO_NOT_CONTACT", 403);
    }
  }
  const result = await sendWhatsappPayload(approval.payload);
  const updated = await repo().updateApproval(id, approval.version, {
    status: "EXECUTED",
    executedAt: nowIso(),
    executionResult: result,
  });
  if (!updated) throwVersionConflict("Approval");
  await automationAudit(
    actor,
    "whatsapp.send.approved",
    "approval",
    id,
    { payloadHash: approval.payloadHash },
    { result },
    approval.leadId,
    tool,
  );
  if (approval.leadId) {
    await leadRepo().addActivity({
      leadId: approval.leadId,
      type: "AGENT_ACTION",
      actor,
      summary: "WhatsApp enviado após aprovação humana: " + approval.preview.slice(0, 180),
      metadata: { approvalId: id, result },
    });
  }
  return { approval: updated, result };
}
