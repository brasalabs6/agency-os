import { NextRequest } from "next/server";
import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { approvalCreateSchema } from "@/lib/validation/automation";
import { createApprovalRequest, listApprovals } from "@/lib/services/communications";
export async function GET(request:NextRequest){try{await apiActor();const p=request.nextUrl.searchParams;return ok(await listApprovals({leadId:p.get("leadId")??undefined,status:p.get("status")??undefined,limit:Number(p.get("limit")??100)}));}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const actor=await apiActor();return created(await createApprovalRequest(approvalCreateSchema.parse(await request.json()),actor));}catch(error){return errorResponse(error);}}
