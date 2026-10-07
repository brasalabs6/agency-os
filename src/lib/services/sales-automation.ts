import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type { Contract, Proposal, Qualification } from "@/lib/domain/automation";
import { getAutomationRepository } from "@/lib/repositories";
import { getLead, moveLeadStage } from "./leads";
import { automationAudit, nowIso, throwVersionConflict } from "./automation-utils";
import { createApprovalRequest, getApproval } from "./communications";

const repo = () => getAutomationRepository();

type DeliveryTarget = { channel: "EMAIL" | "WHATSAPP" | "OTHER"; to: string };

async function deliverDocument(kind: "PROPOSAL" | "CONTRACT", payload: Record<string, unknown>) {
  const delivery=payload.delivery as DeliveryTarget | undefined;
  if(!delivery?.to)throw new DomainError("Document send requires an approved delivery target","DELIVERY_TARGET_REQUIRED",422);
  const url=process.env.DOCUMENT_SEND_WEBHOOK_URL;
  if(!url){
    if(process.env.DOCUMENT_SEND_MODE==="mock"){
      return {provider:"mock",kind,channel:delivery.channel,to:delivery.to,status:"sent",sentAt:nowIso()};
    }
    throw new DomainError("Document send provider is not configured","DOCUMENT_PROVIDER_NOT_CONFIGURED",503);
  }
  const headers:Record<string,string>={"content-type":"application/json"};
  if(process.env.DOCUMENT_SEND_API_TOKEN)headers.authorization="Bearer "+process.env.DOCUMENT_SEND_API_TOKEN;
  const response=await fetch(url,{method:"POST",headers,body:JSON.stringify({kind,delivery,document:payload})});
  const raw=await response.text();
  if(!response.ok)throw new DomainError("Document provider rejected delivery","DOCUMENT_SEND_FAILED",502,{status:response.status,body:raw.slice(0,1000)});
  let result:Record<string,unknown>={providerStatus:response.status,status:"sent",kind};
  try{result={...result,...JSON.parse(raw) as Record<string,unknown>};}catch{result.raw=raw.slice(0,1000);}
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
  await automationAudit(actor, "qualification.upsert", "qualification", item.id, { version: item.version }, {}, leadId, tool);
  return item;
}

export async function getQualification(leadId: string) {
  await getLead(leadId);
  return repo().getQualification(leadId);
}

function renderProposal(proposal: Proposal) {
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
  const existing = await repo().listProposals(leadId);
  const base: Omit<Proposal, "id" | "createdAt" | "updatedAt"> = {
    leadId,
    version: (existing[0]?.version ?? 0) + 1,
    status: "DRAFT",
    ...input,
    renderedContent: null,
    artifactRef: null,
    approvalId: null,
    sentAt: null,
    responseNotes: null,
    createdByType: actor.type,
    createdById: actor.id,
  };
  const created = await repo().createProposal(base);
  const updated = await repo().updateProposal(created.id, created.version, {
    renderedContent: renderProposal(created),
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
  return updated ?? created;
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

export async function updateProposal(
  id: string,
  changes: Partial<Proposal>,
  expectedVersion: number | undefined,
  actor: ActorContext,
  tool?: string,
) {
  const before = await getProposal(id);
  if (changes.agencyFeeCents != null && changes.agencyFeeCents < 0) {
    throw new DomainError("Agency fee cannot be negative", "INVALID_PRICE", 422);
  }
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
    { changed: Object.keys(changes) },
    { version: updated.version },
    before.leadId,
    tool,
  );
  return updated;
}

export async function requestProposalApproval(id: string, actor: ActorContext, tool?: string, delivery?: DeliveryTarget) {
  const proposal = await getProposal(id);
  if (proposal.agencyFeeCents == null || !proposal.paymentTerms) {
    throw new DomainError(
      "Proposal pricing/payment terms are HUMAN_REQUIRED before sending",
      "PRICE_HUMAN_REQUIRED",
      422,
    );
  }
  const approval = await createApprovalRequest({
    leadId: proposal.leadId,
    actionType: "PROPOSAL_SEND",
    payload: {
      proposalId: id,
      version: proposal.version,
      renderedContent: proposal.renderedContent,
      delivery: delivery ?? null,
    },
    preview: proposal.renderedContent ?? "Proposta",
    rationale: "Enviar proposta comercial versionada.",
  }, actor, tool);
  const updated = await repo().updateProposal(id, proposal.version, {
    status: "PENDING_APPROVAL",
    approvalId: approval.id,
  });
  if (!updated) throwVersionConflict("Proposal");
  return { proposal: updated, approval };
}

export async function executeApprovedProposal(
  approvalId: string,
  actor: ActorContext,
  tool?: string,
) {
  const approval = await getApproval(approvalId);
  if (approval.actionType !== "PROPOSAL_SEND" || approval.status !== "APPROVED") {
    throw new DomainError(
      "Approved proposal-send request required",
      "APPROVAL_NOT_APPROVED",
      409,
    );
  }
  const proposalId = String(approval.payload.proposalId ?? "");
  const proposal = await getProposal(proposalId);
  const currentLead = await getLead(proposal.leadId);
  if (currentLead.lead.doNotContact || currentLead.lead.status === "DO_NOT_CONTACT") {
    throw new DomainError("Lead is now do-not-contact", "DO_NOT_CONTACT", 403);
  }
  if (Number(approval.payload.version) !== proposal.version) {
    throw new DomainError(
      "Proposal changed after approval request",
      "APPROVAL_PAYLOAD_MISMATCH",
      409,
    );
  }
  const deliveryResult = await deliverDocument("PROPOSAL", approval.payload);
  const updated = await repo().updateProposal(proposal.id, proposal.version, {
    status: "SENT",
    sentAt: nowIso(),
  });
  if (!updated) throwVersionConflict("Proposal");
  const done = await repo().updateApproval(approval.id, approval.version, {
    status: "EXECUTED",
    executedAt: nowIso(),
    executionResult: { proposalId: proposal.id, status: "SENT", delivery: deliveryResult },
  });
  if (!done) throwVersionConflict("Approval");
  const lead = await getLead(proposal.leadId);
  if (lead.lead.status !== "PROPOSAL_SENT") {
    await moveLeadStage(proposal.leadId, "PROPOSAL_SENT", actor, {
      reason: "Approved proposal marked as sent",
      tool,
    });
  }
  await automationAudit(
    actor,
    "proposal.send.approved",
    "proposal",
    proposal.id,
    { approvalId },
    { status: "SENT", delivery: deliveryResult },
    proposal.leadId,
    tool,
  );
  return updated;
}

export async function markProposalResponse(
  id: string,
  status: "ACCEPTED" | "REJECTED",
  notes: string | undefined,
  actor: ActorContext,
  tool?: string,
) {
  const proposal = await getProposal(id);
  const updated = await repo().updateProposal(id, proposal.version, {
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
  await automationAudit(actor, "proposal.response", "proposal", id, { status, notes }, {}, proposal.leadId, tool);
  return updated;
}

function renderContract(contract: Contract) {
  const list = (title: string, values: string[]) =>
    "## " + title + "\n" + (values.map((item) => "- " + item).join("\n") || "- N/A");
  return [
    "# Contrato — " + contract.templateId,
    "",
    "Proposal: " + contract.proposalId,
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
  if (!["ACCEPTED", "SENT", "APPROVED"].includes(proposal.status)) {
    throw new DomainError(
      "Proposal must be approved/sent/accepted before contract generation",
      "PROPOSAL_NOT_CONTRACTABLE",
      422,
    );
  }
  const existing = await repo().listContracts(proposal.leadId);
  const base: Omit<Contract, "id" | "createdAt" | "updatedAt"> = {
    leadId: proposal.leadId,
    proposalId,
    templateId: input.templateId,
    templateVersion: input.templateVersion,
    version: (existing[0]?.version ?? 0) + 1,
    status: "DRAFT",
    parties: input.parties ?? {},
    terms: input.terms ?? {},
    responsibilitiesAgency: input.responsibilitiesAgency ?? proposal.scope,
    responsibilitiesClient: input.responsibilitiesClient ?? proposal.clientDependencies,
    paymentObligations: input.paymentObligations ?? [],
    deliverables: input.deliverables ?? proposal.scope,
    supportObligations: input.supportObligations ?? [],
    renderedContent: null,
    artifactRef: null,
    approvalId: null,
    signatureProvider: null,
    externalSignatureId: null,
    signedArtifactRef: null,
    signedAt: null,
    createdByType: actor.type,
    createdById: actor.id,
  };
  const created = await repo().createContract(base);
  const updated = await repo().updateContract(created.id, created.version, {
    renderedContent: renderContract(created),
  });
  await automationAudit(
    actor,
    "contract.create",
    "contract",
    created.id,
    { proposalId, templateId: input.templateId },
    { version: created.version },
    proposal.leadId,
    tool,
  );
  return updated ?? created;
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

export async function updateContractDraft(
  id: string,
  changes: Partial<Contract>,
  expectedVersion: number | undefined,
  actor: ActorContext,
  tool?: string,
) {
  const before = await getContract(id);
  if (before.status !== "DRAFT" && before.status !== "PENDING_REVIEW") {
    throw new DomainError("Only draft contracts can be edited", "CONTRACT_NOT_EDITABLE", 409);
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
    { changed: Object.keys(changes) },
    { version: updated.version },
    before.leadId,
    tool,
  );
  return updated;
}

export async function requestContractApproval(
  id: string,
  actor: ActorContext,
  tool?: string,
  delivery?: DeliveryTarget,
) {
  const contract = await getContract(id);
  const approval = await createApprovalRequest({
    leadId: contract.leadId,
    actionType: "CONTRACT_SEND",
    payload: {
      contractId: id,
      version: contract.version,
      renderedContent: contract.renderedContent,
      delivery: delivery ?? null,
    },
    preview: contract.renderedContent ?? "Contrato",
    rationale: "Revisão humana/jurídica obrigatória antes do envio.",
  }, actor, tool);
  const updated = await repo().updateContract(id, contract.version, {
    status: "PENDING_REVIEW",
    approvalId: approval.id,
  });
  if (!updated) throwVersionConflict("Contract");
  return { contract: updated, approval };
}

export async function executeApprovedContract(
  approvalId: string,
  actor: ActorContext,
  tool?: string,
) {
  const approval = await getApproval(approvalId);
  if (approval.actionType !== "CONTRACT_SEND" || approval.status !== "APPROVED") {
    throw new DomainError(
      "Approved contract-send request required",
      "APPROVAL_NOT_APPROVED",
      409,
    );
  }
  const contractId = String(approval.payload.contractId ?? "");
  const contract = await getContract(contractId);
  const currentLead = await getLead(contract.leadId);
  if (currentLead.lead.doNotContact || currentLead.lead.status === "DO_NOT_CONTACT") {
    throw new DomainError("Lead is now do-not-contact", "DO_NOT_CONTACT", 403);
  }
  if (Number(approval.payload.version) !== contract.version) {
    throw new DomainError(
      "Contract changed after approval request",
      "APPROVAL_PAYLOAD_MISMATCH",
      409,
    );
  }
  const deliveryResult = await deliverDocument("CONTRACT", approval.payload);
  const updated = await repo().updateContract(contract.id, contract.version, {
    status: "SENT",
  });
  if (!updated) throwVersionConflict("Contract");
  const done = await repo().updateApproval(approval.id, approval.version, {
    status: "EXECUTED",
    executedAt: nowIso(),
    executionResult: { contractId: contract.id, status: "SENT", delivery: deliveryResult },
  });
  if (!done) throwVersionConflict("Approval");
  await automationAudit(
    actor,
    "contract.send.approved",
    "contract",
    contract.id,
    { approvalId },
    { status: "SENT" },
    contract.leadId,
    tool,
  );
  return updated;
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
    { status: input.status },
    {},
    contract.leadId,
    tool,
  );
  return updated;
}
