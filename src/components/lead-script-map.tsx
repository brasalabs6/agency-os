"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import type { ScriptGraph } from "@/lib/domain/script-flow";

interface TrailStep { nodeId: string; edgeId?: string }
interface Props {
  graph: ScriptGraph;
  trail: TrailStep[];
  onSelect: (nodeId:string)=>void;
}

export function LeadScriptMap({graph,trail,onSelect}:Props) {
  const [zoom,setZoom]=useState(100);
  const viewport=useRef<HTMLDivElement>(null);
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);

  function panStart(e:MouseEvent<HTMLDivElement>) {
    if(e.button!==0 || (e.target as Element).closest('[role="button"]')) return;
    const el=viewport.current;
    if(!el)return;
    drag.current={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop};
  }
  function panMove(e:MouseEvent<HTMLDivElement>) {
    if(!drag.current||!viewport.current)return;
    if(e.buttons!==1){drag.current=null;return;}
    viewport.current.scrollLeft=drag.current.left-(e.clientX-drag.current.x);
    viewport.current.scrollTop=drag.current.top-(e.clientY-drag.current.y);
  }
  function minimapClick(e:MouseEvent<SVGSVGElement>) {
    const el=viewport.current;if(!el)return;
    const rect=e.currentTarget.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width;
    const y=(e.clientY-rect.top)/rect.height;
    el.scrollLeft=Math.max(0,x*el.scrollWidth-el.clientWidth/2);
    el.scrollTop=Math.max(0,y*el.scrollHeight-el.clientHeight/2);
  }
  const layout=useMemo(()=>{
    const outgoing=new Map<string,string[]>();
    for(const edge of graph.edges)outgoing.set(edge.source,[...(outgoing.get(edge.source)??[]),edge.target]);
    const depth=new Map<string,number>([[graph.startNodeId,0]]);
    const pending=[graph.startNodeId];
    while(pending.length){
      const id=pending.shift()!;
      for(const dest of outgoing.get(id)??[])if(!depth.has(dest)) {
        depth.set(dest,(depth.get(id)??0)+1);pending.push(dest);
      }
    }
    const counts=new Map<number,number>();
    const positions=new Map<string,{x:number;y:number}>();
    for(const node of graph.nodes){
      const d=depth.get(node.id)??0;
      const row=counts.get(d)??0;
      positions.set(node.id,{x:30+d*248,y:36+row*116});counts.set(d,row+1);
    }
    const maxDepth=Math.max(0,...depth.values());
    const rows=Math.max(1,...counts.values());
    return {positions,width:Math.max(570, 240*(maxDepth+1)+75),height:Math.max(300,rows*116+75)};
  },[graph]);
  const usedEdges=new Set(trail.map(step=>step.edgeId).filter(Boolean));
  const usedNodes=new Set(trail.map(step=>step.nodeId));
  return <div className="surface-flat rounded-xl border border-default p-3">
    <div className="mb-3 flex items-center justify-between gap-2">
      <div><div className="text-sm font-semibold">Mapa de caminhos</div><div className="text-xs text-muted">Clique num nó para examinar o texto. A trilha percorrida aparece destacada.</div></div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={()=>setZoom(z=>Math.max(50,z-25))} className="rounded-md border border-default px-2 py-1 text-sm" aria-label="Diminuir zoom">−</button>
        <span className="w-12 text-center text-xs tabular-nums">{zoom}%</span>
        <button type="button" onClick={()=>setZoom(z=>Math.min(175,z+25))} className="rounded-md border border-default px-2 py-1 text-sm" aria-label="Aumentar zoom">+</button>
        <button type="button" onClick={()=>{setZoom(100);if(viewport.current){viewport.current.scrollTop=0;viewport.current.scrollLeft=0;}}} className="rounded-md border border-default px-2 py-1 text-xs">Centralizar</button>
      </div>
    </div>
    <div ref={viewport} onMouseDown={panStart} onMouseMove={panMove}
      onMouseUp={()=>{drag.current=null;}} onMouseLeave={()=>{drag.current=null;}}
      className="max-h-[550px] overflow-auto rounded-lg bg-[var(--panel-2)] cursor-grab">
      <svg aria-label="Mapa interativo do roteiro comercial" role="group"
        width={layout.width*zoom/100} height={layout.height*zoom/100}
        viewBox={"0 0 "+layout.width+" "+layout.height}>
        <defs><marker id="script-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7Z" fill="currentColor" opacity="0.4"/></marker></defs>
        {graph.edges.map(edge=>{
          const a=layout.positions.get(edge.source),b=layout.positions.get(edge.target);
          if(!a||!b)return null;
          const x1=a.x+190,y1=a.y+25,x2=b.x,y2=b.y+25,dx=x2-x1;
          const d=dx>10 ? "M"+x1+" "+y1+" C"+(x1+dx/2)+" "+y1+" "+(x2-dx/2)+" "+y2+" "+x2+" "+y2 :
            "M"+x1+" "+y1+" C"+(x1+60)+" "+(y1+65)+" "+(x2-65)+" "+(y2+65)+" "+x2+" "+y2;
          const active=usedEdges.has(edge.id);
          return <g key={edge.id}>
            <path d={d} fill="none" stroke={active?"#2563eb":"#94a3b8"} strokeWidth={active?3:1.5} strokeDasharray={active?undefined:"5 4"} markerEnd="url(#script-arrow)"/>
            <text x={(x1+x2)/2} y={(y1+y2)/2-8} textAnchor="middle" fontSize="10" fill="currentColor">{edge.reaction.label.slice(0,25)}</text>
          </g>;
        })}
        {graph.nodes.map(node=>{
          const pos=layout.positions.get(node.id);
          if(!pos)return null;
          const selected=trail.at(-1)?.nodeId===node.id,visited=usedNodes.has(node.id);
          return <g key={node.id} role="button" tabIndex={0} aria-label={"Examinar nó: "+node.title}
            onClick={()=>onSelect(node.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onSelect(node.id);}}}
            className="cursor-pointer">
            <rect x={pos.x} y={pos.y} width="190" height="52" rx="8"
              fill={selected?"#dbeafe":visited?"#eff6ff":"#f8fafc"}
              stroke={selected?"#2563eb":visited?"#60a5fa":"#94a3b8"} strokeWidth={selected?3:1.5}/>
            <text x={pos.x+10} y={pos.y+19} fontSize="10" fill="#64748b">{node.type}</text>
            <text x={pos.x+10} y={pos.y+39} fontSize="12" fontWeight={selected?"700":"500"} fill="#0f172a">
              {node.title.length>25?node.title.slice(0,24)+"…":node.title}
            </text>
          </g>;
        })}
      </svg>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="flex-1 text-xs text-muted">Arraste o espaço vazio para mover o mapa, use zoom e selecione nós para ver scripts. Nada é registrado como reação real.</p>
      <svg role="button" tabIndex={0} aria-label="Minimapa: clique para navegar"
        className="cursor-crosshair rounded-md border border-default bg-[var(--panel-2)]"
        width={174} height={96} viewBox={"0 0 "+layout.width+" "+layout.height}
        onClick={minimapClick}
        onKeyDown={e=>{const el=viewport.current;if(!el)return;
          if(e.key==="ArrowRight"){e.preventDefault();el.scrollLeft+=120;}
          if(e.key==="ArrowLeft"){e.preventDefault();el.scrollLeft-=120;}
          if(e.key==="ArrowDown"){e.preventDefault();el.scrollTop+=120;}
          if(e.key==="ArrowUp"){e.preventDefault();el.scrollTop-=120;}
        }}>
        {graph.nodes.map(node=>{
          const p=layout.positions.get(node.id);
          if(!p)return null;
          return <rect key={node.id} x={p.x} y={p.y} width={190} height={52} rx={6}
            fill={usedNodes.has(node.id)?"#60a5fa":"#94a3b8"} opacity={.9}/>;
        })}
      </svg>
    </div>
  </div>;
}
