import { z } from "zod";
import { updateTeamMember } from "@/lib/services/team";
import { apiUser, assertSameOrigin, errorResponse, ok } from "@/lib/services/http";
const schema=z.object({ name:z.string().trim().min(1).max(120).optional(), email:z.string().email().optional(), role:z.enum(["ADMIN","MEMBER"]).optional() });
export async function PATCH(request: Request,{params}:{params:Promise<{id:string}>}) { try { assertSameOrigin(request); const admin=await apiUser(); const {id}=await params; return ok(await updateTeamMember(admin,id,schema.parse(await request.json()))); } catch(error){ return errorResponse(error); } }
