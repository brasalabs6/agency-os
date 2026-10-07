import { apiActor,errorResponse,ok } from "@/lib/services/http";
import { requestProposalApproval } from "@/lib/services/sales-automation";
import { approvalRequestCommandSchema } from "@/lib/validation/automation";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const actor=await apiActor();
    const{id}=await params;
    const body=approvalRequestCommandSchema.parse(await request.json());
    return ok(await requestProposalApproval(id,body.expectedVersion,actor,undefined,body.delivery));
  }catch(error){return errorResponse(error);}
}
