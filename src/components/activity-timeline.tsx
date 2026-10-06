import { Bot, CircleUserRound, Cog } from "lucide-react";
import type { LeadActivity } from "@/lib/domain/types";

export function ActivityTimeline({ activities }: { activities: LeadActivity[] }) {
  return <div className="space-y-0">{activities.map((activity, index) => {
    const Icon = activity.actorType === "AGENT" ? Bot : activity.actorType === "SYSTEM" ? Cog : CircleUserRound;
    return <div key={activity.id} className="relative grid grid-cols-[28px_1fr] gap-3 pb-5">
      {index < activities.length - 1 ? <div className="absolute left-[13px] top-7 h-[calc(100%-12px)] w-px bg-[var(--border)]"/> : null}
      <div className="z-10 grid h-7 w-7 place-items-center rounded-full border border-default bg-[var(--panel)] text-muted"><Icon size={13}/></div>
      <div className="pt-0.5"><div className="flex flex-wrap items-baseline gap-x-2"><span className="text-xs font-medium">{activity.actorName}</span><span className="text-[10px] uppercase tracking-wide text-muted">{activity.type.replaceAll("_", " ")}</span><span className="text-[10px] text-muted">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(activity.createdAt))}</span></div><p className="mt-1 text-sm leading-5 text-[color:var(--text)]/85">{activity.summary}</p></div>
    </div>;
  })}{activities.length === 0 ? <p className="text-sm text-muted">Ainda não há atividades registradas.</p> : null}</div>;
}
