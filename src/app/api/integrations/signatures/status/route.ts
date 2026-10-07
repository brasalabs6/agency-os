import { created,errorResponse } from "@/lib/services/http";
import { authorizeSignatureWebhook } from "@/lib/auth/integration-auth";
import { contractSignatureSchema } from "@/lib/validation/automation";
import { updateContractSignature } from "@/lib/services/sales-automation";
export async function POST(request:Request){try{const actor=authorizeSignatureWebhook(request);const body=await request.json();const contractId=String(body.contractId??"");const signature=contractSignatureSchema.parse(body);return created(await updateContractSignature(contractId,signature,actor,"signature_webhook"));}catch(error){return errorResponse(error);}}
