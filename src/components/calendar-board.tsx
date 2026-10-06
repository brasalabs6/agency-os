"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock3, Plus } from "lucide-react";
import type { Lead, LeadTaskView, UserSummary } from "@/lib/domain/types";
import { effectiveTaskDate } from "@/lib/domain/task";
import { TaskForm } from "./task-form";
import { TaskPriorityBadge, taskTypeLabels } from "./task-badge";
import { buttonPrimaryClass, buttonSecondaryClass } from "./ui-kit";

export type CalendarView = "month" | "week" | "agenda";
const TZ = "America/Sao_Paulo";

function dayKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateFromKey(key: string, hour = 10) {
  return new Date(`${key}T${String(hour).padStart(2, "0")}:00:00-03:00`);
}

function fmtTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function fmtDay(value: Date | string, opts?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...(opts ?? { weekday: "short", day: "2-digit", month: "short" }) }).format(typeof value === "string" ? new Date(value) : value);
}

function shiftAnchor(anchor: string, view: CalendarView, direction: number) {
  const date = new Date(`${anchor}T12:00:00-03:00`);
  if (view === "month") date.setMonth(date.getMonth() + direction);
  else if (view === "week") date.setDate(date.getDate() + 7 * direction);
  else date.setDate(date.getDate() + 14 * direction);
  return dayKey(date);
}

export function CalendarBoard({ tasks: initialTasks, leads, users, view, anchor, ownerFilter }: { tasks: LeadTaskView[]; leads: Lead[]; users: UserSummary[]; view: CalendarView; anchor: string; ownerFilter?: string }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadTaskView | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const displayView: CalendarView = compact ? "agenda" : view;
  const byDay = useMemo(() => {
    const map = new Map<string, LeadTaskView[]>();
    for (const task of tasks) {
      const effective = effectiveTaskDate(task);
      if (!effective) continue;
      const key = dayKey(effective);
      map.set(key, [...(map.get(key) ?? []), task]);
    }
    for (const list of map.values()) list.sort((a, b) => (effectiveTaskDate(a) ?? "").localeCompare(effectiveTaskDate(b) ?? ""));
    return map;
  }, [tasks]);

  function navigate(nextView: CalendarView, nextAnchor = anchor) {
    const owner = ownerFilter ? `&owner=${encodeURIComponent(ownerFilter)}` : "";
    router.push(`/calendar?view=${nextView}&date=${nextAnchor}${owner}`);
  }

  function upsert(task: LeadTaskView) {
    setTasks((current) => current.some((item) => item.id === task.id) ? current.map((item) => item.id === task.id ? task : item) : [...current, task]);
    router.refresh();
  }

  async function reschedule(task: LeadTaskView, target: Date) {
    setError(null);
    try {
      let payload: Record<string, unknown>;
      if (task.startAt && task.endAt) {
        const duration = new Date(task.endAt).getTime() - new Date(task.startAt).getTime();
        payload = { startAt: target.toISOString(), endAt: new Date(target.getTime() + duration).toISOString(), dueAt: null, allDay: task.allDay, expectedVersion: task.version };
      } else {
        payload = { dueAt: target.toISOString(), startAt: null, endAt: null, allDay: task.allDay, expectedVersion: task.version };
      }
      const response = await fetch(`/api/tasks/${task.id}/reschedule`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Falha ao reagendar.");
      upsert(body);
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao reagendar"); }
  }

  function dragStart(event: React.DragEvent, task: LeadTaskView) { event.dataTransfer.setData("text/task-id", task.id); event.dataTransfer.effectAllowed = "move"; }
  function dropOn(event: React.DragEvent, key: string, hour?: number) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/task-id");
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const original = effectiveTaskDate(task);
    const originalHour = original ? Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date(original))) : 10;
    void reschedule(task, dateFromKey(key, hour ?? originalHour));
  }

  function createAt(key: string, hour = 10) {
    setEditing(null);
    setDefaultDate(dateFromKey(key, hour).toISOString());
    setFormOpen(true);
  }

  const anchorDate = new Date(`${anchor}T12:00:00-03:00`);
  const edit = (task: LeadTaskView) => { setEditing(task); setDefaultDate(null); setFormOpen(true); };

  return <>
    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={() => navigate(displayView, shiftAnchor(anchor, displayView, -1))} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-default bg-[var(--panel)] hover:bg-[var(--panel-2)]" aria-label="Período anterior"><ChevronLeft size={16}/></button>
        <button onClick={() => navigate(displayView, dayKey(new Date()))} className={buttonSecondaryClass}>Hoje</button>
        <button onClick={() => navigate(displayView, shiftAnchor(anchor, displayView, 1))} className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-default bg-[var(--panel)] hover:bg-[var(--panel-2)]" aria-label="Próximo período"><ChevronRight size={16}/></button>
        <h2 className="ml-1 min-w-0 truncate text-sm font-semibold capitalize">{fmtDay(anchorDate, { month: "long", year: "numeric" })}</h2>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden rounded-xl border border-default bg-[var(--panel)] p-1 md:flex">{([["month","Mês"],["week","Semana"],["agenda","Agenda"]] as Array<[CalendarView,string]>).map(([item,label]) => <button key={item} onClick={() => navigate(item)} className={`focus-ring rounded-lg px-3 py-2 text-xs font-medium transition ${view === item ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted hover:bg-[var(--panel-2)]"}`}>{label}</button>)}</div>
        <span className="rounded-lg border border-default bg-[var(--panel)] px-3 py-2 text-xs font-medium text-muted md:hidden">Agenda</span>
        <button onClick={() => { setEditing(null); setDefaultDate(null); setFormOpen(true); }} className={buttonPrimaryClass}><Plus size={14}/>Nova tarefa</button>
      </div>
    </div>
    {error ? <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}
    {displayView === "month" ? <MonthView anchor={anchorDate} byDay={byDay} onDrop={dropOn} onCreate={createAt} onEdit={edit} onDragStart={dragStart}/> : null}
    {displayView === "week" ? <WeekView anchor={anchorDate} byDay={byDay} onDrop={dropOn} onCreate={createAt} onEdit={edit} onDragStart={dragStart}/> : null}
    {displayView === "agenda" ? <AgendaView anchor={anchorDate} byDay={byDay} onEdit={edit}/> : null}
    <TaskForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); setDefaultDate(null); }} onSaved={upsert} leads={leads} users={users} initialTask={editing} defaultDate={defaultDate}/>
  </>;
}

function TaskChip({ task, onEdit, onDragStart }: { task: LeadTaskView; onEdit: (task: LeadTaskView) => void; onDragStart?: (event: React.DragEvent, task: LeadTaskView) => void }) {
  return <button draggable={Boolean(onDragStart)} onDragStart={(event) => onDragStart?.(event, task)} onClick={() => onEdit(task)} className="focus-ring block w-full truncate rounded-md border border-default bg-[var(--panel)] px-2 py-1.5 text-left text-[10px] hover:border-[var(--border-strong)]"><span className="font-mono text-muted">{task.allDay ? "dia todo" : fmtTime(effectiveTaskDate(task))}</span> <span className="font-medium">{task.title}</span></button>;
}

function MonthView({ anchor, byDay, onDrop, onCreate, onEdit, onDragStart }: { anchor: Date; byDay: Map<string, LeadTaskView[]>; onDrop: (event: React.DragEvent, key: string) => void; onCreate: (key: string) => void; onEdit: (task: LeadTaskView) => void; onDragStart: (event: React.DragEvent, task: LeadTaskView) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  first.setDate(first.getDate() - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => { const date = new Date(first); date.setDate(first.getDate() + index); return date; });
  return <section className="surface-flat overflow-hidden rounded-xl"><div className="grid grid-cols-7 border-b border-default bg-[var(--panel-2)]">{["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((day) => <div key={day} className="px-2 py-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((date) => { const key = dayKey(date); const outside = date.getMonth() !== anchor.getMonth(); const items = byDay.get(key) ?? []; return <div key={key} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, key)} className={`min-h-24 border-b border-r border-default p-1.5 lg:min-h-28 ${outside ? "bg-[var(--panel-2)]/60 text-muted" : ""}`}><button onClick={() => onCreate(key)} className="focus-ring mb-1 grid h-7 w-7 place-items-center rounded-md text-[11px] hover:bg-[var(--panel-2)]" aria-label={`Criar tarefa em ${key}`}>{date.getDate()}</button><div className="space-y-1">{items.slice(0, 4).map((task) => <TaskChip key={task.id} task={task} onEdit={onEdit} onDragStart={onDragStart}/>)}{items.length > 4 ? <div className="px-1 text-[10px] text-muted">+{items.length - 4} mais</div> : null}</div></div>; })}</div></section>;
}

function WeekView({ anchor, byDay, onDrop, onCreate, onEdit, onDragStart }: { anchor: Date; byDay: Map<string, LeadTaskView[]>; onDrop: (event: React.DragEvent, key: string, hour?: number) => void; onCreate: (key: string, hour?: number) => void; onEdit: (task: LeadTaskView) => void; onDragStart: (event: React.DragEvent, task: LeadTaskView) => void }) {
  const start = new Date(anchor); start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 7 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  return <section className="surface-flat scrollbar-thin max-h-[72vh] overflow-auto rounded-xl"><div className="min-w-[820px]"><div className="sticky top-0 z-10 grid grid-cols-[56px_repeat(7,1fr)] border-b border-default bg-[var(--panel-2)]"><div/>{days.map((date) => <div key={dayKey(date)} className="border-l border-default px-2 py-2.5 text-center text-xs font-medium">{fmtDay(date, { weekday: "short", day: "2-digit" })}</div>)}</div>{hours.map((hour) => <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)]"><div className="border-b border-default px-2 py-3 text-right text-[10px] text-muted">{String(hour).padStart(2,"0")}:00</div>{days.map((date) => { const key = dayKey(date); const items = (byDay.get(key) ?? []).filter((task) => { const value = effectiveTaskDate(task); return value && Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date(value))) === hour; }); return <div key={`${key}-${hour}`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, key, hour)} className="min-h-20 border-b border-l border-default p-1"><button onClick={() => onCreate(key, hour)} className="focus-ring mb-1 w-full rounded py-1 text-left text-[9px] text-muted opacity-0 hover:bg-[var(--panel-2)] hover:opacity-100 focus:opacity-100">+ criar</button><div className="space-y-1">{items.map((task) => <TaskChip key={task.id} task={task} onEdit={onEdit} onDragStart={onDragStart}/>)}</div></div>; })}</div>)}</div></section>;
}

function AgendaView({ anchor, byDay, onEdit }: { anchor: Date; byDay: Map<string, LeadTaskView[]>; onEdit: (task: LeadTaskView) => void }) {
  const days = Array.from({ length: 14 }, (_, index) => { const date = new Date(anchor); date.setDate(anchor.getDate() + index); return date; });
  const populated = days.filter((date) => (byDay.get(dayKey(date)) ?? []).length > 0);
  return <div className="space-y-3">{populated.map((date) => { const key = dayKey(date); const items = byDay.get(key) ?? []; return <section key={key} className="surface-flat overflow-hidden rounded-xl"><div className="border-b border-default bg-[var(--panel-2)] px-4 py-2.5 text-xs font-semibold capitalize">{fmtDay(date, { weekday: "long", day: "2-digit", month: "long" })}</div><div className="divide-y divide-[var(--border)]">{items.map((task) => <button key={task.id} onClick={() => onEdit(task)} className="focus-ring grid w-full grid-cols-[54px_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-left hover:bg-[var(--panel-2)] sm:grid-cols-[70px_minmax(0,1fr)_auto]"><span className="font-mono text-xs text-muted">{task.allDay ? "dia todo" : fmtTime(effectiveTaskDate(task))}</span><div className="min-w-0"><div className="truncate text-sm font-medium">{task.title}</div><div className="mt-1 truncate text-xs text-muted">{task.lead.name} · {taskTypeLabels[task.type]} · {task.owner?.name ?? "Sem responsável"}</div></div><span className="col-start-2 sm:col-auto"><TaskPriorityBadge priority={task.priority}/></span></button>)}</div></section>; })}{populated.length === 0 ? <section className="surface-flat rounded-xl px-5 py-12 text-center"><Clock3 size={18} className="mx-auto mb-2 text-muted"/><p className="text-sm font-medium">Nenhum compromisso nos próximos 14 dias</p><p className="mt-1 text-xs text-muted">Crie uma tarefa ou mude o período para continuar planejando.</p></section> : null}</div>;
}
