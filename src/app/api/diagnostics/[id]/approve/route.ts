import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { approveDiagnostic } from "@/lib/services/intelligence";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await apiActor();const{id}=await params;const body=await request.json().catch(()=>({})) as {expectedVersion?:number};return ok(await approveDiagnostic(id,body.expectedVersion,actor));}catch(error){return errorResponse(error);}}
