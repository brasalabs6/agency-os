import { z } from "zod"; import { resetMemberPassword } from "@/lib/services/team"; import { apiUser,assertSameOrigin,errorResponse,ok } from "@/lib/services/http";
const schema=z.object({password:z.string().min(10).max(128)});
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const admin=await apiUser();const {id}=await params;const {password}=schema.parse(await request.json());return ok(await resetMemberPassword(admin,id,password));}catch(error){return errorResponse(error);}}
