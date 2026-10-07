---
name: sales-prioritization
version: "1"
autonomy: "A0"
---

# sales-prioritization

## Objective
Identificar a fronteira executável de vendas do dia.

## Allowed AgencyOS tools
- `pipeline_summary`
- `leads_search`
- `lead_tasks_list`
- `calendar_list`
- `proposal_list`
- `approval_request_list`

## Workflow
1. Colete vencidos, today, sem next action, propostas e approvals.
2. Considere score, estágio, promessa de follow-up e recência.
3. Ordene ações por impacto/urgência real.
4. Não altere CRM nesta skill salvo solicitação explícita.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Brief curto com leads priorizados, ação recomendada e razão.
