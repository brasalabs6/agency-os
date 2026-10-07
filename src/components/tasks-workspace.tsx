"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Clock3, Pencil, Plus } from "lucide-react";
import type { Lead, LeadTaskView, UserSummary } from "@/lib/domain/types";
import { effectiveTaskDate, isTaskOverdue, isTaskToday } from "@/lib/domain/task";
import { intlLocale } from "@/lib/i18n/messages";
import { taskTypeMessageKey } from "@/lib/i18n/domain";
import { TaskForm } from "./task-form";
import { TaskPriorityBadge, TaskStatusBadge } from "./task-badge";
import { useI18n } from "./i18n-provider";
import { buttonPrimaryClass, buttonSecondaryClass, controlClass, EmptyState } from "./ui-kit";

type View = "my" | "today" | "upcoming" | "overdue" | "no-date" | "completed";

export function TasksWorkspace({ tasks: initialTasks, leads, users, currentUserId }: { tasks: LeadTaskView[]; leads: Lead[]; users: UserSummary[]; currentUserId: string }) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [tasks, setTasks] = useState(initialTasks);
  const [view, setView] = useState<View>("my");
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadTaskView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fmt = (value?: string | null) => {
    if (!value) return t("date.noDate");
    return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  };

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
    if (!response.ok) { setError(body?.error?.message ?? t("common.errorUnexpected")); return; }
    upsert(body);
  }

  const tabs: Array<[View, string]> = [["my",t("tasks.my")],["today",t("tasks.today")],["upcoming",t("tasks.upcoming")],["overdue",t("tasks.overdue")],["no-date",t("tasks.noDate")],["completed",t("tasks.completed")]];
  return <>
    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <label className="lg:hidden"><span className="mb-1.5 block text-xs font-medium text-muted">{t("tasks.view")}</span><select value={view} onChange={(event) => setView(event.target.value as View)} className={controlClass}>{tabs.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <div className="hidden overflow-x-auto lg:block"><div className="flex w-max min-w-full gap-1 rounded-xl border border-default bg-[var(--panel)] p-1">{tabs.map(([id,label]) => <button key={id} onClick={() => setView(id)} className={`focus-ring min-h-10 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${view === id ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted hover:bg-[var(--panel-2)] hover:text-[var(--text)]"}`}>{label}</button>)}</div></div>
      <div className="grid grid-cols-2 gap-2 sm:flex"><Link href="/calendar" className={buttonSecondaryClass}><CalendarDays size={15}/>{t("tasks.calendar")}</Link><button onClick={() => { setEditing(null); setFormOpen(true); }} className={buttonPrimaryClass}><Plus size={15}/>{t("tasks.new")}</button></div>
    </div>

    <div className="mb-4 grid gap-2 md:grid-cols-3"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("tasks.searchPlaceholder")} className={controlClass}/><select value={priority} onChange={(e) => setPriority(e.target.value)} className={controlClass}><option value="">{t("tasks.allPriorities")}</option><option value="URGENT">{t("taskPriority.URGENT")}</option><option value="HIGH">{t("taskPriority.HIGH")}</option><option value="MEDIUM">{t("taskPriority.MEDIUM")}</option><option value="LOW">{t("taskPriority.LOW")}</option></select><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={controlClass}><option value="">{t("tasks.allOwners")}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
    {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}

    <div className="space-y-2 lg:hidden">{filtered.map((task) => { const date = effectiveTaskDate(task); const overdue = isTaskOverdue(task); return <article key={task.id} className="surface-flat rounded-xl p-4"><div className="flex items-start gap-2"><button onClick={() => complete(task)} disabled={task.status === "DONE" || task.status === "CANCELED"} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg disabled:opacity-50" aria-label={t("tasks.complete",{title:task.title})}><span className="grid h-6 w-6 place-items-center rounded-full border border-default">{task.status === "DONE" ? <Check size={13}/> : null}</span></button><div className="min-w-0 flex-1 pt-1"><button onClick={() => { setEditing(task); setFormOpen(true); }} className={`block w-full text-left text-[15px] font-semibold hover:text-[var(--accent)] ${task.status === "DONE" ? "line-through" : ""}`}>{task.title}</button><Link href={`/leads/${task.lead.id}`} className="mt-1 block truncate text-xs text-muted hover:underline">{task.lead.name}</Link></div><button onClick={() => { setEditing(task); setFormOpen(true); }} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:bg-[var(--panel-2)]" aria-label={t("tasks.edit")}><Pencil size={16}/></button></div><div className="mt-3 flex flex-wrap items-center gap-2"><TaskPriorityBadge priority={task.priority}/><TaskStatusBadge status={task.status}/><span className="text-xs text-muted">{t(taskTypeMessageKey(task.type))}</span>{task.owner?.name ? <span className="text-xs text-muted">· {task.owner.name}</span> : null}</div><div className={`mt-3 flex items-center gap-1.5 border-t border-default pt-3 text-xs ${overdue ? "font-medium text-red-600 dark:text-red-300" : "text-muted"}`}><Clock3 size={14}/>{fmt(date)}</div></article>; })}{filtered.length === 0 ? <section className="surface-flat rounded-xl"><EmptyState title={t("tasks.noTasks")} description={t("tasks.noTasksDescription")}/></section> : null}</div>

    <section className="surface-flat hidden overflow-hidden rounded-xl lg:block"><div className="grid grid-cols-[32px_minmax(220px,1fr)_minmax(120px,.7fr)_96px_140px_44px] gap-3 border-b border-default bg-[var(--panel-2)] px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted"><span/><span>{t("tasks.task")}</span><span>{t("tasks.lead")}</span><span>{t("tasks.priority")}</span><span>{t("tasks.when")}</span><span/></div><div className="divide-y divide-[var(--border)]">{filtered.map((task) => { const date = effectiveTaskDate(task); const overdue = isTaskOverdue(task); return <div key={task.id} className="grid grid-cols-[32px_minmax(220px,1fr)_minmax(120px,.7fr)_96px_140px_44px] items-center gap-3 px-4 py-3 text-xs hover:bg-[var(--panel-2)]"><button onClick={() => complete(task)} disabled={task.status === "DONE" || task.status === "CANCELED"} className="focus-ring grid h-8 w-8 place-items-center rounded-lg disabled:opacity-50" aria-label={t("tasks.complete",{title:task.title})}><span className="grid h-5 w-5 place-items-center rounded-full border border-default">{task.status === "DONE" ? <Check size={12}/> : null}</span></button><div className="min-w-0"><button onClick={() => { setEditing(task); setFormOpen(true); }} className={`block max-w-full truncate text-left font-medium hover:text-[var(--accent)] hover:underline ${task.status === "DONE" ? "line-through" : ""}`}>{task.title}</button><div className="mt-1 flex items-center gap-2 text-xs text-muted"><span>{t(taskTypeMessageKey(task.type))}</span><TaskStatusBadge status={task.status}/>{task.owner?.name ? <span className="truncate">· {task.owner.name}</span> : null}</div></div><Link href={`/leads/${task.lead.id}`} className="truncate font-medium hover:underline">{task.lead.name}</Link><TaskPriorityBadge priority={task.priority}/><span className={`inline-flex items-center gap-1 whitespace-nowrap ${overdue ? "font-medium text-red-600 dark:text-red-300" : "text-muted"}`}><Clock3 size={12}/>{fmt(date)}</span><button onClick={() => { setEditing(task); setFormOpen(true); }} className="focus-ring grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-[var(--panel)]" aria-label={t("tasks.edit")}><Pencil size={14}/></button></div>; })}{filtered.length === 0 ? <EmptyState title={t("tasks.noTasks")} description={t("tasks.noTasksDescription")}/> : null}</div></section>
    <TaskForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={upsert} leads={leads} users={users} initialTask={editing}/>
  </>;
}
