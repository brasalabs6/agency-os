import { PageHeader } from "@/components/page-header";
import { ProfileSettings } from "@/components/profile-settings";
import { requireCurrentUser } from "@/lib/auth/app-auth";

export default async function ProfilePage({searchParams}:{searchParams:Promise<{forbidden?:string}>}){
  const user=await requireCurrentUser();
  const {forbidden}=await searchParams;
  return <><PageHeader title="Perfil" description="Sua conta e credenciais no AgencyOS." />{forbidden?<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">Sua conta não possui acesso administrativo.</div>:null}<ProfileSettings user={user}/></>;
}
