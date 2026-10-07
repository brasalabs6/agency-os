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
import { pipelineGroupMessageKey } from "@/lib/i18n/domain";
import { getI18n } from "@/lib/i18n/server";

export default async function OverviewPage() {
  const data = await getDashboardSummary();
  const { t } = await getI18n();
  return <>
    <PageHeader title={t("overview.title")} description={t("overview.description")}/>
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 2xl:grid-cols-8">
      <MetricCard label={t("overview.activeLeads")} value={data.activeLeads}/>
      <MetricCard label={t("overview.tasksToday")} value={data.tasksToday}/>
      <MetricCard label={t("overview.overdue")} value={data.overdueTasks}/>
      <MetricCard label={t("overview.contactsToday")} value={data.contactToday}/>
      <MetricCard label={t("overview.meetingsToday")} value={data.meetingsToday}/>
      <MetricCard label={t("overview.proposals")} value={data.openProposals}/>
      <MetricCard label={t("overview.negotiation")} value={data.negotiation}/>
      <MetricCard label={t("overview.won")} value={data.won}/>
    </div>
    <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
      <section className="surface-flat overflow-hidden rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-default px-4 py-3.5">
          <div className="min-w-0"><h2 className="text-sm font-semibold">{t("overview.attention")}</h2><p className="mt-0.5 text-xs text-muted">{t("overview.attentionDescription")}</p></div>
          <Link href="/actions" className="focus-ring flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]">{t("overview.viewAll")} <ArrowRight size={13}/></Link>
        </div>
        {data.needsAttention.length ? <div className="divide-y divide-[var(--border)]">{data.needsAttention.map((lead) => <Link href={`/leads/${lead.id}`} key={lead.id} className="grid gap-3 px-4 py-3.5 hover:bg-[var(--panel-2)] sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="min-w-0"><div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-medium">{lead.name}</span>{!lead.nextAction ? <TriangleAlert size={14} className="shrink-0 text-amber-600"/> : null}</div><p className="mt-1 truncate text-xs text-muted">{lead.nextAction ?? t("leads.noNextAction")}</p></div>
          <div className="flex items-center gap-2"><LeadScore score={lead.score}/><StatusBadge status={lead.status}/></div>
          <div className="flex items-center gap-1 sm:col-span-2 lg:col-span-1"><Clock3 size={13} className="text-muted"/><DateLabel value={lead.nextActionAt} highlightOverdue/></div>
        </Link>)}</div> : <EmptyState title={t("overview.noUrgent")} description={t("overview.noUrgentDescription")}/>}
      </section>
      <section className="surface-flat rounded-xl">
        <div className="border-b border-default px-4 py-3.5"><h2 className="text-sm font-semibold">{t("overview.pipelineSummary")}</h2><p className="mt-0.5 text-xs text-muted">{t("overview.pipelineSummaryDescription")}</p></div>
        <div className="space-y-4 p-4">{PIPELINE_GROUPS.map((group) => {
          const count = group.statuses.reduce((sum, status) => sum + (data.countsByStatus[status] ?? 0), 0);
          const pct = data.activeLeads ? Math.min(100, Math.round((count / data.activeLeads) * 100)) : 0;
          return <div key={group.id}><div className="mb-1.5 flex justify-between text-xs"><span>{t(pipelineGroupMessageKey(group.id))}</span><span className="font-mono text-muted">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }}/></div></div>;
        })}</div>
      </section>
    </div>
  </>;
}
