"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock3, Pencil, Plus } from "lucide-react";
import type { Lead, LeadTaskView, UserSummary } from "@/lib/domain/types";
import { effectiveTaskDate, isTaskOverdue, isTaskToday } from "@/lib/domain/task";
import { TaskForm } from "./task-form";
import { TaskPriorityBadge, TaskStatusBadge, taskTypeLabels } from "./task-badge";
import { buttonPrimaryClass, buttonSecondaryClass, controlClass, EmptyState } from "./ui-kit";

type View = "my" | "today" | "upcoming" | "overdue" | "no-date" | "completed";

function fmt(value?: string | null) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function TasksWorkspace({ tasks: initialTasks, leads, users, currentUserId }: { tasks: LeadTaskView[]; leads: Lead[]; users: UserSummary[]; currentUserId: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<View>("my");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadTaskView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return tasks.filter((task) => {
    const active = task.status === "TODO" || task.status === "DOING";
    const date = effectiveTaskDate(task);
    if (view === "my" && task.owner?.id !== currentUserId) return false;
    if (view === "today" && !isTaskToday(task)) return false;
    if (view === "overdue" && !isTaskOverdue(task)) return false;
    if (view === "no-date" && (!active || date)) return false;
    if (view === "completed" && task.status !== "DONE") return false;
    if (view === "upcoming" && (!active || !date || new Date(date) <= now || new Date(date) > nextWeek)) return false;
    if (priority && task.priority !== priority) return false;
    if (ownerId && task.owner?.id !== ownerId) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!`${task.title} ${task.lead.name} ${task.type}`.toLowerCase().includes(q)) return false;
    }
      return true;
    }).sort((a, b) => (effectiveTaskDate(a) ?? "9999").localeCompare(effectiveTaskDate(b) ?? "9999") || a.order - b.order);
  }, [tasks, view, priority, ownerId, query, currentUserId]);

  function upsert(task: LeadTaskView) {
    setTasks((current) => current.some((item) => item.id === task.id) ? current.map((item) => item.id === task.id ? task : item) : [...current, task]);
    router.refresh();
  }

  async function complete(task: LeadTaskView) {
    setError(null);
    const response = await fetch(`/api/tasks/${task.id}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: task.version }) });
    const body = await response.json();
    if (!response.ok) { setError(body?.error?.message ?? "Falha ao concluir tarefa"); return; }
    upsert(body);
  }

  const tabs: Array<[View, string]> = [["my","Minhas tarefas"],["today","Hoje"],["upcoming","Próximas"],["overdue","Atrasadas"],["no-date","Sem data"],["completed","Concluídas"]];
  return <>
    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="scrollbar-thin -mx-1 overflow-x-auto px-1"><div className="flex w-max min-w-full gap-1 rounded-xl border border-default bg-[var(--panel)] p-1">{tabs.map(([id,label]) => <button key={id} onClick={() => setView(id)} className={`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${view === id ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]"}`}>{label}</button>)}</div></div>
      <div className="flex gap-2"><Link href="/calendar" className={buttonSecondaryClass}><CalendarDays size={14}/>Calendário</Link><button onClick={() => { setEditing(null); setFormOpen(true); }} className={buttonPrimaryClass}><Plus size={14}/>Nova tarefa</button></div>
    </div>

    <div className="mb-4 grid gap-2 md:grid-cols-3"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarefa ou lead…" className={controlClass}/><select value={priority} onChange={(e) => setPriority(e.target.value)} className={controlClass}><option value="">Todas as prioridades</option><option value="URGENT">Urgente</option><option value="HIGH">Alta</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option></select><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={controlClass}><option value="">Todos os responsáveis</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
    {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}

    <div className="space-y-2 lg:hidden">{filtered.map((task) => { const date = effectiveTaskDate(task); const overdue = isTaskOverdue(task); return <article key={task.id} className="surface-flat rounded-xl p-4"><div className="flex items-start gap-3"><button onClick={() => complete(task)} disabled={task.status === "DONE" || task.status === "CANCELED"} className="focus-ring mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-default hover:border-[var(--accent)] disabled:opacity-50" aria-label={`Concluir ${task.title}`}>{task.status === "DONE" ? <Check size={13}/> : null}</button><div className="min-w-0 flex-1"><button onClick={() => { setEditing(task); setFormOpen(true); }} className={`block w-full text-left text-sm font-semibold hover:text-[var(--accent)] ${task.status === "DONE" ? "line-through" : ""}`}>{task.title}</button><Link href={`/leads/${task.lead.id}`} className="mt-1 block truncate text-xs text-muted hover:underline">{task.lead.name}</Link></div><button onClick={() => { setEditing(task); setFormOpen(true); }} className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)]" aria-label="Editar tarefa"><Pencil size={14}/></button></div><div className="mt-3 flex flex-wrap items-center gap-2"><TaskPriorityBadge priority={task.priority}/><TaskStatusBadge status={task.status}/><span className="text-[11px] text-muted">{taskTypeLabels[task.type]}</span>{task.owner?.name ? <span className="text-[11px] text-muted">· {task.owner.name}</span> : null}</div><div className={`mt-3 flex items-center gap-1.5 border-t border-default pt-3 text-xs ${overdue ? "font-medium text-red-600 dark:text-red-300" : "text-muted"}`}><Clock3 size={13}/>{fmt(date)}</div></article>; })}{filtered.length === 0 ? <section className="surface-flat rounded-xl"><EmptyState title="Nenhuma tarefa nesta visão" description="Troque a visão ou ajuste os filtros."/></section> : null}</div>

    <section className="surface-flat hidden overflow-hidden rounded-xl lg:block"><div className="grid grid-cols-[32px_minmax(220px,1fr)_minmax(120px,.7fr)_96px_140px_36px] gap-3 border-b border-default bg-[var(--panel-2)] px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-muted"><span/><span>Tarefa</span><span>Lead</span><span>Prioridade</span><span>Quando</span><span/></div><div className="divide-y divide-[var(--border)]">{filtered.map((task) => { const date = effectiveTaskDate(task); const overdue = isTaskOverdue(task); return <div key={task.id} className="grid grid-cols-[32px_minmax(220px,1fr)_minmax(120px,.7fr)_96px_140px_36px] items-center gap-3 px-4 py-3 text-xs hover:bg-[var(--panel-2)]"><button onClick={() => complete(task)} disabled={task.status === "DONE" || task.status === "CANCELED"} className="focus-ring grid h-5 w-5 place-items-center rounded-full border border-default disabled:opacity-50" aria-label={`Concluir ${task.title}`}>{task.status === "DONE" ? <Check size={12}/> : null}</button><div className="min-w-0"><button onClick={() => { setEditing(task); setFormOpen(true); }} className={`block max-w-full truncate text-left font-medium hover:text-[var(--accent)] hover:underline ${task.status === "DONE" ? "line-through" : ""}`}>{task.title}</button><div className="mt-1 flex items-center gap-2 text-[10px] text-muted"><span>{taskTypeLabels[task.type]}</span><TaskStatusBadge status={task.status}/>{task.owner?.name ? <span className="truncate">· {task.owner.name}</span> : null}</div></div><Link href={`/leads/${task.lead.id}`} className="truncate font-medium hover:underline">{task.lead.name}</Link><TaskPriorityBadge priority={task.priority}/><span className={`inline-flex items-center gap-1 whitespace-nowrap ${overdue ? "font-medium text-red-600 dark:text-red-300" : "text-muted"}`}><Clock3 size={11}/>{fmt(date)}</span><button onClick={() => { setEditing(task); setFormOpen(true); }} className="focus-ring rounded p-1 text-muted hover:bg-[var(--panel)]" aria-label="Editar"><Pencil size={13}/></button></div>; })}{filtered.length === 0 ? <EmptyState title="Nenhuma tarefa nesta visão" description="Troque a visão ou ajuste os filtros."/> : null}</div></section>
    <TaskForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={upsert} leads={leads} users={users} initialTask={editing}/>
  </>;
}
