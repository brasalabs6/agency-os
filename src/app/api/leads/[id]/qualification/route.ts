import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { qualificationSchema } from "@/lib/validation/automation";
import { getQualification, upsertQualification } from "@/lib/services/sales-automation";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{await apiActor();const{id}=await params;return ok(await getQualification(id));}catch(error){return errorResponse(error);}}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await apiActor();const{id}=await params;return ok(await upsertQualification(id,qualificationSchema.parse(await request.json()),actor));}catch(error){return errorResponse(error);}}
