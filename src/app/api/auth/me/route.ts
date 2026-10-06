import { apiUser, errorResponse, ok } from "@/lib/services/http";
export async function GET() {
  try {
    const { sessionId: _sessionId, ...user } = await apiUser();
    return ok(user);
  } catch (error) { return errorResponse(error); }
}
