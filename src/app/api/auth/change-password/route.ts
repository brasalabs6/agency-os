import { z } from "zod";
import { changeOwnPassword } from "@/lib/services/auth";
import { apiUser, assertSameOrigin, errorResponse, ok } from "@/lib/services/http";
const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(128) });
export async function POST(request: Request) {
  try { assertSameOrigin(request); const user = await apiUser(); const input = schema.parse(await request.json()); await changeOwnPassword(user, input.currentPassword, input.newPassword); return ok({ ok: true }); }
  catch (error) { return errorResponse(error); }
}
