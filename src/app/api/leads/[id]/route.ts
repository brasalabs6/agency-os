import { NextRequest } from "next/server";
import { getLead, updateLead } from "@/lib/services/leads";
import { updateLeadSchema } from "@/lib/validation/lead";
import { apiActor, errorResponse, ok } from "@/lib/services/http";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await apiActor(); const { id } = await params; return ok(await getLead(id)); } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await apiActor(); const { id } = await params;
    return ok(await updateLead(id, updateLeadSchema.parse(await request.json()), actor));
  } catch (error) { return errorResponse(error); }
}
