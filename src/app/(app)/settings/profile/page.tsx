import { PageHeader } from "@/components/page-header";
import { ProfileSettings } from "@/components/profile-settings";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { getI18n } from "@/lib/i18n/server";

export default async function ProfilePage({searchParams}:{searchParams:Promise<{forbidden?:string}>}){
  const user=await requireCurrentUser();
  const {forbidden}=await searchParams;
  const { t }=await getI18n();
  return <><PageHeader title={t("profile.title")} description={t("profile.description")}/>{forbidden?<div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">{t("profile.forbidden")}</div>:null}<ProfileSettings user={user}/></>;
}
