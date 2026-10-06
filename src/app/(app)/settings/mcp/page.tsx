import { PageHeader } from "@/components/page-header";
import { McpCredentialsSettings } from "@/components/mcp-credentials-settings";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { listOwnMcpCredentials } from "@/lib/services/mcp-credentials";

export default async function McpSettingsPage() {
  const user = await requireCurrentUser();
  const credentials = await listOwnMcpCredentials(user);
  return <>
    <PageHeader title="ChatGPT" description="Conecte seu ChatGPT pessoal ao AgencyOS com uma credencial MCP própria."/>
    <McpCredentialsSettings initialCredentials={credentials}/>
  </>;
}
