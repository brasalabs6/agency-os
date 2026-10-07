---
name: sales-learning
version: "1"
autonomy: "A0"
---

# sales-learning

## Objective
Transformar histórico comercial em recomendações de experimento/política.

## Allowed AgencyOS tools
- `leads_search`
- `pipeline_summary`
- `proposal_list`
- `lead_score_assessment_get`
- `ai_run_list`

## Workflow
1. Agregue conversão por estágio/segmento/score/serviço.
2. Analise motivos de perda e objeções.
3. Compare pricing/manutenção somente quando assignments forem válidos.
4. Diferencie sinal de anedota.
5. Recomende mudanças; não altere política canônica.

## Guardrails
- Preserve sources and distinguish facts from inference.
- Never bypass DO_NOT_CONTACT, optimistic concurrency, approval or scope guards.
- Never store model chain-of-thought; use AiRun summaries/artifact IDs.
- External action follows the autonomy level above and Agency policy.

## Definition of Done
Insights com evidência, limitações e próximos testes recomendados.
