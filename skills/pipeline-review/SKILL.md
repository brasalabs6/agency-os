---
name: pipeline-review
version: "1"
autonomy: "A0/A1"
---

# pipeline-review

## Objective
Auditar saúde e consistência do pipeline.

## Allowed AgencyOS tools
- `pipeline_summary`
- `leads_search`
- `lead_tasks_list`
- `approval_request_list`
- `proposal_list`
- `contract_list`

## Workflow
1. Procure leads parados, sem next action e tasks vencidas.
2. Ache diagnostics/proposals/approvals sem continuação.
3. Detecte duplicatas/estágios incoerentes.
4. Crie cleanup tasks apenas para achados verificáveis.
5. Não mude políticas comerciais.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Relatório priorizado de bloqueios/inconsistências e ações corretivas.
