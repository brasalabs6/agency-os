"use client";

import { dateKeyInTimeZone, DEFAULT_TIME_ZONE } from "@/lib/domain/time";
import { intlLocale } from "@/lib/i18n/messages";
import { useI18n } from "./i18n-provider";

export function DateLabel({ value, highlightOverdue = false }: { value?: string | null; highlightOverdue?: boolean }) {
  const { locale, t } = useI18n();
  if (!value) return <span className="text-xs text-muted">—</span>;
  const date = new Date(value);
  const now = new Date();
  const sameDay = dateKeyInTimeZone(date) === dateKeyInTimeZone(now);
  const time = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: DEFAULT_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(date);
  const text = sameDay
    ? t("date.today", { time })
    : new Intl.DateTimeFormat(intlLocale(locale), { timeZone: DEFAULT_TIME_ZONE, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  const overdue = Boolean(highlightOverdue && date < now);
  return <span className={overdue ? "text-xs font-medium text-red-600 dark:text-red-400" : "text-xs text-muted"}>{text}</span>;
}
