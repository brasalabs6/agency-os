---
name: client-onboarding
version: "1"
autonomy: "A1/A2"
---

# client-onboarding

## Objective
Iniciar execução após contrato assinado e criar dependências do cliente.

## Allowed AgencyOS tools
- `client_projects_list`
- `lead_task_create`
- `project_obligation_update`
- `approval_request_create`

## Workflow
1. Leia obrigações abertas.
2. Separe tarefas da agência de WAITING_CLIENT.
3. Crie checklist/kickoff e tarefas internas.
4. Solicitações ao cliente são drafts com approval.
5. Atualize obrigações quando inputs chegarem.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Projeto inicia com responsáveis, dependências e próximo marco explícitos.
