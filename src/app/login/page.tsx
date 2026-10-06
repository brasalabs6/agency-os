import { Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/app-auth";
import { redirect } from "next/navigation";
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}){
 const existing=await getCurrentUser(); if(existing) redirect("/");
 const {error}=await searchParams;
 return <main className="grid min-h-screen place-items-center p-4"><form method="post" action="/api/auth/login" className="surface w-full max-w-sm rounded-xl p-6"><div className="mb-5 flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--text)] text-[var(--panel)]"><Activity size={16}/></div><div><h1 className="font-semibold">AgencyOS Leads</h1><p className="text-xs text-muted">Sign in to your workspace</p></div></div><div className="space-y-3"><label className="block text-xs font-medium">Email<input autoFocus required type="email" name="email" autoComplete="email" className="mt-1.5 h-10 w-full rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/></label><label className="block text-xs font-medium">Password<input required type="password" name="password" autoComplete="current-password" className="mt-1.5 h-10 w-full rounded-md border border-default bg-[var(--panel)] px-3 text-sm"/></label></div>{error?<p className="mt-3 text-xs text-red-600">Email ou senha inválidos.</p>:null}<button className="mt-4 w-full rounded-md bg-[var(--text)] py-2.5 text-sm font-medium text-[var(--panel)]">Entrar</button></form></main>;
}
