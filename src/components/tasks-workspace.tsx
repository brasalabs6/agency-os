"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock3, Pencil, Plus } from "lucide-react";
import type { Lead, LeadTaskView, UserSummary } from "@/lib/domain/types";
import { effectiveTaskDate, isTaskOverdue, isTaskToday } from "@/lib/domain/task";
import { TaskForm } from "./task-form";
import { TaskPriorityBadge, TaskStatusBadge, taskTypeLabels } from "./task-badge";

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
  const now = new Date();
  const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);

  const filtered = useMemo(() => tasks.filter((task) => {
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
  }).sort((a, b) => (effectiveTaskDate(a) ?? "9999").localeCompare(effectiveTaskDate(b) ?? "9999") || a.order - b.order), [tasks, view, priority, ownerId, query, currentUserId, now, nextWeek]);

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

  const tabs: Array<[View, string]> = [["my","My Tasks"],["today","Today"],["upcoming","Upcoming"],["overdue","Overdue"],["no-date","No Date"],["completed","Completed"]];
  return <>
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-1 rounded-lg border border-default bg-[var(--panel)] p-1">{tabs.map(([id,label]) => <button key={id} onClick={() => setView(id)} className={`rounded-md px-2.5 py-1.5 text-xs ${view === id ? "bg-[var(--text)] text-[var(--panel)]" : "text-muted hover:bg-[var(--panel-2)]"}`}>{label}</button>)}</div><div className="flex gap-2"><Link href="/calendar" className="inline-flex items-center gap-1 rounded-md border border-default px-3 py-2 text-xs hover:bg-[var(--panel-2)]"><CalendarDays size={13}/>Calendar</Link><button onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-1 rounded-md bg-[var(--text)] px-3 py-2 text-xs font-medium text-[var(--panel)]"><Plus size={13}/>New task</button></div></div>
    <div className="mb-4 grid gap-2 sm:grid-cols-3"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarefa ou lead..." className="rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-xs"/><select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-xs"><option value="">Todas prioridades</option><option value="URGENT">Urgente</option><option value="HIGH">Alta</option><option value="MEDIUM">Média</option><option value="LOW">Baixa</option></select><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-xs"><option value="">Todos responsáveis</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
    {error ? <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}
    <section className="surface-flat overflow-hidden rounded-lg"><div className="grid grid-cols-[32px_minmax(240px,1fr)_180px_110px_130px_150px_36px] gap-3 border-b border-default bg-[var(--panel-2)] px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-muted"><span/><span>Task</span><span>Lead</span><span>Priority</span><span>Owner</span><span>When</span><span/></div><div className="divide-y divide-[var(--border)]">{filtered.map((task) => { const date = effectiveTaskDate(task); const overdue = isTaskOverdue(task); return <div key={task.id} className="grid grid-cols-[32px_minmax(240px,1fr)_180px_110px_130px_150px_36px] items-center gap-3 px-4 py-3 text-xs hover:bg-[var(--panel-2)]"><button onClick={() => complete(task)} disabled={task.status === "DONE" || task.status === "CANCELED"} className="grid h-5 w-5 place-items-center rounded-full border border-default disabled:opacity-50" aria-label={`Concluir ${task.title}`}>{task.status === "DONE" ? <Check size={12}/> : null}</button><div className="min-w-0"><button onClick={() => { setEditing(task); setFormOpen(true); }} className={`truncate text-left font-medium hover:underline ${task.status === "DONE" ? "line-through" : ""}`}>{task.title}</button><div className="mt-1 flex items-center gap-2 text-[10px] text-muted"><span>{taskTypeLabels[task.type]}</span><TaskStatusBadge status={task.status}/></div></div><Link href={`/leads/${task.lead.id}`} className="truncate font-medium hover:underline">{task.lead.name}</Link><TaskPriorityBadge priority={task.priority}/><span className="truncate text-muted">{task.owner?.name ?? "—"}</span><span className={`inline-flex items-center gap-1 ${overdue ? "font-medium text-red-600 dark:text-red-300" : "text-muted"}`}><Clock3 size={11}/>{fmt(date)}</span><button onClick={() => { setEditing(task); setFormOpen(true); }} className="rounded p-1 text-muted hover:bg-[var(--panel)]" aria-label="Editar"><Pencil size={13}/></button></div>; })}{filtered.length === 0 ? <div className="p-10 text-center text-xs text-muted">Nenhuma tarefa nessa visão.</div> : null}</div></section>
    <TaskForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={upsert} leads={leads} users={users} initialTask={editing}/>
  </>;
}
