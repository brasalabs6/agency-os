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
    const mode = process.env.MCP_AUTH_MODE ?? "token";
    const shouldChallenge = err.status === 401 && mode !== "user_query_token";
    return Response.json({ error: err.code, message: err.message }, {
      status: err.status,
      headers: {
        "Cache-Control": "no-store",
        ...(shouldChallenge ? { "WWW-Authenticate": `Bearer resource_metadata="${new URL(request.url).origin}/.well-known/oauth-protected-resource/mcp"` } : {}),
      },
    });
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
