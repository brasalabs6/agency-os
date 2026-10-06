import { NextRequest } from "next/server";
import { z } from "zod";
import { LEAD_TASK_STATUSES } from "@/lib/domain/types";
import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { listCalendar } from "@/lib/services/tasks";

const schema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  ownerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  status: z.enum(LEAD_TASK_STATUSES).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await apiActor();
    const query = schema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    return ok(await listCalendar({ ...query, statuses: query.status ? [query.status] : undefined }));
  } catch (error) { return errorResponse(error); }
}
