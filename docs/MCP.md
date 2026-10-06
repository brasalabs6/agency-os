# Remote MCP

O MCP fica em `/mcp` e é construído com o SDK TypeScript oficial.

## Fluxo

1. O cliente autentica via Bearer.
2. `authorizeMcpRequest` resolve um `ActorContext` e scopes.
3. O handler instancia `buildMcpServer(actor)`.
4. A tool valida input com Zod.
5. A tool chama os mesmos services utilizados pela interface.
6. O service aplica guards, persiste alterações, activity e audit.
7. O resultado é devolvido ao host MCP.

## Recomendações para ChatGPT

Conecte o endpoint HTTPS implantado, não `localhost`.

Para desenvolvimento privado, `MCP_AUTH_MODE=token` é a configuração mais simples. Para produção e múltiplos usuários, utilize OAuth/JWT com um IdP e configure os três campos `MCP_OAUTH_*`.

Ao pesquisar leads externamente, o agente deve:

1. procurar duplicatas com `leads_search`;
2. usar `leads_upsert` em lotes de até 50;
3. preservar URLs de origem;
4. adicionar claims verificáveis com `lead_add_evidence`;
5. distinguir fatos de inferências;
6. definir próxima ação quando fizer sentido;
7. nunca contatar `DO_NOT_CONTACT`.

## Lead Tasks & Calendar

Tasks are first-class CRM domain objects and are always scoped to a lead. Agents use the same task service as the web UI and REST API.

Additional tools:

- `lead_tasks_list` — filter tasks by lead, owner, state, priority, type and dates.
- `lead_task_get` — fetch one task with lead context and version.
- `lead_task_create` — create task/call/follow-up/meeting/research/proposal work.
- `lead_task_update` — edit active task fields or move TODO -> DOING.
- `lead_task_complete` — complete an active task.
- `lead_task_cancel` — cancel an active task.
- `lead_task_reschedule` — change deadline or start/end.
- `lead_tasks_reorder` — set explicit sort order.
- `calendar_list` — list scheduled tasks in a bounded date range.

Rules enforced for agents and humans:

- `CALL`, `FOLLOW_UP` and `MEETING` creation/rescheduling is blocked for `DO_NOT_CONTACT` leads.
- writes support optimistic concurrency through `expectedVersion`.
- terminal tasks cannot be reopened or rescheduled.
- all writes generate lead timeline activity and audit records.
- active tasks automatically derive the lead `nextAction` compatibility fields.
