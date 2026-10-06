import { apiActor, errorResponse, ok } from "@/lib/services/http";
import { reorderTasks } from "@/lib/services/tasks";
import { reorderTasksSchema } from "@/lib/validation/task";

export async function POST(request: Request) {
  try {
    const actor = await apiActor();
    const input = reorderTasksSchema.parse(await request.json());
    return ok({ items: await reorderTasks(input.items, actor) });
  } catch (error) { return errorResponse(error); }
}
