import { revokeOwnMcpCredential } from "@/lib/services/mcp-credentials";
import { apiUser, assertSameOrigin, errorResponse, ok } from "@/lib/services/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const user = await apiUser();
    const { id } = await params;
    return ok(await revokeOwnMcpCredential(user, id));
  } catch (error) {
    return errorResponse(error);
  }
}
