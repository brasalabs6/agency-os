"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarClock, Check, Circle, Clock3, Plus, XCircle } from "lucide-react";
import type { Lead, LeadTaskView, UserSummary } from "@/lib/domain/types";
import { effectiveTaskDate, isTaskOverdue } from "@/lib/domain/task";
import { TaskForm } from "./task-form";
import { TaskPriorityBadge, taskTypeLabels } from "./task-badge";

function dateLabel(value?: string | null, allDay?: boolean) {
  if (!value) return "Sem data";
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", allDay ? { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" } : { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function LeadTasksCard({ lead, tasks: initialTasks, users }: { lead: Lead; tasks: LeadTaskView[]; users: UserSummary[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadTaskView | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ordered = useMemo(() => [...tasks].sort((a, b) => {
    const terminalA = a.status === "DONE" || a.status === "CANCELED";
    const terminalB = b.status === "DONE" || b.status === "CANCELED";
    if (terminalA !== terminalB) return terminalA ? 1 : -1;
    return (effectiveTaskDate(a) ?? "9999").localeCompare(effectiveTaskDate(b) ?? "9999") || a.order - b.order;
  }), [tasks]);

  function upsert(task: LeadTaskView) {
    setTasks((current) => current.some((item) => item.id === task.id) ? current.map((item) => item.id === task.id ? task : item) : [...current, task]);
    router.refresh();
  }

  async function reorder(task: LeadTaskView, direction: -1 | 1) {
    const active = ordered.filter((item) => item.status === "TODO" || item.status === "DOING");
    const index = active.findIndex((item) => item.id === task.id);
    const other = active[index + direction];
    if (!other) return;
    setBusyId(task.id); setError(null);
    try {
      const response = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: [
          { taskId: task.id, order: other.order, expectedVersion: task.version },
          { taskId: other.id, order: task.order, expectedVersion: other.version },
        ] }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Não foi possível reordenar as tarefas.");
      const changed = new Map<string, LeadTaskView>((body.items ?? []).map((item: LeadTaskView) => [item.id, item]));
      setTasks((current) => current.map((item) => changed.get(item.id) ?? item));
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
    finally { setBusyId(null); }
  }

  async function action(task: LeadTaskView, kind: "complete" | "cancel") {
    setBusyId(task.id); setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "complete" ? { expectedVersion: task.version } : { expectedVersion: task.version }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Não foi possível atualizar a tarefa.");
      upsert(body);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro inesperado"); }
    finally { setBusyId(null); }
  }

  return <section className="surface-flat rounded-lg p-4">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Tasks</h2><p className="mt-1 text-xs text-muted">Checklist operacional vinculado ao lead.</p></div><button onClick={() => { setEditing(null); setFormOpen(true); }} className="focus-ring inline-flex items-center gap-1 rounded-md border border-default px-2 py-1.5 text-xs hover:bg-[var(--panel-2)]"><Plus size={13}/> Add task</button></div>
    {error ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}
    <div className="mt-3 divide-y divide-[var(--border)]">
      {ordered.map((task) => {
        const terminal = task.status === "DONE" || task.status === "CANCELED";
        const effective = effectiveTaskDate(task);
        const overdue = isTaskOverdue(task);
        return <div key={task.id} className={`group flex gap-2 py-3 ${terminal ? "opacity-55" : ""}`}>
          <button disabled={terminal || busyId === task.id} onClick={() => action(task, "complete")} className="focus-ring mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-default hover:border-[var(--border-strong)] disabled:cursor-default" aria-label={`Concluir ${task.title}`}>{task.status === "DONE" ? <Check size={12}/> : task.status === "CANCELED" ? <XCircle size={12}/> : task.status === "DOING" ? <Circle size={9} className="fill-current"/> : null}</button>
          <div className="min-w-0 flex-1"><button onClick={() => { setEditing(task); setFormOpen(true); }} className={`block max-w-full truncate text-left text-sm font-medium hover:underline ${task.status === "DONE" ? "line-through" : ""}`}>{task.title}</button><div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted"><span>{taskTypeLabels[task.type]}</span><TaskPriorityBadge priority={task.priority}/>{task.owner ? <span>{task.owner.name}</span> : null}{effective ? <span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-red-600 dark:text-red-300" : ""}`}><Clock3 size={10}/>{dateLabel(effective, task.allDay)}</span> : <span>Sem data</span>}</div></div>
          {!terminal ? <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"><button onClick={() => reorder(task, -1)} disabled={busyId === task.id} className="focus-ring rounded p-1 text-muted hover:bg-[var(--panel-2)]" aria-label={`Mover ${task.title} para cima`} title="Mover para cima"><ArrowUp size={12}/></button><button onClick={() => reorder(task, 1)} disabled={busyId === task.id} className="focus-ring rounded p-1 text-muted hover:bg-[var(--panel-2)]" aria-label={`Mover ${task.title} para baixo`} title="Mover para baixo"><ArrowDown size={12}/></button><button onClick={() => action(task, "cancel")} disabled={busyId === task.id} className="focus-ring rounded p-1 text-muted hover:bg-[var(--panel-2)]" aria-label={`Cancelar ${task.title}`} title="Cancelar"><XCircle size={13}/></button></div> : null}
        </div>;
      })}
      {ordered.length === 0 ? <div className="py-6 text-center"><CalendarClock size={20} className="mx-auto mb-2 text-muted"/><p className="text-xs text-muted">Nenhuma tarefa. Crie o próximo passo deste lead.</p></div> : null}
    </div>
    <TaskForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={upsert} leads={[{ id: lead.id, name: lead.name, status: lead.status }]} users={users} fixedLeadId={lead.id} initialTask={editing}/>
  </section>;
}
