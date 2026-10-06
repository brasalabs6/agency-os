import { markOutcomeSchema } from "@/lib/validation/lead";
import { markOutcome } from "@/lib/services/leads";
import { apiActor, errorResponse, ok } from "@/lib/services/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await apiActor(); const { id } = await params; return ok(await markOutcome(id, markOutcomeSchema.parse(await request.json()), actor)); } catch (error) { return errorResponse(error); }
}
