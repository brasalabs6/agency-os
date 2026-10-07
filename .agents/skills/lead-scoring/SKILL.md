---
name: lead-scoring
version: "1"
autonomy: "A1"
---

# lead-scoring

## Objective
Priorizar o lead usando score multidimensional e oportunidade recomendada.

## Allowed AgencyOS tools
- `lead_get`
- `lead_diagnostic_get`
- `lead_score_assessment_get`
- `lead_score_assessment_create`

## Workflow
1. Leia perfil, diagnóstico e evidências.
2. Atribua somente pontuações sustentadas pela rubrica.
3. Reduza confidence quando dados forem incompletos.
4. Explique reasons e recommendedService.
5. Não fabrique potencial econômico ou urgência.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
ScoreAssessment 0–100 persistido e projetado no lead com justificativas.
