---
name: proposal-generation
version: "1"
autonomy: "A1/A2"
---

# proposal-generation

## Objective
Criar proposta versionada a partir de fatos, diagnóstico e qualificação.

## Allowed AgencyOS tools
- `lead_get`
- `lead_diagnostic_get`
- `lead_qualification_get`
- `proposal_create`
- `proposal_update`
- `proposal_request_approval`
- `proposal_send_approved`

## Workflow
1. Selecione serviços ativos e escopo sustentado.
2. Liste exclusões, premissas e dependências.
3. Use apenas pricing aprovado; se ausente, mantenha HUMAN_REQUIRED.
4. Releia a proposta, use seu `version` como `expectedVersion` e solicite approval com delivery target registrado no lead.
5. Envie somente a versão exata aprovada; após `PENDING_APPROVAL`/`SENT`, nunca edite a mesma row — uma mudança comercial exige nova revisão.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Proposal versionada com escopo/preço rastreáveis e status correto.
