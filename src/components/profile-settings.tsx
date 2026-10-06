"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { buttonPrimaryClass, controlClass } from "./ui-kit";

async function request(url:string,method:string,body:unknown){
  const response=await fetch(url,{method,headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const json=await response.json();
  if(!response.ok)throw new Error(json?.error?.message??"Falha na operação");
  return json;
}

export function ProfileSettings({user}:{user:AuthenticatedUser}){
  const router=useRouter();
  const [message,setMessage]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  async function run(fn:()=>Promise<unknown>,success:string){
    setBusy(true);setError(null);setMessage(null);
    try{await fn();setMessage(success);router.refresh();}
    catch(e){setError(e instanceof Error?e.message:"Erro inesperado");}
    finally{setBusy(false);}
  }

  return <div className="grid gap-5 xl:grid-cols-2">
    <section className="surface-flat rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">Perfil</h2>
      <p className="mt-1 text-xs text-muted">Sua identidade aparece no histórico e nos registros de auditoria.</p>
      <form className="mt-4 space-y-4" onSubmit={(e)=>{e.preventDefault();const d=new FormData(e.currentTarget);void run(()=>request("/api/auth/profile","PATCH",{name:d.get("name")}),"Perfil atualizado.");}}>
        <label className="block text-xs font-medium">Nome<input name="name" defaultValue={user.name} required className={`mt-1.5 ${controlClass}`}/></label>
        <label className="block text-xs font-medium">Email<input value={user.email} readOnly className={`mt-1.5 ${controlClass} bg-[var(--panel-2)] text-muted`}/></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-[var(--panel-2)] px-2.5 py-1 text-[10px] font-medium">{user.role === "ADMIN" ? "Administrador" : "Membro"}</span><button disabled={busy} className={buttonPrimaryClass}>Salvar</button></div>
      </form>
    </section>
    <section className="surface-flat rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">Alterar senha</h2>
      <p className="mt-1 text-xs text-muted">A nova senha deve ter pelo menos 10 caracteres. Outras sessões serão revogadas.</p>
      <form className="mt-4 space-y-3" onSubmit={(e)=>{e.preventDefault();const d=new FormData(e.currentTarget);const next=String(d.get("newPassword")??"");if(next!==String(d.get("confirmPassword")??"")){setError("As novas senhas não coincidem.");return;}void run(()=>request("/api/auth/change-password","POST",{currentPassword:d.get("currentPassword"),newPassword:next}),"Senha alterada.");e.currentTarget.reset();}}>
        <input name="currentPassword" type="password" required placeholder="Senha atual" className={controlClass}/>
        <input name="newPassword" type="password" minLength={10} maxLength={128} required placeholder="Nova senha" className={controlClass}/>
        <input name="confirmPassword" type="password" minLength={10} maxLength={128} required placeholder="Confirmar nova senha" className={controlClass}/>
        <div className="flex justify-end"><button disabled={busy} className={buttonPrimaryClass}>Alterar senha</button></div>
      </form>
    </section>
    {(message||error)?<div className={`xl:col-span-2 rounded-lg border px-3 py-2 text-xs ${error?"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300":"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"}`}>{error??message}</div>:null}
  </div>;
}
