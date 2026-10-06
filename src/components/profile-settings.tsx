"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/auth/types";

async function request(url:string,method:string,body:unknown){const r=await fetch(url,{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j?.error?.message??"Falha na operação");return j;}

export function ProfileSettings({user}:{user:AuthenticatedUser}){
 const router=useRouter(); const [message,setMessage]=useState<string|null>(null); const [error,setError]=useState<string|null>(null); const [busy,setBusy]=useState(false);
 async function run(fn:()=>Promise<unknown>,success:string){setBusy(true);setError(null);setMessage(null);try{await fn();setMessage(success);router.refresh();}catch(e){setError(e instanceof Error?e.message:"Erro inesperado");}finally{setBusy(false);}}
 return <div className="grid gap-5 lg:grid-cols-2">
  <section className="surface-flat rounded-lg p-5"><h2 className="text-sm font-semibold">Profile</h2><p className="mt-1 text-xs text-muted">Sua identidade aparece na timeline e audit log.</p>
   <form className="mt-4 space-y-3" onSubmit={(e)=>{e.preventDefault();const d=new FormData(e.currentTarget);void run(()=>request("/api/auth/profile","PATCH",{name:d.get("name")}),"Perfil atualizado.");}}>
    <label className="block text-xs font-medium">Nome<input name="name" defaultValue={user.name} required className="mt-1.5 h-10 w-full rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/></label>
    <label className="block text-xs font-medium">Email<input value={user.email} readOnly className="mt-1.5 h-10 w-full rounded-md border border-default bg-[var(--panel-2)] px-3 text-sm text-muted"/></label>
    <div className="flex items-center justify-between"><span className="rounded-md bg-[var(--panel-2)] px-2 py-1 text-[10px] font-medium">{user.role}</span><button disabled={busy} className="rounded-md bg-[var(--text)] px-3 py-2 text-xs font-medium text-[var(--panel)] disabled:opacity-50">Salvar</button></div>
   </form>
  </section>
  <section className="surface-flat rounded-lg p-5"><h2 className="text-sm font-semibold">Change password</h2><p className="mt-1 text-xs text-muted">A nova senha deve ter pelo menos 10 caracteres. Outras sessões serão revogadas.</p>
   <form className="mt-4 space-y-3" onSubmit={(e)=>{e.preventDefault();const d=new FormData(e.currentTarget);const next=String(d.get("newPassword")??"");if(next!==String(d.get("confirmPassword")??"")){setError("As novas senhas não coincidem.");return;}void run(()=>request("/api/auth/change-password","POST",{currentPassword:d.get("currentPassword"),newPassword:next}),"Senha alterada.");e.currentTarget.reset();}}>
    <input name="currentPassword" type="password" required placeholder="Senha atual" className="h-10 w-full rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/>
    <input name="newPassword" type="password" minLength={10} maxLength={128} required placeholder="Nova senha" className="h-10 w-full rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/>
    <input name="confirmPassword" type="password" minLength={10} maxLength={128} required placeholder="Confirmar nova senha" className="h-10 w-full rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/>
    <div className="flex justify-end"><button disabled={busy} className="rounded-md bg-[var(--text)] px-3 py-2 text-xs font-medium text-[var(--panel)] disabled:opacity-50">Alterar senha</button></div>
   </form>
  </section>
  {(message||error)?<div className={`lg:col-span-2 rounded-md border px-3 py-2 text-xs ${error?"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300":"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"}`}>{error??message}</div>:null}
 </div>;
}
