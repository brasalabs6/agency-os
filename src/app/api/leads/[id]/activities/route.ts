import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { listActivities } from "@/lib/services/leads";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await apiActor(); const { id } = await params; return ok({ items: await listActivities(id) }); } catch (error) { return errorResponse(error); }
}
