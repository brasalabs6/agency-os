import type { UserRole } from "@/lib/domain/types";

export const AGENT_SCOPES = [
  "leads.read",
  "leads.write",
  "diagnostics.read",
  "diagnostics.write",
  "prospecting.read",
  "prospecting.write",
  "conversations.read",
  "conversations.write",
  "messages.send.approved",
  "approvals.read",
  "approvals.request",
  "proposals.read",
  "proposals.write",
  "proposals.send.approved",
  "contracts.read",
  "contracts.draft",
  "contracts.send.approved",
  "projects.read",
  "projects.write",
  "ai_runs.read",
  "ai_runs.write",
] as const;

export type AgentScope = (typeof AGENT_SCOPES)[number];

export const HUMAN_MEMBER_SCOPES = [...AGENT_SCOPES] as const;
export const HUMAN_ADMIN_SCOPES = [...AGENT_SCOPES, "approvals.approve"] as const;
export const HUMAN_APP_SCOPES = HUMAN_ADMIN_SCOPES;

export function humanScopesForRole(role: UserRole): string[] {
  return role === "ADMIN" ? [...HUMAN_ADMIN_SCOPES] : [...HUMAN_MEMBER_SCOPES];
}
