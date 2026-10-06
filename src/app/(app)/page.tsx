import Link from "next/link";
import { ArrowRight, Clock3, TriangleAlert } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { LeadScore } from "@/components/lead-score";
import { StatusBadge } from "@/components/status-badge";
import { DateLabel } from "@/components/date-label";
import { EmptyState } from "@/components/ui-kit";
import { getDashboardSummary } from "@/lib/services/dashboard";
import { PIPELINE_GROUPS } from "@/lib/domain/status";
import { requireCurrentUser } from "@/lib/auth/app-auth";

export default async function OverviewPage() {
  // Child server components may execute in parallel with the protected layout.
  // Authenticate here before touching the database so unauthenticated requests
  // cannot trigger dashboard queries while the layout is redirecting to /login.
  await requireCurrentUser();
  const data = await getDashboardSummary();
  return <>
    <PageHeader title="Visão geral" description="O que precisa avançar agora no pipeline."/>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
      <MetricCard label="Leads ativos" value={data.activeLeads}/>
      <MetricCard label="Tarefas hoje" value={data.tasksToday}/>
      <MetricCard label="Atrasadas" value={data.overdueTasks}/>
      <MetricCard label="Contatos hoje" value={data.contactToday}/>
      <MetricCard label="Reuniões hoje" value={data.meetingsToday}/>
      <MetricCard label="Propostas" value={data.openProposals}/>
      <MetricCard label="Negociação" value={data.negotiation}/>
      <MetricCard label="Ganhos" value={data.won}/>
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
      <section className="surface-flat overflow-hidden rounded-xl">
        <div className="flex items-center justify-between gap-4 border-b border-default px-4 py-3.5">
          <div><h2 className="text-sm font-semibold">Precisa de atenção</h2><p className="mt-0.5 text-xs text-muted">Atrasos, ausência de próxima ação e leads prioritários.</p></div>
          <Link href="/actions" className="focus-ring flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]">Ver tudo <ArrowRight size={13}/></Link>
        </div>
        {data.needsAttention.length ? <div className="divide-y divide-[var(--border)]">{data.needsAttention.map((lead) => <Link href={`/leads/${lead.id}`} key={lead.id} className="grid gap-3 px-4 py-3.5 hover:bg-[var(--panel-2)] sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-medium">{lead.name}</span>{!lead.nextAction ? <TriangleAlert size={13} className="shrink-0 text-amber-600"/> : null}</div><p className="mt-1 truncate text-xs text-muted">{lead.nextAction ?? "Sem próxima ação definida"}</p></div>
          <div className="flex items-center gap-2"><LeadScore score={lead.score}/><StatusBadge status={lead.status}/></div>
          <div className="flex items-center gap-1 sm:col-span-2 lg:col-span-1"><Clock3 size={12} className="text-muted"/><DateLabel value={lead.nextActionAt} highlightOverdue/></div>
        </Link>)}</div> : <EmptyState title="Nenhum item urgente agora" description="Quando um lead ficar atrasado ou sem próximo passo, ele aparecerá aqui."/>}
      </section>
      <section className="surface-flat rounded-xl">
        <div className="border-b border-default px-4 py-3.5"><h2 className="text-sm font-semibold">Resumo do pipeline</h2><p className="mt-0.5 text-xs text-muted">Distribuição pelos grupos operacionais.</p></div>
        <div className="space-y-4 p-4">{PIPELINE_GROUPS.map((group) => {
          const count = group.statuses.reduce((sum, status) => sum + (data.countsByStatus[status] ?? 0), 0);
          const pct = data.activeLeads ? Math.min(100, Math.round((count / data.activeLeads) * 100)) : 0;
          return <div key={group.id}><div className="mb-1.5 flex justify-between text-xs"><span>{group.label}</span><span className="font-mono text-muted">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }}/></div></div>;
        })}</div>
      </section>
    </div>
  </>;
}
