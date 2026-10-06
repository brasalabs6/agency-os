import type { LeadRepository } from "./lead-repository";
import type { TaskRepository } from "./task-repository";
import { mockLeadRepository } from "./mock-lead-repository";
import { postgresLeadRepository } from "./postgres-lead-repository";
import { mockTaskRepository } from "./mock-task-repository";
import { postgresTaskRepository } from "./postgres-task-repository";

function usePostgres(): boolean {
  const driver = process.env.DATA_DRIVER;

  if (driver === "postgres") return true;
  if (driver === "mock") return false;

  // Production must never silently fall back to volatile in-memory data.
  return process.env.NODE_ENV === "production";
}

export function getLeadRepository(): LeadRepository {
  return usePostgres() ? postgresLeadRepository : mockLeadRepository;
}

export function getTaskRepository(): TaskRepository {
  return usePostgres() ? postgresTaskRepository : mockTaskRepository;
}
