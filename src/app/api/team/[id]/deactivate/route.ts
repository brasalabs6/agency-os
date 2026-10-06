import { deactivateTeamMember } from "@/lib/services/team"; import { apiUser,assertSameOrigin,errorResponse,ok } from "@/lib/services/http";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const admin=await apiUser();const {id}=await params;return ok(await deactivateTeamMember(admin,id));}catch(error){return errorResponse(error);}}
