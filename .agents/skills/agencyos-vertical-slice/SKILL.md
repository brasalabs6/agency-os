---
name: agencyos-vertical-slice
description: Implement AgencyOS features using the project's established vertical-slice architecture without inventing new layers or bypassing domain services.
---

# AgencyOS Vertical Slice

## Purpose

Provide the default recipe for implementing a feature end-to-end in AgencyOS.

Use this when adding a new business capability that may touch domain types, validation, persistence, services, API/MCP, UI and tests.

The goal is consistency: new code should look like it belongs to the existing system.

## Core architecture

AgencyOS uses this direction of dependency:

```text
Server Page / Client Component / MCP
                ↓
             Service
                ↓
      Repository interface
                ↓
       Mock | PostgreSQL
```

For browser writes:

```text
Client Component
      ↓
    /api/*
      ↓
     Zod
      ↓
  apiActor()
      ↓
   Service
      ↓
 Repository
```

Rules from `AGENTS.md` still apply:

- UI, API and MCP do not bypass services;
- repositories do not own business policy;
- MCP never receives raw SQL;
- domain invariants apply regardless of caller.

## Step 1 — Classify the feature

Before creating files, identify which concerns actually change.

Use this checklist:

```text
[ ] domain types / constants
[ ] pure domain rule/helper
[ ] validation
[ ] repository contract
[ ] mock repository
[ ] postgres repository
[ ] service/domain command
[ ] REST API
[ ] MCP tool
[ ] Server Component page
[ ] Client Component interaction
[ ] database migration
[ ] tests
```

Do not create every layer mechanically. Add only the layers required by the behavior.

## Step 2 — Find the closest existing slice

Before coding, inspect the nearest analogue.

Examples:

- lead mutations: `src/lib/services/leads.ts`
- task mutations: `src/lib/services/tasks.ts`
- REST routes: `src/app/api/leads/**`, `src/app/api/tasks/**`
- validation: `src/lib/validation/lead.ts`, `task.ts`
- repository abstraction: `src/lib/repositories/*-repository.ts`
- server pages: `src/app/(app)/**/page.tsx`
- client interactions: `src/components/lead-actions.tsx`, `tasks-workspace.tsx`
- domain helpers: `src/lib/domain/status.ts`, `task.ts`

Prefer adapting the established shape over inventing a new local architecture.

## Step 3 — Define domain vocabulary first

If the feature introduces new concepts, define stable domain vocabulary before UI.

Examples:

- enum-like arrays / union types;
- command names;
- statuses;
- priorities;
- activity types;
- audit action names.

Put domain vocabulary in `src/lib/domain/types.ts` or focused domain modules.

Avoid UI-only string values that later become backend state.

## Step 4 — Separate pure rules from orchestration

Pure rules belong in `src/lib/domain/*`.

Examples:

```ts
canTransition(...)
canContact(...)
effectiveTaskDate(...)
pickNextTask(...)
```

Service orchestration belongs in `src/lib/services/*`.

Services may:

- load entities;
- call pure domain rules;
- validate relationships;
- call repositories;
- record activity/audit;
- synchronize derived state.

## Step 5 — Define transport validation

Use Zod in `src/lib/validation/*` for external shapes.

Validate:

- required/optional fields;
- primitive types;
- UUID/date/URL/email format;
- length/range;
- known enum values.

Do not force relational/business checks into Zod.

Example distinction:

```text
Zod:
ownerId must be a UUID

Service:
ownerId must belong to an active user
```

## Step 6 — Add persistence only through repository contracts

If new persistence behavior is required:

1. extend/create repository interface;
2. implement mock behavior;
3. implement PostgreSQL behavior;
4. wire selector in `src/lib/repositories/index.ts`;
5. test the contract/important behavior.

Services import repository selectors/interfaces, never concrete Postgres/mock instances.

## Step 7 — Implement a semantic service command

Prefer business verbs:

```text
completeTask()
cancelTask()
moveLeadStage()
recordContact()
revokeCredential()
```

Avoid generic updates for state changes that have business meaning.

A write command usually follows:

```text
load current state
→ assert invariants
→ validate related entities
→ persist with expectedVersion when applicable
→ record activity
→ record audit
→ synchronize derived state
→ return result
```

Use the `agencyos-domain-command` recipe for details.

## Step 8 — Expose the correct boundary

### Server-rendered read

A Server Component can call a service directly.

Do not call your own REST API from a Server Component merely to retrieve app data.

### Browser mutation

A Client Component calls an `/api/*` route.

The route authenticates, parses input and calls the service.

### MCP

MCP tools call the same services as the UI/API.

Do not duplicate domain behavior in MCP handlers.

## Step 9 — Build UI from existing primitives

Prefer:

- `PageHeader`
- `ModalShell`
- `EmptyState`
- existing badge components
- classes from `ui-kit.tsx`
- CSS variables/tokens already used in the app.

Before adding a new primitive, search for an existing equivalent.

## Step 10 — Add tests by layer

Minimum useful coverage:

- new pure rule → domain unit test;
- repository behavior → mock repository test;
- security/auth invariant → positive + negative/isolation tests;
- bug fix → regression test when feasible.

Do not depend on production Supabase for normal unit tests.

## File-shape example

A moderately sized feature could look like:

```text
src/lib/domain/types.ts
src/lib/domain/<feature>.ts
src/lib/validation/<feature>.ts
src/lib/repositories/<feature>-repository.ts
src/lib/repositories/mock-<feature>-repository.ts
src/lib/repositories/postgres-<feature>-repository.ts
src/lib/services/<feature>.ts
src/app/api/<feature>/route.ts
src/app/(app)/<feature>/page.tsx
src/components/<feature>-workspace.tsx
tests/<feature>-rules.test.ts
tests/mock-<feature>-repository.test.ts
drizzle/NNNN_<feature>.sql  # only if schema changes
```

This is an example, not a requirement to create every file.

## Anti-patterns

Do not:

- query Postgres directly from a React component or API route;
- put DNC/status/task transition rules only in UI;
- call internal REST APIs from Server Components for ordinary app reads;
- create a generic `updateEverything()` for semantic transitions;
- let Postgres implementation define behavior not represented by the repository contract;
- duplicate a service's business logic inside MCP;
- add global state management when local state + server refresh is enough;
- create a database migration for state that is already derived from existing data.

## Completion checklist

```text
[ ] Closest existing slice inspected
[ ] Domain vocabulary reused/extended consistently
[ ] Pure rules separated from orchestration
[ ] External input validated at boundary
[ ] Services remain the domain authority
[ ] Repository abstraction preserved
[ ] Writes use semantic commands
[ ] Actor/audit/version requirements preserved
[ ] UI uses existing primitives/tokens
[ ] Tests added at the appropriate layer
[ ] No unnecessary layer was introduced
```

## Related recipes

- `agencyos-api-route`
- `agencyos-domain-command`
- `agencyos-repository-adapter`
- `agencyos-server-page`
- `agencyos-client-mutation`
- `agencyos-testing-recipe`
