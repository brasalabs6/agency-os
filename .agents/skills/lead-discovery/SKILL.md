---
name: lead-discovery
version: "1"
autonomy: "A1"
---

# lead-discovery

## Objective
Encontrar empresas alinhadas ao ICP e criar/enriquecer leads sem duplicação.

## Allowed AgencyOS tools
- `prospecting_run_create`
- `leads_search`
- `leads_upsert`
- `lead_add_evidence`
- `ai_run_start`
- `ai_run_finish`

## Workflow
1. Defina ICP, região, fontes e limite no Prospecting Run.
2. Pesquise somente fontes públicas e preserve URLs/evidências.
3. Pesquise o CRM antes de criar; use upsert/deduplicação.
4. Registre rejeitados e duplicados nos counters.
5. Nunca contate o lead nesta skill.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Leads importados possuem identidade suficiente para dedupe, fonte pública e evidência; o run termina com counters auditáveis.
