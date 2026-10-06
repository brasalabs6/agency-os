import { authorizeMcpRequest } from "@/lib/auth/mcp-auth";
import { asDomainError } from "@/lib/domain/errors";
import { createMcpHttpHandler } from "@/lib/mcp/server";

async function handle(request: Request) {
  try {
    const actor = await authorizeMcpRequest(request);
    const handler = createMcpHttpHandler(actor);
    return handler.fetch(request);
  } catch (error) {
    const err = asDomainError(error);
    return Response.json({ error: err.code, message: err.message }, {
      status: err.status,
      headers: err.status === 401 ? { "WWW-Authenticate": `Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource/mcp"` } : undefined,
    });
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
