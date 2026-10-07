import { PageHeader } from "@/components/page-header";
import { TeamSettings } from "@/components/team-settings";
import { requireAdminUser } from "@/lib/auth/app-auth";
import { getI18n } from "@/lib/i18n/server";
import { listTeam } from "@/lib/services/team";

export default async function TeamPage(){
  const admin=await requireAdminUser();
  const users=await listTeam(admin);
  const { t }=await getI18n();
  return <><PageHeader title={t("team.title")} description={t("team.description")}/><TeamSettings initialUsers={users} currentUserId={admin.id}/></>;
}
