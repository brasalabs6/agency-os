import { moveStageSchema } from "@/lib/validation/lead";
import { moveLeadStage } from "@/lib/services/leads";
import { apiActor, errorResponse, ok } from "@/lib/services/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await apiActor(); const { id } = await params; const input = moveStageSchema.parse(await request.json()); return ok(await moveLeadStage(id, input.targetStatus, actor, input)); } catch (error) { return errorResponse(error); }
}
