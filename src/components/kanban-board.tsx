"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Globe2, MessageCircle, Phone } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/domain/types";
import { PIPELINE_GROUPS, statusForPipelineGroup } from "@/lib/domain/status";
import { pipelineGroupMessageKey } from "@/lib/i18n/domain";
import { LeadScore } from "./lead-score";
import { DateLabel } from "./date-label";
import { useI18n } from "./i18n-provider";

export function KanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const { t } = useI18n();
  const [leads, setLeads] = useState(initialLeads);
  const [moving, setMoving] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState(PIPELINE_GROUPS[0].id);
  const groups = useMemo(() => PIPELINE_GROUPS.map((group) => ({ ...group, leads: leads.filter((lead) => group.statuses.includes(lead.status)) })), [leads]);
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0];

  async function move(leadId: string, groupId: string) {
    const targetStatus = statusForPipelineGroup(groupId) as LeadStatus | null;
    if (!targetStatus) return;
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === targetStatus) return;
    const before = leads;
    setMoving(leadId);
    setLeads((items) => items.map((item) => item.id === leadId ? { ...item, status: targetStatus } : item));
    try {
      const response = await fetch(`/api/leads/${leadId}/stage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetStatus, reason: "Moved in Kanban", expectedVersion: lead.version }) });
      if (!response.ok) throw new Error("Failed to move lead");
      const updated = await response.json() as Lead;
      setLeads((items) => items.map((item) => item.id === leadId ? updated : item));
    } catch {
      setLeads(before);
    } finally {
      setMoving(null);
    }
  }

  function renderColumn(group: (typeof groups)[number], mobile: boolean) {
    return <section key={group.id} onDragOver={mobile ? undefined : (event) => event.preventDefault()} onDrop={mobile ? undefined : (event) => void move(event.dataTransfer.getData("text/lead-id"), group.id)} className="rounded-xl border border-default bg-[var(--panel-2)] p-2">
      <div className="mb-2 flex items-center justify-between px-1 py-1"><h2 className="text-sm font-semibold">{t(pipelineGroupMessageKey(group.id))}</h2><span className="rounded-full bg-[var(--panel)] px-2 py-1 text-xs font-medium text-muted">{group.leads.length}</span></div>
      <div className="space-y-2">{group.leads.map((lead) => <article key={lead.id} draggable={!mobile} onDragStart={mobile ? undefined : (event) => event.dataTransfer.setData("text/lead-id", lead.id)} className={`kanban-card rounded-xl border border-default bg-[var(--panel)] p-3 ${moving === lead.id ? "pointer-events-none opacity-50" : ""}`}>
        <div className="flex items-start justify-between gap-2"><Link href={`/leads/${lead.id}`} className="min-w-0 break-words text-[15px] font-semibold leading-5 hover:text-[var(--accent)] hover:underline">{lead.name}</Link><LeadScore score={lead.score}/></div>
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">{lead.segment ? <span>{lead.segment}</span> : null}{lead.city || lead.state ? <span>{[lead.city, lead.state].filter(Boolean).join(" / ")}</span> : null}</div>
        <div className="mt-3 text-sm"><span className={lead.nextAction ? "" : "text-amber-700 dark:text-amber-300"}>{lead.nextAction ?? t("leads.noNextAction")}</span><div className="mt-1"><DateLabel value={lead.nextActionAt} highlightOverdue/></div></div>
        <div className="mt-3 flex items-center justify-between border-t border-default pt-2 text-xs text-muted"><span className="flex items-center gap-2">{lead.website ? <Globe2 size={13}/> : null}{lead.phone ? <Phone size={13}/> : null}{lead.whatsapp ? <MessageCircle size={13}/> : null}</span><span className="max-w-[150px] truncate">{lead.owner?.name ?? t("common.noOwner")}</span></div>
        <label className={`mt-3 block ${mobile ? "" : "2xl:hidden"}`}><span className="sr-only">{t("pipeline.moveTo")}</span><select value={group.id} onChange={(event) => void move(lead.id, event.target.value)} disabled={moving === lead.id} className="focus-ring h-11 w-full rounded-lg border border-default bg-[var(--panel-2)] px-2 text-sm"><option disabled value={group.id}>{t("pipeline.moveTo")}</option>{PIPELINE_GROUPS.filter((candidate) => candidate.id !== group.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{t(pipelineGroupMessageKey(candidate.id))}</option>)}</select></label>
      </article>)}{group.leads.length === 0 ? <div className="rounded-lg border border-dashed border-default px-3 py-8 text-center text-xs text-muted">{t("pipeline.noLeads")}</div> : null}</div>
    </section>;
  }

  return <>
    <div data-testid="mobile-pipeline" className="lg:hidden">
      <div className="scrollbar-thin -mx-3 mb-3 overflow-x-auto px-3 sm:-mx-4 sm:px-4">
        <div className="flex w-max gap-2 pb-1">{groups.map((group) => <button key={group.id} onClick={() => setSelectedGroupId(group.id)} className={`focus-ring min-h-11 whitespace-nowrap rounded-full border px-3 text-sm font-medium ${selectedGroupId === group.id ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-default bg-[var(--panel)] text-muted"}`}>{t(pipelineGroupMessageKey(group.id))}<span className="ml-2 font-mono text-xs">{group.leads.length}</span></button>)}</div>
      </div>
      {renderColumn(selectedGroup, true)}
    </div>

    <div data-testid="desktop-pipeline" className="scrollbar-thin -mx-1 hidden snap-x snap-mandatory overflow-x-auto px-1 pb-4 lg:block 2xl:overflow-visible">
      <div className="grid grid-flow-col auto-cols-[300px] gap-3 2xl:grid-flow-row 2xl:grid-cols-7 2xl:auto-cols-auto">{groups.map((group) => renderColumn(group, false))}</div>
    </div>
  </>;
}
