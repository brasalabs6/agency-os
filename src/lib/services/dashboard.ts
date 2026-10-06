import { and, desc, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { leads, leadTasks } from "@/lib/db/schema";
import { ACTIVE_STATUSES } from "@/lib/domain/status";
import { dayRangeInTimeZone } from "@/lib/domain/time";
import { LEAD_STATUSES, type DashboardSummary, type Lead } from "@/lib/domain/types";

function mapDashboardLead(row: typeof leads.$inferSelect): Lead {
  return {
    id: row.id,
    name: row.name,
    legalName: row.legalName,
    segment: row.segment,
    city: row.city,
    state: row.state,
    website: row.website,
    googleMapsUrl: row.googleMapsUrl,
    instagramUrl: row.instagramUrl,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    contactName: row.contactName,
    contactRole: row.contactRole,
    status: row.status,
    score: row.score,
    scoreReasons: row.scoreReasons ?? [],
    primaryOpportunity: row.primaryOpportunity,
    opportunityNotes: row.opportunityNotes,
    owner: null,
    tags: row.tags ?? [],
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl,
    nextAction: row.nextAction,
    nextActionAt: row.nextActionAt?.toISOString() ?? null,
    nextActionOwner: null,
    doNotContact: row.doNotContact,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = getDb();
  const now = new Date();
  const { start, end } = dayRangeInTimeZone();
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const nowIso = now.toISOString();

  const attentionCondition = and(
    inArray(leads.status, ACTIVE_STATUSES),
    or(
      lt(leads.nextActionAt, now),
      and(gte(leads.nextActionAt, start), lte(leads.nextActionAt, end)),
      isNull(leads.nextAction),
      and(
        inArray(leads.status, ["DISCOVERED", "ENRICHED", "SCORED", "READY_TO_CONTACT"]),
        gte(leads.score, 85),
      ),
    ),
  );

  const [statusRows, attentionRows, taskRows] = await Promise.all([
    db
      .select({ status: leads.status, count: sql<number>`count(*)::int` })
      .from(leads)
      .groupBy(leads.status),

    db
      .select()
      .from(leads)
      .where(attentionCondition)
      .orderBy(desc(leads.score), desc(leads.updatedAt))
      .limit(8),

    db.execute(sql<{
      tasks_today: number;
      overdue_tasks: number;
      meetings_today: number;
    }>`
      select
        count(*) filter (
          where status in ('TODO', 'DOING')
            and coalesce(due_at, start_at) >= ${startIso}::timestamptz
            and coalesce(due_at, start_at) <= ${endIso}::timestamptz
        )::int as tasks_today,
        count(*) filter (
          where status in ('TODO', 'DOING')
            and coalesce(due_at, start_at) < ${nowIso}::timestamptz
        )::int as overdue_tasks,
        count(*) filter (
          where status in ('TODO', 'DOING')
            and type = 'MEETING'
            and coalesce(due_at, start_at) >= ${startIso}::timestamptz
            and coalesce(due_at, start_at) <= ${endIso}::timestamptz
        )::int as meetings_today
      from ${leadTasks}
    `),
  ]);

  const countsByStatus: DashboardSummary["countsByStatus"] = {};
  for (const status of LEAD_STATUSES) countsByStatus[status] = 0;
  for (const row of statusRows) countsByStatus[row.status] = row.count;

  const activeLeads = ACTIVE_STATUSES.reduce(
    (sum, status) => sum + (countsByStatus[status] ?? 0),
    0,
  );

  const taskMetrics = taskRows[0] ?? {
    tasks_today: 0,
    overdue_tasks: 0,
    meetings_today: 0,
  };

  const needsAttention = attentionRows.map(mapDashboardLead);
  const contactToday = needsAttention.filter((lead) => {
    if (!lead.nextActionAt) return false;
    const value = new Date(lead.nextActionAt);
    return value >= start && value <= end;
  }).length;
  const overdueActions = needsAttention.filter((lead) => {
    if (!lead.nextActionAt) return false;
    return new Date(lead.nextActionAt) < now;
  }).length;

  return {
    activeLeads,
    overdueActions,
    contactToday,
    openProposals: countsByStatus.PROPOSAL_SENT ?? 0,
    negotiation: countsByStatus.NEGOTIATION ?? 0,
    won: countsByStatus.WON ?? 0,
    tasksToday: Number(taskMetrics.tasks_today ?? 0),
    overdueTasks: Number(taskMetrics.overdue_tasks ?? 0),
    meetingsToday: Number(taskMetrics.meetings_today ?? 0),
    countsByStatus,
    needsAttention,
  };
}
