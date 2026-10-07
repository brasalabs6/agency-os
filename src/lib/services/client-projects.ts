import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type { ProjectObligation } from "@/lib/domain/automation";
import { getAutomationRepository } from "@/lib/repositories";
import { getLead, moveLeadStage } from "./leads";
import { getContract } from "./sales-automation";
import { automationAudit, nowIso } from "./automation-utils";

const repo = () => getAutomationRepository();

type NewObligation = Omit<ProjectObligation, "id" | "createdAt" | "updatedAt" | "projectId">;

function expectedObligations(contract: Awaited<ReturnType<typeof getContract>>): NewObligation[] {
  const items: NewObligation[] = [];

  contract.deliverables.forEach((title, index) => {
    items.push({
      sourceContractId: contract.id,
      sourceKey: "deliverable:" + index,
      party: "AGENCY",
      kind: "DELIVERABLE",
      title,
      status: "TODO",
      description: null,
      dueAt: null,
      metadata: {},
    });
  });

  contract.responsibilitiesAgency.forEach((title, index) => {
    if (!contract.deliverables.includes(title)) {
      items.push({
        sourceContractId: contract.id,
        sourceKey: "agency-responsibility:" + index,
        party: "AGENCY",
        kind: "OTHER",
        title,
        status: "TODO",
        description: null,
        dueAt: null,
        metadata: {},
      });
    }
  });

  contract.responsibilitiesClient.forEach((title, index) => {
    items.push({
      sourceContractId: contract.id,
      sourceKey: "client-dependency:" + index,
      party: "CLIENT",
      kind: "DEPENDENCY",
      title,
      status: "TODO",
      description: null,
      dueAt: null,
      metadata: {},
    });
  });

  contract.paymentObligations.forEach((payment, index) => {
    items.push({
      sourceContractId: contract.id,
      sourceKey: "payment:" + index,
      party: "CLIENT",
      kind: "PAYMENT",
      title: String(payment.title ?? "Pagamento contratual"),
      status: "TODO",
      description: String(payment.description ?? ""),
      dueAt: typeof payment.dueAt === "string" ? payment.dueAt : null,
      metadata: payment,
    });
  });

  contract.supportObligations.forEach((title, index) => {
    items.push({
      sourceContractId: contract.id,
      sourceKey: "support:" + index,
      party: "AGENCY",
      kind: "SUPPORT",
      title,
      status: "TODO",
      description: null,
      dueAt: null,
      metadata: {},
    });
  });

  return items;
}

export async function createProjectFromSignedContract(
  contractId: string,
  input: { name?: string; ownerUserId?: string | null; targetAt?: string | null },
  actor: ActorContext,
  tool?: string,
) {
  const contract = await getContract(contractId);
  if (contract.status !== "SIGNED") {
    throw new DomainError(
      "Only signed contracts can create client projects",
      "CONTRACT_NOT_SIGNED",
      422,
    );
  }

  const lead = await getLead(contract.leadId);
  const project = (await repo().getProjectByContract(contractId)) ?? await repo().createProject({
    leadId: contract.leadId,
    contractId,
    name: input.name ?? lead.lead.name,
    status: "ACTIVE",
    ownerUserId: input.ownerUserId ?? lead.lead.owner?.id ?? null,
    startedAt: nowIso(),
    targetAt: input.targetAt ?? null,
    completedAt: null,
  });

  const existing = await repo().listObligations(project.id);
  const existingKeys = new Set(existing.map((item) => item.sourceKey));
  let createdCount = 0;
  for (const obligation of expectedObligations(contract)) {
    if (existingKeys.has(obligation.sourceKey)) continue;
    await repo().createObligation({
      projectId: project.id,
      ...obligation,
    });
    existingKeys.add(obligation.sourceKey);
    createdCount += 1;
  }

  const current = await getLead(contract.leadId);
  if (current.lead.status === "WON") {
    await moveLeadStage(contract.leadId, "ONBOARDING", actor, {
      reason: "Client project reconciled from signed contract",
      tool,
    });
  }

  const obligations = await repo().listObligations(project.id);
  await automationAudit(
    actor,
    "project.create_from_contract",
    "client_project",
    project.id,
    { contractId },
    { obligations: obligations.length, obligationsCreated: createdCount },
    contract.leadId,
    tool,
  );
  return project;
}

export async function listProjects(leadId: string) {
  await getLead(leadId);
  const projects = await repo().listProjects(leadId);
  return Promise.all(
    projects.map(async (project) => ({
      ...project,
      obligations: await repo().listObligations(project.id),
    })),
  );
}

export async function updateProjectObligation(
  id: string,
  changes: {
    status?: ProjectObligation["status"];
    dueAt?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown>;
  },
  actor: ActorContext,
  tool?: string,
) {
  const updated = await repo().updateObligation(id, changes);
  if (!updated) throw new DomainError("Obligation not found", "OBLIGATION_NOT_FOUND", 404);
  await automationAudit(
    actor,
    "project_obligation.update",
    "project_obligation",
    id,
    { changes },
    { status: updated.status },
    null,
    tool,
  );
  return updated;
}
