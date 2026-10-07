"use client";

import { useState } from "react";
import type { PublicUser } from "@/lib/auth/types";
import { ModalShell } from "./modal-shell";
import { useI18n } from "./i18n-provider";
import { buttonGhostClass, buttonPrimaryClass, buttonSecondaryClass, controlClass } from "./ui-kit";

async function req(url:string,method:string,body?:unknown){
  const response=await fetch(url,{method,headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
  const json=await response.json();
  if(!response.ok)throw new Error(json?.error?.message??"Request failed");
  return json as PublicUser;
}

export function TeamSettings({initialUsers,currentUserId}:{initialUsers:PublicUser[];currentUserId:string}){
  const { t }=useI18n();
  const [users,setUsers]=useState(initialUsers);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);
  const [editingUser,setEditingUser]=useState<PublicUser|null>(null);
  const [resetUser,setResetUser]=useState<PublicUser|null>(null);

  function upsert(user:PublicUser){setUsers((current)=>current.some((item)=>item.id===user.id)?current.map((item)=>item.id===user.id?user:item):[...current,user]);}
  async function action(id:string,fn:()=>Promise<PublicUser>,ok:string){
    setBusy(id);setError(null);setMessage(null);
    try{upsert(await fn());setMessage(ok);}
    catch(e){setError(e instanceof Error?e.message:t("common.errorUnexpected"));}
    finally{setBusy(null);}
  }

  return <div className="space-y-5">
    <section className="surface-flat rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">{t("team.add")}</h2>
      <p className="mt-1 text-xs text-muted">{t("team.addDescription")}</p>
      <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_.7fr_1fr_auto]" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const d=new FormData(form);setBusy("new");setError(null);setMessage(null);try{const user=await req("/api/team","POST",{name:d.get("name"),email:d.get("email"),role:d.get("role"),password:d.get("password")});upsert(user);form.reset();setMessage(t("team.created"));}catch(err){setError(err instanceof Error?err.message:t("common.errorUnexpected"));}finally{setBusy(null);}}}>
        <input name="name" required placeholder={t("team.name")} className={controlClass}/>
        <input name="email" type="email" required placeholder="email@company.com" className={controlClass}/>
        <select name="role" defaultValue="MEMBER" className={controlClass}><option value="MEMBER">{t("team.member")}</option><option value="ADMIN">{t("team.admin")}</option></select>
        <input name="password" type="password" minLength={10} maxLength={128} required placeholder={t("team.initialPassword")} className={controlClass}/>
        <button disabled={busy==="new"} className={`${buttonPrimaryClass} sm:col-span-2 xl:col-span-1`}>{t("team.addButton")}</button>
      </form>
    </section>

    <section className="surface-flat overflow-hidden rounded-xl">
      <div className="border-b border-default px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">{t("team.members")}</h2><p className="mt-1 text-xs text-muted">{t("team.membersDescription")}</p></div>
      <div className="divide-y divide-[var(--border)]">{users.map((user)=><div key={user.id} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_180px_100px] xl:grid-cols-[minmax(0,1fr)_180px_100px_330px] xl:items-center">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--panel-2)] text-xs font-semibold">{user.name.split(/\s+/).slice(0,2).map((part)=>part[0]).join("").toUpperCase()}</div><div className="min-w-0"><div className="truncate text-sm font-medium">{user.name}{user.id===currentUserId?<span className="ml-2 text-xs text-muted">{t("team.you")}</span>:null}</div><div className="truncate text-xs text-muted">{user.email}</div></div></div>
        <select value={user.role} disabled={!user.active||busy===user.id} onChange={(e)=>void action(user.id,()=>req(`/api/team/${user.id}`,"PATCH",{role:e.target.value}),t("team.roleUpdated"))} className={controlClass}><option value="MEMBER">{t("team.member")}</option><option value="ADMIN">{t("team.admin")}</option></select>
        <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${user.active?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300":"bg-[var(--panel-2)] text-muted"}`}>{user.active?t("common.active").toUpperCase():t("common.inactive").toUpperCase()}</span>
        <div className="grid grid-cols-2 gap-2 lg:col-span-3 sm:flex sm:flex-wrap xl:col-span-1 xl:justify-end">
          <button onClick={()=>setEditingUser(user)} disabled={busy===user.id} className={buttonSecondaryClass}>{t("team.edit")}</button>
          <button onClick={()=>setResetUser(user)} disabled={busy===user.id} className={buttonSecondaryClass}>{t("team.resetPassword")}</button>
          {user.active?<button onClick={()=>void action(user.id,()=>req(`/api/team/${user.id}/deactivate`,"POST"),t("team.deactivated"))} disabled={busy===user.id||user.id===currentUserId} className="focus-ring col-span-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950 sm:col-span-1">{t("team.deactivate")}</button>:<button onClick={()=>void action(user.id,()=>req(`/api/team/${user.id}/activate`,"POST"),t("team.activated"))} disabled={busy===user.id} className={buttonSecondaryClass}>{t("team.activate")}</button>}
        </div>
      </div>)}</div>
    </section>

    {(message||error)?<div className={`rounded-lg border px-3 py-2 text-xs ${error?"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300":"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"}`}>{error??message}</div>:null}

    <ModalShell open={Boolean(editingUser)} onClose={()=>setEditingUser(null)} title={t("team.editMember")} sizeClass="sm:max-w-lg">
      {editingUser?<form className="p-4 sm:p-5" onSubmit={(event)=>{event.preventDefault();const d=new FormData(event.currentTarget);void action(editingUser.id,()=>req(`/api/team/${editingUser.id}`,"PATCH",{name:d.get("name"),email:d.get("email")}),t("team.updated")).then(()=>setEditingUser(null));}}>
        <div className="space-y-4"><label className="block text-xs font-medium">{t("team.name")}<input name="name" defaultValue={editingUser.name} required className={`mt-1.5 ${controlClass}`}/></label><label className="block text-xs font-medium">Email<input name="email" defaultValue={editingUser.email} type="email" required className={`mt-1.5 ${controlClass}`}/></label></div>
        <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-default bg-[var(--panel)] pt-3 pb-[env(safe-area-inset-bottom)]"><button type="button" className={buttonGhostClass} onClick={()=>setEditingUser(null)}>{t("common.cancel")}</button><button disabled={busy===editingUser.id} className={buttonPrimaryClass}>{t("common.save")}</button></div>
      </form>:null}
    </ModalShell>

    <ModalShell open={Boolean(resetUser)} onClose={()=>setResetUser(null)} title={t("team.resetTitle")} description={resetUser?.name} sizeClass="sm:max-w-lg">
      {resetUser?<form className="p-4 sm:p-5" onSubmit={(event)=>{event.preventDefault();const d=new FormData(event.currentTarget);void action(resetUser.id,()=>req(`/api/team/${resetUser.id}/reset-password`,"POST",{password:d.get("password")}),t("team.passwordReset")).then(()=>setResetUser(null));}}>
        <label className="block text-xs font-medium">{t("team.temporaryPassword")}<input name="password" type="password" minLength={10} maxLength={128} required className={`mt-1.5 ${controlClass}`}/><span className="mt-1.5 block text-xs text-muted">{t("team.passwordHint")}</span></label>
        <div className="sticky bottom-0 mt-5 flex justify-end gap-2 border-t border-default bg-[var(--panel)] pt-3 pb-[env(safe-area-inset-bottom)]"><button type="button" className={buttonGhostClass} onClick={()=>setResetUser(null)}>{t("common.cancel")}</button><button disabled={busy===resetUser.id} className={buttonPrimaryClass}>{t("team.resetPassword")}</button></div>
      </form>:null}
    </ModalShell>
  </div>;
}
