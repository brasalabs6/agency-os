import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { createTask, listLeadTasks } from "@/lib/services/tasks";
import { createTaskSchema } from "@/lib/validation/task";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await apiActor(); const { id } = await params; return ok(await listLeadTasks(id, true)); } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await apiActor(); const { id } = await params;
    const raw = await request.json();
    return created(await createTask(createTaskSchema.parse({ ...raw, leadId: id }), actor));
  } catch (error) { return errorResponse(error); }
}
