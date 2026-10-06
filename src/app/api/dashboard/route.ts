import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { getDashboardSummary } from "@/lib/services/dashboard";

export async function GET() {
  try { await apiActor(); return ok(await getDashboardSummary()); } catch (error) { return errorResponse(error); }
}
