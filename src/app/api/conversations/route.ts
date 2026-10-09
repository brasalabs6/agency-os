import { NextRequest } from "next/server";
import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { listConversations } from "@/lib/services/communications";
export async function GET(request:NextRequest){try{await apiActor();const p=request.nextUrl.searchParams;return ok(await listConversations({leadId:p.get("leadId")??undefined,connectionId:p.get("connectionId")??undefined,limit:Number(p.get("limit")??100)}));}catch(error){return errorResponse(error);}}
