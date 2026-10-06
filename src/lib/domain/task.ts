import type { LeadTask, LeadTaskPriority, LeadTaskView } from "./types";
import { dateKeyInTimeZone, dayRangeInTimeZone } from "./time";

export const TASK_PRIORITY_WEIGHT: Record<LeadTaskPriority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  URGENT: 3,
};

export function effectiveTaskDate(task: Pick<LeadTask, "dueAt" | "startAt">): string | null {
  return task.dueAt ?? task.startAt ?? null;
}

export function isTaskActive(task: Pick<LeadTask, "status">) {
  return task.status === "TODO" || task.status === "DOING";
}

export function isTaskOverdue(task: Pick<LeadTask, "status" | "dueAt" | "startAt">, now = new Date()) {
  if (!isTaskActive(task)) return false;
  const value = effectiveTaskDate(task);
  return value ? new Date(value).getTime() < now.getTime() : false;
}

export function isTaskToday(task: Pick<LeadTask, "status" | "dueAt" | "startAt">, now = new Date()) {
  if (!isTaskActive(task)) return false;
  const value = effectiveTaskDate(task);
  return value ? dateKeyInTimeZone(value) === dateKeyInTimeZone(now) : false;
}

export function compareTasksForNextAction(a: LeadTask, b: LeadTask) {
  const ad = effectiveTaskDate(a);
  const bd = effectiveTaskDate(b);
  if (ad && bd && ad !== bd) return ad.localeCompare(bd);
  if (ad && !bd) return -1;
  if (!ad && bd) return 1;
  const priority = TASK_PRIORITY_WEIGHT[b.priority] - TASK_PRIORITY_WEIGHT[a.priority];
  if (priority) return priority;
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt.localeCompare(b.createdAt);
}

export function pickNextTask(tasks: LeadTask[]): LeadTask | null {
  return tasks.filter(isTaskActive).sort(compareTasksForNextAction)[0] ?? null;
}

export function groupTasksForAction(tasks: LeadTaskView[], now = new Date()) {
  const { start, end } = dayRangeInTimeZone(now);
  const overdue: LeadTaskView[] = [];
  const today: LeadTaskView[] = [];
  const upcoming: LeadTaskView[] = [];
  const noDate: LeadTaskView[] = [];
  for (const task of tasks.filter(isTaskActive)) {
    const value = effectiveTaskDate(task);
    if (!value) { noDate.push(task); continue; }
    const date = new Date(value);
    if (date < start) overdue.push(task);
    else if (date <= end) today.push(task);
    else upcoming.push(task);
  }
  const sort = (items: LeadTaskView[]) => items.sort(compareTasksForNextAction);
  return { overdue: sort(overdue), today: sort(today), upcoming: sort(upcoming), noDate: sort(noDate) };
}
