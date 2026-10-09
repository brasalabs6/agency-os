---
name: conversation-to-crm
version: "1"
autonomy: "A1"
---

# conversation-to-crm

## Objective
Converter conversa em estado operacional do CRM.

## Allowed AgencyOS tools
- `lead_get`
- `lead_add_note`
- `lead_record_contact`
- `lead_set_next_action`
- `lead_task_create`
- `lead_move_stage`

## Workflow
1. Use a análise da conversa, não releia seletivamente.
2. Registre resumo e outcome do contato.
3. Crie next action/task para compromissos explícitos.
4. Mova estágio apenas quando a transição for consequência objetiva.
5. DO_NOT_CONTACT prevalece sobre todo planejamento de contato.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Timeline, tasks e estágio refletem a conversa sem perder contexto.
