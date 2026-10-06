"use client";
import { useState } from "react";
import type { PublicUser } from "@/lib/auth/types";

async function req(url:string,method:string,body?:unknown){const r=await fetch(url,{method,headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});const j=await r.json();if(!r.ok)throw new Error(j?.error?.message??"Falha na operação");return j as PublicUser;}

export function TeamSettings({initialUsers,currentUserId}:{initialUsers:PublicUser[];currentUserId:string}){
 const [users,setUsers]=useState(initialUsers); const [busy,setBusy]=useState<string|null>(null); const [error,setError]=useState<string|null>(null); const [message,setMessage]=useState<string|null>(null);
 function upsert(user:PublicUser){setUsers(c=>c.some(x=>x.id===user.id)?c.map(x=>x.id===user.id?user:x):[...c,user]);}
 async function action(id:string,fn:()=>Promise<PublicUser>,ok:string){setBusy(id);setError(null);setMessage(null);try{upsert(await fn());setMessage(ok);}catch(e){setError(e instanceof Error?e.message:"Erro");}finally{setBusy(null);}}
 return <div className="space-y-5">
  <section className="surface-flat rounded-lg p-5"><h2 className="text-sm font-semibold">Add member</h2><p className="mt-1 text-xs text-muted">Crie uma identidade individual. Não existe signup público.</p>
   <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1.2fr_.7fr_1fr_auto]" onSubmit={async(e)=>{e.preventDefault();const form=e.currentTarget;const d=new FormData(form);setBusy("new");setError(null);setMessage(null);try{const user=await req("/api/team","POST",{name:d.get("name"),email:d.get("email"),role:d.get("role"),password:d.get("password")});upsert(user);form.reset();setMessage("Membro criado.");}catch(err){setError(err instanceof Error?err.message:"Erro");}finally{setBusy(null);}}}>
    <input name="name" required placeholder="Nome" className="h-10 rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/>
    <input name="email" type="email" required placeholder="email@empresa.com" className="h-10 rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/>
    <select name="role" defaultValue="MEMBER" className="h-10 rounded-md border border-default bg-[var(--panel)] px-3 text-sm"><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select>
    <input name="password" type="password" minLength={10} maxLength={128} required placeholder="Senha inicial" className="h-10 rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/>
    <button disabled={busy==="new"} className="rounded-md bg-[var(--text)] px-4 text-xs font-medium text-[var(--panel)] disabled:opacity-50">Adicionar</button>
   </form>
  </section>
  <section className="surface-flat overflow-hidden rounded-lg"><div className="border-b border-default px-5 py-4"><h2 className="text-sm font-semibold">Team</h2><p className="mt-1 text-xs text-muted">Usuários desativados mantêm histórico e ownership existentes.</p></div>
   <div className="divide-y divide-[var(--border)]">{users.map(user=><div key={user.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_210px_100px_260px] lg:items-center">
    <div className="flex min-w-0 items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--panel-2)] text-xs font-semibold">{user.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}</div><div className="min-w-0"><div className="truncate text-sm font-medium">{user.name}{user.id===currentUserId?<span className="ml-2 text-[10px] text-muted">you</span>:null}</div><div className="truncate text-xs text-muted">{user.email}</div></div></div>
    <select value={user.role} disabled={!user.active||busy===user.id} onChange={(e)=>void action(user.id,()=>req(`/api/team/${user.id}`,"PATCH",{role:e.target.value}),"Role atualizada.")} className="h-9 rounded-md border border-default bg-[var(--panel)] px-2 text-xs"><option value="MEMBER">MEMBER</option><option value="ADMIN">ADMIN</option></select>
    <span className={`w-fit rounded-md px-2 py-1 text-[10px] font-medium ${user.active?"bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300":"bg-[var(--panel-2)] text-muted"}`}>{user.active?"ACTIVE":"INACTIVE"}</span>
    <div className="flex flex-wrap justify-end gap-2"><button onClick={()=>{const name=window.prompt("Nome",user.name);if(name===null)return;const email=window.prompt("Email",user.email);if(email===null)return;void action(user.id,()=>req(`/api/team/${user.id}`,"PATCH",{name,email}),"Membro atualizado.");}} disabled={busy===user.id} className="rounded-md border border-default px-2.5 py-1.5 text-xs">Edit</button><button onClick={()=>{const password=window.prompt("Nova senha temporária (10+ caracteres)");if(password)void action(user.id,()=>req(`/api/team/${user.id}/reset-password`,"POST",{password}),"Senha redefinida e sessões revogadas.");}} disabled={busy===user.id} className="rounded-md border border-default px-2.5 py-1.5 text-xs">Reset password</button>{user.active?<button onClick={()=>void action(user.id,()=>req(`/api/team/${user.id}/deactivate`,"POST"),"Usuário desativado.")} disabled={busy===user.id||user.id===currentUserId} className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs text-red-700 disabled:opacity-40 dark:border-red-900 dark:text-red-300">Deactivate</button>:<button onClick={()=>void action(user.id,()=>req(`/api/team/${user.id}/activate`,"POST"),"Usuário ativado.")} disabled={busy===user.id} className="rounded-md border border-default px-2.5 py-1.5 text-xs">Activate</button>}</div>
   </div>)}</div>
  </section>
  {(message||error)?<div className={`rounded-md border px-3 py-2 text-xs ${error?"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300":"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"}`}>{error??message}</div>:null}
 </div>;
}
