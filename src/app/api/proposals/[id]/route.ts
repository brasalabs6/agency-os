import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { proposalUpdateSchema } from "@/lib/validation/automation";
import { getProposal, updateProposal } from "@/lib/services/sales-automation";
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){try{await apiActor();const{id}=await params;return ok(await getProposal(id));}catch(error){return errorResponse(error);}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await apiActor();const{id}=await params;const{expectedVersion,...changes}=proposalUpdateSchema.parse(await request.json());return ok(await updateProposal(id,changes,expectedVersion,actor));}catch(error){return errorResponse(error);}}
