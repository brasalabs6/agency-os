import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { diagnosticCreateSchema } from "@/lib/validation/automation";
import { createDiagnostic, listDiagnostics } from "@/lib/services/intelligence";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await apiActor(); const { id } = await params; return ok(await listDiagnostics(id)); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor=await apiActor(); const {id}=await params; const body=diagnosticCreateSchema.omit({leadId:true}).parse(await request.json()); return created(await createDiagnostic(id,body,actor)); } catch(error){return errorResponse(error);}
}
