import { NextRequest } from "next/server";
import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { proposalCreateSchema } from "@/lib/validation/automation";
import { createProposal, listProposals } from "@/lib/services/sales-automation";
export async function GET(request:NextRequest){try{await apiActor();const leadId=request.nextUrl.searchParams.get("leadId");if(!leadId)throw new Error("leadId is required");return ok(await listProposals(leadId));}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const actor=await apiActor();const{leadId,...body}=proposalCreateSchema.parse(await request.json());return created(await createProposal(leadId,body,actor));}catch(error){return errorResponse(error);}}
