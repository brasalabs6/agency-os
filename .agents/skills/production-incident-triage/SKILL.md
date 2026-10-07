---
name: production-incident-triage
description: Diagnose AgencyOS production failures from deployment, runtime, database and diff evidence before applying a fix.
---

# Production Incident Triage

## Purpose

Find the actual failure mechanism before changing production.

Avoid the common error: assuming the most recent feature caused the incident merely because it was recent.

## Trigger

Use when users report:

- site never finishes loading;
- 5xx/timeouts;
- broken login/session;
- deployment says READY but app fails;
- database connection exhaustion/hangs;
- API/MCP suddenly fails;
- production behavior differs from CI/preview.

## First principle

Collect evidence in four layers before assigning causality:

```text
deployment/build
runtime/request
database/config
recent changes
```

## Procedure

### 1. Establish current serving state

Identify:

- production URL;
- currently serving deployment SHA;
- latest main SHA;
- whether they match;
- Vercel deployment state.

Call the health endpoint when available.

### 2. Classify the failure layer

#### Build-time

Evidence:

- Vercel build failed;
- TypeScript/build error;
- deployment never became READY.

#### Runtime

Evidence:

- READY deployment but request errors/timeouts;
- function logs;
- route-specific latency/error.

#### Authentication/session

Evidence:

- login loops;
- session resolver stalls;
- cookies/session table behavior.

#### Database/pool

Evidence:

- `pg_stat_activity`;
- long-running queries;
- waits/locks;
- connection counts;
- pooler state;
- migration mismatch.

#### Configuration

Evidence:

- environment mode/value changed;
- missing variable;
- deployment protection/routing changed.

### 3. Narrow the reproduction

Prefer cheap, bounded probes:

- `/api/health`;
- `/login`;
- one affected read route;
- one database `select 1`;
- exact failing query when identifiable.

Every probe needs a timeout. Do not create another indefinite hang while diagnosing one.

### 4. Inspect recent diffs

Compare the last known healthy SHA with current production/main.

Ask:

- does the changed code execute on the failing path?
- did a migration/config change happen separately?
- was the problem already present historically?
- did a driver/dependency version change?

If a changed feature is not on the affected path, do not blame/revert it without evidence.

### 5. Inspect infrastructure-specific evidence

For Vercel:

- deployment events;
- runtime errors/logs;
- environment configuration;
- current alias/production SHA.

For Supabase/Postgres:

- applied migrations;
- `pg_stat_activity`;
- waits/locks;
- RLS/privileges when access changed;
- pooler mode/connection string when connection behavior changed.

### 6. Form and test a causal hypothesis

Use this structure:

```text
Symptom:
Observed evidence:
Hypothesis:
Prediction if hypothesis is true:
Probe/fix:
Observed result:
Conclusion:
```

Do not call something the root cause until its prediction is validated.

### 7. Stabilize first

Choose the smallest reversible action that restores service.

Possible actions:

- rollback to known-good deployment;
- hotfix runtime config/driver;
- apply missing backward-compatible migration;
- correct env/config;
- disable only the broken activation flag.

Do not revert unrelated working features as a convenience.

### 8. Verify recovery empirically

Require:

- production deployment healthy;
- `/api/health` fast and correct;
- affected user route responds;
- database no longer exhibits the failure state;
- no new runtime errors.

### 9. Convert incident findings into prevention

After recovery inspect whether to add:

- timeout;
- health signal;
- test;
- CI gate;
- dependency constraint;
- migration check;
- observability;
- documentation.

## Incident report

Produce:

```text
Impact:
Start/end or observation window:
Serving SHA:
Root cause:
Evidence:
Why the suspected feature was/was not causal:
Hotfix:
Validation:
Preventive follow-up:
Remaining risk:
```

## Invariants

- Never diagnose solely from the latest commit message.
- Never claim a migration caused a hang without database evidence.
- Never call READY deployment proof of healthy runtime.
- Never leave a network/database request unbounded during diagnosis.

## Common composition

```text
repo-state-recovery
→ production-incident-triage
→ safe-github-delivery
→ cicd-release-guardian
→ production verification
```
