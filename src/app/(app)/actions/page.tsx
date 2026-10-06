import Link from "next/link";
import { Clock3, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TaskPriorityBadge, taskTypeLabels } from "@/components/task-badge";
import { StatusBadge } from "@/components/status-badge";
import { buttonPrimaryClass, controlClass, EmptyState } from "@/components/ui-kit";
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
  return <>
    <PageHeader title="Ações pendentes" description="Fila operacional com o que exige atenção agora ou nos próximos dias."/>
    <form method="get" className="mb-4 grid gap-2 sm:max-w-md sm:grid-cols-[minmax(0,1fr)_auto]">
      <select name="owner" defaultValue={owner??""} className={controlClass}><option value="">Toda a equipe</option><option value="me">Minhas ações</option>{users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select>
      <button className={buttonPrimaryClass}>Aplicar</button>
    </form>
    <div className="grid gap-5 xl:grid-cols-2">
      <TaskBucket title="Atrasadas" description="Tarefas que já deveriam ter acontecido." items={grouped.overdue} danger/>
      <TaskBucket title="Hoje" description="Tarefas e compromissos para hoje." items={grouped.today}/>
      <LeadBucket title="Sem próxima ação" description="Leads ativos sem tarefa ativa ou próximo passo." items={noActionResult.items}/>
      <TaskBucket title="Próximas" description="Próximas tarefas agendadas." items={grouped.upcoming.slice(0,30)}/>
    </div>
  </>;
}

function TaskBucket({title,description,items,danger}:{title:string;description:string;items:LeadTaskView[];danger?:boolean}){
  return <section className="surface-flat overflow-hidden rounded-xl">
    <div className="flex items-start justify-between gap-3 border-b border-default px-4 py-3.5"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-mono ${danger?"bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300":"bg-[var(--panel-2)] text-muted"}`}>{items.length}</span></div>
    {items.length ? <div className="divide-y divide-[var(--border)]">{items.map(task=><Link href={`/leads/${task.lead.id}`} key={task.id} className="grid gap-2 px-4 py-3.5 hover:bg-[var(--panel-2)] sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium">{task.title}</span><TaskPriorityBadge priority={task.priority}/></div><p className="mt-1 truncate text-xs text-muted">{task.lead.name} · {taskTypeLabels[task.type]} · {task.owner?.name??"Sem responsável"}</p></div><span className={`flex items-center gap-1 text-xs ${danger?"text-red-600 dark:text-red-300":"text-muted"}`}><Clock3 size={12}/>{fmt(effectiveTaskDate(task))}</span></Link>)}</div> : <EmptyState title="Nada pendente nesta seção" description="Os itens aparecerão aqui quando corresponderem a essa categoria."/>}
  </section>;
}

function LeadBucket({title,description,items}:{title:string;description:string;items:Lead[]}){
  return <section className="surface-flat overflow-hidden rounded-xl">
    <div className="flex items-start justify-between gap-3 border-b border-default px-4 py-3.5"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-mono text-amber-700 dark:bg-amber-950 dark:text-amber-300">{items.length}</span></div>
    {items.length ? <div className="divide-y divide-[var(--border)]">{items.map(lead=><Link href={`/leads/${lead.id}`} key={lead.id} className="grid gap-2 px-4 py-3.5 hover:bg-[var(--panel-2)] sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium">{lead.name}</span><StatusBadge status={lead.status}/><TriangleAlert size={13} className="text-amber-600"/></div><p className="mt-1 truncate text-xs text-muted">Definir próximo passo · {lead.owner?.name??"Sem responsável"}</p></div><span className="text-xs text-muted">Score {lead.score??"—"}</span></Link>)}</div> : <EmptyState title="Tudo em dia" description="Todos os leads ativos têm um próximo passo definido."/>}
  </section>;
}
