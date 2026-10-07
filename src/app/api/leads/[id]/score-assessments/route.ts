import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { scoreAssessmentSchema } from "@/lib/validation/automation";
import { createScoreAssessment, listScoreAssessments } from "@/lib/services/intelligence";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){try{await apiActor();const{id}=await params;return ok(await listScoreAssessments(id));}catch(error){return errorResponse(error);}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await apiActor();const{id}=await params;const body=scoreAssessmentSchema.omit({leadId:true}).parse(await request.json());return created(await createScoreAssessment(id,body,actor));}catch(error){return errorResponse(error);}}
