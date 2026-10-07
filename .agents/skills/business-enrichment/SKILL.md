---
name: business-enrichment
version: "1"
autonomy: "A1"
---

# business-enrichment

## Objective
Construir um snapshot verificável do negócio e sua presença pública.

## Allowed AgencyOS tools
- `lead_get`
- `business_profile_get`
- `business_profile_snapshot_create`
- `lead_add_evidence`
- `ai_run_start`
- `ai_run_finish`

## Workflow
1. Leia o lead e evidências existentes.
2. Pesquise identidade, segmento, contatos, unidades, serviços, horários e canais públicos.
3. Classifique cada dado como FACT, INFERENCE ou UNKNOWN.
4. Registre fonte/data/confiança para fatos materiais.
5. Crie novo snapshot em vez de sobrescrever histórico.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
BusinessProfile versionado salvo com fontes, incertezas explícitas e dados úteis para diagnóstico.
