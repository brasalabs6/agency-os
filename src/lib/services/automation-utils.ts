import { createHash } from "node:crypto";
import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";
import type { ApprovalRequest } from "@/lib/domain/automation";
import { getLeadRepository } from "@/lib/repositories";

export const nowIso = () => new Date().toISOString();

export function hashPayload(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
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

export function ensureApprovalNotExpired(approval: ApprovalRequest) {
  if (approval.expiresAt && new Date(approval.expiresAt) <= new Date()) {
    throw new DomainError("Approval has expired", "APPROVAL_EXPIRED", 409);
  }
}
