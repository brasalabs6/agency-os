import { PageHeader } from "@/components/page-header";
import { McpCredentialsSettings } from "@/components/mcp-credentials-settings";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { listOwnMcpCredentials } from "@/lib/services/mcp-credentials";

export default async function McpSettingsPage() {
  const user = await requireCurrentUser();
  const credentials = await listOwnMcpCredentials(user);
  const mode = process.env.MCP_AUTH_MODE ?? "token";

  return <>
    <PageHeader title="ChatGPT" description="Conecte seu ChatGPT pessoal ao AgencyOS com uma credencial MCP própria."/>
    {mode !== "user_query_token" ? <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
      O MCP ainda está em <strong>{mode}</strong>. Você pode gerar sua conexão agora, mas a URL pessoal só autenticará chamadas depois que produção for alterada para <code>user_query_token</code>.
    </div> : null}
    <McpCredentialsSettings initialCredentials={credentials}/>
  </>;
}
