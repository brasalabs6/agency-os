---
name: contract-generation
version: "1"
autonomy: "A1/A2"
---

# contract-generation

## Objective
Gerar contrato draft vinculado à proposta exata.

## Allowed AgencyOS tools
- `proposal_get`
- `contract_create_from_proposal`
- `contract_get`
- `contract_update_draft`
- `contract_request_approval`
- `contract_send_approved`

## Workflow
1. Confirme que a Proposal está `ACCEPTED` e passe exatamente seu `proposalVersion` ao criar o contrato.
2. Selecione template/version corretos.
3. Preencha partes, escopo, payment, revisões, suporte, PI e responsabilidades.
4. Sinalize campos/políticas faltantes; não invente termos.
5. Releia o contrato DRAFT, use seu `version` como `expectedVersion` e solicite revisão humana/jurídica antes do envio; depois disso o conteúdo da revisão fica imutável.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Contract draft versionado, aprovado por humano e enviado como versão imutável.
