# Production incident: Supavisor session pool exhaustion (2026-10-14)

## Impact and evidence

The AgencyOS production deployment was READY on the correct `main` commit, but authenticated routes
failed around 21:42 UTC. Vercel runtime errors on the home and lead detail pages showed:

```
EMAXCONNSESSION: max clients reached in session mode
max clients are limited to pool_size: 15
```

Read-only `pg_stat_activity` inspection found **15 Supavisor backend connections**, all idle, while
the Supabase project itself was healthy. This is a client/pool allocation problem, **not**
evidence of slow lead queries or a schema migration error.

## Root cause

Before this incident, `src/lib/db/client.ts` rewrote any Supavisor transaction pooler URL
(port 6543) to session mode (port 5432) to avoid a documented pipelining incompatibility with
`postgres.js`. That rewrite was already present before the Conversation Script Graphs release.
In Vercel serverless, every warm function instance can open its own session connection.
Session-mode Supavisor caps combined clients per role/database to the backend pool size
(15 in this project), rejecting new database connections and causing 5xx responses.

Even `max: 1` per function does not bound the aggregate number of warm instances.

## Proposed correction

- Replace `postgres.js` with non-pipelining `node-postgres`, retaining Drizzle ORM.
- Use Supavisor **transaction pooling**, port 6543, for Supavisor URLs in Vercel;
  preserve local and direct Postgres endpoints.
- Use a small local pool (`max: 1`), bounded checkout/query timeouts, idle recycling.
- Do not use prepared statements requiring session affinity or per-session state.
- Keep schema, RLS, user data, MCP scopes and feature flags unchanged.

## Release and verification

1. Require committed npm lockfile, dependency audit, lint, typecheck, tests,
   Next.js production build, Chromium E2E and real PostgreSQL driver/transaction smoke.
2. Inspect Vercel Preview deployment against the correct SHA and health responses.
3. Merge only after checks succeed and verify GitHub CI `push/main` passes.
4. Verify production `/api/health` returns `200`, `database: ok`, correct commit.
5. Probe one authenticated lead and one dashboard read; inspect Vercel runtime errors.
6. Recheck Supavisor connections after simulated concurrent traffic.
7. Add continuous health-check alerting: one-time post-deploy smoke previously passed,
   despite the later exhaustion.

### Rollback

Revert application deployment and database adapter if necessary; this may reintroduce
the session-pool bottleneck. Database schema and credentials do not change.

### Unverified contributors

Production and preview have separate Vercel `DATABASE_URL` secrets. Without inspecting
secret plaintext we did not confirm whether they target the same database/pool.
