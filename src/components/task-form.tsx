"use client";

import { useMemo, useState } from "react";
import { LEAD_TASK_PRIORITIES, LEAD_TASK_TYPES, type Lead, type LeadTaskView, type UserSummary } from "@/lib/domain/types";
import { DEFAULT_TIME_ZONE, zonedDateTimeToUtc } from "@/lib/domain/time";
import { ModalShell } from "./modal-shell";
import { taskPriorityLabels, taskTypeLabels } from "./task-badge";
import { buttonPrimaryClass, buttonSecondaryClass, controlClass, textareaClass } from "./ui-kit";

type LeadOption = Pick<Lead, "id" | "name" | "status">;

type TaskFormProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (task: LeadTaskView) => void;
  leads: LeadOption[];
  users: UserSummary[];
  fixedLeadId?: string;
  initialTask?: LeadTaskView | null;
  defaultDate?: string | null;
};

type TaskFormContentProps = Omit<TaskFormProps, "open">;

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
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

export function TaskForm({ open, ...props }: TaskFormProps) {
  if (!open) return null;

  const formKey = props.initialTask
    ? `edit:${props.initialTask.id}:${props.initialTask.version}`
    : `new:${props.fixedLeadId ?? "any"}:${props.defaultDate ?? "none"}:${props.leads[0]?.id ?? "none"}`;

  return <TaskFormContent key={formKey} {...props}/>;
}

function TaskFormContent({
  onClose,
  onSaved,
  leads,
  users,
  fixedLeadId,
  initialTask,
  defaultDate,
}: TaskFormContentProps) {
  const defaultLead = fixedLeadId ?? initialTask?.leadId ?? leads[0]?.id ?? "";
  const initialMode = initialTask?.startAt ? "event" : initialTask?.dueAt || defaultDate ? "deadline" : "none";

  const [leadId, setLeadId] = useState(defaultLead);
  const [title, setTitle] = useState(initialTask?.title ?? "");
  const [description, setDescription] = useState(initialTask?.description ?? "");
  const [type, setType] = useState(initialTask?.type ?? "TASK");
  const [priority, setPriority] = useState(initialTask?.priority ?? "MEDIUM");
  const [status, setStatus] = useState<"TODO" | "DOING">(initialTask?.status === "DOING" ? "DOING" : "TODO");
  const [ownerId, setOwnerId] = useState(initialTask?.owner?.id ?? "");
  const [scheduleMode, setScheduleMode] = useState<"none" | "deadline" | "event">(initialMode);
  const [dueAt, setDueAt] = useState(toLocalInput(initialTask?.dueAt ?? defaultDate));
  const [startAt, setStartAt] = useState(toLocalInput(initialTask?.startAt ?? (initialMode === "event" ? defaultDate : null)));
  const [endAt, setEndAt] = useState(toLocalInput(initialTask?.endAt));
  const [allDay, setAllDay] = useState(initialTask?.allDay ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === leadId), [leads, leadId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
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
    } finally {
      setSaving(false);
    }
  }

  return <ModalShell open onClose={onClose} title={initialTask ? "Editar tarefa" : "Nova tarefa"} description={selectedLead ? selectedLead.name : "Vincule a tarefa a um lead"} sizeClass="sm:max-w-2xl">
    <form onSubmit={submit}>
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
        {!fixedLeadId ? <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium">Lead</span><select value={leadId} onChange={(event) => setLeadId(event.target.value)} className={controlClass} required>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.status}</option>)}</select></label> : null}
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium">Título</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className={controlClass} placeholder="Ex.: Ligar para o responsável" required maxLength={300}/></label>
        <label><span className="mb-1.5 block text-xs font-medium">Tipo</span><select value={type} onChange={(event) => setType(event.target.value as typeof type)} className={controlClass}>{LEAD_TASK_TYPES.map((item) => <option key={item} value={item}>{taskTypeLabels[item]}</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-medium">Prioridade</span><select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className={controlClass}>{LEAD_TASK_PRIORITIES.map((item) => <option key={item} value={item}>{taskPriorityLabels[item]}</option>)}</select></label>
        {initialTask && initialTask.status !== "DONE" && initialTask.status !== "CANCELED" ? <label><span className="mb-1.5 block text-xs font-medium">Status</span><select value={status} onChange={(event) => setStatus(event.target.value as "TODO" | "DOING")} className={controlClass}><option value="TODO">A fazer</option><option value="DOING">Em andamento</option></select></label> : null}
        <label><span className="mb-1.5 block text-xs font-medium">Responsável</span><select value={ownerId} onChange={(event) => setOwnerId(event.target.value)} className={controlClass}><option value="">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-medium">Agenda</span><select value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as typeof scheduleMode)} className={controlClass}><option value="none">Sem data</option><option value="deadline">Prazo</option><option value="event">Evento com duração</option></select></label>
        {scheduleMode === "deadline" ? <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium">Data e hora limite</span><input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className={controlClass} required/></label> : null}
        {scheduleMode === "event" ? <><label><span className="mb-1.5 block text-xs font-medium">Início</span><input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} className={controlClass} required/></label><label><span className="mb-1.5 block text-xs font-medium">Fim</span><input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} className={controlClass} required/></label></> : null}
        {scheduleMode !== "none" ? <label className="flex items-center gap-2 text-xs text-muted sm:col-span-2"><input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)}/> Evento de dia inteiro</label> : null}
        <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-medium">Descrição</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} className={`${textareaClass} min-h-24`} maxLength={5000}/></label>
        {error ? <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div> : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-default px-4 py-4 sm:flex-row sm:justify-end sm:px-5"><button type="button" onClick={onClose} className={buttonSecondaryClass}>Cancelar</button><button disabled={saving} className={buttonPrimaryClass}>{saving ? "Salvando…" : initialTask ? "Salvar alterações" : "Criar tarefa"}</button></div>
    </form>
  </ModalShell>;
}
