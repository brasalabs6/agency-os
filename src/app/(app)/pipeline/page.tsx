import { KanbanBoard } from "@/components/kanban-board";
import { PageHeader } from "@/components/page-header";
import { buttonPrimaryClass, controlClass } from "@/components/ui-kit";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { listUsers, searchLeads } from "@/lib/services/leads";
import type { LeadSearchFilters } from "@/lib/domain/types";

export default async function PipelinePage({searchParams}:{searchParams:Promise<{owner?:string}>}) {
  const { owner } = await searchParams;
  const currentUser = await requireCurrentUser();
  const users = await listUsers();
  const filters: LeadSearchFilters = { limit: 100 };
  if (owner === "me") filters.ownerId = currentUser.id;
  else if (owner === "unassigned") filters.ownerUnassigned = true;
  else if (owner) filters.ownerId = owner;
  const result = await searchLeads(filters);
  return <>
    <PageHeader title="Pipeline" description="Acompanhe a prospecção por estágio. No celular, use o seletor de cada card para mover leads."/>
    <form method="get" className="mb-4 grid gap-2 sm:max-w-md sm:grid-cols-[minmax(0,1fr)_auto]">
      <select name="owner" defaultValue={owner??""} className={controlClass} aria-label="Filtrar por responsável"><option value="">Toda a equipe</option><option value="me">Meus leads</option><option value="unassigned">Sem responsável</option>{users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select>
      <button className={buttonPrimaryClass}>Aplicar</button>
    </form>
    <KanbanBoard initialLeads={result.items}/>
  </>;
}
