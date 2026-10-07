---
name: cicd-release-guardian
description: Build, audit and verify AgencyOS CI/CD so production promotion is exact-SHA, public-runner and fail-closed.
---

# CI/CD Release Guardian

## Purpose

Make quality and production promotion deterministic, observable and fail-closed.

This skill covers GitHub Actions, Vercel preview/production gating and post-deploy smoke verification.

## Project baseline

AgencyOS uses:

- GitHub-hosted public runners;
- `ubuntu-latest`;
- Vercel Git integration;
- a Quality Gate workflow;
- preview validation for PRs;
- a production Vercel gate;
- post-deploy Production Smoke;
- `/api/health` as a non-secret deployment contract.

Read `docs/CI-CD.md` and the current workflows before modifying them.

## Required quality gate

The main quality job should prove:

1. deterministic install with `npm ci`;
2. production dependency audit at the configured severity;
3. migration sequence validity;
4. lint with zero warnings;
5. typecheck;
6. unit tests;
7. production build;
8. runtime smoke of the built artifact.

Do not convert failing checks into warnings simply to unblock release.

## Public runner rule

Unless the user explicitly requests otherwise:

```yaml
runs-on: ubuntu-latest
```

Do not introduce Predator/self-hosted runners into this project.

Pin reusable Actions to reviewed immutable commits when practical.

## Avoid duplicate CI

Design event filters so one logical change does not waste runners.

Preferred pattern:

- `pull_request` for feature branches targeting `main`;
- `push` only for `main`;
- concurrency that cancels superseded PR runs but does not accidentally cancel distinct main release validation.

Audit the actual workflow history after changes. YAML intent is not enough.

## Preview gate

For PRs:

```text
Quality Gate
→ Vercel Preview
→ PR ready
```

The preview check must wait for the Vercel status for the exact PR head SHA.

Do not infer preview success from a deployment belonging to another commit.

## Production gate

Production promotion must be tied to:

- exact SHA;
- branch `main`;
- event `push`;
- the intended CI workflow;
- successful conclusion.

### Fail-closed requirement

If a release gate encounters:

- GitHub API error;
- rate limit;
- network failure;
- malformed JSON;
- unknown state;
- timeout;
- missing matching CI run;

the result must be:

```text
do not promote production
```

Never let shell semantics turn an infrastructure error into a release approval.

For Vercel Ignored Build Step remember the contract used by this project:

```text
exit 1 → proceed with build
exit 0 → ignore/skip deployment
```

Guard every command accordingly.

## Post-deploy verification

A Vercel deployment being READY is necessary but insufficient.

Production Smoke should prove:

- Vercel status succeeded;
- production alias serves the expected Git SHA;
- `/api/health` returns success;
- database health is `ok`;
- environment reports production;
- `/login` renders;
- anonymous home behavior is correct.

Use bounded curl/request timeouts.

## Health endpoint contract

Health output may expose non-secret metadata such as:

```json
{
  "ok": true,
  "dataDriver": "postgres",
  "database": "ok",
  "environment": "production",
  "commit": "<VERCEL_GIT_COMMIT_SHA>"
}
```

Never expose connection strings, tokens, user data or credentials.

## Dependency security

Use production-only audit for release gating so dev-tool advisories do not obscure runtime risk.

When an audit finds a runtime HIGH/CRITICAL advisory:

1. inspect affected package/path;
2. determine safe patched version;
3. update package + lockfile;
4. rerun the full gate;
5. raise the audit threshold when appropriate rather than tolerating a known runtime vulnerability.

## Pipeline review protocol

After creating/modifying CI/CD, inspect real runs for:

- duplicate `push` + `pull_request` jobs;
- repeated workflows that only become `skipped`;
- cancelled runs consuming runners unnecessarily;
- action runtime deprecation warnings;
- lint warnings hidden under exit 0;
- dependency advisories;
- gate race conditions;
- stale SHA acceptance;
- production smoke timing/alias convergence.

A pipeline is not finished until its failure behavior has been observed or reasoned about explicitly.

## Branch protection

GitHub branch/ruleset protection is administrative state.

Recommended `main` rules:

- require PR;
- require Quality Gate;
- require Vercel Preview for PRs;
- require branch up-to-date;
- block force push;
- block deletion.

If the connector lacks admin permission, report this as an external configuration gap; do not pretend a repository file enforces it.

## Completion report

Include:

```text
Workflow files changed:
Runner type:
Quality checks:
Preview behavior:
Production gate:
Fail-closed behavior:
Production smoke:
Observed run evidence:
Branch-protection status:
Remaining risks:
```

## Common composition

```text
repo-state-recovery
→ safe-github-delivery
→ cicd-release-guardian
→ production verification
```
