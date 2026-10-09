import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { getAutomationBundle } from "@/lib/services/intelligence";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await apiActor(); const { id } = await params; return ok(await getAutomationBundle(id)); } catch (error) { return errorResponse(error); }
}
