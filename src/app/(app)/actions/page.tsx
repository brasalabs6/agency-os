import Link from "next/link";
import { Clock3, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TaskPriorityBadge } from "@/components/task-badge";
import { StatusBadge } from "@/components/status-badge";
import { buttonPrimaryClass, controlClass, EmptyState } from "@/components/ui-kit";
import { ACTIVE_STATUSES } from "@/lib/domain/status";
import { effectiveTaskDate, groupTasksForAction } from "@/lib/domain/task";
import type { Lead, LeadTaskView } from "@/lib/domain/types";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { taskTypeMessageKey } from "@/lib/i18n/domain";
import { intlLocale } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";
import { listUsers, searchLeads } from "@/lib/services/leads";
import { listTasks } from "@/lib/services/tasks";

export default async function ActionsPage({searchParams}:{searchParams:Promise<{owner?:string}>}) {
  const { owner } = await searchParams;
  const currentUser = await requireCurrentUser();
  const users = await listUsers();
  const ownerId = owner === "me" ? currentUser.id : owner || undefined;
  const tasksResult = await listTasks({statuses:["TODO","DOING"],ownerId,limit:100});
  const noActionResult = await searchLeads({statuses:ACTIVE_STATUSES,noNextAction:true,ownerId,limit:100});
  const grouped=groupTasksForAction(tasksResult.items);
  const { locale, t } = await getI18n();
  const fmt=(value?:string|null)=>!value?t("date.noDate"):new Intl.DateTimeFormat(intlLocale(locale),{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));

  return <>
    <PageHeader title={t("actions.title")} description={t("actions.description")}/>
    <form method="get" className="mb-4 grid gap-2 sm:max-w-md sm:grid-cols-[minmax(0,1fr)_auto]">
      <select name="owner" defaultValue={owner??""} className={controlClass}><option value="">{t("common.allTeam")}</option><option value="me">{t("actions.my")}</option>{users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select>
      <button className={buttonPrimaryClass}>{t("common.apply")}</button>
    </form>
    <div className="grid gap-4 xl:grid-cols-2">
      <TaskBucket title={t("actions.overdue")} description={t("actions.overdueDescription")} items={grouped.overdue} danger fmt={fmt} t={t}/>
      <TaskBucket title={t("actions.today")} description={t("actions.todayDescription")} items={grouped.today} fmt={fmt} t={t}/>
      <LeadBucket title={t("actions.noNext")} description={t("actions.noNextDescription")} items={noActionResult.items} t={t}/>
      <TaskBucket title={t("actions.upcoming")} description={t("actions.upcomingDescription")} items={grouped.upcoming.slice(0,30)} fmt={fmt} t={t}/>
    </div>
  </>;
}

type T = Awaited<ReturnType<typeof getI18n>>["t"];

function TaskBucket({title,description,items,danger,fmt,t}:{title:string;description:string;items:LeadTaskView[];danger?:boolean;fmt:(value?:string|null)=>string;t:T}){
  return <section className="surface-flat overflow-hidden rounded-xl">
    <div className="flex items-start justify-between gap-3 border-b border-default px-4 py-3.5"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-mono ${danger?"bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300":"bg-[var(--panel-2)] text-muted"}`}>{items.length}</span></div>
    {items.length ? <div className="divide-y divide-[var(--border)]">{items.map(task=><Link href={`/leads/${task.lead.id}`} key={task.id} className="grid min-h-16 gap-2 px-4 py-3.5 hover:bg-[var(--panel-2)] sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium">{task.title}</span><TaskPriorityBadge priority={task.priority}/></div><p className="mt-1 truncate text-xs text-muted">{task.lead.name} · {t(taskTypeMessageKey(task.type))} · {task.owner?.name??t("common.noOwner")}</p></div><span className={`flex items-center gap-1 text-xs ${danger?"text-red-600 dark:text-red-300":"text-muted"}`}><Clock3 size={13}/>{fmt(effectiveTaskDate(task))}</span></Link>)}</div> : <EmptyState title={t("actions.empty")} description={t("actions.emptyDescription")}/>}
  </section>;
}

function LeadBucket({title,description,items,t}:{title:string;description:string;items:Lead[];t:T}){
  return <section className="surface-flat overflow-hidden rounded-xl">
    <div className="flex items-start justify-between gap-3 border-b border-default px-4 py-3.5"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-mono text-amber-700 dark:bg-amber-950 dark:text-amber-300">{items.length}</span></div>
    {items.length ? <div className="divide-y divide-[var(--border)]">{items.map(lead=><Link href={`/leads/${lead.id}`} key={lead.id} className="grid min-h-16 gap-2 px-4 py-3.5 hover:bg-[var(--panel-2)] sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium">{lead.name}</span><StatusBadge status={lead.status}/><TriangleAlert size={14} className="text-amber-600"/></div><p className="mt-1 truncate text-xs text-muted">{t("actions.defineNext")} · {lead.owner?.name??t("common.noOwner")}</p></div><span className="text-xs text-muted">Score {lead.score??"—"}</span></Link>)}</div> : <EmptyState title={t("actions.allGood")} description={t("actions.allGoodDescription")}/>}
  </section>;
}
