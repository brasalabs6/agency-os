---
name: lead-qualification
version: "1"
autonomy: "A1/A2"
---

# lead-qualification

## Objective
Manter discovery/qualificação estruturada.

## Allowed AgencyOS tools
- `lead_get`
- `lead_qualification_get`
- `lead_qualification_update`
- `approval_request_create`

## Workflow
1. Mapeie problema, desired outcome, processo atual, urgência, decisores, constraints e unknowns.
2. Budget só entra se explicitamente informado.
3. Perguntas externas devem ser draft/approval quando enviadas por canal.
4. Não transforme hipótese em requisito.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Qualification versionada com unknowns e service fit claros.
