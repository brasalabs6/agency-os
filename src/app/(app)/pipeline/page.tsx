import { KanbanBoard } from "@/components/kanban-board";
import { PageHeader } from "@/components/page-header";
import { buttonPrimaryClass, controlClass } from "@/components/ui-kit";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import { getI18n } from "@/lib/i18n/server";
import { listUsers, searchLeads } from "@/lib/services/leads";
import type { LeadSearchFilters } from "@/lib/domain/types";

export default async function PipelinePage({searchParams}:{searchParams:Promise<{owner?:string}>}) {
  const { owner } = await searchParams;
  const currentUser = await requireCurrentUser();
  const users = await listUsers();
  const { t } = await getI18n();
  const filters: LeadSearchFilters = { limit: 100 };
  if (owner === "me") filters.ownerId = currentUser.id;
  else if (owner === "unassigned") filters.ownerUnassigned = true;
  else if (owner) filters.ownerId = owner;
  const result = await searchLeads(filters);
  return <>
    <PageHeader title={t("pipeline.title")} description={t("pipeline.description")}/>
    <form method="get" className="mb-4 grid gap-2 sm:max-w-md sm:grid-cols-[minmax(0,1fr)_auto]">
      <select name="owner" defaultValue={owner??""} className={controlClass} aria-label={t("leads.owner")}><option value="">{t("pipeline.allTeam")}</option><option value="me">{t("pipeline.myLeads")}</option><option value="unassigned">{t("pipeline.unassigned")}</option>{users.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select>
      <button className={buttonPrimaryClass}>{t("common.apply")}</button>
    </form>
    <KanbanBoard initialLeads={result.items}/>
  </>;
}
