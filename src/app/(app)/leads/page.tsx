import { LeadFilters } from "@/components/lead-filters";
import { LeadTable } from "@/components/lead-table";
import { NewLeadButton } from "@/components/new-lead-button";
import { PageHeader } from "@/components/page-header";
import { searchLeads, listUsers } from "@/lib/services/leads";
import { requireCurrentUser } from "@/lib/auth/app-auth";
import type { LeadSearchFilters } from "@/lib/domain/types";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) as Record<string, string | undefined>;
  const quick = values.quick;
  const currentUser = await requireCurrentUser();
  const filters: LeadSearchFilters = { query: values.q, status: values.status as LeadSearchFilters["status"], opportunity: values.opportunity as LeadSearchFilters["opportunity"], segment: values.segment, city: values.city, scoreMin: values.scoreMin ? Number(values.scoreMin) : undefined, limit: 100 };
  if (quick === "high-score") filters.scoreMin = 80;
  if (quick === "today") filters.dueToday = true;
  if (quick === "overdue") filters.overdue = true;
  if (quick === "no-action") filters.noNextAction = true;
  if (quick === "proposal") filters.status = "PROPOSAL_SENT";
  if (quick === "negotiation") filters.status = "NEGOTIATION";
  if (quick === "won") filters.status = "WON";
  if (values.owner === "me") filters.ownerId = currentUser.id;
  else if (values.owner === "unassigned") filters.ownerUnassigned = true;
  else if (values.owner) filters.ownerId = values.owner;
  const result = await searchLeads(filters);
  const users = await listUsers();
  return <><PageHeader title="Leads" description={`${result.total} leads encontrados`} action={<NewLeadButton/>}/><LeadFilters values={values} users={users} currentUserId={currentUser.id}/><LeadTable leads={result.items}/></>;
}
