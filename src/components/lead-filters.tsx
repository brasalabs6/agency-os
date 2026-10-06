import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES } from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/domain/status";
import type { UserSummary } from "@/lib/domain/types";
import { buttonGhostClass, buttonPrimaryClass, buttonSecondaryClass, controlClass } from "./ui-kit";

const quickLabels: Record<string, string> = {
  "high-score": "Score alto",
  today: "Contato hoje",
  overdue: "Atrasados",
  "no-action": "Sem próxima ação",
  proposal: "Propostas",
  negotiation: "Negociação",
  won: "Ganhos",
};

export function LeadFilters({ values, users, currentUserId }: { values: Record<string, string | undefined>; users: UserSummary[]; currentUserId: string }) {
  const advancedActive = Boolean(values.opportunity || values.segment || values.city || values.scoreMin || values.quick);
  const ownerLabel = values.owner === "me" ? "Eu" : values.owner === "unassigned" ? "Sem responsável" : users.find((user) => user.id === values.owner)?.name;
  const chips = [
    values.status ? ["Estágio", STATUS_LABELS[values.status as keyof typeof STATUS_LABELS]] : null,
    values.owner ? ["Responsável", ownerLabel ?? values.owner] : null,
    values.opportunity ? ["Oportunidade", values.opportunity.replaceAll("_", " ")] : null,
    values.segment ? ["Segmento", values.segment] : null,
    values.city ? ["Cidade", values.city] : null,
    values.scoreMin ? ["Score mín.", values.scoreMin] : null,
    values.quick ? ["Visão", quickLabels[values.quick] ?? values.quick] : null,
  ].filter(Boolean) as string[][];

  return <form className="mb-5 space-y-3" method="get">
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_190px_auto_auto]">
      <label className="relative sm:col-span-2 xl:col-span-1"><span className="sr-only">Buscar leads</span><Search size={16} className="pointer-events-none absolute left-3 top-3 text-muted"/><input name="q" defaultValue={values.q} placeholder="Buscar empresa, domínio, telefone…" className={`${controlClass} pl-9`}/></label>
      <select aria-label="Filtrar por estágio" name="status" defaultValue={values.status ?? ""} className={controlClass}><option value="">Todos os estágios</option>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
      <select aria-label="Filtrar por responsável" name="owner" defaultValue={values.owner ?? ""} className={controlClass}><option value="">Todos os responsáveis</option><option value="me">Eu</option><option value="unassigned">Sem responsável</option>{users.map((user) => <option key={user.id} value={user.id}>{user.id === currentUserId ? `${user.name} (eu)` : user.name}</option>)}</select>
      <button className={buttonPrimaryClass}>Aplicar</button>
      <a href="/leads" className={buttonGhostClass}>Limpar</a>
    </div>

    <details open={advancedActive} className="group rounded-xl border border-default bg-[var(--panel)]">
      <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3.5 text-sm font-medium hover:bg-[var(--panel-2)]"><span className="flex items-center gap-2"><SlidersHorizontal size={15}/>Mais filtros{advancedActive ? <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">ativos</span> : null}</span><ChevronDown size={15} className="text-muted transition-transform group-open:rotate-180"/></summary>
      <div className="grid gap-3 border-t border-default p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <label><span className="mb-1.5 block text-xs font-medium text-muted">Oportunidade</span><select name="opportunity" defaultValue={values.opportunity ?? ""} className={controlClass}><option value="">Todas</option>{SERVICE_OPPORTUNITIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label><span className="mb-1.5 block text-xs font-medium text-muted">Segmento</span><input name="segment" defaultValue={values.segment} placeholder="Ex.: restaurante" className={controlClass}/></label>
        <label><span className="mb-1.5 block text-xs font-medium text-muted">Cidade</span><input name="city" defaultValue={values.city} placeholder="Ex.: Brasília" className={controlClass}/></label>
        <label><span className="mb-1.5 block text-xs font-medium text-muted">Score mínimo</span><input name="scoreMin" type="number" min="0" max="100" defaultValue={values.scoreMin} placeholder="0–100" className={controlClass}/></label>
        <label><span className="mb-1.5 block text-xs font-medium text-muted">Visão rápida</span><select name="quick" defaultValue={values.quick ?? ""} className={controlClass}><option value="">Nenhuma</option><option value="high-score">Score alto</option><option value="today">Contato hoje</option><option value="overdue">Atrasados</option><option value="no-action">Sem próxima ação</option><option value="proposal">Propostas</option><option value="negotiation">Negociação</option><option value="won">Ganhos</option></select></label>
      </div>
    </details>

    {chips.length ? <div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-medium uppercase tracking-wide text-muted">Filtros ativos</span>{chips.map(([label, value]) => <span key={`${label}-${value}`} className="inline-flex items-center gap-1.5 rounded-full border border-default bg-[var(--panel)] px-2.5 py-1 text-xs"><span className="text-muted">{label}:</span>{value}</span>)}<a href="/leads" className={`${buttonSecondaryClass} min-h-8 px-2.5 text-xs`}><X size={12}/>Limpar todos</a></div> : null}
  </form>;
}
