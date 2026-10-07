"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalRequest } from "@/lib/domain/automation";

function ApprovalCard({ item }: { item: ApprovalRequest }) {
  const router=useRouter();
  const [preview,setPreview]=useState(item.preview);
  const [payload,setPayload]=useState(JSON.stringify(item.payload,null,2));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const parsed=useMemo(()=>{try{return JSON.parse(payload) as Record<string,unknown>;}catch{return null;}},[payload]);

  async function act(kind:"approve"|"reject") {
    setBusy(true);setError(null);
    try{
      const response=await fetch("/api/approvals/"+item.id+"/"+kind,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify(kind==="approve"?{expectedVersion:item.version,payload:parsed,preview}:{expectedVersion:item.version}),
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error?.message??"Falha ao atualizar aprovação.");
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha inesperada.");}finally{setBusy(false);}
  }

  async function execute() {
    setBusy(true);setError(null);
    try{
      const suffix=item.actionType==="WHATSAPP_SEND"?"execute-whatsapp":item.actionType==="PROPOSAL_SEND"?"execute-proposal":item.actionType==="CONTRACT_SEND"?"execute-contract":null;
      if(!suffix)throw new Error("Esta ação não possui executor automático.");
      const response=await fetch("/api/approvals/"+item.id+"/"+suffix,{method:"POST"});
      const body=await response.json();
      if(!response.ok)throw new Error(body?.error?.message??"Falha na execução.");
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Falha inesperada.");}finally{setBusy(false);}
  }

  const editable=item.status==="PENDING";
  return <article className="surface-flat rounded-lg p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-[10px] uppercase tracking-wide text-muted">{item.actionType}</div><h2 className="mt-1 text-sm font-semibold">{item.leadId?"Lead "+item.leadId.slice(0,8):"Ação sem lead"}</h2></div>
      <span className="rounded border border-default px-2 py-1 text-[10px]">{item.status} · v{item.version}</span>
    </div>
    {item.rationale?<p className="mt-3 text-xs leading-5 text-muted">{item.rationale}</p>:null}
    <div className="mt-4"><label className="text-[10px] font-semibold uppercase tracking-wide text-muted">Preview aprovado</label><textarea value={preview} onChange={(e)=>setPreview(e.target.value)} disabled={!editable} rows={5} className="mt-1 w-full rounded-lg border border-default bg-[var(--panel-2)] p-3 text-xs outline-none focus:border-[var(--accent)] disabled:opacity-70"/></div>
    <details className="mt-3"><summary className="cursor-pointer text-xs text-muted">Payload estruturado</summary><textarea value={payload} onChange={(e)=>setPayload(e.target.value)} disabled={!editable} rows={9} className="mt-2 w-full rounded-lg border border-default bg-[var(--panel-2)] p-3 font-mono text-[11px] outline-none disabled:opacity-70"/></details>
    <div className="mt-4 space-y-1">{item.policyChecks.map((check)=><div key={check.id} className={"text-xs "+(check.passed?"text-emerald-700 dark:text-emerald-300":"text-red-700 dark:text-red-300")}>{check.passed?"✓":"✕"} {check.message}</div>)}</div>
    {error?<p className="mt-3 text-xs text-red-600">{error}</p>:null}
    <div className="mt-4 flex flex-wrap gap-2">
      {item.status==="PENDING"?<><button disabled={busy||!parsed} onClick={()=>act("approve")} className="rounded-lg bg-[var(--text)] px-3 py-2 text-xs font-medium text-[var(--panel)] disabled:opacity-40">Aprovar{preview!==item.preview||payload!==JSON.stringify(item.payload,null,2)?" alterações":""}</button><button disabled={busy} onClick={()=>act("reject")} className="rounded-lg border border-default px-3 py-2 text-xs disabled:opacity-40">Rejeitar</button></>:null}
      {item.status==="APPROVED"?<button disabled={busy} onClick={execute} className="rounded-lg bg-[var(--text)] px-3 py-2 text-xs font-medium text-[var(--panel)] disabled:opacity-40">Executar ação aprovada</button>:null}
    </div>
  </article>;
}

export function ApprovalInbox({ items }: { items: ApprovalRequest[] }) {
  if(!items.length)return <div className="surface-flat rounded-lg p-8 text-center text-sm text-muted">Nenhuma aprovação encontrada.</div>;
  return <div className="grid gap-4 xl:grid-cols-2">{items.map((item)=><ApprovalCard key={item.id} item={item}/>)}</div>;
}
