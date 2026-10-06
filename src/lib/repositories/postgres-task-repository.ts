import { and, asc, eq, gte, inArray, isNull, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { leadTasks, leads, users } from "@/lib/db/schema";
import { dayRangeInTimeZone } from "@/lib/domain/time";
import type { LeadTaskView, TaskSearchFilters, TaskSearchResult, UserSummary } from "@/lib/domain/types";
import type { CreateTaskRepositoryInput, TaskRepository, UpdateTaskRepositoryInput } from "./task-repository";

const iso = (value: Date | null | undefined) => value ? value.toISOString() : null;
type TaskRow = typeof leadTasks.$inferSelect;

async function userMap(): Promise<Map<string, UserSummary>> {
  const rows = await getDb().select({ id: users.id, name: users.name, email: users.email }).from(users);
  return new Map(rows.map((user) => [user.id, user]));
}

async function mapTask(row: TaskRow, people?: Map<string, UserSummary>): Promise<LeadTaskView> {
  const leadRows = await getDb().select({ id: leads.id, name: leads.name, status: leads.status, score: leads.score }).from(leads).where(eq(leads.id, row.leadId)).limit(1);
  const map = people ?? await userMap();
  const lead = leadRows[0];
  if (!lead) throw new Error("Lead not found for task");
  return {
    id: row.id, leadId: row.leadId, title: row.title, description: row.description, type: row.type, status: row.status,
    priority: row.priority, dueAt: iso(row.dueAt), startAt: iso(row.startAt), endAt: iso(row.endAt), allDay: row.allDay,
    owner: row.ownerId ? map.get(row.ownerId) ?? null : null, order: row.sortOrder, createdByType: row.createdByType,
    createdById: row.createdById, completedAt: iso(row.completedAt), canceledAt: iso(row.canceledAt),
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), version: row.version,
    lead,
  };
}

export class PostgresTaskRepository implements TaskRepository {
  async search(filters: TaskSearchFilters): Promise<TaskSearchResult> {
    const conditions: SQL[] = [];
    if (filters.leadId) conditions.push(eq(leadTasks.leadId, filters.leadId));
    if (filters.ownerId) conditions.push(eq(leadTasks.ownerId, filters.ownerId));
    if (filters.status) conditions.push(eq(leadTasks.status, filters.status));
    if (filters.statuses?.length) conditions.push(inArray(leadTasks.status, filters.statuses));
    if (filters.priority) conditions.push(eq(leadTasks.priority, filters.priority));
    if (filters.priorities?.length) conditions.push(inArray(leadTasks.priority, filters.priorities));
    if (filters.type) conditions.push(eq(leadTasks.type, filters.type));
    if (filters.types?.length) conditions.push(inArray(leadTasks.type, filters.types));
    if (!filters.includeCompleted) conditions.push(inArray(leadTasks.status, ["TODO", "DOING"]));
    const effective = sql<Date>`coalesce(${leadTasks.dueAt}, ${leadTasks.startAt})`;
    if (filters.noDate) conditions.push(and(isNull(leadTasks.dueAt), isNull(leadTasks.startAt))!);
    if (filters.overdue) conditions.push(and(inArray(leadTasks.status, ["TODO", "DOING"]), lt(effective, new Date()))!);
    if (filters.dueToday) {
      const { start, end } = dayRangeInTimeZone();
      conditions.push(and(inArray(leadTasks.status, ["TODO", "DOING"]), gte(effective, start), lte(effective, end))!);
    }
    if (filters.from) conditions.push(gte(effective, new Date(filters.from)));
    if (filters.to) conditions.push(lte(effective, new Date(filters.to)));
    const where = conditions.length ? and(...conditions) : undefined;
    const limit = Math.min(filters.limit ?? 50, 500); const offset = filters.offset ?? 0; const db = getDb();
    const rows = await db.select().from(leadTasks).where(where).orderBy(asc(effective), asc(leadTasks.sortOrder)).limit(limit).offset(offset);
    const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(leadTasks).where(where);
    const people = await userMap();
    const items: LeadTaskView[] = [];
    for (const row of rows) items.push(await mapTask(row, people));
    return { items, total: countRows[0]?.count ?? 0, limit, offset };
  }

  async getById(id: string) {
    const rows = await getDb().select().from(leadTasks).where(eq(leadTasks.id, id)).limit(1);
    return rows[0] ? mapTask(rows[0]) : null;
  }

  async create(input: CreateTaskRepositoryInput) {
    const rows = await getDb().insert(leadTasks).values({
      leadId: input.leadId, title: input.title, description: input.description, type: input.type ?? "TASK", priority: input.priority ?? "MEDIUM",
      dueAt: input.dueAt ? new Date(input.dueAt) : null, startAt: input.startAt ? new Date(input.startAt) : null,
      endAt: input.endAt ? new Date(input.endAt) : null, allDay: input.allDay ?? false, ownerId: input.ownerId,
      sortOrder: input.order ?? 0, createdByType: input.createdByType, createdById: input.createdById,
    }).returning();
    return mapTask(rows[0]);
  }

  async update(id: string, input: UpdateTaskRepositoryInput) {
    const conditions = [eq(leadTasks.id, id)];
    if (input.expectedVersion != null) conditions.push(eq(leadTasks.version, input.expectedVersion));
    const { expectedVersion: _expectedVersion, ownerId, order, dueAt, startAt, endAt, completedAt, canceledAt, ...rest } = input;
    const patch: Partial<typeof leadTasks.$inferInsert> = {
      ...rest,
      ownerId,
      sortOrder: order,
      dueAt: dueAt === undefined ? undefined : dueAt ? new Date(dueAt) : null,
      startAt: startAt === undefined ? undefined : startAt ? new Date(startAt) : null,
      endAt: endAt === undefined ? undefined : endAt ? new Date(endAt) : null,
      completedAt: completedAt === undefined ? undefined : completedAt ? new Date(completedAt) : null,
      canceledAt: canceledAt === undefined ? undefined : canceledAt ? new Date(canceledAt) : null,
      updatedAt: new Date(), version: sql`${leadTasks.version} + 1` as unknown as number,
    };
    const rows = await getDb().update(leadTasks).set(patch).where(and(...conditions)).returning();
    return rows[0] ? mapTask(rows[0]) : null;
  }
}

export const postgresTaskRepository = new PostgresTaskRepository();
