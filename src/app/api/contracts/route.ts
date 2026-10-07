import { NextRequest } from "next/server";
import { apiActor,created,errorResponse,ok } from "@/lib/services/http";
import { contractCreateSchema } from "@/lib/validation/automation";
import { createContractFromProposal,listContracts } from "@/lib/services/sales-automation";
export async function GET(request:NextRequest){try{await apiActor();const leadId=request.nextUrl.searchParams.get("leadId");if(!leadId)throw new Error("leadId is required");return ok(await listContracts(leadId));}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const actor=await apiActor();const{proposalId,...body}=contractCreateSchema.parse(await request.json());return created(await createContractFromProposal(proposalId,body,actor));}catch(error){return errorResponse(error);}}