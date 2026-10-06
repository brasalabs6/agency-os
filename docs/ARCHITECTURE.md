# Architecture

## Regra principal

```text
Web UI ─────┐
REST API ───┼──> Domain Services ──> LeadRepository ──> Mock | PostgreSQL
Remote MCP ─┘
```

Nenhum adaptador de entrada contém regras essenciais de pipeline. Isso evita divergência entre alterações feitas por humanos e por agentes.

## Domain Services

`src/lib/services/leads.ts` concentra:

- deduplicação/upsert;
- update com optimistic concurrency;
- state transition guard;
- do-not-contact guard;
- activity creation;
- evidence creation;
- next action;
- contact recording;
- outcomes;
- audit log.

## Repository boundary

`LeadRepository` define a interface de persistência. Existem dois adapters:

- `MockLeadRepository`: memória, útil para bootstrap e demonstração;
- `PostgresLeadRepository`: Drizzle/PostgreSQL.

A interface não depende do MCP ou React.

## Segurança

- App web: sessão assinada, trocável por SSO.
- MCP: Bearer token em dev ou JWT/OAuth em produção.
- Scopes: `leads.read` e `leads.write`.
- Sem SQL arbitrário para agentes.
- `expectedVersion` reduz lost updates entre humano e agente.
- `DO_NOT_CONTACT` é verificado no service, não só na UI.

## Auditabilidade

`lead_activities` representa o histórico visível do lead.

`audit_logs` representa as operações técnicas executadas, incluindo tool MCP, actor, input e resultado resumido.

Não é armazenado chain-of-thought do modelo.

## Tasks and calendar

`LeadTask` is a lead-scoped domain entity with its own repository (`TaskRepository`) and service (`src/lib/services/tasks.ts`). The same service is consumed by REST, UI and MCP. The lead's legacy `nextAction`, `nextActionAt` and `nextActionOwner` fields are compatibility projections derived from the highest-priority active task according to the task ordering rules.

Task dates are stored as UTC timestamps. Operational day boundaries use `America/Sao_Paulo` by default through `src/lib/domain/time.ts`. Calendar reads are interval-bounded and never load the entire task table.
