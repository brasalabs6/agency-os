import type { LeadTaskPriority, LeadTaskStatus, LeadTaskType } from "@/lib/domain/types";

export const taskTypeLabels: Record<LeadTaskType, string> = {
  TASK: "Tarefa",
  CALL: "Ligação",
  FOLLOW_UP: "Follow-up",
  MEETING: "Reunião",
  RESEARCH: "Pesquisa",
  PROPOSAL: "Proposta",
  OTHER: "Outro",
};

export const taskPriorityLabels: Record<LeadTaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const statusLabels: Record<LeadTaskStatus, string> = {
  TODO: "A fazer",
  DOING: "Em andamento",
  DONE: "Concluída",
  CANCELED: "Cancelada",
};

export function TaskPriorityBadge({ priority }: { priority: LeadTaskPriority }) {
  const classes: Record<LeadTaskPriority, string> = {
    LOW: "bg-[var(--panel-2)] text-muted",
    MEDIUM: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    HIGH: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    URGENT: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${classes[priority]}`}>{taskPriorityLabels[priority]}</span>;
}

export function TaskStatusBadge({ status }: { status: LeadTaskStatus }) {
  const classes: Record<LeadTaskStatus, string> = {
    TODO: "bg-[var(--panel-2)] text-muted",
    DOING: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    DONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    CANCELED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${classes[status]}`}>{statusLabels[status]}</span>;
}
