import Link from "next/link";
import { Clock3, TriangleAlert } from "lucide-react";
import { DateLabel } from "@/components/date-label";
import { LeadScore } from "@/components/lead-score";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ACTIVE_STATUSES } from "@/lib/domain/status";
import { searchLeads } from "@/lib/services/leads";
import type { Lead } from "@/lib/domain/types";

export default async function ActionsPage() {
  const result = await searchLeads({ limit: 100 }); const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0); const end = new Date(now); end.setHours(23,59,59,999);
  const active = result.items.filter((lead) => ACTIVE_STATUSES.includes(lead.status));
  const overdue = active.filter((lead) => lead.nextActionAt && new Date(lead.nextActionAt) < start);
  const today = active.filter((lead) => lead.nextActionAt && new Date(lead.nextActionAt) >= start && new Date(lead.nextActionAt) <= end);
  const noAction = active.filter((lead) => !lead.nextAction);
  const upcoming = active.filter((lead) => lead.nextActionAt && new Date(lead.nextActionAt) > end).sort((a,b) => (a.nextActionAt ?? "").localeCompare(b.nextActionAt ?? "")).slice(0,20);
  return <><PageHeader title="Needs Action" description="Fila operacional baseada na próxima ação — não apenas no estágio do lead."/><div className="grid gap-5 xl:grid-cols-2"><Bucket title="Overdue" description="Ações que já deveriam ter acontecido." items={overdue} danger/><Bucket title="Today" description="Compromissos para hoje." items={today}/><Bucket title="No next action" description="Leads ativos sem um próximo passo explícito." items={noAction} warning/><Bucket title="Upcoming" description="Próximas ações agendadas." items={upcoming}/></div></>;
}
function Bucket({ title, description, items, danger, warning }: { title: string; description: string; items: Lead[]; danger?: boolean; warning?: boolean }) { return <section className="surface-flat overflow-hidden rounded-lg"><div className="flex items-start justify-between border-b border-default px-4 py-3"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div><span className={`rounded-md px-2 py-1 text-xs font-mono ${danger ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : warning ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-[var(--panel-2)] text-muted"}`}>{items.length}</span></div><div className="divide-y divide-[var(--border)]">{items.map((lead) => <Link href={`/leads/${lead.id}`} key={lead.id} className="grid gap-2 px-4 py-3 hover:bg-[var(--panel-2)] sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{lead.name}</span><StatusBadge status={lead.status}/>{!lead.nextAction ? <TriangleAlert size={13} className="text-amber-600"/> : null}</div><p className="mt-1 text-xs text-muted">{lead.nextAction ?? "Definir próxima ação"}</p></div><div className="flex items-center gap-3"><LeadScore score={lead.score}/><span className="flex items-center gap-1"><Clock3 size={12} className="text-muted"/><DateLabel value={lead.nextActionAt} highlightOverdue/></span></div></Link>)}{items.length === 0 ? <div className="p-6 text-center text-xs text-muted">Nada pendente nesta seção.</div> : null}</div></section>; }
