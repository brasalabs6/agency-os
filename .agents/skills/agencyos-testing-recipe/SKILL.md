---
name: agencyos-testing-recipe
description: Add AgencyOS tests at the right layer for domain rules, repositories, security/isolation and regressions while keeping normal CI independent of production infrastructure.
---

# AgencyOS Testing Recipe

## Purpose

Choose the smallest test that proves the invariant at the layer where it belongs.

AgencyOS favors fast deterministic tests using pure domain functions and mock repositories. Normal unit CI must not require production Supabase.

## Test categories

### 1. Pure domain rule tests

Use for functions in `src/lib/domain/*`.

Examples:

- status transitions;
- contact eligibility;
- task ordering;
- overdue/today calculation;
- pipeline grouping.

Pattern:

```ts
describe("lead status rules", () => {
  it("keeps terminal status terminal", () => {
    expect(
      canTransition("DO_NOT_CONTACT", "CONTACTED"),
    ).toBe(false);
  });
});
```

These should be small, explicit and exhaustive around boundary cases.

## 2. Mock repository behavior tests

Use when adding/changing repository semantics.

Examples:

- filtering;
- duplicate detection;
- create/update;
- version increments;
- revocation;
- expiration;
- owner visibility.

Pattern:

```ts
const repo = new MockThingRepository();

const created = await repo.create(...);
const loaded = await repo.getById(created.id);

expect(loaded).toMatchObject(...);
```

Mock tests should exercise behavior that the service relies on, not internal implementation details.

## 3. Security/auth/isolation tests

For security-sensitive behavior, test more than the success path.

Minimum pattern:

```text
positive
negative
isolation
revocation/terminal behavior
```

Example for per-user MCP:

```text
credential A resolves to user A
credential B resolves to user B
revoke A
A fails
B still succeeds
```

Use synthetic identities/secrets. Never use production credentials in fixtures.

## 4. Service/domain command tests

Add when a command combines meaningful invariants that pure helpers/repository tests do not prove.

Good targets:

- DNC blocks contact task;
- terminal task cannot be reopened;
- version conflict is surfaced;
- command updates derived next action;
- user deactivation revokes dependent credentials.

Prefer injecting/using the mock repository path rather than a live DB.

## 5. Regression tests

When fixing a bug, ask:

```text
Can a deterministic test reproduce the old failure?
```

If yes:

1. write the failing scenario;
2. apply the fix;
3. prove the regression stays fixed.

Examples:

- query alias resolution;
- duplicate matching edge case;
- transition incorrectly allowed;
- cross-user revocation.

Infrastructure-only failures may instead require CI/smoke checks rather than unit tests.

## 6. API route tests

Do not create route tests merely to duplicate Zod/service tests.

API-level tests are valuable when the transport contract itself is important:

- status code mapping;
- auth boundary;
- CSRF/origin behavior;
- unusual empty-body handling;
- externally consumed response shape.

For ordinary internal CRUD, service/domain coverage plus build/smoke may be enough.

## 7. UI tests

The current project does not rely on a broad browser-component test suite.

Add UI tests selectively for behavior that cannot be adequately proven by domain/client logic and is valuable enough to justify the maintenance cost.

Do not introduce a large testing framework for a single trivial component.

Critical production flows can be protected by smoke/E2E at the release layer.

## File naming

Use focused test files under `tests/`.

Examples:

```text
tests/status.test.ts
tests/task-rules.test.ts
tests/mock-repository.test.ts
tests/mock-task-repository.test.ts
tests/mcp-user-auth.test.ts
```

Prefer behavior-oriented names over mirroring every source filename.

## Test data

Use:

- synthetic names;
- reserved/example domains;
- deterministic UUIDs where useful;
- generated/random secrets only inside test process.

Do not copy real lead/customer/user data into tests.

## Time-sensitive logic

Pass `now` into pure helpers when supported rather than relying on wall-clock timing.

Example:

```ts
isTaskToday(task, fixedNow)
```

For timezone behavior, assert the operational timezone semantics explicitly.

Avoid sleeps in unit tests.

## Error assertions

Prefer machine-stable fields:

```ts
await expect(operation()).rejects.toMatchObject({
  code: "MCP_CREDENTIAL_INVALID",
  status: 403,
});
```

Do not depend only on exact human-readable message strings when a stable domain code exists.

## Mock vs Postgres parity

When a new repository behavior is important:

- write the semantics against the mock;
- inspect the PostgreSQL implementation for parity;
- add DB/integration coverage only if the risk justifies infrastructure complexity.

The mock must not deliberately “cheat” around an invariant the service depends on.

## CI expectation

Tests run as part of the Quality Gate:

```text
npm test
```

A test suite change is not complete until the repository Quality Gate passes.

Do not weaken or skip tests to unblock a PR without explicit justification.

## Recipe by change type

```text
New pure rule
→ pure unit test

New repository behavior
→ mock repository test

New auth/security behavior
→ positive + negative + isolation

New domain command
→ rule/service test around invariant

Bug fix
→ regression test when reproducible

CI/deploy behavior
→ workflow/run/smoke validation
```

## Review checklist

```text
[ ] Test is at the correct layer
[ ] Test proves behavior, not implementation trivia
[ ] No production infrastructure required for normal unit run
[ ] Security change has negative/isolation coverage
[ ] Bug fix has regression coverage when practical
[ ] Stable DomainError code asserted when relevant
[ ] Test data is synthetic/public-safe
[ ] No wall-clock sleeps
[ ] Full Quality Gate passes
```

## Reference examples

- `tests/status.test.ts`
- `tests/task-rules.test.ts`
- `tests/mock-repository.test.ts`
- `tests/mock-task-repository.test.ts`
- `tests/mcp-user-auth.test.ts`
- `tests/mock-mcp-credential-repository.test.ts`
