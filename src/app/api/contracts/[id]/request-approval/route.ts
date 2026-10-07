import { apiActor,errorResponse,ok } from "@/lib/services/http";
import { requestContractApproval } from "@/lib/services/sales-automation";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const actor=await apiActor();const{id}=await params;
    const body=await request.json().catch(()=>({})) as {delivery?:{channel:"EMAIL"|"WHATSAPP"|"OTHER";to:string}};
    return ok(await requestContractApproval(id,actor,undefined,body.delivery));
  }catch(error){return errorResponse(error);}
}
