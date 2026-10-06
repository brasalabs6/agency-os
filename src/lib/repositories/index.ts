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

import type { AuthRepository } from "./auth-repository";
import { mockAuthRepository } from "./mock-auth-repository";
import { postgresAuthRepository } from "./postgres-auth-repository";

export function getAuthRepository(): AuthRepository {
  return process.env.DATA_DRIVER === "postgres" ? postgresAuthRepository : mockAuthRepository;
}
