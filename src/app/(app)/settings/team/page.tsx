import { PageHeader } from "@/components/page-header";
import { TeamSettings } from "@/components/team-settings";
import { requireAdminUser } from "@/lib/auth/app-auth";
import { listTeam } from "@/lib/services/team";

export default async function TeamPage(){
  const admin=await requireAdminUser();
  const users=await listTeam(admin);
  return <><PageHeader title="Equipe" description="Identidades, funções e acesso da equipe ao CRM."/><TeamSettings initialUsers={users} currentUserId={admin.id}/></>;
}
