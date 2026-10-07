import { randomUUID } from "node:crypto";
import { pipelineGroupForStatus } from "@/lib/domain/status";
import type {
  AuditLog,
  CreateLeadInput,
  Lead,
  LeadActivity,
  LeadEvidence,
  LeadSearchFilters,
  LeadSearchResult,
  UpdateLeadInput,
  UserSummary,
} from "@/lib/domain/types";
import { createDemoActivities, createDemoEvidence, createDemoLeads, DEMO_USERS } from "@/lib/mock/seed-data";
import type { AddActivityInput, AddAuditInput, AddEvidenceInput, LeadRepository } from "./lead-repository";

const clone = <T>(value: T): T => structuredClone(value);
const normalize = (value?: string | null) => (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export class MockLeadRepository implements LeadRepository {
  private leads = createDemoLeads();
  private activities = createDemoActivities(this.leads);
  private evidence = createDemoEvidence(this.leads);
  private audits: AuditLog[] = [];

  async search(filters: LeadSearchFilters): Promise<LeadSearchResult> {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    let items = this.leads.filter((lead) => {
      if (filters.query) {
        const q = normalize(filters.query);
        const haystack = normalize([lead.name, lead.website, lead.phone, lead.email, lead.segment, lead.city, ...lead.tags].filter(Boolean).join(" "));
        if (!haystack.includes(q)) return false;
      }
      if (filters.status && lead.status !== filters.status) return false;
      if (filters.statuses?.length && !filters.statuses.includes(lead.status)) return false;
      if (filters.pipelineGroup && pipelineGroupForStatus(lead.status) !== filters.pipelineGroup) return false;
      if (filters.segment && normalize(lead.segment) !== normalize(filters.segment)) return false;
      if (filters.city && normalize(lead.city) !== normalize(filters.city)) return false;
      if (filters.opportunity && lead.primaryOpportunity !== filters.opportunity) return false;
      if (filters.ownerId && lead.owner?.id !== filters.ownerId) return false;
      if (filters.ownerUnassigned && lead.owner) return false;
      if (filters.scoreMin != null && (lead.score ?? -1) < filters.scoreMin) return false;
      if (filters.scoreMax != null && (lead.score ?? 101) > filters.scoreMax) return false;
      if (filters.tags?.length && !filters.tags.every((tag) => lead.tags.includes(tag))) return false;
      const due = lead.nextActionAt ? new Date(lead.nextActionAt) : null;
      if (filters.overdue && (!due || due >= now)) return false;
      if (filters.dueToday && (!due || due < start || due > end)) return false;
      if (filters.noNextAction && lead.nextAction) return false;
      return true;
    });
    items = items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.updatedAt.localeCompare(a.updatedAt));
    const total = items.length;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = filters.offset ?? 0;
    return { items: clone(items.slice(offset, offset + limit)), total, limit, offset };
  }

  async getById(id: string) { return clone(this.leads.find((lead) => lead.id === id) ?? null); }

  async findDuplicate(input: CreateLeadInput) {
    const domain = input.website ? normalize(input.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]) : "";
    return clone(this.leads.find((lead) => {
      const leadDomain = lead.website ? normalize(lead.website.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]) : "";
      if (domain && leadDomain === domain) return true;
      if (input.phone && normalize(lead.phone) === normalize(input.phone)) return true;
      if (input.email && normalize(lead.email) === normalize(input.email)) return true;
      return normalize(lead.name) === normalize(input.name) && normalize(lead.city) === normalize(input.city);
    }) ?? null);
  }

  async create(input: CreateLeadInput) {
    const now = new Date().toISOString();
    const owner = input.ownerId ? DEMO_USERS.find((user) => user.id === input.ownerId) ?? null : null;
    const nextOwner = input.nextActionOwnerId ? DEMO_USERS.find((user) => user.id === input.nextActionOwnerId) ?? null : null;
    const lead: Lead = {
      id: randomUUID(), name: input.name, legalName: input.legalName ?? null, segment: input.segment ?? null,
      city: input.city ?? null, state: input.state ?? null, website: input.website ?? null,
      googleMapsUrl: input.googleMapsUrl ?? null, instagramUrl: input.instagramUrl ?? null,
      phone: input.phone ?? null, whatsapp: input.whatsapp ?? null, email: input.email ?? null,
      contactName: input.contactName ?? null, contactRole: input.contactRole ?? null,
      status: input.status ?? "DISCOVERED", score: input.score ?? null, scoreReasons: input.scoreReasons ?? [],
      primaryOpportunity: input.primaryOpportunity ?? null, opportunityNotes: input.opportunityNotes ?? null,
      owner, tags: input.tags ?? [], sourceType: input.sourceType ?? null, sourceUrl: input.sourceUrl ?? null,
      nextAction: input.nextAction ?? null, nextActionAt: input.nextActionAt ?? null, nextActionOwner: nextOwner,
      doNotContact: input.status === "DO_NOT_CONTACT", createdAt: now, updatedAt: now, version: 1,
    };
    this.leads.unshift(lead);
    return clone(lead);
  }

  async update(id: string, input: UpdateLeadInput) {
    const index = this.leads.findIndex((lead) => lead.id === id);
    if (index < 0) return null;
    const current = this.leads[index];
    if (input.expectedVersion != null && input.expectedVersion !== current.version) return null;
    const owner = input.ownerId === undefined ? current.owner : (input.ownerId ? DEMO_USERS.find((u) => u.id === input.ownerId) ?? null : null);
    const nextOwner = input.nextActionOwnerId === undefined ? current.nextActionOwner : (input.nextActionOwnerId ? DEMO_USERS.find((u) => u.id === input.nextActionOwnerId) ?? null : null);
    const { expectedVersion: _expectedVersion, ownerId: _ownerId, nextActionOwnerId: _nextActionOwnerId, ...changes } = input;
    const updated: Lead = {
      ...current,
      ...changes,
      owner,
      nextActionOwner: nextOwner,
      doNotContact: changes.status === "DO_NOT_CONTACT" ? true : (changes.status && current.status === "DO_NOT_CONTACT" ? false : current.doNotContact),
      updatedAt: new Date().toISOString(),
      version: current.version + 1,
    };
    this.leads[index] = updated;
    return clone(updated);
  }

  async listActivities(leadId: string, limit = 100) {
    return clone(this.activities.filter((item) => item.leadId === leadId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit));
  }

  async addActivity(input: AddActivityInput) {
    const activity: LeadActivity = {
      id: randomUUID(), leadId: input.leadId, type: input.type, actorType: input.actor.type,
      actorId: input.actor.id, actorName: input.actor.name, summary: input.summary,
      metadata: input.metadata ?? {}, createdAt: new Date().toISOString(),
    };
    this.activities.unshift(activity);
    return clone(activity);
  }

  async listEvidence(leadId: string) { return clone(this.evidence.filter((item) => item.leadId === leadId)); }

  async addEvidence(input: AddEvidenceInput) {
    const item: LeadEvidence = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    this.evidence.unshift(item);
    return clone(item);
  }

  async addAudit(input: AddAuditInput) {
    const audit: AuditLog = {
      id: randomUUID(), actorType: input.actor.type, actorId: input.actor.id, tool: input.tool ?? null,
      action: input.action, leadId: input.leadId ?? null, entityType: input.entityType ?? null, entityId: input.entityId ?? null, input: input.input ?? {}, result: input.result ?? {}, createdAt: new Date().toISOString(),
    };
    this.audits.unshift(audit);
    return clone(audit);
  }

  async listUsers(): Promise<UserSummary[]> { return clone(DEMO_USERS.filter((user) => user.active !== false)); }
}

export const mockLeadRepository = new MockLeadRepository();
