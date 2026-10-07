import { apiActor,errorResponse,ok } from "@/lib/services/http";
import { markProposalResponse } from "@/lib/services/sales-automation";
import { proposalResponseSchema } from "@/lib/validation/automation";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const actor=await apiActor();
    const{id}=await params;
    const body=proposalResponseSchema.parse(await request.json());
    return ok(await markProposalResponse(id,body.status,body.notes,body.expectedVersion,actor));
  }catch(error){return errorResponse(error);}
}
