import { Search } from "lucide-react";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES } from "@/lib/domain/types";
import { STATUS_LABELS } from "@/lib/domain/status";

export function LeadFilters({ values }: { values: Record<string, string | undefined> }) {
  return <form className="mb-4 grid gap-2 lg:grid-cols-[minmax(260px,1.4fr)_repeat(5,minmax(130px,.7fr))_auto_auto]" method="get">
    <label className="relative"><Search size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-muted"/><input name="q" defaultValue={values.q} placeholder="Buscar empresa, domínio, telefone…" className="focus-ring h-9 w-full rounded-md border border-default bg-[var(--panel)] pl-8 pr-3 text-sm outline-none"/></label>
    <select name="status" defaultValue={values.status ?? ""} className="focus-ring h-9 rounded-md border border-default bg-[var(--panel)] px-2.5 text-sm"><option value="">Estágio</option>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
    <select name="opportunity" defaultValue={values.opportunity ?? ""} className="focus-ring h-9 rounded-md border border-default bg-[var(--panel)] px-2.5 text-sm"><option value="">Oportunidade</option>{SERVICE_OPPORTUNITIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select>
    <input name="segment" defaultValue={values.segment} placeholder="Segmento" className="focus-ring h-9 rounded-md border border-default bg-[var(--panel)] px-2.5 text-sm"/>
    <input name="city" defaultValue={values.city} placeholder="Cidade" className="focus-ring h-9 rounded-md border border-default bg-[var(--panel)] px-2.5 text-sm"/>
    <input name="scoreMin" type="number" min="0" max="100" defaultValue={values.scoreMin} placeholder="Score mín." className="focus-ring h-9 rounded-md border border-default bg-[var(--panel)] px-2.5 text-sm"/>
    <select name="quick" defaultValue={values.quick ?? ""} className="focus-ring h-9 rounded-md border border-default bg-[var(--panel)] px-2.5 text-sm"><option value="">Visão</option><option value="high-score">High score</option><option value="today">Contato hoje</option><option value="overdue">Overdue</option><option value="no-action">Sem próxima ação</option><option value="proposal">Propostas</option><option value="negotiation">Negociação</option><option value="won">Ganhos</option></select>
    <button className="focus-ring h-9 rounded-md bg-[var(--text)] px-3 text-sm font-medium text-[var(--panel)]">Aplicar</button>
    <a href="/leads" className="grid h-9 place-items-center rounded-md px-2.5 text-xs text-muted hover:bg-[var(--panel)]">Limpar</a>
  </form>;
}
