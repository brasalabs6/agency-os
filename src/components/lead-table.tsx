import Link from "next/link";
import { ArrowRight, Globe2, MapPin, MessageCircle, Phone, UserRound } from "lucide-react";
import type { Lead } from "@/lib/domain/types";
import { StatusBadge } from "./status-badge";
import { LeadScore } from "./lead-score";
import { DateLabel } from "./date-label";
import { EmptyState } from "./ui-kit";

const opportunityLabels: Record<string, string> = {
  WEBSITE: "Website", LANDING_PAGE: "Landing page", DIGITAL_CATALOG: "Catálogo", GOOGLE_BUSINESS: "Google Business",
  AUTOMATION: "Automação", CUSTOM_SYSTEM: "Sistema", OTHER: "Outro",
};

function location(lead: Lead) { return [lead.city, lead.state].filter(Boolean).join(" / ") || "Local não informado"; }

export function LeadTable({ leads }: { leads: Lead[] }) {
  if (!leads.length) return <section className="surface-flat rounded-xl"><EmptyState title="Nenhum lead encontrado" description="Ajuste ou limpe os filtros para ampliar os resultados."/></section>;

  return <>
    <div className="space-y-2 lg:hidden">{leads.map((lead) => <Link key={lead.id} href={`/leads/${lead.id}`} className="surface-flat block rounded-xl p-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--panel-2)]">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-semibold">{lead.name}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-muted"><MapPin size={12}/><span className="truncate">{location(lead)}</span></div></div><LeadScore score={lead.score}/></div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={lead.status}/>{lead.primaryOpportunity ? <span className="rounded-md border border-default bg-[var(--panel)] px-2 py-1 text-[11px]">{opportunityLabels[lead.primaryOpportunity]}</span> : null}</div>
      <div className="mt-4 grid gap-3 border-t border-default pt-3 sm:grid-cols-2"><div className="min-w-0"><div className="text-[10px] font-medium uppercase tracking-wide text-muted">Próxima ação</div><div className={`mt-1 truncate text-xs ${lead.nextAction ? "" : "text-amber-700 dark:text-amber-300"}`}>{lead.nextAction ?? "Sem próxima ação"}</div></div><div><div className="text-[10px] font-medium uppercase tracking-wide text-muted">Prazo</div><div className="mt-1"><DateLabel value={lead.nextActionAt} highlightOverdue/></div></div></div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted"><span className="inline-flex min-w-0 items-center gap-1.5"><UserRound size={12}/><span className="truncate">{lead.owner?.name ?? "Sem responsável"}</span></span><span className="inline-flex items-center gap-1 font-medium text-[var(--accent)]">Abrir <ArrowRight size={12}/></span></div>
    </Link>)}</div>

    <div className="hidden overflow-x-auto rounded-xl border border-default bg-[var(--panel)] lg:block">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead><tr className="border-b border-default bg-[var(--panel-2)] text-[10px] uppercase tracking-[0.07em] text-muted">
          <th className="px-4 py-3 font-medium">Lead</th><th className="px-3 py-3 font-medium">Oportunidade</th><th className="px-3 py-3 font-medium">Score</th><th className="px-3 py-3 font-medium">Estágio</th><th className="px-3 py-3 font-medium">Responsável</th><th className="px-3 py-3 font-medium">Próxima ação</th><th className="px-4 py-3 font-medium">Prazo</th>
        </tr></thead>
        <tbody>{leads.map((lead) => <tr key={lead.id} className="table-row border-b border-default last:border-b-0">
          <td className="px-4 py-3.5"><Link href={`/leads/${lead.id}`} className="font-medium hover:text-[var(--accent)] hover:underline">{lead.name}</Link><div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted"><span className="truncate">{lead.segment ?? "Segmento não informado"}</span><span aria-hidden>·</span><span className="truncate">{location(lead)}</span><span className="ml-1 flex shrink-0 gap-1.5">{lead.website ? <Globe2 size={11}/> : null}{lead.phone ? <Phone size={11}/> : null}{lead.whatsapp ? <MessageCircle size={11}/> : null}</span></div></td>
          <td className="px-3 py-3.5">{lead.primaryOpportunity ? <span className="rounded-md border border-default px-2 py-1 text-xs">{opportunityLabels[lead.primaryOpportunity]}</span> : <span className="text-muted">—</span>}</td>
          <td className="px-3 py-3.5"><LeadScore score={lead.score}/></td><td className="px-3 py-3.5"><StatusBadge status={lead.status}/></td>
          <td className="max-w-[150px] px-3 py-3.5 text-muted"><span className="block truncate">{lead.owner?.name ?? "—"}</span></td><td className="max-w-[220px] px-3 py-3.5"><div className="truncate">{lead.nextAction ?? <span className="text-amber-700 dark:text-amber-300">Sem próxima ação</span>}</div></td><td className="whitespace-nowrap px-4 py-3.5"><DateLabel value={lead.nextActionAt} highlightOverdue/></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
