import { apiActor, created, errorResponse } from "@/lib/services/http";
import { whatsappIngestSchema } from "@/lib/validation/automation";
import { ingestWhatsAppConversation } from "@/lib/services/communications";
export async function POST(request:Request){try{const actor=await apiActor();return created(await ingestWhatsAppConversation(whatsappIngestSchema.parse(await request.json()),actor));}catch(error){return errorResponse(error);}}
