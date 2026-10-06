import { recordContactSchema } from "@/lib/validation/lead";
import { recordContact } from "@/lib/services/leads";
import { apiActor, errorResponse, ok } from "@/lib/services/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await apiActor(); const { id } = await params; return ok(await recordContact(id, recordContactSchema.parse(await request.json()), actor)); } catch (error) { return errorResponse(error); }
}
