"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConversationScript, ScriptView } from "@/lib/domain/script-flow";
import type { UserRole } from "@/lib/domain/types";
import { LeadScriptMap } from "./lead-script-map";

type TrailStep={nodeId:string;edgeId?:string};
type Mode="guided"|"map";

export function LeadScriptWorkspace({leadId,role}:{leadId:string;role:UserRole}) {
  const [scripts,setScripts]=useState<ConversationScript[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [view,setView]=useState<"published"|"draft">("published");
  const [data,setData]=useState<ScriptView|null>(null);
  const [loadedSelection,setLoadedSelection]=useState("");
  const [trail,setTrail]=useState<TrailStep[]>([]);
  const [inspectId,setInspectId]=useState<string|null>(null);
  const [mode,setMode]=useState<Mode>("guided");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  const base="/api/leads/"+encodeURIComponent(leadId)+"/scripts";
  const loadList=useCallback(async ()=>{
    const response=await fetch(base,{cache:"no-store"});
    if(!response.ok)throw new Error("Não foi possível listar os roteiros");
    const list=await response.json() as {items:ConversationScript[]};
    setScripts(list.items);
    setSelectedId(old=>list.items.some(s=>s.id===old)?old:(list.items[0]?.id??""));
  },[base]);
  useEffect(()=>{
    let mounted=true;
    async function load(){
      try{await loadList();}catch(e){if(mounted)setError(e instanceof Error?e.message:"Erro ao carregar os roteiros");}
    }
    void load();return ()=>{mounted=false;};
  },[loadList]);

  const selected=scripts.find(x=>x.id===selectedId);
  const effectiveView=view==="published"&&!selected?.publishedRevisionId?"draft":view;
  useEffect(()=>{
    if(!selectedId)return;
    let ignore=false;
    async function load(){
      try{
        const response=await fetch(base+"/"+encodeURIComponent(selectedId)+"?view="+effectiveView,{cache:"no-store"});
        if(!response.ok)throw new Error("Não foi possível carregar esta versão");
        const result=await response.json() as ScriptView;
        if(!ignore){
          setData(result);
          setLoadedSelection(selectedId+":"+effectiveView);
          setTrail(result.revision?.graph.startNodeId?[{nodeId:result.revision.graph.startNodeId}]:[]);
          setInspectId(null);setNotice("");setError("");
        }
      }catch(e){if(!ignore){setError(e instanceof Error?e.message:"Erro");setData(null);}}
    }
    void load();
    return ()=>{ignore=true;};
  },[base,selectedId,effectiveView]);

  // Never show an earlier lead/script/revision while a new async fetch is pending.
  const ready=Boolean(selectedId && loadedSelection===selectedId+":"+effectiveView && data?.script.id===selectedId);
  const graph=ready?data?.revision?.graph:undefined;
  const currentNode=useMemo(()=>graph?.nodes.find(x=>x.id===trail.at(-1)?.nodeId),[graph,trail]);
  const inspection=graph?.nodes.find(x=>x.id===inspectId);
  const choices=graph?.edges.filter(x=>x.source===currentNode?.id)??[];
  const used=ready?(data?.revision?.id===selected?.publishedRevisionId?"Publicado":"Rascunho / Prévia"):"Carregando";

  function reset(){if(graph){setTrail(graph.startNodeId?[{nodeId:graph.startNodeId}]:[]);setInspectId(null);}}
  function step(target:string,edgeId:string){
    if(trail.length>=100){setNotice("Limite de 100 passos na simulação. Volte ou reinicie para continuar.");return;}
    setTrail(old=>[...old,{nodeId:target,edgeId}]);setInspectId(null);setNotice("");
  }
  async function publish(){
    if(!ready||!selected||!data?.script.draftRevisionId||!confirm("Publicar este rascunho? A versão atualmente publicada permanecerá no histórico."))return;
    setBusy(true);setError("");
    try{
      const response=await fetch(base+"/"+selected.id+"/publish",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({expectedVersion:data.script.version,expectedDraftRevisionId:data.script.draftRevisionId}),
      });
      if(!response.ok){const body=await response.json();throw new Error(body?.error?.message??"Não foi possível publicar");}
      await loadList();setView("published");setNotice("Versão publicada. Atualize a aba para consultar a nova revisão.");
      const result=await response.json() as ScriptView;
      setData(result);setLoadedSelection(selected.id+":published");setTrail(result.revision?.graph.startNodeId?[{nodeId:result.revision.graph.startNodeId}]:[]);
    }catch(e){setError(e instanceof Error?e.message:"Erro ao publicar");}finally{setBusy(false);}
  }
  return <section className="space-y-4">
    <div className="surface-flat rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-base font-semibold">Script de conversa</h2>
          <p className="mt-1 text-xs text-muted">Explore abordagens possíveis. As reações selecionadas nesta aba são uma simulação, não mensagens reais.</p></div>
        <span className="rounded-lg border border-default px-2 py-1 text-xs text-muted">{used}</span>
      </div>
      {error?<p role="alert" className="mt-3 rounded-md border border-red-500 p-2 text-sm text-red-600">{error}</p>:null}
      {notice?<p role="status" className="mt-3 rounded-md border border-default p-2 text-sm">{notice}</p>:null}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-52 flex-1 text-xs text-muted">Roteiro
          <select value={selectedId} onChange={e=>{setSelectedId(e.target.value);setView("published");}}
            className="mt-1 block h-10 w-full rounded-lg border border-default bg-[var(--panel)] px-3 text-sm">
            {scripts.length===0?<option value="">Nenhum roteiro cadastrado</option>:null}
            {scripts.map(script=><option key={script.id} value={script.id}>{script.title} · {script.channel} · {script.purpose}</option>)}
          </select>
        </label>
        {selected?.draftRevisionId&&selected.publishedRevisionId?<button type="button" onClick={()=>setView(x=>x==="draft"?"published":"draft")}
          className="rounded-lg border border-default px-3 py-2 text-sm">
          {effectiveView==="draft"?"Ver publicada":"Prévia do rascunho"}
        </button>:null}
        {ready&&role==="ADMIN"&&selected?.draftRevisionId&&effectiveView==="draft"?<button type="button" disabled={busy}
          onClick={()=>void publish()} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-contrast)] disabled:opacity-50">Publicar rascunho</button>:null}
      </div>
      {ready&&data?.revision?<p className="mt-2 text-xs text-muted">Revisão #{data.revision.revisionNumber} · Versão {data.script.version} · {data.revision.createdAt.slice(0,10)}</p>:null}
    </div>
    {!graph?<div className="surface-flat rounded-xl p-7 text-center text-sm text-muted">
      {selected?"Esta versão não contém um grafo disponível.":"Ainda não há roteiros. O agente pode criá-los pela ferramenta MCP lead_script_upsert."}
    </div>:<>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Modo de visualização">
        <button type="button" onClick={()=>setMode("guided")}
          aria-pressed={mode==="guided"} className={"rounded-lg px-4 py-2 text-sm "+(mode==="guided"?"bg-[var(--accent)] text-[var(--accent-contrast)]":"border border-default")}>Navegador guiado</button>
        <button type="button" onClick={()=>setMode("map")}
          aria-pressed={mode==="map"} className={"rounded-lg px-4 py-2 text-sm "+(mode==="map"?"bg-[var(--accent)] text-[var(--accent-contrast)]":"border border-default")}>Mapa do roteiro</button>
      </div>
      {mode==="guided"?<div className="surface-flat space-y-4 rounded-xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {trail.map((step,index)=><span key={index} className="flex items-center gap-2">
            {index>0?<span aria-hidden="true">→</span>:null}
            <button type="button" className="rounded-md border border-default px-2 py-1 hover:bg-[var(--panel-2)]"
              onClick={()=>{setTrail(trail.slice(0,index+1));setNotice("");}}>
              {graph.nodes.find(x=>x.id===step.nodeId)?.title??step.nodeId}
            </button>
          </span>)}
        </div>
        {currentNode?<div className="rounded-xl border border-default bg-[var(--panel-2)] p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{currentNode.title}</h3><span className="text-xs text-muted">{currentNode.type}</span>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7">{currentNode.script}</p>
          {currentNode.guidance?<p className="mt-3 border-t border-default pt-3 text-xs text-muted">Orientação: {currentNode.guidance}</p>:null}
          <button type="button" onClick={()=>void navigator.clipboard.writeText(currentNode.script)}
            className="mt-4 rounded-lg border border-default px-3 py-2 text-xs">Copiar fala</button>
        </div>:<p className="text-sm text-muted">Este rascunho ainda não tem ponto inicial.</p>}
        {choices.length?<div className="space-y-2">
          <h4 className="text-sm font-semibold">Como o lead poderia reagir?</h4>
          {choices.map(edge=><button type="button" key={edge.id}
            onClick={()=>step(edge.target,edge.id)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-default p-3 text-left text-sm hover:bg-[var(--panel-2)]">
            <span>{edge.reaction.label}</span><span aria-hidden="true">→</span>
          </button>)}
        </div>:currentNode?.type==="END"?<p className="text-sm text-muted">Fim deste caminho. Retorne para explorar outra reação.</p>:null}
        <div className="flex flex-wrap gap-2 border-t border-default pt-4">
          <button type="button" disabled={trail.length<2}
            onClick={()=>{setTrail(old=>old.slice(0,-1));setNotice("");}}
            className="rounded-lg border border-default px-3 py-2 text-sm disabled:opacity-50">← Voltar</button>
          <button type="button" onClick={reset} className="rounded-lg border border-default px-3 py-2 text-sm">↺ Reiniciar</button>
          <button type="button" onClick={()=>setMode("map")} className="rounded-lg border border-default px-3 py-2 text-sm">Ver no mapa</button>
        </div>
      </div>:<div className="space-y-3">
        <LeadScriptMap graph={graph} trail={trail} onSelect={setInspectId}/>
        {inspection?<div className="surface-flat rounded-xl p-4">
          <h3 className="font-semibold">{inspection.title}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm">{inspection.script}</p>
          {inspection.guidance?<p className="mt-2 text-xs text-muted">{inspection.guidance}</p>:null}
          <button type="button" className="mt-3 rounded-lg border border-default px-3 py-2 text-xs"
            onClick={()=>{setInspectId(null);setMode("guided");}}>Voltar ao caminho guiado</button>
        </div>:null}
      </div>}
    </>}
  </section>;
}
