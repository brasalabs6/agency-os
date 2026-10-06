import { NextRequest } from "next/server";
import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { createTask, listTasks } from "@/lib/services/tasks";
import { createTaskSchema, taskQuerySchema } from "@/lib/validation/task";

export async function GET(request: NextRequest) {
  try {
    await apiActor();
    const parsed = taskQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    return ok(await listTasks(parsed));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await apiActor();
    return created(await createTask(createTaskSchema.parse(await request.json()), actor));
  } catch (error) { return errorResponse(error); }
}
