import { DomainError } from "@/lib/domain/errors";
import { errorResponse } from "@/lib/services/http";
import { authorizeSignatureWebhook } from "@/lib/auth/integration-auth";

/**
 * Fail closed until a real provider-specific webhook verifier has been built.
 * A bearer token plus caller-supplied signedArtifactRef is not proof that
 * the signed document matches our immutable contract.
 */
export async function POST(request: Request) {
  try {
    authorizeSignatureWebhook(request);
    throw new DomainError(
      "Signature callbacks are unavailable until provider authenticity, document identity and signed artifact verification are implemented",
      "SIGNATURE_PROVIDER_NOT_VERIFIED",
      503,
    );
  } catch (error) {
    return errorResponse(error);
  }
}
