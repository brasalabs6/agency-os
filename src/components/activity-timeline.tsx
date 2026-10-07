"use client";

import { Bot, CircleUserRound, Cog } from "lucide-react";
import type { LeadActivity } from "@/lib/domain/types";
import { intlLocale } from "@/lib/i18n/messages";
import { useI18n } from "./i18n-provider";

export function ActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  const { locale, t } = useI18n();
  return <div className="space-y-0">{activities.map((activity, index) => {
    const Icon = activity.actorType === "AGENT" ? Bot : activity.actorType === "SYSTEM" ? Cog : CircleUserRound;
    return <div key={activity.id} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-3 pb-5">
      {index < activities.length - 1 ? <div className="absolute left-[15px] top-8 h-[calc(100%-14px)] w-px bg-[var(--border)]"/> : null}
      <div className="z-10 grid h-8 w-8 place-items-center rounded-full border border-default bg-[var(--panel)] text-muted"><Icon size={14}/></div>
      <div className="min-w-0 pt-0.5"><div className="flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="text-xs font-medium">{activity.actorName}</span><span className="text-xs uppercase tracking-wide text-muted">{activity.type.replaceAll("_"," ")}</span><span className="text-xs text-muted">{new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(new Date(activity.createdAt))}</span></div><p className="mt-1 break-words text-sm leading-5 text-[color:var(--text)]/85">{activity.summary}</p></div>
    </div>;
  })}{activities.length === 0 ? <p className="text-sm text-muted">{t("leads.noActivities")}</p> : null}</div>;
}
