---
name: whatsapp-conversation-analysis
version: "1"
autonomy: "A0"
---

# whatsapp-conversation-analysis

## Objective
Entender conversa sincronizada sem enviar mensagens.

## Allowed AgencyOS tools
- `whatsapp_conversation_get`
- `whatsapp_messages_list`
- `lead_get`

## Workflow
1. Leia a thread em ordem.
2. Resuma necessidades, objeções, decisores, compromissos e perguntas abertas.
3. Detecte opt-out e linguagem explícita de consentimento/follow-up.
4. Separe declarações do cliente de inferências.
5. Sugira próxima ação sem executá-la.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Resumo estruturado fiel à conversa, com opt-out e compromissos identificados.
