"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProspectingRunForm(){
  const router=useRouter();
  const [objective,setObjective]=useState("");
  const [region,setRegion]=useState("");
  const [segments,setSegments]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError(null);
    try{
      const response=await fetch("/api/prospecting",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        objective,region:region||null,segments:segments.split(",").map(x=>x.trim()).filter(Boolean),
        sources:["public-web","maps","business-directories"],maxCandidates:50,icp:{},
      })});
      const body=await response.json();if(!response.ok)throw new Error(body?.error?.message??"Falha ao criar pesquisa.");
      setObjective("");setRegion("");setSegments("");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha inesperada.");}finally{setBusy(false);}
  }
  return <form onSubmit={submit} className="surface-flat rounded-lg p-5">
    <h2 className="text-sm font-semibold">Nova rodada de prospecção</h2><p className="mt-1 text-xs text-muted">Define o objetivo que a skill lead-discovery deve executar usando pesquisa pública.</p>
    <label className="mt-4 block text-xs font-medium">Objetivo<textarea required value={objective} onChange={e=>setObjective(e.target.value)} rows={3} placeholder="Ex.: encontrar 30 clínicas veterinárias no DF com boa reputação no Google e presença digital fraca" className="mt-1 w-full rounded-lg border border-default bg-[var(--panel-2)] p-3 text-sm outline-none"/></label>
    <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium">Região<input value={region} onChange={e=>setRegion(e.target.value)} placeholder="Brasília / DF" className="mt-1 w-full rounded-lg border border-default bg-[var(--panel-2)] p-2.5 text-sm outline-none"/></label><label className="text-xs font-medium">Segmentos<input value={segments} onChange={e=>setSegments(e.target.value)} placeholder="clínicas, veterinárias" className="mt-1 w-full rounded-lg border border-default bg-[var(--panel-2)] p-2.5 text-sm outline-none"/></label></div>
    {error?<p className="mt-3 text-xs text-red-600">{error}</p>:null}<button disabled={busy} className="mt-4 rounded-lg bg-[var(--text)] px-4 py-2 text-xs font-medium text-[var(--panel)] disabled:opacity-50">{busy?"Criando...":"Criar rodada"}</button>
  </form>;
}
