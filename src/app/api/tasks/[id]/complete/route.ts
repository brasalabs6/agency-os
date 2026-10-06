import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { completeTask } from "@/lib/services/tasks";
import { completeTaskSchema } from "@/lib/validation/task";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await apiActor(); const { id } = await params;
    const input = completeTaskSchema.parse(await request.json().catch(() => ({})));
    return ok(await completeTask(id, actor, input.expectedVersion));
  } catch (error) { return errorResponse(error); }
}
