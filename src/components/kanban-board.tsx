"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Globe2, MessageCircle, Phone } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/domain/types";
import { PIPELINE_GROUPS, statusForPipelineGroup } from "@/lib/domain/status";
import { LeadScore } from "./lead-score";
import { DateLabel } from "./date-label";

export function KanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [moving, setMoving] = useState<string | null>(null);
  const groups = useMemo(() => PIPELINE_GROUPS.map((group) => ({ ...group, leads: leads.filter((lead) => group.statuses.includes(lead.status)) })), [leads]);

  async function move(leadId: string, groupId: string) {
    const targetStatus = statusForPipelineGroup(groupId) as LeadStatus | null;
    if (!targetStatus) return;
    const lead = leads.find((item) => item.id === leadId); if (!lead || lead.status === targetStatus) return;
    const before = leads; setMoving(leadId); setLeads((items) => items.map((item) => item.id === leadId ? { ...item, status: targetStatus } : item));
    try {
      const response = await fetch(`/api/leads/${leadId}/stage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetStatus, reason: "Movido no Kanban", expectedVersion: lead.version }) });
      if (!response.ok) throw new Error("Falha ao mover lead");
      const updated = await response.json() as Lead;
      setLeads((items) => items.map((item) => item.id === leadId ? updated : item));
    } catch { setLeads(before); } finally { setMoving(null); }
  }

  return <div className="scrollbar-thin -mx-1 snap-x snap-mandatory overflow-x-auto px-1 pb-4 2xl:overflow-visible"><div className="grid grid-flow-col auto-cols-[minmax(260px,82vw)] gap-3 sm:auto-cols-[280px] xl:auto-cols-[300px] 2xl:grid-flow-row 2xl:grid-cols-7 2xl:auto-cols-auto">{groups.map((group) => <section key={group.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => void move(e.dataTransfer.getData("text/lead-id"), group.id)} className="rounded-xl border border-default bg-[var(--panel-2)] p-2 snap-start">
    <div className="mb-2 flex items-center justify-between px-1 py-1"><h2 className="text-xs font-semibold">{group.label}</h2><span className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-[10px] font-medium text-muted">{group.leads.length}</span></div>
    <div className="space-y-2">{group.leads.map((lead) => <article key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)} className={`kanban-card rounded-xl border border-default bg-[var(--panel)] p-3 ${moving === lead.id ? "pointer-events-none opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2"><Link href={`/leads/${lead.id}`} className="min-w-0 text-sm font-semibold leading-5 hover:text-[var(--accent)] hover:underline">{lead.name}</Link><LeadScore score={lead.score}/></div>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-muted">{lead.segment ? <span>{lead.segment}</span> : null}{lead.city || lead.state ? <span>{[lead.city, lead.state].filter(Boolean).join(" / ")}</span> : null}</div>
      <div className="mt-3 text-xs"><span className={lead.nextAction ? "" : "text-amber-700 dark:text-amber-300"}>{lead.nextAction ?? "Sem próxima ação"}</span><div className="mt-1"><DateLabel value={lead.nextActionAt} highlightOverdue/></div></div>
      <div className="mt-3 flex items-center justify-between border-t border-default pt-2 text-[10px] text-muted"><span className="flex items-center gap-1.5">{lead.website ? <Globe2 size={11}/> : null}{lead.phone ? <Phone size={11}/> : null}{lead.whatsapp ? <MessageCircle size={11}/> : null}</span><span className="max-w-[120px] truncate">{lead.owner?.name ?? "Sem responsável"}</span></div>
      <label className="mt-3 block 2xl:hidden"><span className="sr-only">Mover {lead.name} para outro grupo</span><select value={group.id} onChange={(event) => void move(lead.id, event.target.value)} disabled={moving === lead.id} className="focus-ring h-9 w-full rounded-lg border border-default bg-[var(--panel-2)] px-2 text-xs"><option disabled value={group.id}>Mover para…</option>{PIPELINE_GROUPS.filter((candidate) => candidate.id !== group.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select></label>
    </article>)}{group.leads.length === 0 ? <div className="rounded-lg border border-dashed border-default px-3 py-8 text-center text-[11px] text-muted">Nenhum lead</div> : null}</div>
  </section>)}</div></div>;
}
