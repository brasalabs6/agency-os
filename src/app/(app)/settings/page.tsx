import Link from "next/link";
import { Bot, Copy, Database, KeyRound, Server, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireAdminUser } from "@/lib/auth/app-auth";
import { getI18n } from "@/lib/i18n/server";

export default async function SettingsPage(){
  await requireAdminUser();
  const { t } = await getI18n();
  const mode=process.env.DATA_DRIVER??"mock";
  const auth=process.env.MCP_AUTH_MODE??"token";
  return <>
    <PageHeader title={t("settings.title")} description={t("settings.description")}/>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card icon={<Bot size={17}/>} title={t("settings.chatgpt")}><p className="text-sm">{t("settings.chatgptDescription")}</p><Link href="/settings/mcp" className="mt-3 inline-flex min-h-10 items-center rounded-lg text-xs font-medium text-[var(--accent)] hover:underline">{t("settings.manageConnection")}</Link></Card>
      <Card icon={<Users size={17}/>} title={t("settings.team")}><p className="text-sm">{t("settings.teamDescription")}</p><Link href="/settings/team" className="mt-3 inline-flex min-h-10 items-center rounded-lg text-xs font-medium text-[var(--accent)] hover:underline">{t("settings.manageTeam")}</Link></Card>
      <Card icon={<Database size={17}/>} title={t("settings.persistence")}><p className="text-sm">{t("settings.currentMode",{mode})}</p><p className="mt-1 text-xs text-muted">{t("settings.postgres")}</p></Card>
      <Card icon={<Server size={17}/>} title={t("settings.remoteMcp")}><p className="text-sm">Endpoint: <code>/mcp</code></p><p className="mt-1 text-xs text-muted">{t("settings.mcpDescription")}</p></Card>
      <Card icon={<KeyRound size={17}/>} title={t("settings.mcpAuth")}><p className="text-sm">{t("settings.currentMode",{mode:auth})}</p><p className="mt-1 text-xs text-muted">{t("settings.mcpSecrets")}</p></Card>
      <Card icon={<Copy size={17}/>} title={t("settings.permissions")}><div className="flex flex-wrap gap-2"><code className="rounded-md bg-[var(--panel-2)] px-2 py-1 text-xs">leads.read</code><code className="rounded-md bg-[var(--panel-2)] px-2 py-1 text-xs">leads.write</code></div></Card>
    </div>
  </>;
}

function Card({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){
  return <section className="surface-flat rounded-xl p-4 sm:p-5"><div className="mb-3 flex items-center gap-2 text-muted">{icon}<h2 className="text-xs font-semibold uppercase tracking-wide">{title}</h2></div>{children}</section>;
}
