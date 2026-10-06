import { addNoteSchema } from "@/lib/validation/lead";
import { addLeadNote } from "@/lib/services/leads";
import { apiActor, errorResponse, ok } from "@/lib/services/http";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await apiActor(); const { id } = await params; const { body } = addNoteSchema.parse(await request.json()); return ok(await addLeadNote(id, body, actor)); } catch (error) { return errorResponse(error); }
}
