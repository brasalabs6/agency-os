import { and, desc, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { leads, leadTasks } from "@/lib/db/schema";
import { ACTIVE_STATUSES } from "@/lib/domain/status";
import { dayRangeInTimeZone } from "@/lib/domain/time";
import { effectiveTaskDate } from "@/lib/domain/task";
import { LEAD_STATUSES, type DashboardSummary, type Lead } from "@/lib/domain/types";
import { getLeadRepository, getTaskRepository } from "@/lib/repositories";

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

async function getRepositoryDashboardSummary(): Promise<DashboardSummary> {
  const leadRepository = getLeadRepository();
  const taskRepository = getTaskRepository();
  const [leadResult, taskResult] = await Promise.all([
    leadRepository.search({ limit: 100 }),
    taskRepository.search({ includeCompleted: true, limit: 500 }),
  ]);

  const now = new Date();
  const { start, end } = dayRangeInTimeZone(now);
  const countsByStatus: DashboardSummary["countsByStatus"] = {};
  for (const status of LEAD_STATUSES) countsByStatus[status] = 0;
  for (const lead of leadResult.items) countsByStatus[lead.status] = (countsByStatus[lead.status] ?? 0) + 1;

  const activeLeads = ACTIVE_STATUSES.reduce(
    (sum, status) => sum + (countsByStatus[status] ?? 0),
    0,
  );

  const needsAttention = leadResult.items
    .filter((lead) => {
      if (!ACTIVE_STATUSES.includes(lead.status)) return false;
      const due = lead.nextActionAt ? new Date(lead.nextActionAt) : null;
      const dueOrOverdue = Boolean(due && due <= end);
      const noNextAction = !lead.nextAction;
      const highPriorityDiscovery =
        ["DISCOVERED", "ENRICHED", "SCORED", "READY_TO_CONTACT"].includes(lead.status)
        && (lead.score ?? 0) >= 85;
      return dueOrOverdue || noNextAction || highPriorityDiscovery;
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  const activeTasks = taskResult.items.filter((task) => task.status === "TODO" || task.status === "DOING");
  const tasksToday = activeTasks.filter((task) => {
    const value = effectiveTaskDate(task);
    if (!value) return false;
    const date = new Date(value);
    return date >= start && date <= end;
  }).length;
  const overdueTasks = activeTasks.filter((task) => {
    const value = effectiveTaskDate(task);
    return Boolean(value && new Date(value) < now);
  }).length;
  const meetingsToday = activeTasks.filter((task) => {
    if (task.type !== "MEETING") return false;
    const value = effectiveTaskDate(task);
    if (!value) return false;
    const date = new Date(value);
    return date >= start && date <= end;
  }).length;
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
    tasksToday,
    overdueTasks,
    meetingsToday,
    countsByStatus,
    needsAttention,
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (process.env.DATA_DRIVER === "mock") {
    return getRepositoryDashboardSummary();
  }

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

  const statusRows = await db
    .select({ status: leads.status, count: sql<number>`count(*)::int` })
    .from(leads)
    .groupBy(leads.status);

  const attentionRows = await db
    .select()
    .from(leads)
    .where(attentionCondition)
    .orderBy(desc(leads.score), desc(leads.updatedAt))
    .limit(8);

  const taskRows = await db.execute(sql<{
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
  `);

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
