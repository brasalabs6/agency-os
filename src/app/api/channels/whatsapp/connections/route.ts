import { apiActor, created, errorResponse, ok } from "@/lib/services/http";
import { channelConnectionCreateSchema } from "@/lib/validation/automation";
import { createChannelConnection, listChannelConnections } from "@/lib/services/communications";
export async function GET(){try{await apiActor();return ok(await listChannelConnections());}catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{const actor=await apiActor();return created(await createChannelConnection(channelConnectionCreateSchema.parse(await request.json()),actor));}catch(error){return errorResponse(error);}}
