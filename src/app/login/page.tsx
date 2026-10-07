import { Activity } from "lucide-react";
import { redirect } from "next/navigation";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonPrimaryClass, controlClass } from "@/components/ui-kit";
import { getCurrentUser } from "@/lib/auth/app-auth";
import { getI18n } from "@/lib/i18n/server";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const existing = await getCurrentUser();
  if (existing) redirect("/");
  const { error } = await searchParams;
  const { t } = await getI18n();

  return <main className="relative grid min-h-dvh place-items-center p-4 sm:p-6">
    <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-4 sm:top-4"><LanguageToggle compact/><ThemeToggle/></div>
    <form method="post" action="/api/auth/login" className="surface w-full max-w-sm rounded-2xl p-5 sm:p-6">
      <div className="mb-6 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--text)] text-[var(--panel)]"><Activity size={19}/></div><div><h1 className="font-semibold tracking-tight">AgencyOS Leads</h1><p className="mt-0.5 text-xs text-muted">{t("login.subtitle")}</p></div></div>
      <div className="space-y-4"><label className="block text-xs font-medium">{t("login.email")}<input autoFocus required type="email" name="email" autoComplete="email" className={`mt-1.5 ${controlClass}`}/></label><label className="block text-xs font-medium">{t("login.password")}<input required type="password" name="password" autoComplete="current-password" className={`mt-1.5 ${controlClass}`}/></label></div>
      {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{t("login.invalid")}</p> : null}
      <button className={`${buttonPrimaryClass} mt-5 w-full`}>{t("login.submit")}</button>
    </form>
  </main>;
}
