"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { useI18n } from "./i18n-provider";
import { buttonPrimaryClass, controlClass } from "./ui-kit";

async function request(url:string,method:string,body:unknown){
  const response=await fetch(url,{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const json=await response.json();
  if(!response.ok)throw new Error(json?.error?.message??"Request failed");
  return json;
}

export function ProfileSettings({user}:{user:AuthenticatedUser}){
  const router=useRouter();
  const { t }=useI18n();
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  async function run(fn:()=>Promise<unknown>,success:string){
    setBusy(true);setError(null);setMessage(null);
    try{await fn();setMessage(success);router.refresh();}
    catch(e){setError(e instanceof Error?e.message:t("common.errorUnexpected"));}
    finally{setBusy(false);}
  }

  return <div className="grid gap-5 xl:grid-cols-2">
    <section className="surface-flat rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{t("profile.identity")}</h2>
      <p className="mt-1 text-xs text-muted">{t("profile.identityDescription")}</p>
      <form className="mt-4 space-y-4" onSubmit={(e)=>{e.preventDefault();const d=new FormData(e.currentTarget);void run(()=>request("/api/auth/profile","PATCH",{name:d.get("name")}),t("profile.updated"));}}>
        <label className="block text-xs font-medium">{t("profile.name")}<input name="name" defaultValue={user.name} required className={`mt-1.5 ${controlClass}`}/></label>
        <label className="block text-xs font-medium">Email<input value={user.email} readOnly className={`mt-1.5 ${controlClass} bg-[var(--panel-2)] text-muted`}/></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-[var(--panel-2)] px-2.5 py-1 text-xs font-medium">{user.role === "ADMIN" ? t("profile.roleAdmin") : t("profile.roleMember")}</span><button disabled={busy} className={buttonPrimaryClass}>{t("common.save")}</button></div>
      </form>
    </section>
    <section className="surface-flat rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{t("profile.changePassword")}</h2>
      <p className="mt-1 text-xs text-muted">{t("profile.passwordDescription")}</p>
      <form className="mt-4 space-y-3" onSubmit={(e)=>{e.preventDefault();const d=new FormData(e.currentTarget);const next=String(d.get("newPassword")??"");if(next!==String(d.get("confirmPassword")??"")){setError(t("profile.passwordMismatch"));return;}void run(()=>request("/api/auth/change-password","POST",{currentPassword:d.get("currentPassword"),newPassword:next}),t("profile.passwordChanged"));e.currentTarget.reset();}}>
        <input name="currentPassword" type="password" required placeholder={t("profile.currentPassword")} className={controlClass}/>
        <input name="newPassword" type="password" minLength={10} maxLength={128} required placeholder={t("profile.newPassword")} className={controlClass}/>
        <input name="confirmPassword" type="password" minLength={10} maxLength={128} required placeholder={t("profile.confirmPassword")} className={controlClass}/>
        <div className="flex justify-end"><button disabled={busy} className={buttonPrimaryClass}>{t("profile.changePassword")}</button></div>
      </form>
    </section>
    {(message||error)?<div className={`xl:col-span-2 rounded-lg border px-3 py-2 text-xs ${error?"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300":"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"}`}>{error??message}</div>:null}
  </div>;
}
