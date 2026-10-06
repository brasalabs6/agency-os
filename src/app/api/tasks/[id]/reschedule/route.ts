import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { rescheduleTask } from "@/lib/services/tasks";
import { rescheduleTaskSchema } from "@/lib/validation/task";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await apiActor(); const { id } = await params;
    return ok(await rescheduleTask(id, rescheduleTaskSchema.parse(await request.json()), actor));
  } catch (error) { return errorResponse(error); }
}
