import Link from "next/link";
import { Globe2, MessageCircle, Phone } from "lucide-react";
import type { Lead } from "@/lib/domain/types";
import { StatusBadge } from "./status-badge";
import { LeadScore } from "./lead-score";
import { DateLabel } from "./date-label";

const opportunityLabels: Record<string, string> = {
  WEBSITE: "Website", LANDING_PAGE: "Landing page", DIGITAL_CATALOG: "Catálogo", GOOGLE_BUSINESS: "Google Business",
  AUTOMATION: "Automação", CUSTOM_SYSTEM: "Sistema", OTHER: "Outro",
};

export function LeadTable({ leads }: { leads: Lead[] }) {
  return <div className="overflow-x-auto rounded-lg border border-default bg-[var(--panel)]">
    <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
      <thead><tr className="border-b border-default bg-[var(--panel-2)] text-[11px] uppercase tracking-[0.05em] text-muted">
        <th className="px-3 py-2.5 font-medium">Lead</th><th className="px-3 py-2.5 font-medium">Segmento</th><th className="px-3 py-2.5 font-medium">Local</th><th className="px-3 py-2.5 font-medium">Oportunidade</th><th className="px-3 py-2.5 font-medium">Score</th><th className="px-3 py-2.5 font-medium">Estágio</th><th className="px-3 py-2.5 font-medium">Responsável</th><th className="px-3 py-2.5 font-medium">Próxima ação</th><th className="px-3 py-2.5 font-medium">Prazo</th>
      </tr></thead>
      <tbody>{leads.map((lead) => <tr key={lead.id} className="table-row border-b border-default last:border-b-0">
        <td className="px-3 py-3"><Link href={`/leads/${lead.id}`} className="font-medium hover:underline">{lead.name}</Link><div className="mt-1 flex gap-1.5 text-muted">{lead.website ? <Globe2 size={12}/> : null}{lead.phone ? <Phone size={12}/> : null}{lead.whatsapp ? <MessageCircle size={12}/> : null}</div></td>
        <td className="px-3 py-3 text-muted">{lead.segment ?? "—"}</td><td className="px-3 py-3 text-muted">{[lead.city, lead.state].filter(Boolean).join(" / ") || "—"}</td>
        <td className="px-3 py-3">{lead.primaryOpportunity ? <span className="rounded-md border border-default px-2 py-1 text-xs">{opportunityLabels[lead.primaryOpportunity]}</span> : "—"}</td>
        <td className="px-3 py-3"><LeadScore score={lead.score}/></td><td className="px-3 py-3"><StatusBadge status={lead.status}/></td>
        <td className="px-3 py-3 text-muted">{lead.owner?.name ?? "—"}</td><td className="max-w-[260px] px-3 py-3"><div className="truncate">{lead.nextAction ?? <span className="text-amber-700 dark:text-amber-300">Sem próxima ação</span>}</div></td><td className="px-3 py-3"><DateLabel value={lead.nextActionAt} highlightOverdue/></td>
      </tr>)}</tbody>
    </table>
    {leads.length === 0 ? <div className="p-10 text-center text-sm text-muted">Nenhum lead encontrado com esses filtros.</div> : null}
  </div>;
}
