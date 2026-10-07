"use client";

import Link from "next/link";
import { ArrowRight, Globe2, MapPin, MessageCircle, Phone, UserRound } from "lucide-react";
import type { Lead } from "@/lib/domain/types";
import { serviceMessageKey } from "@/lib/i18n/domain";
import { StatusBadge } from "./status-badge";
import { LeadScore } from "./lead-score";
import { DateLabel } from "./date-label";
import { EmptyState } from "./ui-kit";
import { useI18n } from "./i18n-provider";

export function LeadTable({ leads }: { leads: Lead[] }) {
  const { t } = useI18n();
  const location = (lead: Lead) => [lead.city, lead.state].filter(Boolean).join(" / ") || t("leads.locationUnknown");

  if (!leads.length) return <section className="surface-flat rounded-xl"><EmptyState title={t("leads.noResults")} description={t("leads.noResultsDescription")}/></section>;

  return <>
    <div className="space-y-2 lg:hidden">{leads.map((lead) => <Link key={lead.id} href={`/leads/${lead.id}`} className="surface-flat block rounded-xl p-4 transition active:bg-[var(--panel-2)]">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-[15px] font-semibold">{lead.name}</div><div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted"><MapPin size={13}/><span className="truncate">{location(lead)}</span></div></div><LeadScore score={lead.score}/></div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><StatusBadge status={lead.status}/>{lead.primaryOpportunity ? <span className="rounded-md border border-default bg-[var(--panel)] px-2 py-1 text-xs">{t(serviceMessageKey(lead.primaryOpportunity))}</span> : null}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-default pt-3"><div className="min-w-0"><div className="text-xs font-medium uppercase tracking-wide text-muted">{t("leads.nextAction")}</div><div className={`mt-1 truncate text-sm ${lead.nextAction ? "" : "text-amber-700 dark:text-amber-300"}`}>{lead.nextAction ?? t("leads.noNextAction")}</div></div><div><div className="text-xs font-medium uppercase tracking-wide text-muted">{t("leads.deadline")}</div><div className="mt-1"><DateLabel value={lead.nextActionAt} highlightOverdue/></div></div></div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-default pt-3 text-xs text-muted"><span className="inline-flex min-w-0 items-center gap-1.5"><UserRound size={13}/><span className="truncate">{lead.owner?.name ?? t("common.noOwner")}</span></span><span className="inline-flex min-h-8 items-center gap-1 font-medium text-[var(--accent)]">{t("leads.open")} <ArrowRight size={13}/></span></div>
    </Link>)}</div>

    <div className="hidden overflow-x-auto rounded-xl border border-default bg-[var(--panel)] lg:block">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead><tr className="border-b border-default bg-[var(--panel-2)] text-xs uppercase tracking-[0.07em] text-muted">
          <th className="px-4 py-3 font-medium">Lead</th><th className="px-3 py-3 font-medium">{t("leads.opportunity")}</th><th className="px-3 py-3 font-medium">Score</th><th className="px-3 py-3 font-medium">{t("leads.stage")}</th><th className="px-3 py-3 font-medium">{t("leads.owner")}</th><th className="px-3 py-3 font-medium">{t("leads.nextAction")}</th><th className="px-4 py-3 font-medium">{t("leads.deadline")}</th>
        </tr></thead>
        <tbody>{leads.map((lead) => <tr key={lead.id} className="table-row border-b border-default last:border-b-0">
          <td className="px-4 py-3.5"><Link href={`/leads/${lead.id}`} className="font-medium hover:text-[var(--accent)] hover:underline">{lead.name}</Link><div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted"><span className="truncate">{lead.segment ?? t("leads.segmentUnknown")}</span><span aria-hidden>·</span><span className="truncate">{location(lead)}</span><span className="ml-1 flex shrink-0 gap-1.5">{lead.website ? <Globe2 size={12}/> : null}{lead.phone ? <Phone size={12}/> : null}{lead.whatsapp ? <MessageCircle size={12}/> : null}</span></div></td>
          <td className="px-3 py-3.5">{lead.primaryOpportunity ? <span className="rounded-md border border-default px-2 py-1 text-xs">{t(serviceMessageKey(lead.primaryOpportunity))}</span> : <span className="text-muted">—</span>}</td>
          <td className="px-3 py-3.5"><LeadScore score={lead.score}/></td><td className="px-3 py-3.5"><StatusBadge status={lead.status}/></td>
          <td className="max-w-[150px] px-3 py-3.5 text-muted"><span className="block truncate">{lead.owner?.name ?? "—"}</span></td><td className="max-w-[220px] px-3 py-3.5"><div className="truncate">{lead.nextAction ?? <span className="text-amber-700 dark:text-amber-300">{t("leads.noNextAction")}</span>}</div></td><td className="whitespace-nowrap px-4 py-3.5"><DateLabel value={lead.nextActionAt} highlightOverdue/></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
