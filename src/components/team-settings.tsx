"use client";

import { useState } from "react";
import type { PublicUser } from "@/lib/auth/types";
import { buttonPrimaryClass, buttonSecondaryClass, controlClass } from "./ui-kit";

async function req(url:string,method:string,body?:unknown){
  const response=await fetch(url,{method,headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
  const json=await response.json();
  if(!response.ok)throw new Error(json?.error?.message??"Falha na operação");
  return json as PublicUser;
}

export function TeamSettings({initialUsers,currentUserId}:{initialUsers:PublicUser[];currentUserId:string}){
  const [users,setUsers]=useState(initialUsers);
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [message,setMessage]=useState<string|null>(null);

  function upsert(user:PublicUser){setUsers((current)=>current.some((item)=>item.id===user.id)?current.map((item)=>item.id===user.id?user:item):[...current,user]);}
  async function action(id:string,fn:()=>Promise<PublicUser>,ok:string){
    setBusy(id);setError(null);setMessage(null);
    try{upsert(await fn());setMessage(ok);}
    catch(e){setError(e instanceof Error?e.message:"Erro");}
    finally{setBusy(null);}
  }

  return <div className="space-y-5">
    <section className="surface-flat rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold">Adicionar membro</h2>
      <p className="mt-1 text-xs text-muted">Crie uma identidade individual. Não existe cadastro público.</p>
      <form className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_.7fr_1fr_auto]" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const d=new FormData(form);setBusy("new");setError(null);setMessage(null);try{const user=await req("/api/team","POST",{name:d.get("name"),email:d.get("email"),role:d.get("role"),password:d.get("password")});upsert(user);form.reset();setMessage("Membro criado.");}catch(err){setError(err instanceof Error?err.message:"Erro");}finally{setBusy(null);}}}>
        <input name="name" required placeholder="Nome" className={controlClass}/>
        <input name="email" type="email" required placeholder="email@empresa.com" className={controlClass}/>
        <select name="role" defaultValue="MEMBER" className={controlClass}><option value="MEMBER">Membro</option><option value="ADMIN">Administrador</option></select>
        <input name="password" type="password" minLength={10} maxLength={128} required placeholder="Senha inicial" className={controlClass}/>
        <button disabled={busy==="new"} className={`${buttonPrimaryClass} sm:col-span-2 xl:col-span-1`}>Adicionar</button>
      </form>
    </section>

    <section className="surface-flat overflow-hidden rounded-xl">
      <div className="border-b border-default px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold">Equipe</h2><p className="mt-1 text-xs text-muted">Usuários desativados mantêm histórico e atribuições existentes.</p></div>
      <div className="divide-y divide-[var(--border)]">{users.map((user)=><div key={user.id} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_180px_100px] xl:grid-cols-[minmax(0,1fr)_180px_100px_330px] xl:items-center">
        <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--panel-2)] text-xs font-semibold">{user.name.split(/\s+/).slice(0,2).map((part)=>part[0]).join("").toUpperCase()}</div><div className="min-w-0"><div className="truncate text-sm font-medium">{user.name}{user.id===currentUserId?<span className="ml-2 text-[10px] text-muted">(você)</span>:null}</div><div className="truncate text-xs text-muted">{user.email}</div></div></div>
        <select value={user.role} disabled={!user.active||busy===user.id} onChange={(e)=>void action(user.id,()=>req(`/api/team/${user.id}`,"PATCH",{role:e.target.value}),"Função atualizada.")} className={controlClass}><option value="MEMBER">Membro</option><option value="ADMIN">Administrador</option></select>
        <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-medium ${user.active?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300":"bg-[var(--panel-2)] text-muted"}`}>{user.active?"ATIVO":"INATIVO"}</span>
        <div className="flex flex-wrap gap-2 lg:col-span-3 xl:col-span-1 xl:justify-end">
          <button onClick={()=>{const name=window.prompt("Nome",user.name);if(name===null)return;const email=window.prompt("Email",user.email);if(email===null)return;void action(user.id,()=>req(`/api/team/${user.id}`,"PATCH",{name,email}),"Membro atualizado.");}} disabled={busy===user.id} className={buttonSecondaryClass}>Editar</button>
          <button onClick={()=>{const password=window.prompt("Nova senha temporária (10+ caracteres)");if(password)void action(user.id,()=>req(`/api/team/${user.id}/reset-password`,"POST",{password}),"Senha redefinida e sessões revogadas.");}} disabled={busy===user.id} className={buttonSecondaryClass}>Redefinir senha</button>
          {user.active?<button onClick={()=>void action(user.id,()=>req(`/api/team/${user.id}/deactivate`,"POST"),"Usuário desativado.")} disabled={busy===user.id||user.id===currentUserId} className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">Desativar</button>:<button onClick={()=>void action(user.id,()=>req(`/api/team/${user.id}/activate`,"POST"),"Usuário ativado.")} disabled={busy===user.id} className={buttonSecondaryClass}>Ativar</button>}
        </div>
      </div>)}</div>
    </section>

    {(message||error)?<div className={`rounded-lg border px-3 py-2 text-xs ${error?"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300":"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"}`}>{error??message}</div>:null}
  </div>;
}
