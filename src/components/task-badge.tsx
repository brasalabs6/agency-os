"use client";

import type { LeadTaskPriority, LeadTaskStatus } from "@/lib/domain/types";
import { taskPriorityMessageKey, taskStatusMessageKey } from "@/lib/i18n/domain";
import { useI18n } from "./i18n-provider";

export function TaskPriorityBadge({ priority }: { priority: LeadTaskPriority }) {
  const { t } = useI18n();
  const classes: Record<LeadTaskPriority, string> = {
    LOW: "bg-[var(--panel-2)] text-muted",
    MEDIUM: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    HIGH: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    URGENT: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${classes[priority]}`}>{t(taskPriorityMessageKey(priority))}</span>;
}

export function TaskStatusBadge({ status }: { status: LeadTaskStatus }) {
  const { t } = useI18n();
  const classes: Record<LeadTaskStatus, string> = {
    TODO: "bg-[var(--panel-2)] text-muted",
    DOING: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    DONE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    CANCELED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${classes[status]}`}>{t(taskStatusMessageKey(status))}</span>;
}
