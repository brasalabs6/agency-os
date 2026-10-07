import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { executeApprovedWhatsapp } from "@/lib/services/communications";
export async function POST(_request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await apiActor();const{id}=await params;return ok(await executeApprovedWhatsapp(id,actor));}catch(error){return errorResponse(error);}}
