---
name: digital-presence-diagnostic
version: "1"
autonomy: "A1"
---

# digital-presence-diagnostic

## Objective
Gerar diagnóstico interno e público baseado em evidências.

## Allowed AgencyOS tools
- `lead_get`
- `business_profile_get`
- `lead_diagnostic_create`
- `lead_diagnostic_update`
- `lead_diagnostic_finalize`
- `lead_add_evidence`

## Workflow
1. Audite website, mobile, local presence, conversão, confiança, técnico e social.
2. Transforme observações em strengths/gaps com severity/confidence.
3. Associe evidenceIds e não trate gosto visual como fato.
4. Marque publicSafe somente quando a conclusão for apropriada para o cliente.
5. Finalize o diagnóstico para gerar versão renderizada.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Diagnóstico READY com scorecards, lacunas, recomendações e evidência rastreável.
