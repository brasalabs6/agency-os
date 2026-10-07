import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { prospectingRunCreateSchema } from "@/lib/validation/automation";
import { createProspectingRun, listProspectingRuns } from "@/lib/services/intelligence";
export async function GET(){try{await apiActor();return ok(await listProspectingRuns());}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const actor=await apiActor();return created(await createProspectingRun(prospectingRunCreateSchema.parse(await request.json()),actor));}catch(error){return errorResponse(error);}}
