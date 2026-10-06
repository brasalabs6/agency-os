import { DomainError } from "@/lib/domain/errors";
import { canContact, canTransition, isActiveStatus } from "@/lib/domain/status";
import type {
  ActorContext,
  CreateLeadInput,
  Lead,
  LeadSearchFilters,
  LeadStatus,
  UpdateLeadInput,
} from "@/lib/domain/types";
import { getLeadRepository, getTaskRepository } from "@/lib/repositories";
import { cancelContactTasksForLead, createTask } from "./tasks";

const repo = () => getLeadRepository();

async function mustGetLead(id: string): Promise<Lead> {
  const lead = await repo().getById(id);
  if (!lead) throw new DomainError("Lead not found", "LEAD_NOT_FOUND", 404);
  return lead;
}

async function ensureAssignableUser(ownerId?: string | null) {
  if (!ownerId) return;
  const users = await repo().listUsers();
  if (!users.some((user) => user.id === ownerId)) {
    throw new DomainError("Owner must be an active user", "INVALID_OWNER", 422, { ownerId });
  }
}

function ensureVersion(result: Lead | null, expectedVersion?: number): Lead {
  if (result) return result;
  if (expectedVersion != null) throw new DomainError("Lead changed since it was read. Reload before writing again.", "VERSION_CONFLICT", 409);
  throw new DomainError("Lead not found", "LEAD_NOT_FOUND", 404);
}

export async function searchLeads(filters: LeadSearchFilters) {
  return repo().search(filters);
}

export async function getLead(id: string) {
  const lead = await mustGetLead(id);
  const [activities, evidence, tasks] = await Promise.all([repo().listActivities(id), repo().listEvidence(id), getTaskRepository().search({ leadId: id, includeCompleted: true, limit: 100 })]);
  return { lead, activities, evidence, tasks: tasks.items };
}

export async function listActivities(id: string, limit = 100) {
  await mustGetLead(id);
  return repo().listActivities(id, limit);
}

export async function createLead(input: CreateLeadInput, actor: ActorContext, options?: { allowDuplicate?: boolean; tool?: string }) {
  await ensureAssignableUser(input.ownerId);
  await ensureAssignableUser(input.nextActionOwnerId);
  const duplicate = await repo().findDuplicate(input);
  if (duplicate && !options?.allowDuplicate) {
    throw new DomainError("Possible duplicate lead", "POSSIBLE_DUPLICATE", 409, { duplicateId: duplicate.id, duplicateName: duplicate.name });
  }
  const lead = await repo().create(input);
  await repo().addActivity({ leadId: lead.id, type: "CREATED", actor, summary: "Lead criado.", metadata: { sourceType: lead.sourceType, sourceUrl: lead.sourceUrl } });
  await repo().addAudit({ actor, tool: options?.tool, action: "lead.create", leadId: lead.id, input: input as unknown as Record<string, unknown>, result: { id: lead.id, version: lead.version } });
  return lead;
}

export async function upsertLeads(inputs: CreateLeadInput[], actor: ActorContext, tool = "leads_upsert") {
  const created: Lead[] = [];
  const updated: Lead[] = [];
  const possibleDuplicates: { input: CreateLeadInput; lead: Lead }[] = [];
  const rejected: { input: CreateLeadInput; error: string }[] = [];

  for (const input of inputs.slice(0, 50)) {
    try {
      const duplicate = await repo().findDuplicate(input);
      if (!duplicate) {
        created.push(await createLead(input, actor, { tool }));
        continue;
      }
      const highConfidence = Boolean(
        (input.website && duplicate.website === input.website) ||
        (input.phone && duplicate.phone === input.phone) ||
        (input.email && duplicate.email === input.email),
      );
      if (!highConfidence) {
        possibleDuplicates.push({ input, lead: duplicate });
        continue;
      }
      const patch: UpdateLeadInput = {
        segment: input.segment ?? duplicate.segment,
        city: input.city ?? duplicate.city,
        state: input.state ?? duplicate.state,
        website: input.website ?? duplicate.website,
        googleMapsUrl: input.googleMapsUrl ?? duplicate.googleMapsUrl,
        instagramUrl: input.instagramUrl ?? duplicate.instagramUrl,
        phone: input.phone ?? duplicate.phone,
        whatsapp: input.whatsapp ?? duplicate.whatsapp,
        email: input.email ?? duplicate.email,
        score: input.score ?? duplicate.score,
        scoreReasons: input.scoreReasons?.length ? input.scoreReasons : duplicate.scoreReasons,
        primaryOpportunity: input.primaryOpportunity ?? duplicate.primaryOpportunity,
        opportunityNotes: input.opportunityNotes ?? duplicate.opportunityNotes,
        tags: Array.from(new Set([...(duplicate.tags ?? []), ...(input.tags ?? [])])),
        sourceType: input.sourceType ?? duplicate.sourceType,
        sourceUrl: input.sourceUrl ?? duplicate.sourceUrl,
        expectedVersion: duplicate.version,
      };
      updated.push(await updateLead(duplicate.id, patch, actor, tool));
    } catch (error) {
      rejected.push({ input, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return { created, updated, possibleDuplicates, rejected };
}

export async function updateLead(id: string, input: UpdateLeadInput, actor: ActorContext, tool?: string) {
  if (input.status !== undefined) throw new DomainError("Use moveLeadStage to change status", "STATUS_UPDATE_REQUIRES_TRANSITION", 422);
  const before = await mustGetLead(id);
  if (input.ownerId !== undefined) await ensureAssignableUser(input.ownerId);
  if (input.nextActionOwnerId !== undefined) await ensureAssignableUser(input.nextActionOwnerId);
  const updated = ensureVersion(await repo().update(id, input), input.expectedVersion);
  const changed = Object.keys(input).filter((key) => key !== "expectedVersion");
  const ownerChanged = input.ownerId !== undefined && input.ownerId !== before.owner?.id;
  await repo().addActivity({
    leadId: id,
    type: ownerChanged ? "ASSIGNED" : input.score !== undefined && input.score !== before.score ? "SCORE_UPDATED" : "UPDATED",
    actor,
    summary: ownerChanged ? `Responsável alterado de ${before.owner?.name ?? "Unassigned"} para ${updated.owner?.name ?? "Unassigned"}.` : `Lead atualizado: ${changed.join(", ") || "sem alterações"}.`,
    metadata: ownerChanged ? { previousOwnerId: before.owner?.id ?? null, newOwnerId: updated.owner?.id ?? null } : { changed },
  });
  await repo().addAudit({ actor, tool, action: "lead.update", leadId: id, input: input as unknown as Record<string, unknown>, result: { version: updated.version } });
  return updated;
}

export async function moveLeadStage(id: string, targetStatus: LeadStatus, actor: ActorContext, opts?: { reason?: string; expectedVersion?: number; tool?: string }) {
  const before = await mustGetLead(id);
  if (!canTransition(before.status, targetStatus)) {
    throw new DomainError(`Transition ${before.status} -> ${targetStatus} is not allowed`, "INVALID_STAGE_TRANSITION", 422);
  }
  const updated = ensureVersion(await repo().update(id, { status: targetStatus, expectedVersion: opts?.expectedVersion }), opts?.expectedVersion);
  await repo().addActivity({
    leadId: id,
    type: targetStatus === "WON" ? "WON" : targetStatus === "LOST" ? "LOST" : "STAGE_CHANGED",
    actor,
    summary: `Estágio alterado de ${before.status} para ${targetStatus}.${opts?.reason ? ` Motivo: ${opts.reason}` : ""}`,
    metadata: { from: before.status, to: targetStatus, reason: opts?.reason ?? null },
  });
  await repo().addAudit({ actor, tool: opts?.tool, action: "lead.move_stage", leadId: id, input: { targetStatus, reason: opts?.reason }, result: { version: updated.version } });
  if (targetStatus === "DO_NOT_CONTACT") { await cancelContactTasksForLead(id, actor, opts?.tool); return mustGetLead(id); }
  return updated;
}

export async function addLeadNote(id: string, body: string, actor: ActorContext, tool?: string) {
  await mustGetLead(id);
  const activity = await repo().addActivity({ leadId: id, type: "NOTE_ADDED", actor, summary: body, metadata: { body } });
  await repo().addAudit({ actor, tool, action: "lead.add_note", leadId: id, input: { body }, result: { activityId: activity.id } });
  return activity;
}

export async function addLeadEvidence(id: string, input: { sourceUrl: string; sourceType?: string | null; observedAt?: string | null; claim: string; value: string; confidence?: number | null }, actor: ActorContext, tool?: string) {
  await mustGetLead(id);
  const evidence = await repo().addEvidence({ leadId: id, ...input, createdBy: actor.id });
  await repo().addActivity({ leadId: id, type: "SOURCE_ADDED", actor, summary: `Evidência adicionada: ${input.claim} = ${input.value}`, metadata: { evidenceId: evidence.id, sourceUrl: input.sourceUrl } });
  await repo().addAudit({ actor, tool, action: "lead.add_evidence", leadId: id, input, result: { evidenceId: evidence.id } });
  return evidence;
}

export async function setNextAction(id: string, input: { action: string; dueAt?: string | null; ownerId?: string | null; expectedVersion?: number }, actor: ActorContext, tool?: string) {
  const lead = await mustGetLead(id);
  if (!isActiveStatus(lead.status) && !["WON", "ONBOARDING", "NURTURE"].includes(lead.status)) {
    throw new DomainError("Next action cannot be set for this lead status", "NEXT_ACTION_NOT_ALLOWED", 422);
  }
  if (input.expectedVersion != null && input.expectedVersion !== lead.version) throw new DomainError("Lead changed since it was read. Reload before writing again.", "VERSION_CONFLICT", 409);
  await createTask({ leadId: id, title: input.action, type: "TASK", priority: "MEDIUM", dueAt: input.dueAt ?? null, ownerId: input.ownerId ?? lead.owner?.id ?? null }, actor, tool ?? "lead_set_next_action");
  return mustGetLead(id);
}

export async function recordContact(id: string, input: { channel: string; outcome: string; summary: string; contactedAt?: string; nextAction?: string | null; nextActionAt?: string | null; expectedVersion?: number }, actor: ActorContext, tool?: string) {
  const lead = await mustGetLead(id);
  if (!canContact(lead.status, lead.doNotContact)) throw new DomainError("This lead cannot be contacted", "DO_NOT_CONTACT", 403);
  const shouldMoveToContacted = ["DISCOVERED", "ENRICHED", "SCORED", "READY_TO_CONTACT"].includes(lead.status);
  let updated = lead;
  if (shouldMoveToContacted) {
    updated = ensureVersion(await repo().update(id, { status: "CONTACTED", expectedVersion: input.expectedVersion }), input.expectedVersion);
    await repo().addActivity({ leadId: id, type: "STAGE_CHANGED", actor, summary: `Estágio alterado de ${lead.status} para CONTACTED após registro de contato.`, metadata: { from: lead.status, to: "CONTACTED" } });
  } else if (input.expectedVersion != null && input.expectedVersion !== lead.version) {
    throw new DomainError("Lead changed since it was read. Reload before writing again.", "VERSION_CONFLICT", 409);
  }
  await repo().addActivity({ leadId: id, type: "CONTACT_RECORDED", actor, summary: input.summary, metadata: { channel: input.channel, outcome: input.outcome, contactedAt: input.contactedAt ?? new Date().toISOString(), nextAction: input.nextAction ?? null, nextActionAt: input.nextActionAt ?? null } });
  await repo().addAudit({ actor, tool, action: "lead.record_contact", leadId: id, input, result: { version: updated.version, stageMoved: shouldMoveToContacted } });
  if (input.nextAction) {
    await createTask({ leadId: id, title: input.nextAction, type: input.channel === "MEETING" ? "MEETING" : "FOLLOW_UP", priority: "MEDIUM", dueAt: input.nextActionAt ?? null, ownerId: lead.owner?.id ?? null }, actor, tool ?? "lead_record_contact");
    updated = await mustGetLead(id);
  }
  return updated;
}

export async function markOutcome(id: string, input: { outcome: "WON" | "LOST" | "NURTURE" | "INVALID" | "DO_NOT_CONTACT"; reason: string; notes?: string; expectedVersion?: number }, actor: ActorContext, tool?: string) {
  const updated = await moveLeadStage(id, input.outcome, actor, { reason: input.reason, expectedVersion: input.expectedVersion, tool });
  if (input.notes) await addLeadNote(id, input.notes, actor, tool);
  return updated;
}

export async function listUsers() { return repo().listUsers(); }
