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
    const lead = leads.find((item) => item.id === leadId); if (!lead) return;
    const before = leads; setMoving(leadId); setLeads((items) => items.map((item) => item.id === leadId ? { ...item, status: targetStatus } : item));
    try {
      const response = await fetch(`/api/leads/${leadId}/stage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetStatus, reason: "Movido no Kanban", expectedVersion: lead.version }) });
      if (!response.ok) throw new Error("Falha ao mover lead");
      const updated = await response.json() as Lead;
      setLeads((items) => items.map((item) => item.id === leadId ? updated : item));
    } catch { setLeads(before); } finally { setMoving(null); }
  }

  return <div className="scrollbar-thin -mx-2 overflow-x-auto px-2 pb-5"><div className="grid min-w-[1500px] grid-cols-7 gap-3">{groups.map((group) => <section key={group.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => void move(e.dataTransfer.getData("text/lead-id"), group.id)} className="rounded-lg border border-default bg-[var(--panel-2)] p-2">
    <div className="mb-2 flex items-center justify-between px-1 py-1"><h2 className="text-xs font-semibold">{group.label}</h2><span className="rounded bg-[var(--panel)] px-1.5 py-0.5 text-[10px] text-muted">{group.leads.length}</span></div>
    <div className="space-y-2">{group.leads.map((lead) => <article key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/lead-id", lead.id)} className={`kanban-card rounded-lg border border-default bg-[var(--panel)] p-3 ${moving === lead.id ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2"><Link href={`/leads/${lead.id}`} className="text-sm font-medium leading-5 hover:underline">{lead.name}</Link><LeadScore score={lead.score}/></div>
      <p className="mt-1 text-[11px] text-muted">{lead.segment} · {lead.city}</p><div className="mt-3 flex items-center gap-1.5 text-muted">{lead.website ? <Globe2 size={12}/> : null}{lead.phone ? <Phone size={12}/> : null}{lead.whatsapp ? <MessageCircle size={12}/> : null}<span className="ml-auto text-[10px]">{lead.owner?.name?.split(" ")[0] ?? "—"}</span></div>
      <div className="mt-3 border-t border-default pt-2"><p className={`line-clamp-2 text-xs ${lead.nextAction ? "" : "text-amber-700 dark:text-amber-300"}`}>{lead.nextAction ?? "Sem próxima ação"}</p><div className="mt-1"><DateLabel value={lead.nextActionAt} highlightOverdue/></div></div>
    </article>)}</div>
  </section>)}</div></div>;
}
