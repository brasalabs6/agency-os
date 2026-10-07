import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { approvalDecisionSchema } from "@/lib/validation/automation";
import { approveRequest } from "@/lib/services/communications";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await apiActor();const{id}=await params;return ok(await approveRequest(id,approvalDecisionSchema.parse(await request.json().catch(()=>({}))),actor));}catch(error){return errorResponse(error);}}
