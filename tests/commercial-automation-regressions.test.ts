import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ActorContext } from "@/lib/domain/types";
import { getAutomationRepository } from "@/lib/repositories";
import { createLead, getLead } from "@/lib/services/leads";
import {
  approveRequest,
  createApprovalRequest,
  createChannelConnection,
  executeApprovedWhatsapp,
  getApproval,
  ingestWhatsAppConversation,
} from "@/lib/services/communications";
import {
  createContractFromProposal,
  createProposal,
  executeApprovedContract,
  executeApprovedProposal,
  markProposalResponse,
  requestContractApproval,
  requestProposalApproval,
  updateContractDraft,
  updateContractSignature,
  updateProposal,
} from "@/lib/services/sales-automation";
import { createProjectFromSignedContract } from "@/lib/services/client-projects";
import { approveDiagnostic, createDiagnostic, finalizeDiagnostic, updateDiagnostic } from "@/lib/services/intelligence";
import { hashPayload } from "@/lib/services/automation-utils";

const previous = {
  driver: process.env.DATA_DRIVER,
  whatsapp: process.env.WHATSAPP_SEND_MODE,
  document: process.env.DOCUMENT_SEND_MODE,
  lease: process.env.APPROVAL_EXECUTION_LEASE_SECONDS,
};

const admin: ActorContext = {
  type: "USER",
  id: "00000000-0000-4000-8000-000000000001",
  name: "Admin",
  role: "ADMIN",
  scopes: ["approvals.approve"],
};
const agent: ActorContext = {
  type: "AGENT",
  id: "agent-regression",
  name: "Agent",
  scopes: [],
};

beforeEach(() => {
  process.env.DATA_DRIVER = "mock";
  process.env.WHATSAPP_SEND_MODE = "mock";
  process.env.DOCUMENT_SEND_MODE = "mock";
});

afterEach(() => {
  if (previous.driver === undefined) delete process.env.DATA_DRIVER;
  else process.env.DATA_DRIVER = previous.driver;
  if (previous.whatsapp === undefined) delete process.env.WHATSAPP_SEND_MODE;
  else process.env.WHATSAPP_SEND_MODE = previous.whatsapp;
  if (previous.document === undefined) delete process.env.DOCUMENT_SEND_MODE;
  else process.env.DOCUMENT_SEND_MODE = previous.document;
  if (previous.lease === undefined) delete process.env.APPROVAL_EXECUTION_LEASE_SECONDS;
  else process.env.APPROVAL_EXECUTION_LEASE_SECONDS = previous.lease;
});

async function makeLead(status: "QUALIFIED" | "READY_TO_CONTACT" = "QUALIFIED") {
  return createLead({
    name: "Regression " + randomUUID(),
    status,
    email: "client@example.test",
    sourceType: "TEST",
  }, admin, { allowDuplicate: true, tool: "test" });
}

async function makeAcceptedProposal() {
  const lead = await makeLead("QUALIFIED");
  const proposal = await createProposal(lead.id, {
    diagnosticId: null,
    qualificationId: null,
    services: ["WEBSITE"],
    scope: ["Site institucional"],
    exclusions: [],
    assumptions: [],
    clientDependencies: [],
    milestones: [],
    agencyFeeCents: 150000,
    currency: "BRL",
    externalCosts: [],
    paymentTerms: "50/50",
    validityUntil: null,
  }, agent);

  const pending = await requestProposalApproval(
    proposal.id,
    proposal.version,
    agent,
    "test",
    { channel: "EMAIL", to: "client@example.test" },
  );
  expect(pending.proposal.version).toBe(Number(pending.approval.payload.version));

  const approved = await approveRequest(
    pending.approval.id,
    { expectedVersion: pending.approval.version },
    admin,
  );
  const sent = await executeApprovedProposal(approved.id, agent, "test");
  expect(sent.status).toBe("SENT");
  expect((await getApproval(approved.id)).status).toBe("EXECUTED");

  const accepted = await markProposalResponse(
    sent.id,
    "ACCEPTED",
    "Cliente aprovou",
    sent.version,
    agent,
    "test",
  );
  return { lead, proposal: accepted };
}

describe("commercial automation regressions", () => {
  it("uses canonical payload hashes independent of object key order", () => {
    const left = { b: 2, a: { z: 3, y: [2, { b: 1, a: 0 }] } };
    const right = { a: { y: [2, { a: 0, b: 1 }], z: 3 }, b: 2 };
    expect(hashPayload(left)).toBe(hashPayload(right));
  });

  it("makes finalized/approved diagnostics immutable", async () => {
    const lead = await makeLead();
    const draft = await createDiagnostic(lead.id, {
      executiveSummary: "Diagnóstico",
      strengths: [],
      gaps: [],
      recommendations: [],
      scores: {},
      recommendedServices: [],
    }, agent, "test");
    const ready = await finalizeDiagnostic(draft.id, draft.version, agent, "test");
    expect(ready.status).toBe("READY");

    await expect(updateDiagnostic(
      ready.id,
      { executiveSummary: "mutação indevida" },
      ready.version,
      agent,
      "test",
    )).rejects.toMatchObject({ code: "DIAGNOSTIC_NOT_EDITABLE" });

    const approved = await approveDiagnostic(ready.id, ready.version, admin);
    expect(approved.status).toBe("APPROVED");
    await expect(finalizeDiagnostic(
      approved.id,
      approved.version,
      agent,
      "test",
    )).rejects.toMatchObject({ code: "DIAGNOSTIC_NOT_FINALIZABLE" });
  });

  it("blocks WhatsApp approvals that are unbound or target another recipient", async () => {
    await expect(createApprovalRequest({
      actionType: "WHATSAPP_SEND",
      payload: { to: "+5561999999999", text: "Sem lead" },
      preview: "Sem lead",
    }, agent)).rejects.toMatchObject({ code: "CONTACT_ACTION_LEAD_REQUIRED" });

    const lead = await createLead({
      name: "Target binding " + randomUUID(),
      status: "READY_TO_CONTACT",
      whatsapp: "+5561888888888",
      sourceType: "TEST",
    }, admin, { allowDuplicate: true, tool: "test" });
    await expect(createApprovalRequest({
      leadId: lead.id,
      actionType: "WHATSAPP_SEND",
      payload: { to: "+5561777777777", text: "Destino errado" },
      preview: "Destino errado",
    }, agent)).rejects.toMatchObject({ code: "CONTACT_TARGET_NOT_LINKED" });
  });

  it("blocks generic creation of proposal/contract approvals", async () => {
    await expect(createApprovalRequest({
      actionType: "PROPOSAL_SEND",
      payload: { proposalId: randomUUID(), version: 1 },
      preview: "proposal",
    }, agent)).rejects.toMatchObject({ code: "SPECIALIZED_APPROVAL_FLOW_REQUIRED" });
  });

  it("runs proposal request -> approval -> execution without a stale version", async () => {
    const { proposal } = await makeAcceptedProposal();
    expect(proposal.status).toBe("ACCEPTED");
    await expect(updateProposal(
      proposal.id,
      { paymentTerms: "altered after acceptance" },
      proposal.version,
      agent,
    )).rejects.toMatchObject({ code: "PROPOSAL_NOT_EDITABLE", status: 409 });
  });

  it("binds contract to the exact accepted proposal snapshot and enforces signature state machine", async () => {
    const { lead, proposal } = await makeAcceptedProposal();
    const contract = await createContractFromProposal(proposal.id, {
      proposalVersion: proposal.version,
      templateId: "standard-web",
      templateVersion: "1",
      parties: {},
      terms: { revisions: 2 },
      responsibilitiesAgency: ["Construir site"],
      responsibilitiesClient: ["Enviar identidade visual"],
      paymentObligations: [{ title: "Entrada", dueAt: "2026-12-01T12:00:00.000Z" }],
      deliverables: ["Site", "Landing page"],
      supportObligations: ["30 dias de suporte"],
    }, agent, "test");

    expect(contract.proposalVersion).toBe(proposal.version);
    expect(contract.proposalSnapshotHash).toBe(hashPayload(contract.proposalSnapshot));

    await expect(updateContractSignature(contract.id, {
      status: "SIGNED",
      externalSignatureId: "sig-invalid",
    }, admin, "test")).rejects.toMatchObject({ code: "INVALID_CONTRACT_SIGNATURE_STATE" });

    const pending = await requestContractApproval(
      contract.id,
      contract.version,
      agent,
      "test",
      { channel: "EMAIL", to: "client@example.test" },
    );
    expect(pending.contract.version).toBe(Number(pending.approval.payload.version));

    const approved = await approveRequest(
      pending.approval.id,
      { expectedVersion: pending.approval.version },
      admin,
    );
    const sent = await executeApprovedContract(approved.id, agent, "test");
    expect(sent.status).toBe("SENT");

    const signed = await updateContractSignature(sent.id, {
      status: "SIGNED",
      signatureProvider: "test",
      externalSignatureId: "sig-1",
      signedArtifactRef: "test://signed",
    }, admin, "test");
    expect(signed.status).toBe("SIGNED");

    const repeated = await updateContractSignature(sent.id, {
      status: "SIGNED",
      signatureProvider: "test",
      externalSignatureId: "sig-1",
      signedArtifactRef: "test://signed",
    }, admin, "test");
    expect(repeated.version).toBe(signed.version);

    await expect(updateContractSignature(sent.id, {
      status: "DECLINED",
      externalSignatureId: "sig-1",
    }, admin, "test")).rejects.toMatchObject({ code: "CONTRACT_SIGNATURE_TERMINAL" });

    await expect(updateContractDraft(
      signed.id,
      { terms: { revisions: 99 } },
      signed.version,
      agent,
    )).rejects.toMatchObject({ code: "CONTRACT_NOT_EDITABLE" });

    expect((await getLead(lead.id)).lead.status).toBe("WON");
  });

  it("claims external execution before side effect and makes retries idempotent", async () => {
    const lead = await createLead({
      name: "WhatsApp idempotency " + randomUUID(),
      status: "READY_TO_CONTACT",
      whatsapp: "+5561999999999",
      sourceType: "TEST",
    }, admin, { allowDuplicate: true, tool: "test" });
    const pending = await createApprovalRequest({
      leadId: lead.id,
      actionType: "WHATSAPP_SEND",
      payload: { to: "+5561999999999", text: "Teste idempotente" },
      preview: "Teste idempotente",
    }, agent);
    const approved = await approveRequest(
      pending.id,
      { expectedVersion: pending.version },
      admin,
    );

    const results = await Promise.allSettled([
      executeApprovedWhatsapp(approved.id, agent, "test"),
      executeApprovedWhatsapp(approved.id, agent, "test"),
    ]);
    expect(results.some((item) => item.status === "fulfilled")).toBe(true);
    const stored = await getApproval(approved.id);
    expect(stored.status).toBe("EXECUTED");
    expect(stored.executionResult).toMatchObject({
      messageId: "mock_" + approved.id,
      idempotencyKey: approved.id,
    });

    const retry = await executeApprovedWhatsapp(approved.id, agent, "test");
    expect(retry.result).toMatchObject({
      messageId: "mock_" + approved.id,
      idempotencyKey: approved.id,
    });
  });

  it("recovers a stale EXECUTING lease with the same idempotency key", async () => {
    process.env.APPROVAL_EXECUTION_LEASE_SECONDS = "0";
    const lead = await createLead({
      name: "Lease recovery " + randomUUID(),
      status: "READY_TO_CONTACT",
      whatsapp: "+5561666666666",
      sourceType: "TEST",
    }, admin, { allowDuplicate: true, tool: "test" });
    const pending = await createApprovalRequest({
      leadId: lead.id,
      actionType: "WHATSAPP_SEND",
      payload: { to: "+5561666666666", text: "Recovery" },
      preview: "Recovery",
    }, agent);
    const approved = await approveRequest(
      pending.id,
      { expectedVersion: pending.version },
      admin,
    );
    const repo = getAutomationRepository();
    const executing = await repo.updateApproval(approved.id, approved.version, {
      status: "EXECUTING",
      executionResult: {
        idempotencyKey: approved.id,
        startedAt: "2000-01-01T00:00:00.000Z",
      },
    });
    expect(executing?.status).toBe("EXECUTING");

    const recovered = await executeApprovedWhatsapp(approved.id, agent, "test");
    expect(recovered.approval.status).toBe("EXECUTED");
    expect(recovered.result).toMatchObject({
      messageId: "mock_" + approved.id,
      idempotencyKey: approved.id,
    });
  });

  it("preserves conversation binding and makes opt-out monotonic when ingest omits leadId", async () => {
    const lead = await makeLead("READY_TO_CONTACT");
    const connection = await createChannelConnection({
      accountLabel: "Test",
      capabilities: ["READ"],
    }, admin);
    const externalId = "thread-" + randomUUID();

    await ingestWhatsAppConversation({
      connectionId: connection.id,
      externalId,
      leadId: lead.id,
      contactAddress: "+5561888888888",
      contactDisplayName: "Cliente",
      messages: [{
        externalId: "m1",
        direction: "INBOUND",
        sentAt: "2026-10-07T10:00:00.000Z",
        sender: "+5561888888888",
        text: "Olá",
        rawMetadata: {},
      }],
    }, agent, "test");

    const optedOut = await ingestWhatsAppConversation({
      connectionId: connection.id,
      externalId,
      contactAddress: "+5561888888888",
      optOutDetected: true,
      messages: [{
        externalId: "m2",
        direction: "INBOUND",
        sentAt: "2026-10-07T10:01:00.000Z",
        sender: "+5561888888888",
        text: "Não quero mais mensagens",
        rawMetadata: {},
      }],
    }, agent, "test");

    expect(optedOut.conversation.leadId).toBe(lead.id);
    expect(optedOut.conversation.optOutDetected).toBe(true);
    expect((await getLead(lead.id)).lead.status).toBe("DO_NOT_CONTACT");

    const later = await ingestWhatsAppConversation({
      connectionId: connection.id,
      externalId,
      contactAddress: "+5561888888888",
      optOutDetected: false,
      messages: [{
        externalId: "m3",
        direction: "INBOUND",
        sentAt: "2026-10-07T10:02:00.000Z",
        sender: "+5561888888888",
        text: "Mensagem posterior",
        rawMetadata: {},
      }],
    }, agent, "test");
    expect(later.conversation.leadId).toBe(lead.id);
    expect(later.conversation.optOutDetected).toBe(true);
  });

  it("rejects cross-lead diagnostic references in proposal creation", async () => {
    const a = await makeLead();
    const b = await makeLead();
    const diagnostic = await createDiagnostic(a.id, {
      executiveSummary: "A",
      strengths: [],
      gaps: [],
      recommendations: [],
      scores: {},
      recommendedServices: [],
    }, agent, "test");

    await expect(createProposal(b.id, {
      diagnosticId: diagnostic.id,
      qualificationId: null,
      services: ["WEBSITE"],
      scope: [],
      exclusions: [],
      assumptions: [],
      clientDependencies: [],
      milestones: [],
      agencyFeeCents: 10000,
      currency: "BRL",
      externalCosts: [],
      paymentTerms: "À vista",
      validityUntil: null,
    }, agent, "test")).rejects.toMatchObject({ code: "RELATION_LEAD_MISMATCH" });
  });

  it("reconciles missing project obligations on retry without duplicating existing ones", async () => {
    const { proposal } = await makeAcceptedProposal();
    const contract = await createContractFromProposal(proposal.id, {
      proposalVersion: proposal.version,
      templateId: "project-retry",
      templateVersion: "1",
      deliverables: ["A", "B"],
      responsibilitiesAgency: ["C"],
      responsibilitiesClient: ["D"],
      paymentObligations: [{ title: "P1" }],
      supportObligations: ["S1"],
    }, agent, "test");
    const pending = await requestContractApproval(
      contract.id,
      contract.version,
      agent,
      "test",
      { channel: "EMAIL", to: "client@example.test" },
    );
    const approved = await approveRequest(
      pending.approval.id,
      { expectedVersion: pending.approval.version },
      admin,
    );
    const sent = await executeApprovedContract(approved.id, agent, "test");
    const signed = await updateContractSignature(sent.id, {
      status: "SIGNED",
      externalSignatureId: "sig-project-" + randomUUID(),
    }, admin, "test");

    const repo = getAutomationRepository();
    const lead = (await getLead(signed.leadId)).lead;
    const partial = await repo.createProject({
      leadId: signed.leadId,
      contractId: signed.id,
      name: "Partial",
      status: "ACTIVE",
      ownerUserId: null,
      startedAt: new Date().toISOString(),
      targetAt: null,
      completedAt: null,
    });
    await repo.createObligation({
      projectId: partial.id,
      sourceContractId: signed.id,
      sourceKey: "deliverable:0",
      party: "AGENCY",
      kind: "DELIVERABLE",
      title: "A",
      status: "TODO",
      description: null,
      dueAt: null,
      metadata: {},
    });

    const project = await createProjectFromSignedContract(signed.id, {}, admin, "test");
    expect(project.id).toBe(partial.id);
    const obligations = await repo.listObligations(project.id);
    expect(new Set(obligations.map((item) => item.sourceKey)).size).toBe(6);
    expect(obligations).toHaveLength(6);

    await createProjectFromSignedContract(signed.id, {}, admin, "test");
    expect(await repo.listObligations(project.id)).toHaveLength(6);
    expect(["ONBOARDING", "WON"]).toContain((await getLead(lead.id)).lead.status);
  });
});
