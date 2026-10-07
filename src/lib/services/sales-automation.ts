import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type { Contract, Proposal, Qualification } from "@/lib/domain/automation";
import { getAutomationRepository } from "@/lib/repositories";
import { getLead, moveLeadStage } from "./leads";
import { getDiagnostic } from "./intelligence";
import {
  automationAudit,
  hashPayload,
  nowIso,
  throwVersionConflict,
} from "./automation-utils";
import {
  claimApprovalForExecution,
  completeApprovalExecution,
  createApprovalRequest,
  getApproval,
} from "./communications";

const repo = () => getAutomationRepository();

type DeliveryTarget = { channel: "EMAIL" | "WHATSAPP" | "OTHER"; to: string };

async function deliverDocument(
  kind: "PROPOSAL" | "CONTRACT",
  payload: Record<string, unknown>,
  idempotencyKey: string,
) {
  const delivery = payload.delivery as DeliveryTarget | undefined;
  if (!delivery?.to) {
    throw new DomainError(
      "Document send requires an approved delivery target",
      "DELIVERY_TARGET_REQUIRED",
      422,
    );
  }
  const url = process.env.DOCUMENT_SEND_WEBHOOK_URL;
  if (!url) {
    if (process.env.DOCUMENT_SEND_MODE === "mock") {
      return {
        provider: "mock",
        kind,
        channel: delivery.channel,
        to: delivery.to,
        idempotencyKey,
        status: "sent",
        sentAt: nowIso(),
      };
    }
    throw new DomainError(
      "Document send provider is not configured",
      "DOCUMENT_PROVIDER_NOT_CONFIGURED",
      503,
    );
  }
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "idempotency-key": idempotencyKey,
  };
  if (process.env.DOCUMENT_SEND_API_TOKEN) {
    headers.authorization = "Bearer " + process.env.DOCUMENT_SEND_API_TOKEN;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ kind, delivery, document: payload, idempotencyKey }),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new DomainError(
      "Document provider rejected delivery",
      "DOCUMENT_SEND_FAILED",
      502,
      { status: response.status, body: raw.slice(0, 1000) },
    );
  }
  let result: Record<string, unknown> = {
    providerStatus: response.status,
    status: "sent",
    kind,
    idempotencyKey,
  };
  try {
    result = { ...result, ...(JSON.parse(raw) as Record<string, unknown>) };
  } catch {
    result.raw = raw.slice(0, 1000);
  }
  return result;
}

export async function upsertQualification(
  leadId: string,
  input: Omit<Qualification,
    "id" | "leadId" | "version" | "createdAt" | "updatedAt" |
    "createdByType" | "createdById">,
  actor: ActorContext,
  tool?: string,
) {
  await getLead(leadId);
  const before = await repo().getQualification(leadId);
  const item = await repo().upsertQualification({
    leadId,
    version: (before?.version ?? 0) + 1,
    ...input,
    createdByType: actor.type,
    createdById: actor.id,
  });
  await automationAudit(
    actor,
    "qualification.upsert",
    "qualification",
    item.id,
    { version: item.version },
    {},
    leadId,
    tool,
  );
  return item;
}

export async function getQualification(leadId: string) {
  await getLead(leadId);
  return repo().getQualification(leadId);
}

function renderProposal(proposal: Pick<Proposal,
  "services" | "scope" | "exclusions" | "assumptions" | "clientDependencies" |
  "agencyFeeCents" | "currency" | "paymentTerms">) {
  const money = proposal.agencyFeeCents == null
    ? "HUMAN_REQUIRED"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: proposal.currency,
      }).format(proposal.agencyFeeCents / 100);
  return [
    "# Proposta Comercial",
    "",
    "## Serviços",
    proposal.services.map((item) => "- " + item).join("\n"),
    "",
    "## Escopo",
    proposal.scope.map((item) => "- " + item).join("\n"),
    "",
    "## Não incluído",
    proposal.exclusions.map((item) => "- " + item).join("\n"),
    "",
    "## Premissas",
    proposal.assumptions.map((item) => "- " + item).join("\n"),
    "",
    "## Dependências do cliente",
    proposal.clientDependencies.map((item) => "- " + item).join("\n"),
    "",
    "## Investimento",
    money,
    "",
    "## Pagamento",
    proposal.paymentTerms ?? "HUMAN_REQUIRED",
  ].join("\n");
}

async function validateProposalRelations(
  leadId: string,
  diagnosticId?: string | null,
  qualificationId?: string | null,
) {
  if (diagnosticId) {
    const diagnostic = await getDiagnostic(diagnosticId);
    if (diagnostic.leadId !== leadId) {
      throw new DomainError(
        "Diagnostic belongs to another lead",
        "RELATION_LEAD_MISMATCH",
        422,
        { relation: "diagnosticId" },
      );
    }
  }
  if (qualificationId) {
    const qualification = await repo().getQualification(leadId);
    if (!qualification || qualification.id !== qualificationId) {
      throw new DomainError(
        "Qualification belongs to another lead or is not current",
        "RELATION_LEAD_MISMATCH",
        422,
        { relation: "qualificationId" },
      );
    }
  }
}

export async function createProposal(
  leadId: string,
  input: Omit<Proposal,
    "id" | "leadId" | "version" | "status" | "createdAt" | "updatedAt" |
    "createdByType" | "createdById" | "renderedContent" | "artifactRef" |
    "approvalId" | "sentAt" | "responseNotes">,
  actor: ActorContext,
  tool?: string,
) {
  await getLead(leadId);
  await validateProposalRelations(leadId, input.diagnosticId, input.qualificationId);
  const existing = await repo().listProposals(leadId);
  const draft = {
    leadId,
    version: (existing[0]?.version ?? 0) + 1,
    status: "DRAFT" as const,
    ...input,
    artifactRef: null,
    approvalId: null,
    sentAt: null,
    responseNotes: null,
    createdByType: actor.type,
    createdById: actor.id,
  };
  const created = await repo().createProposal({
    ...draft,
    renderedContent: renderProposal(draft),
  });
  await automationAudit(
    actor,
    "proposal.create",
    "proposal",
    created.id,
    { version: created.version, services: created.services },
    { priced: created.agencyFeeCents != null },
    leadId,
    tool,
  );
  return created;
}

export async function listProposals(leadId: string) {
  await getLead(leadId);
  return repo().listProposals(leadId);
}

export async function getProposal(id: string) {
  const proposal = await repo().getProposal(id);
  if (!proposal) throw new DomainError("Proposal not found", "PROPOSAL_NOT_FOUND", 404);
  return proposal;
}

type ProposalEditableChanges = Partial<Pick<Proposal,
  "diagnosticId" | "qualificationId" | "services" | "scope" | "exclusions" |
  "assumptions" | "clientDependencies" | "milestones" | "agencyFeeCents" |
  "currency" | "externalCosts" | "paymentTerms" | "validityUntil">>;

export async function updateProposal(
  id: string,
  changes: ProposalEditableChanges,
  expectedVersion: number | undefined,
  actor: ActorContext,
  tool?: string,
) {
  const before = await getProposal(id);
  if (before.status !== "DRAFT") {
    throw new DomainError(
      "Only DRAFT proposals can be edited; create a new revision after externalization",
      "PROPOSAL_NOT_EDITABLE",
      409,
      { status: before.status },
    );
  }
  if (expectedVersion == null) {
    throw new DomainError("expectedVersion is required", "EXPECTED_VERSION_REQUIRED", 422);
  }
  if (changes.agencyFeeCents != null && changes.agencyFeeCents < 0) {
    throw new DomainError("Agency fee cannot be negative", "INVALID_PRICE", 422);
  }
  await validateProposalRelations(
    before.leadId,
    changes.diagnosticId ?? before.diagnosticId,
    changes.qualificationId ?? before.qualificationId,
  );
  const next = { ...before, ...changes };
  const updated = await repo().updateProposal(id, expectedVersion, {
    ...changes,
    renderedContent: renderProposal(next),
  });
  if (!updated) throwVersionConflict("Proposal");
  await automationAudit(
    actor,
    "proposal.update",
    "proposal",
    id,
    { changed: Object.keys(changes), expectedVersion },
    { version: updated.version },
    before.leadId,
    tool,
  );
  return updated;
}

async function cancelUnboundApproval(approvalId: string) {
  const approval = await getApproval(approvalId);
  if (approval.status === "PENDING") {
    await repo().updateApproval(approval.id, approval.version, {
      status: "CANCELED",
      executionResult: { reason: "entity_binding_failed" },
    });
  }
}

export async function requestProposalApproval(
  id: string,
  expectedVersion: number | undefined,
  actor: ActorContext,
  tool?: string,
  delivery?: DeliveryTarget,
) {
  const proposal = await getProposal(id);
  if (proposal.status !== "DRAFT") {
    throw new DomainError("Only DRAFT proposals can enter approval", "PROPOSAL_NOT_APPROVABLE", 409);
  }
  if (expectedVersion == null || expectedVersion !== proposal.version) {
    throwVersionConflict("Proposal");
  }
  if (proposal.agencyFeeCents == null || !proposal.paymentTerms) {
    throw new DomainError(
      "Proposal pricing/payment terms are HUMAN_REQUIRED before sending",
      "PRICE_HUMAN_REQUIRED",
      422,
    );
  }

  const boundVersion = proposal.version + 1;
  const approval = await createApprovalRequest({
    leadId: proposal.leadId,
    actionType: "PROPOSAL_SEND",
    payload: {
      proposalId: id,
      version: boundVersion,
      renderedContent: proposal.renderedContent,
      delivery: delivery ?? null,
    },
    preview: proposal.renderedContent ?? "Proposta",
    rationale: "Enviar proposta comercial versionada.",
  }, actor, tool, { allowSpecializedAction: true });

  const updated = await repo().updateProposal(id, proposal.version, {
    status: "PENDING_APPROVAL",
    approvalId: approval.id,
  });
  if (!updated) {
    await cancelUnboundApproval(approval.id);
    throwVersionConflict("Proposal");
  }
  if (updated.version !== boundVersion) {
    await cancelUnboundApproval(approval.id);
    throw new DomainError("Unexpected proposal version after approval binding", "VERSION_INVARIANT_FAILED", 500);
  }
  return { proposal: updated, approval };
}

export async function executeApprovedProposal(
  approvalId: string,
  actor: ActorContext,
  tool?: string,
) {
  const approval = await getApproval(approvalId);
  const proposalId = String(approval.payload.proposalId ?? "");
  const proposal = await getProposal(proposalId);

  const claim = await claimApprovalForExecution(approvalId, {
    actionType: "PROPOSAL_SEND",
    leadId: proposal.leadId,
    entity: {
      idKey: "proposalId",
      id: proposal.id,
      version: proposal.version,
      approvalId: proposal.approvalId,
      status: proposal.status,
      expectedStatus: "PENDING_APPROVAL",
    },
  });
  if (claim.alreadyExecuted) return proposal;

  try {
    const deliveryResult = await deliverDocument(
      "PROPOSAL",
      claim.approval.payload,
      claim.approval.id,
    );
    const updated = await repo().updateProposal(proposal.id, proposal.version, {
      status: "SENT",
      sentAt: nowIso(),
    });
    if (!updated) throwVersionConflict("Proposal");

    await completeApprovalExecution(claim.approval, {
      proposalId: proposal.id,
      status: "SENT",
      delivery: deliveryResult,
    });

    const lead = await getLead(proposal.leadId);
    if (lead.lead.status !== "PROPOSAL_SENT") {
      await moveLeadStage(proposal.leadId, "PROPOSAL_SENT", actor, {
        reason: "Approved proposal sent",
        tool,
      });
    }
    await automationAudit(
      actor,
      "proposal.send.approved",
      "proposal",
      proposal.id,
      { approvalId, idempotencyKey: claim.approval.id },
      { status: "SENT", delivery: deliveryResult },
      proposal.leadId,
      tool,
    );
    return updated;
  } catch (error) {
    await automationAudit(
      actor,
      "proposal.send.execution_uncertain",
      "proposal",
      proposal.id,
      { approvalId, idempotencyKey: claim.approval.id },
      { error: error instanceof Error ? error.message : "Unknown execution failure" },
      proposal.leadId,
      tool,
    );
    throw error;
  }
}

export async function markProposalResponse(
  id: string,
  status: "ACCEPTED" | "REJECTED",
  notes: string | undefined,
  expectedVersion: number | undefined,
  actor: ActorContext,
  tool?: string,
) {
  const proposal = await getProposal(id);
  if (proposal.status === status) return proposal;
  if (proposal.status !== "SENT") {
    throw new DomainError(
      "Only SENT proposals can receive an accepted/rejected response",
      "INVALID_PROPOSAL_RESPONSE_STATE",
      409,
      { status: proposal.status },
    );
  }
  if (expectedVersion == null) {
    throw new DomainError("expectedVersion is required", "EXPECTED_VERSION_REQUIRED", 422);
  }
  const updated = await repo().updateProposal(id, expectedVersion, {
    status,
    responseNotes: notes ?? null,
  });
  if (!updated) throwVersionConflict("Proposal");
  if (status === "ACCEPTED") {
    const lead = await getLead(proposal.leadId);
    if (lead.lead.status !== "NEGOTIATION") {
      await moveLeadStage(proposal.leadId, "NEGOTIATION", actor, {
        reason: "Proposal accepted; contract preparation started",
        tool,
      });
    }
  }
  await automationAudit(
    actor,
    "proposal.response",
    "proposal",
    id,
    { status, notes, expectedVersion },
    { version: updated.version },
    proposal.leadId,
    tool,
  );
  return updated;
}

function proposalSnapshot(proposal: Proposal): Record<string, unknown> {
  return {
    id: proposal.id,
    leadId: proposal.leadId,
    version: proposal.version,
    status: proposal.status,
    diagnosticId: proposal.diagnosticId ?? null,
    qualificationId: proposal.qualificationId ?? null,
    services: proposal.services,
    scope: proposal.scope,
    exclusions: proposal.exclusions,
    assumptions: proposal.assumptions,
    clientDependencies: proposal.clientDependencies,
    milestones: proposal.milestones,
    agencyFeeCents: proposal.agencyFeeCents ?? null,
    currency: proposal.currency,
    externalCosts: proposal.externalCosts,
    paymentTerms: proposal.paymentTerms ?? null,
    validityUntil: proposal.validityUntil ?? null,
    renderedContent: proposal.renderedContent ?? null,
  };
}

function renderContract(contract: Pick<Contract,
  "templateId" | "proposalId" | "proposalVersion" | "proposalSnapshotHash" |
  "deliverables" | "responsibilitiesAgency" | "responsibilitiesClient" |
  "supportObligations" | "terms">) {
  const list = (title: string, values: string[]) =>
    "## " + title + "\n" + (values.map((item) => "- " + item).join("\n") || "- N/A");
  return [
    "# Contrato — " + contract.templateId,
    "",
    "Proposal: " + contract.proposalId + " @ v" + contract.proposalVersion,
    "Proposal snapshot SHA-256: " + contract.proposalSnapshotHash,
    "",
    list("Entregáveis", contract.deliverables),
    "",
    list("Responsabilidades da Agência", contract.responsibilitiesAgency),
    "",
    list("Responsabilidades do Cliente", contract.responsibilitiesClient),
    "",
    list("Suporte", contract.supportObligations),
    "",
    "## Termos estruturados",
    "JSON: " + JSON.stringify(contract.terms, null, 2),
  ].join("\n");
}

export async function createContractFromProposal(
  proposalId: string,
  input: {
    proposalVersion: number;
    templateId: string;
    templateVersion: string;
    parties?: Record<string, unknown>;
    terms?: Record<string, unknown>;
    responsibilitiesAgency?: string[];
    responsibilitiesClient?: string[];
    paymentObligations?: Record<string, unknown>[];
    deliverables?: string[];
    supportObligations?: string[];
  },
  actor: ActorContext,
  tool?: string,
) {
  const proposal = await getProposal(proposalId);
  if (proposal.status !== "ACCEPTED") {
    throw new DomainError(
      "Proposal must be ACCEPTED before contract generation",
      "PROPOSAL_NOT_CONTRACTABLE",
      422,
      { status: proposal.status },
    );
  }
  if (proposal.version !== input.proposalVersion) {
    throwVersionConflict("Proposal");
  }

  const snapshot = proposalSnapshot(proposal);
  const snapshotHash = hashPayload(snapshot);
  const existing = await repo().listContracts(proposal.leadId);
  const draft = {
    leadId: proposal.leadId,
    proposalId,
    proposalVersion: proposal.version,
    proposalSnapshotHash: snapshotHash,
    proposalSnapshot: snapshot,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    version: (existing[0]?.version ?? 0) + 1,
    status: "DRAFT" as const,
    parties: input.parties ?? {},
    terms: input.terms ?? {},
    responsibilitiesAgency: input.responsibilitiesAgency ?? proposal.scope,
    responsibilitiesClient: input.responsibilitiesClient ?? proposal.clientDependencies,
    paymentObligations: input.paymentObligations ?? [],
    deliverables: input.deliverables ?? proposal.scope,
    supportObligations: input.supportObligations ?? [],
    artifactRef: null,
    approvalId: null,
    signatureProvider: null,
    externalSignatureId: null,
    signedArtifactRef: null,
    signedAt: null,
    createdByType: actor.type,
    createdById: actor.id,
  };
  const created = await repo().createContract({
    ...draft,
    renderedContent: renderContract(draft),
  });
  await automationAudit(
    actor,
    "contract.create",
    "contract",
    created.id,
    {
      proposalId,
      proposalVersion: proposal.version,
      proposalSnapshotHash: snapshotHash,
      templateId: input.templateId,
      templateVersion: input.templateVersion,
    },
    { version: created.version },
    proposal.leadId,
    tool,
  );
  return created;
}

export async function listContracts(leadId: string) {
  await getLead(leadId);
  return repo().listContracts(leadId);
}

export async function getContract(id: string) {
  const contract = await repo().getContract(id);
  if (!contract) throw new DomainError("Contract not found", "CONTRACT_NOT_FOUND", 404);
  return contract;
}

type ContractEditableChanges = Partial<Pick<Contract,
  "parties" | "terms" | "responsibilitiesAgency" | "responsibilitiesClient" |
  "paymentObligations" | "deliverables" | "supportObligations">>;

export async function updateContractDraft(
  id: string,
  changes: ContractEditableChanges,
  expectedVersion: number | undefined,
  actor: ActorContext,
  tool?: string,
) {
  const before = await getContract(id);
  if (before.status !== "DRAFT") {
    throw new DomainError(
      "Only DRAFT contracts can be edited",
      "CONTRACT_NOT_EDITABLE",
      409,
      { status: before.status },
    );
  }
  if (expectedVersion == null) {
    throw new DomainError("expectedVersion is required", "EXPECTED_VERSION_REQUIRED", 422);
  }
  const next = { ...before, ...changes };
  const updated = await repo().updateContract(id, expectedVersion, {
    ...changes,
    renderedContent: renderContract(next),
  });
  if (!updated) throwVersionConflict("Contract");
  await automationAudit(
    actor,
    "contract.update",
    "contract",
    id,
    { changed: Object.keys(changes), expectedVersion },
    { version: updated.version },
    before.leadId,
    tool,
  );
  return updated;
}

export async function requestContractApproval(
  id: string,
  expectedVersion: number | undefined,
  actor: ActorContext,
  tool?: string,
  delivery?: DeliveryTarget,
) {
  const contract = await getContract(id);
  if (contract.status !== "DRAFT") {
    throw new DomainError(
      "Only DRAFT contracts can enter review",
      "CONTRACT_NOT_REVIEWABLE",
      409,
      { status: contract.status },
    );
  }
  if (expectedVersion == null || expectedVersion !== contract.version) {
    throwVersionConflict("Contract");
  }

  const boundVersion = contract.version + 1;
  const approval = await createApprovalRequest({
    leadId: contract.leadId,
    actionType: "CONTRACT_SEND",
    payload: {
      contractId: id,
      version: boundVersion,
      renderedContent: contract.renderedContent,
      delivery: delivery ?? null,
    },
    preview: contract.renderedContent ?? "Contrato",
    rationale: "Revisão humana/jurídica obrigatória antes do envio.",
  }, actor, tool, { allowSpecializedAction: true });

  const updated = await repo().updateContract(id, contract.version, {
    status: "PENDING_REVIEW",
    approvalId: approval.id,
  });
  if (!updated) {
    await cancelUnboundApproval(approval.id);
    throwVersionConflict("Contract");
  }
  if (updated.version !== boundVersion) {
    await cancelUnboundApproval(approval.id);
    throw new DomainError("Unexpected contract version after approval binding", "VERSION_INVARIANT_FAILED", 500);
  }
  return { contract: updated, approval };
}

export async function executeApprovedContract(
  approvalId: string,
  actor: ActorContext,
  tool?: string,
) {
  const approval = await getApproval(approvalId);
  const contractId = String(approval.payload.contractId ?? "");
  const contract = await getContract(contractId);

  const claim = await claimApprovalForExecution(approvalId, {
    actionType: "CONTRACT_SEND",
    leadId: contract.leadId,
    entity: {
      idKey: "contractId",
      id: contract.id,
      version: contract.version,
      approvalId: contract.approvalId,
      status: contract.status,
      expectedStatus: "PENDING_REVIEW",
    },
  });
  if (claim.alreadyExecuted) return contract;

  try {
    const deliveryResult = await deliverDocument(
      "CONTRACT",
      claim.approval.payload,
      claim.approval.id,
    );
    const updated = await repo().updateContract(contract.id, contract.version, {
      status: "SENT",
    });
    if (!updated) throwVersionConflict("Contract");

    await completeApprovalExecution(claim.approval, {
      contractId: contract.id,
      status: "SENT",
      delivery: deliveryResult,
    });
    await automationAudit(
      actor,
      "contract.send.approved",
      "contract",
      contract.id,
      { approvalId, idempotencyKey: claim.approval.id },
      { status: "SENT", delivery: deliveryResult },
      contract.leadId,
      tool,
    );
    return updated;
  } catch (error) {
    await automationAudit(
      actor,
      "contract.send.execution_uncertain",
      "contract",
      contract.id,
      { approvalId, idempotencyKey: claim.approval.id },
      { error: error instanceof Error ? error.message : "Unknown execution failure" },
      contract.leadId,
      tool,
    );
    throw error;
  }
}

export async function updateContractSignature(
  id: string,
  input: {
    status: "SIGNED" | "DECLINED";
    signatureProvider?: string | null;
    externalSignatureId?: string | null;
    signedArtifactRef?: string | null;
    signedAt?: string | null;
  },
  actor: ActorContext,
  tool?: string,
) {
  const contract = await getContract(id);

  if (contract.status === input.status) {
    if (
      contract.externalSignatureId &&
      input.externalSignatureId &&
      contract.externalSignatureId !== input.externalSignatureId
    ) {
      throw new DomainError(
        "Signature event belongs to another external signature",
        "SIGNATURE_ID_MISMATCH",
        409,
      );
    }
    return contract;
  }

  if (contract.status === "SIGNED" || contract.status === "DECLINED") {
    throw new DomainError(
      "Signed/declined contracts are terminal",
      "CONTRACT_SIGNATURE_TERMINAL",
      409,
      { current: contract.status, requested: input.status },
    );
  }
  if (contract.status !== "SENT") {
    throw new DomainError(
      "Only SENT contracts can transition to SIGNED or DECLINED",
      "INVALID_CONTRACT_SIGNATURE_STATE",
      409,
      { status: contract.status },
    );
  }
  if (
    contract.externalSignatureId &&
    input.externalSignatureId &&
    contract.externalSignatureId !== input.externalSignatureId
  ) {
    throw new DomainError(
      "Signature event belongs to another external signature",
      "SIGNATURE_ID_MISMATCH",
      409,
    );
  }

  const updated = await repo().updateContract(id, contract.version, {
    status: input.status,
    signatureProvider: input.signatureProvider ?? contract.signatureProvider,
    externalSignatureId: input.externalSignatureId ?? contract.externalSignatureId,
    signedArtifactRef: input.signedArtifactRef ?? contract.signedArtifactRef,
    signedAt: input.status === "SIGNED" ? input.signedAt ?? nowIso() : null,
  });
  if (!updated) throwVersionConflict("Contract");

  if (input.status === "SIGNED") {
    const lead = await getLead(contract.leadId);
    if (lead.lead.status !== "WON" && lead.lead.status !== "ONBOARDING") {
      await moveLeadStage(contract.leadId, "WON", actor, {
        reason: "Contract signed",
        tool,
      });
    }
  }
  await automationAudit(
    actor,
    "contract.signature.update",
    "contract",
    id,
    {
      status: input.status,
      externalSignatureId: input.externalSignatureId ?? contract.externalSignatureId ?? null,
    },
    { version: updated.version },
    contract.leadId,
    tool,
  );
  return updated;
}
