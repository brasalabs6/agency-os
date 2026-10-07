import { errorResponse,created } from "@/lib/services/http";
import { authorizeWhatsAppIngest } from "@/lib/auth/integration-auth";
import { whatsappIngestSchema } from "@/lib/validation/automation";
import { ingestWhatsAppConversation } from "@/lib/services/communications";
export async function POST(request:Request){try{const actor=authorizeWhatsAppIngest(request);const input=whatsappIngestSchema.parse(await request.json());return created(await ingestWhatsAppConversation(input,actor,"whatsapp_external_ingest"));}catch(error){return errorResponse(error);}}
