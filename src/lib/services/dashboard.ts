import { ACTIVE_STATUSES } from "@/lib/domain/status";
import { LEAD_STATUSES, type DashboardSummary } from "@/lib/domain/types";
import { searchLeads } from "./leads";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [statusPages, overdue, today, noAction, highPriority] = await Promise.all([
    Promise.all(LEAD_STATUSES.map((status) => searchLeads({ status, limit: 1 }))),
    searchLeads({ statuses: ACTIVE_STATUSES, overdue: true, limit: 30 }),
    searchLeads({ statuses: ACTIVE_STATUSES, dueToday: true, limit: 30 }),
    searchLeads({ statuses: ACTIVE_STATUSES, noNextAction: true, limit: 30 }),
    searchLeads({ statuses: ["DISCOVERED", "ENRICHED", "SCORED", "READY_TO_CONTACT"], scoreMin: 85, limit: 30 }),
  ]);

  const countsByStatus: DashboardSummary["countsByStatus"] = {};
  LEAD_STATUSES.forEach((status, index) => { countsByStatus[status] = statusPages[index]?.total ?? 0; });
  const activeLeads = ACTIVE_STATUSES.reduce((sum, status) => sum + (countsByStatus[status] ?? 0), 0);
  const needsAttention = Array.from(new Map(
    [...overdue.items, ...today.items, ...noAction.items, ...highPriority.items].map((lead) => [lead.id, lead]),
  ).values()).slice(0, 8);

  return {
    activeLeads,
    overdueActions: overdue.total,
    contactToday: today.total,
    openProposals: countsByStatus.PROPOSAL_SENT ?? 0,
    negotiation: countsByStatus.NEGOTIATION ?? 0,
    won: countsByStatus.WON ?? 0,
    countsByStatus,
    needsAttention,
  };
}
