import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { businessProfileSnapshotSchema } from "@/lib/validation/automation";
import { createBusinessProfileSnapshot, listBusinessProfiles } from "@/lib/services/intelligence";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await apiActor(); const { id } = await params; return ok(await listBusinessProfiles(id)); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await apiActor(); const { id } = await params; return created(await createBusinessProfileSnapshot(id, businessProfileSnapshotSchema.parse(await request.json()), actor)); } catch (error) { return errorResponse(error); }
}
