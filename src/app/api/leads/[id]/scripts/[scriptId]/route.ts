import { apiActor, assertSameOrigin, errorResponse, ok } from "@/lib/services/http";
import { getLeadScript, patchLeadScript, replaceLeadScript } from "@/lib/services/script-flows";
import { DomainError } from "@/lib/domain/errors";
type Params={params:Promise<{id:string;scriptId:string}>};
export async function GET(request:Request,{params}:Params){
  try{
    const actor=await apiActor(),{id,scriptId}=await params;
    const q=new URL(request.url).searchParams,view=q.get("view"),revisionId=q.get("revisionId")??undefined;
    if(view&&view!=="draft"&&view!=="published")throw new DomainError("Invalid view","SCRIPT_GRAPH_INVALID",422);
    return ok(await getLeadScript(id,scriptId,actor,{view:view as "draft"|"published"|undefined,revisionId}),
      {headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
export async function PUT(request:Request,{params}:Params){
  try{assertSameOrigin(request);const actor=await apiActor(),{id,scriptId}=await params;
    return ok(await replaceLeadScript(id,scriptId,await request.json(),actor));
  }catch(e){return errorResponse(e);}
}
export async function PATCH(request:Request,{params}:Params){
  try{assertSameOrigin(request);const actor=await apiActor(),{id,scriptId}=await params;
    return ok(await patchLeadScript(id,scriptId,await request.json(),actor));
  }catch(e){return errorResponse(e);}
}
