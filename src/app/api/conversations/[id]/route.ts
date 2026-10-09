import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { getConversation, linkConversation } from "@/lib/services/communications";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{await apiActor();const{id}=await params;return ok(await getConversation(id));}catch(error){return errorResponse(error);}}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await apiActor();const{id}=await params;const body=await request.json() as {leadId?:string|null;optOutDetected?:boolean};return ok(await linkConversation(id,body.leadId??null,body.optOutDetected,actor));}catch(error){return errorResponse(error);}}
