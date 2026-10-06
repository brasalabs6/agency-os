import { z } from "zod";
import { createTeamMember, listTeam } from "@/lib/services/team";
import { apiUser, assertSameOrigin, created, errorResponse, ok } from "@/lib/services/http";
const createSchema = z.object({ name: z.string().trim().min(1).max(120), email: z.string().email(), password: z.string().min(10).max(128), role: z.enum(["ADMIN","MEMBER"]).default("MEMBER") });
export async function GET() { try { return ok(await listTeam(await apiUser())); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) { try { assertSameOrigin(request); const admin=await apiUser(); return created(await createTeamMember(admin, createSchema.parse(await request.json()))); } catch (error) { return errorResponse(error); } }
