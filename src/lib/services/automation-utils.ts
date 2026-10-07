import { createHash } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type { ApprovalRequest } from "@/lib/domain/automation";
import { getLeadRepository } from "@/lib/repositories";

export const nowIso = () => new Date().toISOString();

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) result[key] = canonicalizeJson(source[key]);
    }
    return result;
  }
  return value;
}

export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalizeJson(value));
}

export function hashPayload(payload: Record<string, unknown>) {
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

export async function automationAudit(
  actor: ActorContext,
  action: string,
  entityType: string,
  entityId: string,
  input: Record<string, unknown>,
  result: Record<string, unknown> = {},
  leadId?: string | null,
  tool?: string,
) {
  await getLeadRepository().addAudit({
    actor,
    tool,
    action,
    leadId: leadId ?? null,
    entityType,
    entityId,
    input,
    result,
  });
}

export function throwVersionConflict(entity: string): never {
  throw new DomainError(entity + " changed since it was read. Reload before writing again.", "VERSION_CONFLICT", 409);
}

export function requireHumanActor(actor: ActorContext) {
  if (actor.type !== "USER") {
    throw new DomainError("This action requires a human user", "HUMAN_APPROVAL_REQUIRED", 403);
  }
}

export function requireApprovalActor(actor: ActorContext) {
  requireHumanActor(actor);
  if (!actor.scopes?.includes("approvals.approve")) {
    throw new DomainError("This user cannot approve external actions", "APPROVAL_PERMISSION_REQUIRED", 403);
  }
}

export function ensureApprovalNotExpired(approval: ApprovalRequest) {
  if (approval.expiresAt && new Date(approval.expiresAt) <= new Date()) {
    throw new DomainError("Approval has expired", "APPROVAL_EXPIRED", 409);
  }
}
