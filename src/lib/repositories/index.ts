import type { LeadRepository } from "./lead-repository";
import type { TaskRepository } from "./task-repository";
import { mockLeadRepository } from "./mock-lead-repository";
import { postgresLeadRepository } from "./postgres-lead-repository";
import { mockTaskRepository } from "./mock-task-repository";
import { postgresTaskRepository } from "./postgres-task-repository";
import type { AuthRepository } from "./auth-repository";
import { mockAuthRepository } from "./mock-auth-repository";
import { postgresAuthRepository } from "./postgres-auth-repository";
import type { McpCredentialRepository } from "./mcp-credential-repository";
import { mockMcpCredentialRepository } from "./mock-mcp-credential-repository";
import { postgresMcpCredentialRepository } from "./postgres-mcp-credential-repository";
import type { AutomationRepository } from "./automation-repository";
import { mockAutomationRepository } from "./mock-automation-repository";
import { postgresAutomationRepository } from "./postgres-automation-repository";

function isPostgresDriver(): boolean {
  const driver = process.env.DATA_DRIVER;
  if (driver === "postgres") return true;
  if (driver === "mock") return false;
  return process.env.NODE_ENV === "production";
}

export function getLeadRepository(): LeadRepository {
  return isPostgresDriver() ? postgresLeadRepository : mockLeadRepository;
}

export function getTaskRepository(): TaskRepository {
  return isPostgresDriver() ? postgresTaskRepository : mockTaskRepository;
}

export function getAuthRepository(): AuthRepository {
  return isPostgresDriver() ? postgresAuthRepository : mockAuthRepository;
}

export function getMcpCredentialRepository(): McpCredentialRepository {
  return isPostgresDriver() ? postgresMcpCredentialRepository : mockMcpCredentialRepository;
}

export function getAutomationRepository(): AutomationRepository {
  return isPostgresDriver() ? postgresAutomationRepository : mockAutomationRepository;
}
