# Production database migrations — AgencyOS

The Vercel Git integration deploys `main` automatically; it **does not run
Drizzle/Supabase SQL against the live PostgreSQL database**.

This repository has two migration histories:

- Supabase already contains the original schema migrations that correspond
  to `drizzle/0000`–`0007`. Do **not** replay these on production.
- `drizzle/0008_ai_commercial_automation.sql` is the first commercial-module
  migration. New sequential `drizzle/0009_*.sql`, `0010_*.sql` etc. are
  handled by `scripts/production-migrations.mjs`.

## Safeguards

The runner is transaction-based, uses a PostgreSQL advisory transaction lock,
checks immutable SHA-256 digests and contiguous numbering, and refuses
destructive DROP/TRUNCATE/DELETE statements. It will never silently run
a changed migration or replay preexisting `0000`–`0007`.

Migrations on the actual database are **not authorized merely by a merge**:
they additionally require a fresh, independently recoverable backup reference
verified within the last 24h; the executor refuses to apply without it.

The production project was **Supabase Free** as of 2026-10-09. There are
no automatic daily backups on that tier. Obtain and verify a logical offsite
backup, using Supabase's supported `db dump` workflow (or `pg_dump` through
a secure operator terminal), and test restoration in a disposable database.
Do not upload dump files or database credentials to the public repository or
CI artifacts. The `production-db` reviewer must confirm the backup/reference
and its restoration procedure.

## GitHub setup (one time)

1. Create a protected GitHub Environment called `production-db` with
   **required reviewers**. Limit deployments to `main`.
2. Add Environment secret `AGENCYOS_MIGRATION_DATABASE_URL` containing a
   database URL with appropriate DDL permissions and TLS. Do not use an
   anonymous connection; prefer a dedicated short-lived migration credential.
3. Do not enable `AGENCYOS_MIGRATIONS_AUTO_APPLY` until backup verification
   is automated or a responsible reviewer verifies a fresh backup for every
   execution. By default, successful main CI only triggers read-only `plan`.
4. Each deployment must observe `AI_COMMERCIAL_AUTOMATION_ENABLED=false`
   until the target schema is verified.

## First-time production activation (manual)

1. Confirm backup/restoration, then apply migration 0008 using the approved
   Supabase migration facility (or this runner in `apply` mode). Verify all
   14 tables, RLS, indexes, credentials and original data counts.
2. If 0008 was already applied via the Supabase connector, an empty runner
   ledger is expected. For the first run, provide
   `ADOPT_EXISTING_MIGRATION_0008=true` only after the runner's structural
   verification succeeds. Its first `apply` run records the known checksum
   **without rerunning** the original SQL.
3. In GitHub Actions → **Production Database Migrations** → **Run workflow**,
   choose `plan`. Examine expected operations. For `apply`, set the
   offsite backup reference, verification time in ISO UTC, and request the
   protected environment's approval. The workflow will fail closed without
   those inputs, a configured database secret or the approved environment.
4. Verify database migration ledger and project health; enable
   `AI_COMMERCIAL_AUTOMATION_ENABLED=true` in Vercel production and redeploy.
   Keep outbound WhatsApp and signature integrations off until their own
   approved provider verifications are implemented.
5. Run read-only user/MCP tests and UI smoke before the first write action.

## Automated future flow

A successful `CI` push to `main` starts this workflow. The default mode is
**plan**. Once offsite backups and reviewers are operational, operators can
enable GitHub Environment variable `AGENCYOS_MIGRATIONS_AUTO_APPLY=true`,
provide `AGENCYOS_BACKUP_REFERENCE` and
`AGENCYOS_BACKUP_VERIFIED_AT`, and keep required reviewers enforced.
Without a recent verified backup the workflow refuses all SQL writes.

Every new schema change should follow **expand → deploy compatible code →
activate → contract later**. Never run breaking DROP/RENAME migrations in an
automated release. Keep the new feature disabled until compatible schema is
present. Do not assume Vercel and GitHub Actions deploy at the same instant.

## On-call diagnosis

- Dry-run: `node scripts/production-migrations.mjs plan`
- Approved execution: `node scripts/production-migrations.mjs apply`
- Tests: `node --test scripts/production-migrations.test.mjs`

Expected environment values:
`DATABASE_URL` (secret), `PRODUCTION_BACKUP_REFERENCE`,
`PRODUCTION_BACKUP_VERIFIED_AT`, `PRODUCTION_MIGRATION_APPROVED=true`.
For local CI-only PostgreSQL without TLS, `MIGRATION_DB_SSL=disable`; **never
disable TLS for production**.

If a migration fails inside its transaction, the PostgreSQL transaction rolls
back and the existing schema/data remain unchanged. Do not automatically
rollback a previously committed schema: repair using a reviewed forward
migration. Backup restoration is a separate operational last resort.
