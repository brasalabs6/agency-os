import { and, desc, eq, gte, ilike, inArray, isNull, lte, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { auditLogs, leadActivities, leadEvidence, leads, users } from "@/lib/db/schema";
import { PIPELINE_GROUPS } from "@/lib/domain/status";
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
import type { AddActivityInput, AddAuditInput, AddEvidenceInput, LeadRepository } from "./lead-repository";

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

type LeadRow = typeof leads.$inferSelect;

async function userMap(): Promise<Map<string, UserSummary>> {
  const rows = await getDb().select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active }).from(users);
  return new Map(rows.map((user) => [user.id, user]));
}

function mapLead(row: LeadRow, people: Map<string, UserSummary>): Lead {
  return {
    id: row.id, name: row.name, legalName: row.legalName, segment: row.segment, city: row.city, state: row.state,
    website: row.website, googleMapsUrl: row.googleMapsUrl, instagramUrl: row.instagramUrl, phone: row.phone,
    whatsapp: row.whatsapp, email: row.email, contactName: row.contactName, contactRole: row.contactRole,
    status: row.status, score: row.score, scoreReasons: row.scoreReasons ?? [], primaryOpportunity: row.primaryOpportunity,
    opportunityNotes: row.opportunityNotes, owner: row.ownerId ? people.get(row.ownerId) ?? null : null,
    tags: row.tags ?? [], sourceType: row.sourceType, sourceUrl: row.sourceUrl, nextAction: row.nextAction,
    nextActionAt: iso(row.nextActionAt), nextActionOwner: row.nextActionOwnerId ? people.get(row.nextActionOwnerId) ?? null : null,
    doNotContact: row.doNotContact, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), version: row.version,
  };
}

export class PostgresLeadRepository implements LeadRepository {
  async search(filters: LeadSearchFilters): Promise<LeadSearchResult> {
    const conditions: SQL[] = [];
    if (filters.query) {
      const q = `%${filters.query}%`;
      const queryCondition = or(
        ilike(leads.name, q), ilike(leads.website, q), ilike(leads.phone, q), ilike(leads.email, q),
        ilike(leads.segment, q), ilike(leads.city, q), sql`${leads.tags}::text ILIKE ${q}`,
      );
      if (queryCondition) conditions.push(queryCondition);
    }
    if (filters.status) conditions.push(eq(leads.status, filters.status));
    if (filters.statuses?.length) conditions.push(inArray(leads.status, filters.statuses));
    if (filters.pipelineGroup) {
      const group = PIPELINE_GROUPS.find((item) => item.id === filters.pipelineGroup);
      if (group) conditions.push(sql`${leads.status} = ANY(${sql.raw(`ARRAY[${group.statuses.map((s) => `'${s}'`).join(",")}]::text[]`)})`);
    }
    if (filters.segment) conditions.push(ilike(leads.segment, filters.segment));
    if (filters.city) conditions.push(ilike(leads.city, filters.city));
    if (filters.opportunity) conditions.push(eq(leads.primaryOpportunity, filters.opportunity));
    if (filters.ownerId) conditions.push(eq(leads.ownerId, filters.ownerId));
    if (filters.ownerUnassigned) conditions.push(isNull(leads.ownerId));
    if (filters.scoreMin != null) conditions.push(gte(leads.score, filters.scoreMin));
    if (filters.scoreMax != null) conditions.push(lte(leads.score, filters.scoreMax));
    if (filters.noNextAction) conditions.push(isNull(leads.nextAction));
    if (filters.overdue) conditions.push(lt(leads.nextActionAt, new Date()));
    if (filters.dueToday) {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      conditions.push(and(gte(leads.nextActionAt, start), lte(leads.nextActionAt, end))!);
    }
    if (filters.tags?.length) {
      for (const tag of filters.tags) conditions.push(sql`${leads.tags} @> ${JSON.stringify([tag])}::jsonb`);
    }
    const whereClause = conditions.length ? and(...conditions) : undefined;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = filters.offset ?? 0;
    const db = getDb();
    const rows = await db.select().from(leads).where(whereClause).orderBy(desc(leads.score), desc(leads.updatedAt)).limit(limit).offset(offset);
    const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(leads).where(whereClause);
    const people = await userMap();
    return { items: rows.map((row) => mapLead(row, people)), total: countRows[0]?.count ?? 0, limit, offset };
  }

  async getById(id: string) {
    const row = await getDb().select().from(leads).where(eq(leads.id, id)).limit(1);
    const people = await userMap();
    return row[0] ? mapLead(row[0], people) : null;
  }

  async findDuplicate(input: CreateLeadInput) {
    const candidates: SQL[] = [];
    if (input.website) candidates.push(eq(leads.website, input.website));
    if (input.phone) candidates.push(eq(leads.phone, input.phone));
    if (input.email) candidates.push(eq(leads.email, input.email));
    if (input.name && input.city) candidates.push(and(ilike(leads.name, input.name), ilike(leads.city, input.city))!);
    if (!candidates.length) return null;
    const rows = await getDb().select().from(leads).where(or(...candidates)).limit(1);
    const people = await userMap();
    return rows[0] ? mapLead(rows[0], people) : null;
  }

  async create(input: CreateLeadInput) {
    const inserted = await getDb().insert(leads).values({
      name: input.name, legalName: input.legalName, segment: input.segment, city: input.city, state: input.state,
      website: input.website, googleMapsUrl: input.googleMapsUrl, instagramUrl: input.instagramUrl, phone: input.phone,
      whatsapp: input.whatsapp, email: input.email, contactName: input.contactName, contactRole: input.contactRole,
      status: input.status ?? "DISCOVERED", score: input.score, scoreReasons: input.scoreReasons ?? [],
      primaryOpportunity: input.primaryOpportunity, opportunityNotes: input.opportunityNotes, ownerId: input.ownerId,
      tags: input.tags ?? [], sourceType: input.sourceType, sourceUrl: input.sourceUrl, nextAction: input.nextAction,
      nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
      nextActionOwnerId: input.nextActionOwnerId, doNotContact: input.status === "DO_NOT_CONTACT",
    }).returning();
    const people = await userMap();
    return mapLead(inserted[0], people);
  }

  async update(id: string, input: UpdateLeadInput) {
    const conditions = [eq(leads.id, id)];
    if (input.expectedVersion != null) conditions.push(eq(leads.version, input.expectedVersion));
    const { expectedVersion: _expectedVersion, ...rest } = input;
    const patch: Partial<typeof leads.$inferInsert> = {
      ...rest,
      nextActionAt: rest.nextActionAt === undefined ? undefined : (rest.nextActionAt ? new Date(rest.nextActionAt) : null),
      updatedAt: new Date(),
      version: sql`${leads.version} + 1` as unknown as number,
    };
    if (rest.status) patch.doNotContact = rest.status === "DO_NOT_CONTACT";
    const rows = await getDb().update(leads).set(patch).where(and(...conditions)).returning();
    if (!rows[0]) return null;
    return mapLead(rows[0], await userMap());
  }

  async listActivities(leadId: string, limit = 100): Promise<LeadActivity[]> {
    const rows = await getDb().select().from(leadActivities).where(eq(leadActivities.leadId, leadId)).orderBy(desc(leadActivities.createdAt)).limit(limit);
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }

  async addActivity(input: AddActivityInput) {
    const rows = await getDb().insert(leadActivities).values({
      leadId: input.leadId, type: input.type, actorType: input.actor.type, actorId: input.actor.id,
      actorName: input.actor.name, summary: input.summary, metadata: input.metadata ?? {},
    }).returning();
    const row = rows[0];
    return { ...row, createdAt: row.createdAt.toISOString() };
  }

  async listEvidence(leadId: string): Promise<LeadEvidence[]> {
    const rows = await getDb().select().from(leadEvidence).where(eq(leadEvidence.leadId, leadId)).orderBy(desc(leadEvidence.createdAt));
    return rows.map((row) => ({ ...row, observedAt: iso(row.observedAt), createdAt: row.createdAt.toISOString() }));
  }

  async addEvidence(input: AddEvidenceInput) {
    const rows = await getDb().insert(leadEvidence).values({
      leadId: input.leadId, sourceUrl: input.sourceUrl, sourceType: input.sourceType,
      observedAt: input.observedAt ? new Date(input.observedAt) : null, claim: input.claim, value: input.value,
      confidence: input.confidence, createdBy: input.createdBy,
    }).returning();
    const row = rows[0];
    return { ...row, observedAt: iso(row.observedAt), createdAt: row.createdAt.toISOString() };
  }

  async addAudit(input: AddAuditInput): Promise<AuditLog> {
    const rows = await getDb().insert(auditLogs).values({
      actorType: input.actor.type, actorId: input.actor.id, tool: input.tool, action: input.action,
      leadId: input.leadId, input: input.input ?? {}, result: input.result ?? {},
    }).returning();
    const row = rows[0];
    return { ...row, createdAt: row.createdAt.toISOString() };
  }

  async listUsers(): Promise<UserSummary[]> {
    return getDb().select({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active }).from(users).where(eq(users.active, true));
  }
}

export const postgresLeadRepository = new PostgresLeadRepository();
