import { randomUUID } from "node:crypto";
import { dayRangeInTimeZone } from "@/lib/domain/time";
import { effectiveTaskDate, isTaskOverdue } from "@/lib/domain/task";
import type { LeadTaskView, TaskSearchFilters, TaskSearchResult } from "@/lib/domain/types";
import { createDemoLeads, DEMO_USERS } from "@/lib/mock/seed-data";
import { createDemoTasks } from "@/lib/mock/task-seed-data";
import type { CreateTaskRepositoryInput, TaskRepository, UpdateTaskRepositoryInput } from "./task-repository";

const clone = <T>(value: T): T => structuredClone(value);

export class MockTaskRepository implements TaskRepository {
  private leads = createDemoLeads();
  private tasks = createDemoTasks(this.leads);

  async search(filters: TaskSearchFilters): Promise<TaskSearchResult> {
    const now = new Date();
    const { start, end } = dayRangeInTimeZone(now);
    let items = this.tasks.filter((task) => {
      if (filters.leadId && task.leadId !== filters.leadId) return false;
      if (filters.ownerId && task.owner?.id !== filters.ownerId) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.statuses?.length && !filters.statuses.includes(task.status)) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.priorities?.length && !filters.priorities.includes(task.priority)) return false;
      if (filters.type && task.type !== filters.type) return false;
      if (filters.types?.length && !filters.types.includes(task.type)) return false;
      if (!filters.includeCompleted && (task.status === "DONE" || task.status === "CANCELED")) return false;
      const value = effectiveTaskDate(task);
      const date = value ? new Date(value) : null;
      if (filters.noDate && date) return false;
      if (filters.overdue && !isTaskOverdue(task, now)) return false;
      if (filters.dueToday && (!date || date < start || date > end || task.status === "DONE" || task.status === "CANCELED")) return false;
      if (filters.from && (!date || date < new Date(filters.from))) return false;
      if (filters.to && (!date || date > new Date(filters.to))) return false;
      return true;
    });
    items = items.sort((a, b) => (effectiveTaskDate(a) ?? "9999").localeCompare(effectiveTaskDate(b) ?? "9999") || a.order - b.order);
    const total = items.length;
    const limit = Math.min(filters.limit ?? 50, 500);
    const offset = filters.offset ?? 0;
    return { items: clone(items.slice(offset, offset + limit)), total, limit, offset };
  }

  async getById(id: string) { return clone(this.tasks.find((task) => task.id === id) ?? null); }

  async create(input: CreateTaskRepositoryInput) {
    const lead = this.leads.find((item) => item.id === input.leadId);
    if (!lead) throw new Error("Lead not found");
    const now = new Date().toISOString();
    const owner = input.ownerId ? DEMO_USERS.find((user) => user.id === input.ownerId) ?? null : null;
    const task: LeadTaskView = {
      id: randomUUID(), leadId: input.leadId, title: input.title, description: input.description ?? null,
      type: input.type ?? "TASK", status: "TODO", priority: input.priority ?? "MEDIUM", dueAt: input.dueAt ?? null,
      startAt: input.startAt ?? null, endAt: input.endAt ?? null, allDay: input.allDay ?? false, owner,
      order: input.order ?? 0, createdByType: input.createdByType, createdById: input.createdById ?? null,
      completedAt: null, canceledAt: null, createdAt: now, updatedAt: now, version: 1,
      lead: { id: lead.id, name: lead.name, status: lead.status, score: lead.score },
    };
    this.tasks.push(task);
    return clone(task);
  }

  async update(id: string, input: UpdateTaskRepositoryInput) {
    const index = this.tasks.findIndex((task) => task.id === id);
    if (index < 0) return null;
    const current = this.tasks[index];
    if (input.expectedVersion != null && input.expectedVersion !== current.version) return null;
    const owner = input.ownerId === undefined ? current.owner : input.ownerId ? DEMO_USERS.find((user) => user.id === input.ownerId) ?? null : null;
    const { expectedVersion: _version, ownerId: _ownerId, ...changes } = input;
    const updated: LeadTaskView = { ...current, ...changes, owner, updatedAt: new Date().toISOString(), version: current.version + 1 };
    this.tasks[index] = updated;
    return clone(updated);
  }
}

export const mockTaskRepository = new MockTaskRepository();
