import { DomainError } from "@/lib/domain/errors";
import { pickNextTask } from "@/lib/domain/task";
import type {
  ActorContext,
  CreateLeadTaskInput,
  Lead,
  LeadTask,
  LeadTaskStatus,
  LeadTaskType,
  TaskSearchFilters,
  UpdateLeadTaskInput,
} from "@/lib/domain/types";
import { getLeadRepository, getTaskRepository, withRepositoryTransaction } from "@/lib/repositories";

const repo = () => getTaskRepository();
const leadRepo = () => getLeadRepository();
const CONTACT_TASK_TYPES = new Set<LeadTaskType>(["CALL", "FOLLOW_UP", "MEETING"]);

async function mustLead(id: string): Promise<Lead> {
  const lead = await leadRepo().getById(id);
  if (!lead) throw new DomainError("Lead not found", "LEAD_NOT_FOUND", 404);
  return lead;
}

async function mustTask(id: string) {
  const task = await repo().getById(id);
  if (!task) throw new DomainError("Task not found", "TASK_NOT_FOUND", 404);
  return task;
}

function ensureVersion<T>(result: T | null, expectedVersion?: number): T {
  if (result) return result;
  if (expectedVersion != null) {
    throw new DomainError("Task changed since it was read. Reload before writing again.", "TASK_VERSION_CONFLICT", 409);
  }
  throw new DomainError("Task not found", "TASK_NOT_FOUND", 404);
}

async function ensureOwnerExists(ownerId?: string | null) {
  if (!ownerId) return;
  const users = await leadRepo().listUsers();
  if (!users.some((user) => user.id === ownerId)) {
    throw new DomainError("Task owner not found", "INVALID_OWNER", 422, { ownerId });
  }
}

function assertContactTaskAllowed(lead: Lead, type: LeadTaskType) {
  if ((lead.status === "DO_NOT_CONTACT" || lead.doNotContact) && CONTACT_TASK_TYPES.has(type)) {
    throw new DomainError("Contact tasks are blocked for DO_NOT_CONTACT leads", "DNC_CONTACT_TASK_BLOCKED", 403);
  }
}

function validateSchedule(input: { dueAt?: string | null; startAt?: string | null; endAt?: string | null }) {
  const parse = (value?: string | null) => value ? new Date(value) : null;
  const due = parse(input.dueAt);
  const start = parse(input.startAt);
  const end = parse(input.endAt);

  for (const date of [due, start, end]) {
    if (date && Number.isNaN(date.getTime())) {
      throw new DomainError("Invalid task date", "INVALID_TASK_DATE", 422);
    }
  }
  if (Boolean(start) !== Boolean(end)) {
    throw new DomainError("Events require both startAt and endAt", "INVALID_TASK_DATE", 422);
  }
  if (start && end && end < start) {
    throw new DomainError("endAt cannot be before startAt", "INVALID_TASK_DATE", 422);
  }
}

async function taskActivity(
  task: LeadTask,
  actor: ActorContext,
  type: Parameters<ReturnType<typeof leadRepo>["addActivity"]>[0]["type"],
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  return leadRepo().addActivity({
    leadId: task.leadId,
    type,
    actor,
    summary,
    metadata: { taskId: task.id, title: task.title, ...metadata },
  });
}

async function audit(
  task: LeadTask,
  actor: ActorContext,
  action: string,
  input: Record<string, unknown>,
  tool?: string,
) {
  await leadRepo().addAudit({
    actor,
    tool,
    action,
    leadId: task.leadId,
    input,
    result: { taskId: task.id, version: task.version },
  });
}

export async function syncLeadNextAction(leadId: string) {
  return withRepositoryTransaction(async () => {
    // Serializes projection refreshes for a lead. This removes the read-version-write
    // race while keeping task optimistic concurrency independent from lead versions.
    await leadRepo().lockForUpdate(leadId);
    const lead = await mustLead(leadId);
    const result = await repo().search({ leadId, statuses: ["TODO", "DOING"], limit: 500 });
    const next = pickNextTask(result.items);
    const nextAction = next?.title ?? null;
    const nextActionAt = next ? (next.dueAt ?? next.startAt ?? null) : null;
    const nextActionOwnerId = next?.owner?.id ?? null;

    if (
      lead.nextAction === nextAction &&
      lead.nextActionAt === nextActionAt &&
      (lead.nextActionOwner?.id ?? null) === nextActionOwnerId
    ) {
      return lead;
    }

    const updated = await leadRepo().update(leadId, {
      nextAction,
      nextActionAt,
      nextActionOwnerId,
    });
    if (!updated) {
      throw new DomainError("Lead disappeared while recalculating next action", "LEAD_NOT_FOUND", 404);
    }
    return updated;
  });
}

export async function listTasks(filters: TaskSearchFilters) {
  return repo().search(filters);
}

export async function listLeadTasks(leadId: string, includeCompleted = true) {
  await mustLead(leadId);
  return repo().search({ leadId, includeCompleted, limit: 500 });
}

export async function getTask(id: string) {
  return mustTask(id);
}

export async function createTask(input: CreateLeadTaskInput, actor: ActorContext, tool?: string) {
  return withRepositoryTransaction(async () => {
    const lead = await mustLead(input.leadId);
    const type = input.type ?? "TASK";
    assertContactTaskAllowed(lead, type);
    await ensureOwnerExists(input.ownerId);
    validateSchedule(input);

    const task = await repo().create({ ...input, type, createdByType: actor.type, createdById: actor.id });
    await taskActivity(task, actor, "TASK_CREATED", `Tarefa criada: ${task.title}`, {
      type: task.type,
      dueAt: task.dueAt,
      startAt: task.startAt,
    });
    await audit(task, actor, "task.create", input as unknown as Record<string, unknown>, tool);
    await syncLeadNextAction(task.leadId);
    return task;
  });
}

export async function updateTask(id: string, input: UpdateLeadTaskInput, actor: ActorContext, tool?: string) {
  return withRepositoryTransaction(async () => {
    const before = await mustTask(id);
    if (before.status === "DONE" || before.status === "CANCELED") {
      throw new DomainError("Terminal tasks cannot be edited", "INVALID_TASK_TRANSITION", 422);
    }

    const lead = await mustLead(before.leadId);
    assertContactTaskAllowed(lead, input.type ?? before.type);
    if (input.ownerId !== undefined) await ensureOwnerExists(input.ownerId);

    validateSchedule({
      dueAt: input.dueAt === undefined ? before.dueAt : input.dueAt,
      startAt: input.startAt === undefined ? before.startAt : input.startAt,
      endAt: input.endAt === undefined ? before.endAt : input.endAt,
    });

    const updated = ensureVersion(await repo().update(id, input), input.expectedVersion);
    const changed = Object.keys(input).filter((key) => key !== "expectedVersion");
    const scheduleChanged = ["dueAt", "startAt", "endAt", "allDay"].some((key) => changed.includes(key));
    const activityType = scheduleChanged
      ? "TASK_RESCHEDULED"
      : input.status === "DOING" && before.status !== "DOING"
        ? "TASK_STARTED"
        : input.ownerId !== undefined && input.ownerId !== before.owner?.id
          ? "TASK_REASSIGNED"
          : "TASK_UPDATED";

    await taskActivity(
      updated,
      actor,
      activityType,
      scheduleChanged ? `Tarefa reagendada: ${updated.title}` : `Tarefa atualizada: ${updated.title}`,
      { changed },
    );
    await audit(updated, actor, "task.update", input as unknown as Record<string, unknown>, tool);
    await syncLeadNextAction(updated.leadId);
    return updated;
  });
}

export async function completeTask(id: string, actor: ActorContext, expectedVersion?: number, tool?: string) {
  return withRepositoryTransaction(async () => {
    const before = await mustTask(id);
    if (before.status === "DONE" || before.status === "CANCELED") {
      throw new DomainError("Task is already terminal", "INVALID_TASK_TRANSITION", 422);
    }

    const updated = ensureVersion(
      await repo().update(id, {
        status: "DONE",
        completedAt: new Date().toISOString(),
        expectedVersion,
      }),
      expectedVersion,
    );
    await taskActivity(updated, actor, "TASK_COMPLETED", `Tarefa concluída: ${updated.title}`);
    await audit(updated, actor, "task.complete", { expectedVersion }, tool);
    await syncLeadNextAction(updated.leadId);
    return updated;
  });
}

export async function cancelTask(
  id: string,
  actor: ActorContext,
  input: { reason?: string; expectedVersion?: number } = {},
  tool?: string,
) {
  return withRepositoryTransaction(async () => {
    const before = await mustTask(id);
    if (before.status === "DONE" || before.status === "CANCELED") {
      throw new DomainError("Task is already terminal", "INVALID_TASK_TRANSITION", 422);
    }

    const updated = ensureVersion(
      await repo().update(id, {
        status: "CANCELED",
        canceledAt: new Date().toISOString(),
        expectedVersion: input.expectedVersion,
      }),
      input.expectedVersion,
    );
    await taskActivity(
      updated,
      actor,
      "TASK_CANCELED",
      `Tarefa cancelada: ${updated.title}${input.reason ? `. Motivo: ${input.reason}` : ""}`,
      { reason: input.reason ?? null },
    );
    await audit(updated, actor, "task.cancel", input as Record<string, unknown>, tool);
    await syncLeadNextAction(updated.leadId);
    return updated;
  });
}

export async function rescheduleTask(
  id: string,
  input: {
    dueAt?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    allDay?: boolean;
    expectedVersion?: number;
  },
  actor: ActorContext,
  tool?: string,
) {
  return withRepositoryTransaction(async () => {
    const before = await mustTask(id);
    if (before.status === "DONE" || before.status === "CANCELED") {
      throw new DomainError("Terminal tasks cannot be rescheduled", "INVALID_TASK_TRANSITION", 422);
    }

    const lead = await mustLead(before.leadId);
    assertContactTaskAllowed(lead, before.type);

    const schedule = {
      dueAt: input.dueAt === undefined ? before.dueAt : input.dueAt,
      startAt: input.startAt === undefined ? before.startAt : input.startAt,
      endAt: input.endAt === undefined ? before.endAt : input.endAt,
    };
    validateSchedule(schedule);

    const updated = ensureVersion(await repo().update(id, input), input.expectedVersion);
    await taskActivity(updated, actor, "TASK_RESCHEDULED", `Tarefa reagendada: ${updated.title}`, schedule);
    await audit(updated, actor, "task.reschedule", input as Record<string, unknown>, tool);
    await syncLeadNextAction(updated.leadId);
    return updated;
  });
}

export async function reorderTasks(
  items: Array<{ taskId: string; order: number; expectedVersion?: number }>,
  actor: ActorContext,
  tool?: string,
) {
  return withRepositoryTransaction(async () => {
    const updated: LeadTask[] = [];
    const leadIds = new Set<string>();

    for (const item of items) {
      const task = ensureVersion(
        await repo().update(item.taskId, { order: item.order, expectedVersion: item.expectedVersion }),
        item.expectedVersion,
      );
      updated.push(task);
      leadIds.add(task.leadId);
      await taskActivity(task, actor, "TASK_REORDERED", `Tarefa reordenada: ${task.title}`, { order: item.order });
      await audit(task, actor, "task.reorder", item as unknown as Record<string, unknown>, tool);
    }

    // Stable lock order avoids deadlocks if two reorder requests overlap multiple leads.
    for (const leadId of [...leadIds].sort()) {
      await syncLeadNextAction(leadId);
    }
    return updated;
  });
}

export async function listCalendar(input: {
  from: string;
  to: string;
  ownerId?: string;
  leadId?: string;
  statuses?: LeadTaskStatus[];
}) {
  validateSchedule({ dueAt: input.from });
  validateSchedule({ dueAt: input.to });
  if (new Date(input.to) < new Date(input.from)) {
    throw new DomainError("Calendar to must be after from", "INVALID_TASK_DATE", 422);
  }

  return repo().search({
    from: input.from,
    to: input.to,
    ownerId: input.ownerId,
    leadId: input.leadId,
    statuses: input.statuses,
    includeCompleted: Boolean(input.statuses?.some((status) => status === "DONE" || status === "CANCELED")),
    limit: 500,
  });
}

export async function cancelContactTasksForLead(leadId: string, actor: ActorContext, tool?: string) {
  return withRepositoryTransaction(async () => {
    const result = await repo().search({
      leadId,
      statuses: ["TODO", "DOING"],
      types: ["CALL", "FOLLOW_UP", "MEETING"],
      limit: 500,
    });

    let count = 0;
    for (const task of result.items) {
      await cancelTask(
        task.id,
        actor,
        { expectedVersion: task.version, reason: "Lead marked DO_NOT_CONTACT" },
        tool,
      );
      count += 1;
    }
    return count;
  });
}
