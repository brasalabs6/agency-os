---
name: contract-obligations
version: "1"
autonomy: "A1"
---

# contract-obligations

## Objective
Transformar contrato assinado em obrigações executáveis.

## Allowed AgencyOS tools
- `contract_get`
- `project_create_from_contract`
- `client_projects_list`
- `project_obligation_update`

## Workflow
1. Confirme status SIGNED e artifact/version.
2. Crie projeto idempotente por contractId.
3. Gere deliverables, agency/client responsibilities, payments e support obligations.
4. Não use draft/sent como fonte.
5. Mantenha vínculo sourceContractId.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Projeto contém obrigações derivadas exclusivamente do contrato assinado.
