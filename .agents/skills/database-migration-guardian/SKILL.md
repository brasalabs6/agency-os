---
name: database-migration-guardian
description: Design, apply and verify AgencyOS PostgreSQL/Supabase migrations without exposing data or breaking the currently deployed app.
---

# Database Migration Guardian

## Purpose

Treat schema changes as explicit, observable production operations rather than side effects of code deployment.

Use for PostgreSQL/Supabase schema, index, constraint, RLS, privilege or data-migration work.

## Preconditions

Run `repo-state-recovery`.

Before choosing a migration number inspect:

- every file under `drizzle/`;
- current `src/lib/db/schema.ts`;
- applied Supabase migrations when production matters;
- later hardening migrations that may change grants/RLS/ownership.

Never infer the next migration prefix from memory.

## Procedure

### 1. Define the compatibility window

Identify:

- currently deployed application behavior;
- new application behavior;
- whether old and new code may run concurrently during rollout.

Prefer expand-first changes that allow both versions to function.

### 2. Design the migration

A production migration should be:

- versioned;
- narrowly scoped;
- backward-compatible when possible;
- safe to rerun where practical using `IF EXISTS` / `IF NOT EXISTS`;
- explicit about defaults/nullability;
- explicit about foreign-key delete behavior;
- indexed for intended lookup paths.

Do not hide product logic inside opaque SQL if it belongs in domain services.

### 3. Respect security posture

For tables containing sessions, auth identities, MCP credentials, audit data or other internal state:

- enable RLS where the project model expects it;
- revoke unintended `PUBLIC` privileges;
- revoke `anon` / `authenticated` Data API privileges when direct client access is not intended;
- do not create permissive policies merely to silence an advisor;
- verify the server/database role used by the application can still operate.

### 4. Keep ORM schema aligned

Update `src/lib/db/schema.ts` in the same feature when the application uses the new schema.

SQL migration and ORM schema must represent the same contract.

### 5. Do not auto-push production schema

Never make production depend on:

```text
drizzle-kit push
npm run db:push
schema synchronization during Vercel build
PR workflow applying production SQL
```

Production migration execution remains deliberate.

### 6. Validate migration ordering

Ensure numeric prefixes are:

- unique;
- strictly increasing;
- consistent with current repository state.

If another agent adds a migration while you work, renumber/rebuild yours rather than creating a collision.

### 7. Apply production migration deliberately

When authorized:

1. confirm target Supabase project;
2. re-read latest applied migrations;
3. apply the exact reviewed SQL;
4. record the applied migration name/result.

Do not apply a different locally improvised query than the committed migration unless explicitly documenting why.

### 8. Verify after application

Inspect the live database for:

- table/column existence and types;
- constraints;
- indexes;
- defaults/nullability;
- RLS enabled state;
- grants/privileges;
- expected row/data state;
- security advisor findings;
- performance advisor findings when material.

For credential/session tables, explicitly verify they are not exposed through Data API roles.

### 9. Coordinate rollout

Report separately:

```text
Migration committed:
Migration applied:
Schema verified:
Code deployed:
Feature activated:
E2E verified:
```

Code that references a new table is not fully released until the table exists in the target environment.

### 10. Rollback strategy

Prefer forward fixes over destructive rollback after data has been written.

The spec should state:

- whether old code tolerates the expanded schema;
- whether new columns/tables can remain unused;
- how to disable feature activation without dropping data;
- when a destructive reverse migration would be unsafe.

## Validation examples

### RLS/privilege verification

Check effective privileges for:

- `PUBLIC`;
- `anon`;
- `authenticated`.

Do not assume `ENABLE ROW LEVEL SECURITY` alone prevents every unintended access path.

### Runtime verification

After schema activation, exercise the server path that uses the migration and confirm health/runtime logs.

## Completion criteria

A migration task is complete only when the requested stage is explicit.

For production application, complete means:

- committed SQL;
- applied migration;
- live schema/security verified;
- dependent code compatible;
- remaining activation/E2E status reported.

## Common composition

```text
repo-state-recovery
→ feature-spec-first
→ database-migration-guardian
→ safe-github-delivery
→ cicd-release-guardian
```
