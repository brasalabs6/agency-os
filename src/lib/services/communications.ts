import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type {
  ApprovalActionType,
  ApprovalRequest,
  ChannelMessage,
  PolicyCheck,
} from "@/lib/domain/automation";
import { getAutomationRepository, getLeadRepository } from "@/lib/repositories";
import { getLead, moveLeadStage } from "./leads";
import {
  automationAudit,
  canonicalJson,
  ensureApprovalNotExpired,
  hashPayload,
  nowIso,
  requireApprovalActor,
  requireHumanActor,
  throwVersionConflict,
} from "./automation-utils";

const repo = () => getAutomationRepository();
const leadRepo = () => getLeadRepository();
const SPECIALIZED_ACTIONS = new Set<ApprovalActionType>(["PROPOSAL_SEND", "CONTRACT_SEND"]);

function maxIso(a?: string | null, b?: string | null) {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

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
    // Registration alone is not proof of a live provider session.
    status: "DISCONNECTED",
    capabilities: ["READ"],
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

  const existing = await repo().getConversationByExternal(input.connectionId, input.externalId);
  if (existing?.leadId && input.leadId && existing.leadId !== input.leadId) {
    throw new DomainError(
      "Gateway ingest cannot reassign an already linked conversation",
      "CONVERSATION_LEAD_CONFLICT",
      409,
    );
  }

  const newestInputMessage = input.messages.reduce<string | null>(
    (latest, message) => maxIso(latest, message.sentAt),
    null,
  );
  const conversation = await repo().upsertConversation({
    connectionId: input.connectionId,
    externalId: input.externalId,
    leadId: existing?.leadId ?? input.leadId ?? null,
    contactAddress: input.contactAddress,
    contactDisplayName: input.contactDisplayName === undefined
      ? existing?.contactDisplayName ?? null
      : input.contactDisplayName,
    lastMessageAt: maxIso(existing?.lastMessageAt, newestInputMessage),
    optOutDetected: Boolean(existing?.optOutDetected || input.optOutDetected === true),
  });

  const messages: ChannelMessage[] = [];
  for (const message of input.messages) {
    messages.push(await repo().upsertMessage({
      conversationId: conversation.id,
      ...message,
      rawMetadata: message.rawMetadata ?? {},
    }));
  }

  if (conversation.leadId && conversation.optOutDetected) {
    const data = await getLead(conversation.leadId);
    if (data.lead.status !== "DO_NOT_CONTACT") {
      await moveLeadStage(conversation.leadId, "DO_NOT_CONTACT", actor, {
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
    {
      messageCount: messages.length,
      optOutDetected: conversation.optOutDetected,
      preservedLeadBinding: Boolean(existing?.leadId),
    },
    {},
    conversation.leadId,
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
  requireHumanActor(actor);
  if (leadId) await getLead(leadId);
  const updated = await repo().linkConversation(id, leadId, optOutDetected);
  if (!updated) throw new DomainError("Conversation not found", "CONVERSATION_NOT_FOUND", 404);
  if (updated.leadId && updated.optOutDetected) {
    const data = await getLead(updated.leadId);
    if (data.lead.status !== "DO_NOT_CONTACT") {
      await moveLeadStage(updated.leadId, "DO_NOT_CONTACT", actor, {
        reason: "Conversation explicitly marked as opted out",
      });
    }
  }
  await automationAudit(actor, "conversation.link", "conversation", id, { leadId, optOutDetected }, {}, updated.leadId);
  return updated;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

async function validateExternalTarget(
  actionType: ApprovalActionType,
  leadId: string | null | undefined,
  payload: Record<string, unknown>,
) {
  const directChannel = actionType === "WHATSAPP_SEND"
    ? "WHATSAPP"
    : actionType === "EMAIL_SEND"
      ? "EMAIL"
      : null;
  const delivery = payload.delivery && typeof payload.delivery === "object"
    ? payload.delivery as { channel?: string; to?: string }
    : null;
  const isDocumentSend = actionType === "PROPOSAL_SEND" || actionType === "CONTRACT_SEND";
  if (isDocumentSend && (!delivery?.channel || !delivery.to)) {
    throw new DomainError(
      "Document approval requires a delivery channel and target",
      "DELIVERY_TARGET_REQUIRED",
      422,
    );
  }
  const channel = directChannel ?? delivery?.channel ?? null;
  const rawTarget = directChannel ? String(payload.to ?? "") : String(delivery?.to ?? "");

  if (actionType === "WHATSAPP_SEND" && !String(payload.text ?? "").trim()) {
    throw new DomainError(
      "WhatsApp approval requires non-empty text",
      "INVALID_WHATSAPP_PAYLOAD",
      422,
    );
  }

  if (channel !== "WHATSAPP" && channel !== "EMAIL") return;
  if (!leadId) {
    throw new DomainError(
      "Contact actions must be bound to a lead",
      "CONTACT_ACTION_LEAD_REQUIRED",
      422,
    );
  }
  if (!rawTarget) {
    throw new DomainError("Contact target is required", "CONTACT_TARGET_REQUIRED", 422);
  }

  const { lead } = await getLead(leadId);
  if (channel === "EMAIL") {
    const allowed = new Set([lead.email].filter(Boolean).map((value) => String(value).trim().toLowerCase()));
    if (!allowed.has(rawTarget.trim().toLowerCase())) {
      throw new DomainError(
        "Email target is not registered on this lead",
        "CONTACT_TARGET_NOT_LINKED",
        422,
      );
    }
    return;
  }

  const allowed = new Set(
    [lead.whatsapp, lead.phone]
      .filter(Boolean)
      .map((value) => normalizePhone(String(value))),
  );
  const conversations = await repo().listConversations({ leadId, limit: 200 });
  for (const conversation of conversations) {
    allowed.add(normalizePhone(conversation.contactAddress));
  }
  const normalizedTarget = normalizePhone(rawTarget);
  if (!normalizedTarget || !allowed.has(normalizedTarget)) {
    throw new DomainError(
      "WhatsApp target is not registered or linked to this lead",
      "CONTACT_TARGET_NOT_LINKED",
      422,
    );
  }
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
  if (actionType !== "OTHER") {
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
  options: { allowSpecializedAction?: boolean } = {},
) {
  if (SPECIALIZED_ACTIONS.has(input.actionType) && !options.allowSpecializedAction) {
    throw new DomainError(
      "Proposal/contract approvals must be created through their specialized workflow",
      "SPECIALIZED_APPROVAL_FLOW_REQUIRED",
      422,
    );
  }
  if (input.leadId) await getLead(input.leadId);
  await validateExternalTarget(input.actionType, input.leadId, input.payload);
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

function assertSpecializedApprovalEdit(
  before: ApprovalRequest,
  payload: Record<string, unknown>,
  preview: string,
) {
  if (!SPECIALIZED_ACTIONS.has(before.actionType)) return;
  const immutableKeys = before.actionType === "PROPOSAL_SEND"
    ? ["proposalId", "version", "renderedContent"]
    : ["contractId", "version", "renderedContent"];
  for (const key of immutableKeys) {
    if (canonicalJson(payload[key]) !== canonicalJson(before.payload[key])) {
      throw new DomainError(
        "Specialized approval document identity/content cannot be edited in the approval inbox",
        "SPECIALIZED_APPROVAL_IMMUTABLE",
        409,
        { key },
      );
    }
  }
  if (preview !== before.preview) {
    throw new DomainError(
      "Specialized approval preview cannot diverge from the versioned document",
      "SPECIALIZED_APPROVAL_IMMUTABLE",
      409,
    );
  }
}

export async function approveRequest(
  id: string,
  input: { expectedVersion: number; payload?: Record<string, unknown>; preview?: string },
  actor: ActorContext,
) {
  requireApprovalActor(actor);
  const before = await getApproval(id);
  if (before.status !== "PENDING") {
    throw new DomainError("Approval is not pending", "APPROVAL_NOT_PENDING", 409);
  }
  ensureApprovalNotExpired(before);
  if (before.policyChecks.some((check) => !check.passed)) {
    throw new DomainError("Approval has failing policy checks", "POLICY_CHECK_FAILED", 403);
  }
  if (before.leadId) {
    const current = await getLead(before.leadId);
    if (current.lead.doNotContact || current.lead.status === "DO_NOT_CONTACT") {
      throw new DomainError("Lead is now do-not-contact", "DO_NOT_CONTACT", 403);
    }
  }
  const payload = input.payload ?? before.payload;
  const preview = input.preview ?? before.preview;
  assertSpecializedApprovalEdit(before, payload, preview);
  await validateExternalTarget(before.actionType, before.leadId, payload);
  const updated = await repo().updateApproval(id, input.expectedVersion, {
    payload,
    payloadHash: hashPayload(payload),
    preview,
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

async function reopenRejectedSpecializedEntity(approval: ApprovalRequest) {
  if (approval.actionType === "PROPOSAL_SEND") {
    const proposalId = String(approval.payload.proposalId ?? "");
    const proposal = proposalId ? await repo().getProposal(proposalId) : null;
    if (proposal?.approvalId === approval.id && proposal.status === "PENDING_APPROVAL") {
      await repo().updateProposal(proposal.id, proposal.version, { status: "DRAFT", approvalId: null });
    }
  }
  if (approval.actionType === "CONTRACT_SEND") {
    const contractId = String(approval.payload.contractId ?? "");
    const contract = contractId ? await repo().getContract(contractId) : null;
    if (contract?.approvalId === approval.id && contract.status === "PENDING_REVIEW") {
      await repo().updateContract(contract.id, contract.version, { status: "DRAFT", approvalId: null });
    }
  }
}

export async function rejectRequest(
  id: string,
  expectedVersion: number,
  actor: ActorContext,
) {
  requireApprovalActor(actor);
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
  await reopenRejectedSpecializedEntity(before);
  await automationAudit(actor, "approval.reject", "approval", id, {}, { status: "REJECTED" }, before.leadId);
  return updated;
}

export interface ApprovalExecutionExpectation {
  actionType: ApprovalActionType;
  leadId?: string | null;
  entity?: {
    idKey: "proposalId" | "contractId";
    id: string;
    version: number;
    approvalId?: string | null;
    status: string;
    expectedStatus: string;
  };
}

export async function claimApprovalForExecution(
  id: string,
  expectation: ApprovalExecutionExpectation,
) {
  const approval = await getApproval(id);
  if (approval.actionType !== expectation.actionType) {
    throw new DomainError("Approval action type mismatch", "INVALID_APPROVAL_ACTION", 422);
  }

  if (expectation.entity) {
    if (String(approval.payload[expectation.entity.idKey] ?? "") !== expectation.entity.id) {
      throw new DomainError("Approval is bound to another entity", "APPROVAL_ENTITY_MISMATCH", 409);
    }
    if (expectation.entity.approvalId !== approval.id) {
      throw new DomainError("Entity is not bound to this approval", "APPROVAL_BINDING_MISMATCH", 409);
    }
  }
  if (expectation.leadId !== undefined && approval.leadId !== expectation.leadId) {
    throw new DomainError("Approval lead binding mismatch", "APPROVAL_LEAD_MISMATCH", 409);
  }

  if (approval.status === "EXECUTED") {
    return { approval, alreadyExecuted: true as const };
  }
  if (approval.status !== "APPROVED" && approval.status !== "EXECUTING") {
    throw new DomainError("Approval must be approved before execution", "APPROVAL_NOT_APPROVED", 409);
  }

  ensureApprovalNotExpired(approval);
  if (approval.payloadHash !== hashPayload(approval.payload)) {
    throw new DomainError("Approved payload integrity check failed", "APPROVAL_PAYLOAD_MISMATCH", 409);
  }
  if (approval.policyChecks.some((check) => !check.passed)) {
    throw new DomainError("Approval has failing policy checks", "POLICY_CHECK_FAILED", 403);
  }
  await validateExternalTarget(approval.actionType, approval.leadId, approval.payload);

  if (expectation.entity) {
    if (expectation.entity.status !== expectation.entity.expectedStatus) {
      throw new DomainError(
        "Entity is not in the expected state for approved execution",
        "APPROVAL_ENTITY_STATE_MISMATCH",
        409,
        { expected: expectation.entity.expectedStatus, actual: expectation.entity.status },
      );
    }
    if (Number(approval.payload.version) !== expectation.entity.version) {
      throw new DomainError("Entity changed after approval request", "APPROVAL_PAYLOAD_MISMATCH", 409);
    }
  }

  const leadId = expectation.leadId ?? approval.leadId;
  if (leadId) {
    const current = await getLead(leadId);
    if (current.lead.doNotContact || current.lead.status === "DO_NOT_CONTACT") {
      throw new DomainError("Lead is now do-not-contact", "DO_NOT_CONTACT", 403);
    }
  }

  if (approval.status === "EXECUTING") {
    const startedAt = typeof approval.executionResult.startedAt === "string"
      ? new Date(approval.executionResult.startedAt).getTime()
      : 0;
    const leaseSeconds = Number(process.env.APPROVAL_EXECUTION_LEASE_SECONDS ?? "300");
    const leaseMs = Number.isFinite(leaseSeconds) && leaseSeconds >= 0 ? leaseSeconds * 1000 : 300000;
    if (startedAt && Date.now() - startedAt < leaseMs) {
      throw new DomainError(
        "Approval execution is already in progress",
        "APPROVAL_EXECUTION_IN_PROGRESS",
        409,
        { idempotencyKey: approval.id, retryAfterSeconds: Math.ceil((leaseMs - (Date.now() - startedAt)) / 1000) },
      );
    }
    const resumed = await repo().updateApproval(approval.id, approval.version, {
      status: "EXECUTING",
      executionResult: {
        ...approval.executionResult,
        idempotencyKey: approval.id,
        startedAt: nowIso(),
        resumeCount: Number(approval.executionResult.resumeCount ?? 0) + 1,
      },
    });
    if (!resumed) throwVersionConflict("Approval");
    return { approval: resumed, alreadyExecuted: false as const };
  }

  const claimed = await repo().updateApproval(approval.id, approval.version, {
    status: "EXECUTING",
    executionResult: {
      idempotencyKey: approval.id,
      startedAt: nowIso(),
    },
  });
  if (!claimed) throwVersionConflict("Approval");
  return { approval: claimed, alreadyExecuted: false as const };
}

export async function completeApprovalExecution(
  claimed: ApprovalRequest,
  result: Record<string, unknown>,
) {
  if (claimed.status !== "EXECUTING") {
    throw new DomainError("Approval was not claimed for execution", "APPROVAL_NOT_EXECUTING", 409);
  }
  const updated = await repo().updateApproval(claimed.id, claimed.version, {
    status: "EXECUTED",
    executedAt: nowIso(),
    executionResult: result,
  });
  if (!updated) throwVersionConflict("Approval");
  return updated;
}

async function sendWhatsappPayload(payload: Record<string, unknown>, idempotencyKey: string) {
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
        messageId: "mock_" + idempotencyKey,
        idempotencyKey,
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
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "idempotency-key": idempotencyKey,
  };
  if (process.env.WHATSAPP_API_TOKEN) {
    headers.authorization = "Bearer " + process.env.WHATSAPP_API_TOKEN;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ to, text, metadata: payload.metadata ?? {}, idempotencyKey }),
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
    idempotencyKey,
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
  if (!process.env.WHATSAPP_SEND_WEBHOOK_URL && process.env.WHATSAPP_SEND_MODE !== "mock") {
    throw new DomainError("WhatsApp send provider is not configured", "WHATSAPP_PROVIDER_NOT_CONFIGURED", 503);
  }
  if (process.env.WHATSAPP_SEND_WEBHOOK_URL && process.env.WHATSAPP_PROVIDER_IDEMPOTENCY_CONFIRMED !== "true") {
    throw new DomainError(
      "WhatsApp adapter must guarantee provider-side deduplication by Idempotency-Key",
      "PROVIDER_IDEMPOTENCY_REQUIRED",
      503,
    );
  }
  const claim = await claimApprovalForExecution(id, { actionType: "WHATSAPP_SEND" });
  if (claim.alreadyExecuted) {
    return { approval: claim.approval, result: claim.approval.executionResult };
  }

  try {
    const result = await sendWhatsappPayload(claim.approval.payload, claim.approval.id);
    const updated = await completeApprovalExecution(claim.approval, result);
    await automationAudit(
      actor,
      "whatsapp.send.approved",
      "approval",
      id,
      { payloadHash: claim.approval.payloadHash, idempotencyKey: claim.approval.id },
      { result },
      claim.approval.leadId,
      tool,
    );
    if (claim.approval.leadId) {
      await leadRepo().addActivity({
        leadId: claim.approval.leadId,
        type: "AGENT_ACTION",
        actor,
        summary: "WhatsApp enviado após aprovação humana: " + claim.approval.preview.slice(0, 180),
        metadata: { approvalId: id, result },
      });
    }
    return { approval: updated, result };
  } catch (error) {
    await automationAudit(
      actor,
      "whatsapp.send.execution_uncertain",
      "approval",
      id,
      { idempotencyKey: claim.approval.id },
      { error: error instanceof Error ? error.message : "Unknown execution failure" },
      claim.approval.leadId,
      tool,
    );
    throw error;
  }
}
