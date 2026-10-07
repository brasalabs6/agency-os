---
name: whatsapp-assisted-outreach
version: "1"
autonomy: "A2"
---

# whatsapp-assisted-outreach

## Objective
Enviar WhatsApp somente após aprovação humana do payload exato.

## Allowed AgencyOS tools
- `lead_get`
- `whatsapp_conversation_get`
- `approval_request_create`
- `approval_request_get`
- `whatsapp_message_send_approved`
- `lead_record_contact`

## Workflow
1. Monte draft usando contexto/evidências.
2. Crie WHATSAPP_SEND approval com to/text/metadata.
3. Aguarde humano aprovar/editar.
4. Execute somente approval APPROVED não expirado.
5. Registre contato e next action após receipt.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Mensagem enviada corresponde ao payload aprovado e possui audit/timeline.
