import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { finalizeDiagnostic } from "@/lib/services/intelligence";
import { versionCommandSchema } from "@/lib/validation/automation";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const actor=await apiActor();
    const{id}=await params;
    const body=versionCommandSchema.parse(await request.json());
    return ok(await finalizeDiagnostic(id,body.expectedVersion,actor));
  }catch(error){return errorResponse(error);}
}
