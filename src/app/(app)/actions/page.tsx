import Link from "next/link";
import { Clock3, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TaskPriorityBadge, taskTypeLabels } from "@/components/task-badge";
import { StatusBadge } from "@/components/status-badge";
import { ACTIVE_STATUSES } from "@/lib/domain/status";
import { effectiveTaskDate, groupTasksForAction } from "@/lib/domain/task";
import type { Lead, LeadTaskView } from "@/lib/domain/types";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { listUsers, searchLeads } from "@/lib/services/leads";
import { listTasks } from "@/lib/services/tasks";

function fmt(value?:string|null){if(!value)return"Sem data";return new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value));}

export default async function ActionsPage({searchParams}:{searchParams:Promise<{owner?:string}>}) {
  const { owner } = await searchParams;
  const currentUser = await requireCurrentUser();
  const users = await listUsers();
  const ownerId = owner === "me" ? currentUser.id : owner || undefined;
  const tasksResult = await listTasks({statuses:["TODO","DOING"],ownerId,limit:100});
  const noActionResult = await searchLeads({statuses:ACTIVE_STATUSES,noNextAction:true,ownerId,limit:100});
  const grouped=groupTasksForAction(tasksResult.items);
  return <><PageHeader title="Needs Action" description="Fila operacional da equipe ou de um responsável específico."/>
    <form method="get" className="mb-4 flex max-w-sm gap-2"><select name="owner" defaultValue={owner??""} className="h-9 flex-1 rounded-md border border-default bg-[var(--panel)] px-3 text-sm"><option value="">All team</option><option value="me">Mine</option>{users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select><button className="rounded-md bg-[var(--text)] px-3 text-xs font-medium text-[var(--panel)]">Filter</button></form>
    <div className="grid gap-5 xl:grid-cols-2"><TaskBucket title="Overdue" description="Tarefas que já deveriam ter acontecido." items={grouped.overdue} danger/><TaskBucket title="Today" description="Tarefas e compromissos para hoje." items={grouped.today}/><LeadBucket title="No next action" description="Leads ativos sem tarefa ativa ou próximo passo." items={noActionResult.items}/><TaskBucket title="Upcoming" description="Próximas tarefas agendadas." items={grouped.upcoming.slice(0,30)}/></div></>;
}
function TaskBucket({title,description,items,danger}:{title:string;description:string;items:LeadTaskView[];danger?:boolean}){return <section className="surface-flat overflow-hidden rounded-lg"><div className="flex items-start justify-between border-b border-default px-4 py-3"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div><span className={`rounded-md px-2 py-1 text-xs font-mono ${danger?"bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300":"bg-[var(--panel-2)] text-muted"}`}>{items.length}</span></div><div className="divide-y divide-[var(--border)]">{items.map(task=><Link href={`/leads/${task.lead.id}`} key={task.id} className="grid gap-2 px-4 py-3 hover:bg-[var(--panel-2)] sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{task.title}</span><TaskPriorityBadge priority={task.priority}/></div><p className="mt-1 text-xs text-muted">{task.lead.name} · {taskTypeLabels[task.type]} · {task.owner?.name??"Sem responsável"}</p></div><span className={`flex items-center gap-1 text-xs ${danger?"text-red-600 dark:text-red-300":"text-muted"}`}><Clock3 size={12}/>{fmt(effectiveTaskDate(task))}</span></Link>)}{items.length===0?<div className="p-6 text-center text-xs text-muted">Nada pendente nesta seção.</div>:null}</div></section>;}
function LeadBucket({title,description,items}:{title:string;description:string;items:Lead[]}){return <section className="surface-flat overflow-hidden rounded-lg"><div className="flex items-start justify-between border-b border-default px-4 py-3"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div><span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-mono text-amber-700 dark:bg-amber-950 dark:text-amber-300">{items.length}</span></div><div className="divide-y divide-[var(--border)]">{items.map(lead=><Link href={`/leads/${lead.id}`} key={lead.id} className="grid gap-2 px-4 py-3 hover:bg-[var(--panel-2)] sm:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{lead.name}</span><StatusBadge status={lead.status}/><TriangleAlert size={13} className="text-amber-600"/></div><p className="mt-1 text-xs text-muted">Definir próximo passo · {lead.owner?.name??"Unassigned"}</p></div><span className="text-xs text-muted">Score {lead.score??"—"}</span></Link>)}{items.length===0?<div className="p-6 text-center text-xs text-muted">Todos os leads ativos têm próximo passo.</div>:null}</div></section>;}
