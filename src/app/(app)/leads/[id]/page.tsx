import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe2, Instagram, Mail, MapPin, MessageCircle, Phone, ShieldAlert, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { ActivityTimeline } from "@/components/activity-timeline";
import { DateLabel } from "@/components/date-label";
import { LeadActions } from "@/components/lead-actions";
import { LeadScore } from "@/components/lead-score";
import { LeadTasksCard } from "@/components/lead-tasks-card";
import { LeadAutomationPanel } from "@/components/lead-automation-panel";
import { StatusBadge } from "@/components/status-badge";
import { DomainError } from "@/lib/domain/errors";
import { getLead, listUsers } from "@/lib/services/leads";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { getAutomationBundle } from "@/lib/services/intelligence";

const opportunityLabels: Record<string, string> = { WEBSITE: "Website", LANDING_PAGE: "Landing page", DIGITAL_CATALOG: "Catálogo digital", GOOGLE_BUSINESS: "Google Business", AUTOMATION: "Automação", CUSTOM_SYSTEM: "Sistema personalizado", OTHER: "Outro" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data; try { data = await getLead(id); } catch (error) { if (error instanceof DomainError && error.status === 404) notFound(); throw error; }
  const { lead, activities, evidence, tasks } = data;
  const [users, currentUser, automation] = await Promise.all([listUsers(), requireCurrentUser(), getAutomationBundle(id)]);

  return <>
    <Link href="/leads" className="focus-ring mb-4 inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs text-muted hover:text-[var(--accent)]"><ArrowLeft size={13}/>Voltar aos leads</Link>
    {lead.doNotContact ? <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"><ShieldAlert size={17} className="mt-0.5 shrink-0"/><div><strong>Não contatar.</strong> Ações de contato humano e via MCP são bloqueadas enquanto este estado estiver ativo.</div></div> : null}

    <header className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{lead.name}</h1><StatusBadge status={lead.status}/></div><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted"><span>{lead.segment ?? "Segmento não informado"}</span><span className="inline-flex items-center gap-1"><MapPin size={13}/>{[lead.city, lead.state].filter(Boolean).join(" / ") || "Local não informado"}</span><span>v{lead.version}</span></div><div className="mt-3 flex flex-wrap gap-1.5">{lead.tags.map((tag) => <span key={tag} className="rounded-full border border-default px-2 py-1 text-[11px] text-muted">{tag}</span>)}</div></div>
      <LeadActions lead={lead} users={users} currentUserId={currentUser.id}/>
    </header>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="surface-flat rounded-xl p-4 sm:p-5"><div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold">Oportunidade</h2><p className="mt-1 text-xs text-muted">Hipótese comercial baseada em evidências registradas.</p></div><LeadScore score={lead.score}/></div><div className="grid gap-4 sm:grid-cols-2"><div><div className="text-[10px] uppercase tracking-wide text-muted">Serviço recomendado</div><div className="mt-1 text-sm font-medium">{lead.primaryOpportunity ? opportunityLabels[lead.primaryOpportunity] : "Não definido"}</div></div><div><div className="text-[10px] uppercase tracking-wide text-muted">Razões do score</div><ul className="mt-1 space-y-1 text-sm">{lead.scoreReasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul></div></div>{lead.opportunityNotes ? <p className="mt-4 border-t border-default pt-4 text-sm leading-6 text-[color:var(--text)]/80">{lead.opportunityNotes}</p> : null}</section>
        <section className="surface-flat rounded-xl p-4 sm:p-5"><div className="mb-5"><h2 className="text-sm font-semibold">Histórico</h2><p className="mt-1 text-xs text-muted">Ações de humanos, agentes e do sistema.</p></div><ActivityTimeline activities={activities}/></section>
      </div>

      <aside className="space-y-4">
        <section className="surface-flat rounded-xl p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Próxima ação</h2><p className={`mt-3 text-sm font-medium ${lead.nextAction ? "" : "text-amber-700 dark:text-amber-300"}`}>{lead.nextAction ?? "Nenhuma próxima ação definida"}</p><div className="mt-2"><DateLabel value={lead.nextActionAt} highlightOverdue/></div>{lead.nextActionOwner ? <p className="mt-2 text-xs text-muted">Responsável: {lead.nextActionOwner.name}</p> : null}</section>
        <LeadTasksCard lead={lead} tasks={tasks} users={users}/>
        <section className="surface-flat rounded-xl p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Contato</h2><div className="mt-3 space-y-2 text-sm">{lead.contactName ? <Row icon={<UserRound size={14}/>} label={[lead.contactName, lead.contactRole].filter(Boolean).join(" · ")}/> : null}{lead.phone ? <Row icon={<Phone size={14}/>} label={lead.phone}/> : null}{lead.whatsapp ? <Row icon={<MessageCircle size={14}/>} label={lead.whatsapp}/> : null}{lead.email ? <Row icon={<Mail size={14}/>} label={lead.email}/> : null}{!lead.contactName && !lead.phone && !lead.whatsapp && !lead.email ? <span className="text-xs text-muted">Sem dados de contato.</span> : null}</div></section>
        <section className="surface-flat rounded-xl p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Presença digital</h2><div className="mt-3 space-y-2 text-sm">{lead.website ? <WebRow icon={<Globe2 size={14}/>} href={lead.website} label="Website"/> : <span className="text-xs text-amber-700 dark:text-amber-300">Site próprio não identificado</span>}{lead.googleMapsUrl ? <WebRow icon={<MapPin size={14}/>} href={lead.googleMapsUrl} label="Perfil no Google"/> : null}{lead.instagramUrl ? <WebRow icon={<Instagram size={14}/>} href={lead.instagramUrl} label="Instagram"/> : null}</div></section>
        <section className="surface-flat rounded-xl p-4"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Evidências</h2><div className="mt-3 space-y-3">{evidence.map((item) => <div key={item.id} className="rounded-lg bg-[var(--panel-2)] p-3"><div className="text-[10px] uppercase text-muted">{item.claim}</div><div className="mt-1 text-xs font-medium">{item.value}</div><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 flex min-w-0 items-center gap-1 text-[10px] text-muted hover:text-[var(--accent)]"><ExternalLink size={10} className="shrink-0"/><span className="truncate">{item.sourceUrl}</span></a></div>)}{evidence.length === 0 ? <p className="text-xs text-muted">Nenhuma evidência registrada.</p> : null}</div></section>
      </aside>
    </div>
  </>;
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="flex min-w-0 items-center gap-2 text-muted">{icon}<span className="truncate">{label}</span></div>; }
function WebRow({ icon, href, label }: { icon: React.ReactNode; href: string; label: string }) { return <a href={href} target="_blank" rel="noreferrer" className="focus-ring flex items-center justify-between gap-2 rounded-md text-muted hover:text-[var(--accent)]"><span className="flex items-center gap-2">{icon}{label}</span><ExternalLink size={11}/></a>; }
