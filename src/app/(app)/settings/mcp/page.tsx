import { PageHeader } from "@/components/page-header";
import { McpCredentialsSettings } from "@/components/mcp-credentials-settings";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { getI18n } from "@/lib/i18n/server";
import { listOwnMcpCredentials } from "@/lib/services/mcp-credentials";

export default async function McpSettingsPage() {
  const user = await requireCurrentUser();
  const credentials = await listOwnMcpCredentials(user);
  const mode = process.env.MCP_AUTH_MODE ?? "token";
  const { t } = await getI18n();

  return <>
    <PageHeader title={t("mcp.title")} description={t("mcp.description")}/>
    {mode !== "user_query_token" ? <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
      {t("mcp.modeWarning",{mode})}
    </div> : null}
    <McpCredentialsSettings initialCredentials={credentials}/>
  </>;
}
