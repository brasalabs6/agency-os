import { KanbanBoard } from "@/components/kanban-board";
import { PageHeader } from "@/components/page-header";
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
  return <><PageHeader title="Pipeline" description="Arraste os cards entre grupos. Filtre por responsável para dividir a prospecção."/>
    <form method="get" className="mb-4 flex max-w-sm gap-2"><select name="owner" defaultValue={owner??""} className="h-9 flex-1 rounded-md border border-default bg-[var(--panel)] px-3 text-sm"><option value="">All team</option><option value="me">Mine</option><option value="unassigned">Unassigned</option>{users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select><button className="rounded-md bg-[var(--text)] px-3 text-xs font-medium text-[var(--panel)]">Filter</button></form>
    <KanbanBoard initialLeads={result.items}/></>;
}
