import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { diagnosticUpdateSchema } from "@/lib/validation/automation";
import { getDiagnostic, updateDiagnostic } from "@/lib/services/intelligence";
export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}){try{await apiActor();const{id}=await params;return ok(await getDiagnostic(id));}catch(error){return errorResponse(error);}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await apiActor();const{id}=await params;const{expectedVersion,...changes}=diagnosticUpdateSchema.parse(await request.json());return ok(await updateDiagnostic(id,changes,expectedVersion,actor));}catch(error){return errorResponse(error);}}
