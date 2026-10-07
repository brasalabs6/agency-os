import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe2, Instagram, Mail, MapPin, MessageCircle, Phone, ShieldAlert, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DateLabel } from "@/components/date-label";
import { LeadActions } from "@/components/lead-actions";
import { LeadAutomationPanel } from "@/components/lead-automation-panel";
import { LeadScore } from "@/components/lead-score";
import { LeadTasksCard } from "@/components/lead-tasks-card";
import { StatusBadge } from "@/components/status-badge";
import { DomainError } from "@/lib/domain/errors";
import { serviceMessageKey } from "@/lib/i18n/domain";
import { getI18n } from "@/lib/i18n/server";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { getAutomationBundle } from "@/lib/services/intelligence";
import { getLead, listUsers } from "@/lib/services/leads";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try { data = await getLead(id); } catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const { lead, activities, evidence, tasks } = data;
  const [users, currentUser, automation, i18n] = await Promise.all([listUsers(), requireCurrentUser(), getAutomationBundle(id), getI18n()]);
  const { t } = i18n;

  return <>
    <Link href="/leads" className="focus-ring mb-4 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:bg-[var(--panel-2)] hover:text-[var(--accent)]"><ArrowLeft size={14}/>{t("leads.back")}</Link>
    {lead.doNotContact ? <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"><ShieldAlert size={18} className="mt-0.5 shrink-0"/><div><strong>{t("leads.doNotContact")}</strong> {t("leads.doNotContactDescription")}</div></div> : null}

    <header className="mb-5 min-w-0 flex flex-col justify-between gap-4 sm:mb-6 xl:flex-row xl:items-start">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{lead.name}</h1><StatusBadge status={lead.status}/></div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted"><span>{lead.segment ?? t("leads.segmentUnknown")}</span><span className="inline-flex items-center gap-1"><MapPin size={14}/>{[lead.city, lead.state].filter(Boolean).join(" / ") || t("leads.locationUnknown")}</span><span>v{lead.version}</span></div><div className="mt-3 flex flex-wrap gap-1.5">{lead.tags.map((tag) => <span key={tag} className="max-w-full break-all rounded-full border border-default px-2 py-1 text-xs text-muted">{tag}</span>)}</div></div>
      <LeadActions lead={lead} users={users} currentUserId={currentUser.id}/>
    </header>

    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <aside className="order-1 min-w-0 space-y-4 xl:order-2">
        <section className="surface-flat rounded-xl p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("leads.nextAction")}</h2><p className={`mt-3 text-sm font-medium ${lead.nextAction ? "" : "text-amber-700 dark:text-amber-300"}`}>{lead.nextAction ?? t("leads.noNextAction")}</p><div className="mt-2"><DateLabel value={lead.nextActionAt} highlightOverdue/></div>{lead.nextActionOwner ? <p className="mt-2 text-xs text-muted">{t("leads.nextActionOwner", { name: lead.nextActionOwner.name })}</p> : null}</section>
        <LeadTasksCard lead={lead} tasks={tasks} users={users}/>
        <section className="surface-flat rounded-xl p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("leads.contact")}</h2><div className="mt-3 space-y-3 text-sm">{lead.contactName ? <Row icon={<UserRound size={15}/>} label={[lead.contactName, lead.contactRole].filter(Boolean).join(" · ")}/> : null}{lead.phone ? <Row icon={<Phone size={15}/>} label={lead.phone}/> : null}{lead.whatsapp ? <Row icon={<MessageCircle size={15}/>} label={lead.whatsapp}/> : null}{lead.email ? <Row icon={<Mail size={15}/>} label={lead.email}/> : null}{!lead.contactName && !lead.phone && !lead.whatsapp && !lead.email ? <span className="text-xs text-muted">{t("leads.noContact")}</span> : null}</div></section>
        <section className="surface-flat rounded-xl p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("leads.digitalPresence")}</h2><div className="mt-3 space-y-3 text-sm">{lead.website ? <WebRow icon={<Globe2 size={15}/>} href={lead.website} label="Website"/> : <span className="text-xs text-amber-700 dark:text-amber-300">{t("leads.noWebsite")}</span>}{lead.googleMapsUrl ? <WebRow icon={<MapPin size={15}/>} href={lead.googleMapsUrl} label={t("leads.googleProfile")}/> : null}{lead.instagramUrl ? <WebRow icon={<Instagram size={15}/>} href={lead.instagramUrl} label="Instagram"/> : null}</div></section>
        <section className="surface-flat rounded-xl p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("leads.evidence")}</h2><div className="mt-3 space-y-3">{evidence.map((item) => <div key={item.id} className="rounded-lg bg-[var(--panel-2)] p-3"><div className="text-xs uppercase text-muted">{item.claim}</div><div className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">{item.value}</div><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 flex min-h-9 min-w-0 items-center gap-1 text-xs text-muted hover:text-[var(--accent)]"><ExternalLink size={12} className="shrink-0"/><span className="truncate">{item.sourceUrl}</span></a></div>)}{evidence.length === 0 ? <p className="text-xs text-muted">{t("leads.noEvidence")}</p> : null}</div></section>
      </aside>

      <div className="order-2 min-w-0 xl:order-1">
        <section className="surface-flat rounded-xl p-4 sm:p-5"><div className="mb-4 flex min-w-0 items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-sm font-semibold">{t("leads.opportunity")}</h2><p className="mt-1 text-xs text-muted">{t("leads.opportunityDescription")}</p></div><LeadScore score={lead.score}/></div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-xs uppercase tracking-wide text-muted">{t("leads.recommendedService")}</div><div className="mt-1 text-sm font-medium">{lead.primaryOpportunity ? t(serviceMessageKey(lead.primaryOpportunity)) : t("leads.notDefined")}</div></div><div><div className="text-xs uppercase tracking-wide text-muted">{t("leads.scoreReasons")}</div><ul className="mt-1 space-y-1 text-sm">{lead.scoreReasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul></div></div>{lead.opportunityNotes ? <p className="mt-4 border-t border-default pt-4 text-sm leading-6 text-[color:var(--text)]/80">{lead.opportunityNotes}</p> : null}</section>
      </div>
    </div>

    <div className="mt-5"><LeadAutomationPanel leadId={lead.id} data={automation}/></div>

    <section className="surface-flat mt-5 rounded-xl p-4 sm:p-5"><div className="mb-5"><h2 className="text-sm font-semibold">{t("leads.timeline")}</h2><p className="mt-1 text-xs text-muted">{t("leads.timelineDescription")}</p></div><ActivityTimeline activities={activities}/></section>
  </>;
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="flex min-w-0 items-center gap-2 text-muted">{icon}<span className="break-all">{label}</span></div>; }
function WebRow({ icon, href, label }: { icon: React.ReactNode; href: string; label: string }) { return <a href={href} target="_blank" rel="noreferrer" className="focus-ring flex min-h-11 items-center justify-between gap-2 rounded-lg px-1 text-muted hover:text-[var(--accent)]"><span className="flex items-center gap-2">{icon}{label}</span><ExternalLink size={12}/></a>; }
