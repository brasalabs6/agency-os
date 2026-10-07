---
name: agencyos-repository-adapter
description: Add or extend AgencyOS persistence through repository interfaces with matching mock and PostgreSQL adapters while keeping services storage-agnostic.
---

# AgencyOS Repository Adapter

## Purpose

Preserve the application's persistence boundary.

Services should express what data operation they need without knowing whether data comes from mock memory or PostgreSQL.

## Current pattern

```text
LeadRepository
├── MockLeadRepository
└── PostgresLeadRepository

TaskRepository
├── MockTaskRepository
└── PostgresTaskRepository

AuthRepository
├── MockAuthRepository
└── PostgresAuthRepository

McpCredentialRepository
├── MockMcpCredentialRepository
└── PostgresMcpCredentialRepository
```

Selection happens through:

```text
src/lib/repositories/index.ts
```

using `DATA_DRIVER`.

## Dependency rule

Services may import:

```ts
getLeadRepository()
getTaskRepository()
getAuthRepository()
getMcpCredentialRepository()
```

They should not import:

```ts
postgresLeadRepository
mockLeadRepository
getDb()
```

Concrete adapters stay behind the selector.

## Recipe for new persistence capability

### 1. Start from service needs

Define the smallest operation contract the service requires.

Examples:

```ts
interface TaskRepository {
  search(filters: TaskSearchFilters): Promise<TaskSearchResult>;
  getById(id: string): Promise<LeadTaskView | null>;
  create(input: CreateTaskRepositoryInput): Promise<LeadTaskView>;
  update(id: string, input: UpdateTaskRepositoryInput): Promise<LeadTaskView | null>;
}
```

Prefer domain-shaped methods over database-shaped methods.

Do not expose arbitrary query builders through repository interfaces.

## 2. Keep repository inputs persistence-focused

Repository inputs may include persistence metadata not present in public create inputs.

Example:

```ts
interface CreateTaskRepositoryInput
  extends CreateLeadTaskInput {
  createdByType: ActorType;
  createdById?: string | null;
}
```

The service constructs this after domain decisions.

## 3. Implement mock adapter

The mock is not disposable test junk.

It is part of the project architecture because:

- local/test environments use it;
- CI can exercise services without production DB;
- repository behavior can be tested deterministically.

Mock must preserve relevant semantics:

- version increments;
- filtering;
- active/inactive rules;
- duplicate detection;
- terminal/revocation state where repository-owned;
- deterministic return shape.

Do not intentionally make mock behavior materially different from PostgreSQL behavior.

## 4. Implement PostgreSQL adapter

Postgres adapter owns persistence details:

- Drizzle queries;
- joins;
- row-to-domain mapping;
- timestamps;
- pagination/count queries;
- optimistic update predicates;
- indexes/schema-aware filtering.

It does not own business policy.

Examples of things that belong in service/domain, not Postgres adapter:

- whether DNC can be contacted;
- whether a transition is valid;
- whether terminal tasks may be edited;
- whether a user is authorized to invoke a command.

## 5. Map rows explicitly

Create mapping functions when DB representation differs from domain view.

Examples:

```ts
mapTask(row)
mapCredential(row)
mapUser(row)
```

Normalize:

- Date → ISO string;
- foreign keys → summary objects;
- nullable values;
- DB column names → domain names.

Do not leak Drizzle row types into UI/API contracts.

## 6. Optimistic concurrency

For versioned entities, PostgreSQL update should include the expected version in the WHERE clause when supplied.

Return `null` when the conditional update affects zero rows.

The service distinguishes:

- version conflict;
- entity not found.

Do not throw HTTP/domain errors from the repository for this normal control path.

## 7. Pagination/search

Repository owns data-access filtering mechanics, but filters are domain-defined types.

Return consistent shapes:

```ts
{
  items,
  total,
  limit,
  offset
}
```

Keep limits bounded.

## 8. Register adapter

Update `src/lib/repositories/index.ts`.

Selector pattern:

```ts
export function getThingRepository(): ThingRepository {
  return isPostgresDriver()
    ? postgresThingRepository
    : mockThingRepository;
}
```

Do not use a function name beginning with `use...` for non-React repository selectors; ESLint interprets that as a hook.

## 9. Schema/migration coordination

If PostgreSQL adapter needs new schema:

- update Drizzle schema;
- create numbered SQL migration;
- follow `database-migration-guardian`.

Do not make mock support a feature that production schema cannot represent.

## Tests

At minimum, test important repository semantics using the mock adapter.

Good candidates:

- filtering;
- dedupe;
- create/update;
- version changes;
- revocation isolation;
- expiration;
- owner visibility.

Service/domain tests should not need a live PostgreSQL database.

## Anti-patterns

Do not:

- import concrete repository in service;
- expose `db.execute(sql)` through interface;
- make mock return shapes different from Postgres;
- put business transition rules in SQL adapter;
- return raw DB Date/row objects to UI;
- implement a Postgres-only capability without mock/test strategy unless explicitly justified.

## Completion checklist

```text
[ ] Interface expresses service need
[ ] Mock implementation added/updated
[ ] Postgres implementation added/updated
[ ] Row/domain mapping explicit where needed
[ ] Version semantics match across adapters
[ ] Repository selector wired
[ ] No service imports concrete adapter
[ ] Migration created if schema changed
[ ] Mock repository tests cover important behavior
```
