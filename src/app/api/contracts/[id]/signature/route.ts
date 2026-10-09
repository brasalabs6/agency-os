import { DomainError } from "@/lib/domain/errors";
import { apiActor, errorResponse } from "@/lib/services/http";

/**
 * Legacy manual signature endpoint is intentionally disabled.
 * A contract must never be marked SIGNED/DECLINED by an authenticated
 * dashboard client without provider-verified evidence.
 * Provider support belongs to a dedicated, audited follow-up PR (#57).
 */
export async function POST(_request: Request) {
  try {
    await apiActor();
    throw new DomainError(
      "Contract signature changes require a verified signature provider; manual status changes are disabled",
      "SIGNATURE_VERIFICATION_REQUIRED",
      403,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
