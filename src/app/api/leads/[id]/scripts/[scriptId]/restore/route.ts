import { apiActor, assertSameOrigin, errorResponse, ok } from "@/lib/services/http";
import { restoreLeadScript } from "@/lib/services/script-flows";
export async function POST(request:Request,{params}:{params:Promise<{id:string;scriptId:string}>}){
  try{
    assertSameOrigin(request);const actor=await apiActor(),{id,scriptId}=await params;
    return ok(await restoreLeadScript(id,scriptId,await request.json(),actor));
  }catch(e){return errorResponse(e);}
}
