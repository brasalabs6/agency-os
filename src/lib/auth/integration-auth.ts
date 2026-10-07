import { DomainError } from "@/lib/domain/errors";
import type { ActorContext } from "@/lib/domain/types";

export function authorizeWhatsAppIngest(request: Request): ActorContext {
  const expected=process.env.WHATSAPP_INGEST_TOKEN;
  if(!expected)throw new DomainError("WhatsApp ingest token is not configured","WHATSAPP_INGEST_CONFIG_ERROR",500);
  const authorization=request.headers.get("authorization");
  if(authorization!=="Bearer "+expected)throw new DomainError("Invalid WhatsApp ingest token","WHATSAPP_INGEST_UNAUTHORIZED",401);
  return {type:"SYSTEM",id:"whatsapp-ingest",name:"WhatsApp Sync Gateway",scopes:["conversations.write"]};
}


export function authorizeSignatureWebhook(request: Request): ActorContext {
  const expected=process.env.SIGNATURE_WEBHOOK_TOKEN;
  if(!expected)throw new DomainError("Signature webhook token is not configured","SIGNATURE_WEBHOOK_CONFIG_ERROR",500);
  const authorization=request.headers.get("authorization");
  if(authorization!=="Bearer "+expected)throw new DomainError("Invalid signature webhook token","SIGNATURE_WEBHOOK_UNAUTHORIZED",401);
  return {type:"SYSTEM",id:"signature-webhook",name:"Signature Provider",scopes:["contracts.draft"]};
}
