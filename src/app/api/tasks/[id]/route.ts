import { NextRequest } from "next/server";
import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { getTask, updateTask } from "@/lib/services/tasks";
import { updateTaskSchema } from "@/lib/validation/task";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await apiActor(); const { id } = await params; return ok(await getTask(id)); } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await apiActor(); const { id } = await params;
    return ok(await updateTask(id, updateTaskSchema.parse(await request.json()), actor));
  } catch (error) { return errorResponse(error); }
}
