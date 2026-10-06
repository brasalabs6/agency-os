"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { LEAD_TASK_PRIORITIES, LEAD_TASK_TYPES, type Lead, type LeadTaskView, type UserSummary } from "@/lib/domain/types";
import { DEFAULT_TIME_ZONE, zonedDateTimeToUtc } from "@/lib/domain/time";
import { taskPriorityLabels, taskTypeLabels } from "./task-badge";

type LeadOption = Pick<Lead, "id" | "name" | "status">;

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function isoOrNull(value: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return zonedDateTimeToUtc(Number(year), Number(month), Number(day), Number(hour), Number(minute), 0, DEFAULT_TIME_ZONE).toISOString();
}

export function TaskForm({
  open,
  onClose,
  onSaved,
  leads,
  users,
  fixedLeadId,
  initialTask,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (task: LeadTaskView) => void;
  leads: LeadOption[];
  users: UserSummary[];
  fixedLeadId?: string;
  initialTask?: LeadTaskView | null;
  defaultDate?: string | null;
}) {
  const defaultLead = fixedLeadId ?? initialTask?.leadId ?? leads[0]?.id ?? "";
  const [leadId, setLeadId] = useState(defaultLead);
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(initialTask?.description ?? "");
  const [type, setType] = useState(initialTask?.type ?? "TASK");
  const [priority, setPriority] = useState(initialTask?.priority ?? "MEDIUM");
  const [status, setStatus] = useState<"TODO" | "DOING">(initialTask?.status === "DOING" ? "DOING" : "TODO");
  const [ownerId, setOwnerId] = useState(initialTask?.owner?.id ?? "");
  const initialMode = initialTask?.startAt ? "event" : initialTask?.dueAt || defaultDate ? "deadline" : "none";
  const [scheduleMode, setScheduleMode] = useState<"none" | "deadline" | "event">(initialMode);
  const [dueAt, setDueAt] = useState(toLocalInput(initialTask?.dueAt ?? defaultDate));
  const [startAt, setStartAt] = useState(toLocalInput(initialTask?.startAt ?? (initialMode === "event" ? defaultDate : null)));
  const [endAt, setEndAt] = useState(toLocalInput(initialTask?.endAt));
  const [allDay, setAllDay] = useState(initialTask?.allDay ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const mode = initialTask?.startAt ? "event" : initialTask?.dueAt || defaultDate ? "deadline" : "none";
    setLeadId(fixedLeadId ?? initialTask?.leadId ?? leads[0]?.id ?? "");
    setTitle(initialTask?.title ?? "");
    setDescription(initialTask?.description ?? "");
    setType(initialTask?.type ?? "TASK");
    setPriority(initialTask?.priority ?? "MEDIUM");
    setStatus(initialTask?.status === "DOING" ? "DOING" : "TODO");
    setOwnerId(initialTask?.owner?.id ?? "");
    setScheduleMode(mode);
    setDueAt(toLocalInput(initialTask?.dueAt ?? defaultDate));
    setStartAt(toLocalInput(initialTask?.startAt ?? (mode === "event" ? defaultDate : null)));
    setEndAt(toLocalInput(initialTask?.endAt));
    setAllDay(initialTask?.allDay ?? false);
    setError(null);
  }, [open, fixedLeadId, initialTask, defaultDate, leads]);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === leadId), [leads, leadId]);
  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null);
    try {
      if (!leadId) throw new Error("Selecione um lead.");
      if (scheduleMode === "event" && (!startAt || !endAt)) throw new Error("Eventos precisam de início e fim.");
      const payload = {
        ...(initialTask ? {} : { leadId }),
        title: title.trim(),
        description: description.trim() || null,
        type,
        priority,
        ...(initialTask && initialTask.status !== "DONE" && initialTask.status !== "CANCELED" ? { status } : {}),
        ownerId: ownerId || null,
        dueAt: scheduleMode === "deadline" ? isoOrNull(dueAt) : null,
        startAt: scheduleMode === "event" ? isoOrNull(startAt) : null,
        endAt: scheduleMode === "event" ? isoOrNull(endAt) : null,
        allDay,
        ...(initialTask ? { expectedVersion: initialTask.version } : {}),
      };
      const response = await fetch(initialTask ? `/api/tasks/${initialTask.id}` : "/api/tasks", {
        method: initialTask ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Não foi possível salvar a tarefa.");
      onSaved(body);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <form onSubmit={submit} className="surface w-full max-w-2xl rounded-xl" role="dialog" aria-modal="true" aria-label={initialTask ? "Editar tarefa" : "Nova tarefa"}>
      <div className="flex items-center justify-between border-b border-default px-5 py-4"><div><h2 className="text-sm font-semibold">{initialTask ? "Editar tarefa" : "Nova tarefa"}</h2><p className="mt-0.5 text-xs text-muted">{selectedLead ? selectedLead.name : "Vincule a tarefa a um lead"}</p></div><button type="button" onClick={onClose} className="focus-ring rounded-md p-1.5 text-muted hover:bg-[var(--panel-2)]" aria-label="Fechar"><X size={16}/></button></div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        {!fixedLeadId ? <label className="sm:col-span-2"><span className="mb-1 block text-xs text-muted">Lead</span><select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm" required>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.status}</option>)}</select></label> : null}
        <label className="sm:col-span-2"><span className="mb-1 block text-xs text-muted">Título</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm" placeholder="Ex.: Ligar para o responsável" required maxLength={300}/></label>
        <label><span className="mb-1 block text-xs text-muted">Tipo</span><select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm">{LEAD_TASK_TYPES.map((item) => <option key={item} value={item}>{taskTypeLabels[item]}</option>)}</select></label>
        <label><span className="mb-1 block text-xs text-muted">Prioridade</span><select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm">{LEAD_TASK_PRIORITIES.map((item) => <option key={item} value={item}>{taskPriorityLabels[item]}</option>)}</select></label>
        {initialTask && initialTask.status !== "DONE" && initialTask.status !== "CANCELED" ? <label><span className="mb-1 block text-xs text-muted">Status</span><select value={status} onChange={(e) => setStatus(e.target.value as "TODO" | "DOING")} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm"><option value="TODO">To do</option><option value="DOING">Em andamento</option></select></label> : null}
        <label><span className="mb-1 block text-xs text-muted">Responsável</span><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm"><option value="">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <label><span className="mb-1 block text-xs text-muted">Agenda</span><select value={scheduleMode} onChange={(e) => setScheduleMode(e.target.value as typeof scheduleMode)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm"><option value="none">Sem data</option><option value="deadline">Prazo</option><option value="event">Evento com duração</option></select></label>
        {scheduleMode === "deadline" ? <label className="sm:col-span-2"><span className="mb-1 block text-xs text-muted">Data e hora limite</span><input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm" required/></label> : null}
        {scheduleMode === "event" ? <><label><span className="mb-1 block text-xs text-muted">Início</span><input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm" required/></label><label><span className="mb-1 block text-xs text-muted">Fim</span><input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm" required/></label></> : null}
        {scheduleMode !== "none" ? <label className="flex items-center gap-2 text-xs text-muted sm:col-span-2"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)}/> Evento de dia inteiro</label> : null}
        <label className="sm:col-span-2"><span className="mb-1 block text-xs text-muted">Descrição</span><textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} className="min-h-24 w-full rounded-md border border-default bg-[var(--panel)] px-3 py-2 text-sm" maxLength={5000}/></label>
        {error ? <div className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-default px-5 py-4"><button type="button" onClick={onClose} className="rounded-md border border-default px-3 py-2 text-xs">Cancelar</button><button disabled={saving} className="rounded-md bg-[var(--text)] px-3 py-2 text-xs font-medium text-[var(--panel)] disabled:opacity-50">{saving ? "Salvando..." : initialTask ? "Salvar" : "Criar tarefa"}</button></div>
    </form>
  </div>;
}
