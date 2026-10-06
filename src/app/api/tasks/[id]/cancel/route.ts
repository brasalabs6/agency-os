import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { cancelTask } from "@/lib/services/tasks";
import { cancelTaskSchema } from "@/lib/validation/task";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await apiActor(); const { id } = await params;
    return ok(await cancelTask(id, actor, cancelTaskSchema.parse(await request.json().catch(() => ({})))));
  } catch (error) { return errorResponse(error); }
}
