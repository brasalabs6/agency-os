import { z } from "zod"; import { updateOwnProfile } from "@/lib/services/auth"; import { apiUser,assertSameOrigin,errorResponse,ok } from "@/lib/services/http";
const schema=z.object({name:z.string().trim().min(1).max(120)});
export async function PATCH(request:Request){try{assertSameOrigin(request);const user=await apiUser();return ok(await updateOwnProfile(user,schema.parse(await request.json()).name));}catch(error){return errorResponse(error);}}
