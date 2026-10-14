import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { getLeadScript } from "@/lib/services/script-flows";
export async function GET(_request:Request,{params}:{params:Promise<{id:string;scriptId:string;revisionId:string}>}){
  try{
    const actor=await apiActor(),{id,scriptId,revisionId}=await params;
    return ok(await getLeadScript(id,scriptId,actor,{revisionId}),{headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
