import type { LeadRepository } from "./lead-repository";
import type { TaskRepository } from "./task-repository";
import { mockLeadRepository } from "./mock-lead-repository";
import { postgresLeadRepository } from "./postgres-lead-repository";
import { mockTaskRepository } from "./mock-task-repository";
import { postgresTaskRepository } from "./postgres-task-repository";

export function getLeadRepository(): LeadRepository {
  return process.env.DATA_DRIVER === "postgres" ? postgresLeadRepository : mockLeadRepository;
}

export function getTaskRepository(): TaskRepository {
  return process.env.DATA_DRIVER === "postgres" ? postgresTaskRepository : mockTaskRepository;
}
