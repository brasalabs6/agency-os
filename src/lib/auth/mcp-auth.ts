import { createRemoteJWKSet, jwtVerify } from "jose";
import type { ActorContext } from "@/lib/domain/types";
import { DomainError } from "@/lib/domain/errors";

function parseScopes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") return value.split(/\s+/).filter(Boolean);
  return [];
}

function requiredScopes(): string[] {
  return (process.env.MCP_REQUIRED_SCOPES ?? "leads.read,leads.write").split(",").map((item) => item.trim()).filter(Boolean);
}

export async function authorizeMcpRequest(request: Request): Promise<ActorContext> {
  const mode = process.env.MCP_AUTH_MODE ?? "token";
  if (mode === "none" && process.env.NODE_ENV !== "production") {
    return { type: "AGENT", id: "mcp-dev", name: "MCP Dev Client", scopes: ["leads.read", "leads.write"] };
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new DomainError("Bearer token required", "MCP_UNAUTHORIZED", 401);
  const token = auth.slice("Bearer ".length).trim();

  if (mode === "token") {
    const expected = process.env.MCP_API_TOKEN;
    if (!expected || token !== expected) throw new DomainError("Invalid MCP token", "MCP_UNAUTHORIZED", 401);
    return { type: "AGENT", id: "mcp-token-client", name: "ChatGPT", scopes: ["leads.read", "leads.write"] };
  }

  if (mode === "oauth") {
    const issuer = process.env.MCP_OAUTH_ISSUER;
    const audience = process.env.MCP_OAUTH_AUDIENCE;
    const jwksUrl = process.env.MCP_OAUTH_JWKS_URL;
    if (!issuer || !audience || !jwksUrl) throw new DomainError("MCP OAuth is not configured", "MCP_AUTH_CONFIG_ERROR", 500);
    const jwks = createRemoteJWKSet(new URL(jwksUrl));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    const scopes = parseScopes(payload.scope ?? payload.scp);
    const missing = requiredScopes().filter((scope) => !scopes.includes(scope));
    if (missing.length) throw new DomainError(`Missing MCP scopes: ${missing.join(", ")}`, "MCP_FORBIDDEN", 403);
    return {
      type: "AGENT",
      id: String(payload.sub ?? "oauth-client"),
      name: String(payload.name ?? payload.preferred_username ?? "ChatGPT"),
      scopes,
    };
  }

  throw new DomainError("Unsupported MCP_AUTH_MODE", "MCP_AUTH_CONFIG_ERROR", 500);
}

export function requireScope(actor: ActorContext, scope: "leads.read" | "leads.write") {
  if (!actor.scopes?.includes(scope)) throw new DomainError(`Missing scope: ${scope}`, "MCP_FORBIDDEN", 403);
}
