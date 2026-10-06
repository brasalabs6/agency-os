import { dateKeyInTimeZone, DEFAULT_TIME_ZONE } from "@/lib/domain/time";

export function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  const now = new Date();
  const sameDay = dateKeyInTimeZone(date) === dateKeyInTimeZone(now);
  if (sameDay) return `Hoje, ${new Intl.DateTimeFormat("pt-BR", { timeZone: DEFAULT_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(date)}`;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: DEFAULT_TIME_ZONE, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function DateLabel({ value, highlightOverdue = false }: { value?: string | null; highlightOverdue?: boolean }) {
  const overdue = Boolean(highlightOverdue && value && new Date(value) < new Date());
  return <span className={overdue ? "text-xs font-medium text-red-600 dark:text-red-400" : "text-xs text-muted"}>{dateLabel(value)}</span>;
}
