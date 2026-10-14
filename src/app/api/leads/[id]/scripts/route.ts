import { apiActor, assertSameOrigin, created, errorResponse, ok } from "@/lib/services/http";
import { createLeadScript, listLeadScripts } from "@/lib/services/script-flows";
import { SCRIPT_CHANNELS, SCRIPT_PURPOSES, type ScriptChannel, type ScriptPurpose } from "@/lib/domain/script-flow";
import { DomainError } from "@/lib/domain/errors";

type Params={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Params){
  try {
    const actor=await apiActor(),{id}=await params;
    const q=new URL(request.url).searchParams;
    const channel=q.get("channel")??undefined,purpose=q.get("purpose")??undefined;
    if(channel&&!SCRIPT_CHANNELS.includes(channel as ScriptChannel))throw new DomainError("Invalid channel","SCRIPT_GRAPH_INVALID",422);
    if(purpose&&!SCRIPT_PURPOSES.includes(purpose as ScriptPurpose))throw new DomainError("Invalid purpose","SCRIPT_GRAPH_INVALID",422);
    const limit=Number(q.get("limit")??50),offset=Number(q.get("offset")??0);
    if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0)
      throw new DomainError("Invalid pagination","SCRIPT_GRAPH_INVALID",422);
    return ok(await listLeadScripts(id,actor,{channel:channel as ScriptChannel|undefined,purpose:purpose as ScriptPurpose|undefined,limit,offset}),
      {headers:{"Cache-Control":"no-store"}});
  }catch(e){return errorResponse(e);}
}
export async function POST(request:Request,{params}:Params){
  try{
    assertSameOrigin(request);
    const actor=await apiActor(),{id}=await params;
    return created(await createLeadScript(id,await request.json(),actor));
  }catch(e){return errorResponse(e);}
}
