export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const issuer = process.env.MCP_OAUTH_ISSUER;
  return Response.json({
    resource: `${origin}/mcp`,
    authorization_servers: issuer ? [issuer] : [],
    bearer_methods_supported: ["header"],
    scopes_supported: (process.env.MCP_REQUIRED_SCOPES ?? "leads.read,leads.write").split(",").map((item) => item.trim()),
  });
}
