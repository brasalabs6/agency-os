import { NextRequest } from "next/server";
import { createLeadSchema } from "@/lib/validation/lead";
import { createLead, searchLeads } from "@/lib/services/leads";
import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { LEAD_STATUSES, SERVICE_OPPORTUNITIES, type LeadSearchFilters } from "@/lib/domain/types";

function bool(value: string | null) { return value === "true" ? true : undefined; }
function num(value: string | null) { return value == null || value === "" ? undefined : Number(value); }

export async function GET(request: NextRequest) {
  try {
    await apiActor();
    const p = request.nextUrl.searchParams;
    const status = p.get("status");
    const opportunity = p.get("opportunity");
    const filters: LeadSearchFilters = {
      query: p.get("q") || undefined,
      status: status && LEAD_STATUSES.includes(status as never) ? status as LeadSearchFilters["status"] : undefined,
      pipelineGroup: p.get("pipelineGroup") || undefined,
      segment: p.get("segment") || undefined,
      city: p.get("city") || undefined,
      opportunity: opportunity && SERVICE_OPPORTUNITIES.includes(opportunity as never) ? opportunity as LeadSearchFilters["opportunity"] : undefined,
      ownerId: p.get("ownerId") || undefined,
      scoreMin: num(p.get("scoreMin")), scoreMax: num(p.get("scoreMax")),
      tags: p.getAll("tag"), overdue: bool(p.get("overdue")), dueToday: bool(p.get("dueToday")), noNextAction: bool(p.get("noNextAction")),
      limit: num(p.get("limit")), offset: num(p.get("offset")),
    };
    return ok(await searchLeads(filters));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await apiActor();
    const input = createLeadSchema.parse(await request.json());
    return created(await createLead(input, actor));
  } catch (error) { return errorResponse(error); }
}
