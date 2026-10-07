# AgencyOS CI/CD

## Goals

Production must fail closed: code can reach production only after quality checks pass, the Vercel build succeeds, and a post-deploy smoke test confirms that the production alias is serving the expected commit.

All GitHub Actions jobs run on GitHub-hosted public runners (`ubuntu-latest`). No self-hosted runner is required.

## Pipeline

```text
push / pull request
        |
        v
GitHub Actions — Quality Gate
  npm ci
  dependency audit
  migration sequence validation
  lint
  typecheck
  unit tests
  Next production build
  local runtime smoke
        |
        +-------------------------+
        |                         |
       PR                        main
        |                         |
        v                         v
Mobile Browser Gate        Vercel production waits
  public ubuntu runner      for Quality Gate = green
  Chromium / Playwright
  360, 390, 412, 768 px
  PT/EN preference
        |
        v
Vercel Preview
                                  |
                                  v
                          Vercel build/deploy
                                  |
                                  v
                          Production Smoke
                            expected Git SHA
                            /api/health
                            database=ok
                            /login
                            anonymous home redirect
```

## GitHub Actions

### CI

File: `.github/workflows/ci.yml`

The required application-quality check is named **Quality Gate**. Push CI runs only on `main`; feature branches are validated by the pull-request event, avoiding duplicate `push` + `pull_request` runs for the same commit.

It runs:

- `npm ci`
- `npm audit --omit=dev --audit-level=high`
- migration sequence validation
- lint with `--max-warnings=0`
- `npm run typecheck`
- `npm test`
- `npm run build`
- a local smoke test against the built Next.js artifact

On pull requests, a separate **Mobile Browser Gate** runs on a GitHub-hosted public `ubuntu-latest` runner after the Quality Gate. It installs a pinned Playwright runner ephemerally (without changing the application lockfile), installs Chromium, starts AgencyOS with the mock data driver and development auth bypass, and validates the core routes at 360×800, 390×844, 412×915 and 768×1024. Authentication behavior remains covered separately by unit/service tests and the regular quality gate; the browser job isolates responsive and localization regressions from in-memory mock-session boundaries. It checks that the intended mobile variants are rendered, that the document does not gain horizontal overflow, and that the PT-BR/English language preference persists.

After both gates pass, CI waits for Vercel's **Vercel** commit status, producing the **Vercel Preview** check.

### Production Smoke

File: `.github/workflows/post-deploy-smoke.yml`

The workflow is filtered to `main` at the `workflow_run` trigger, so feature-branch and pull-request CI runs do not create noisy skipped smoke workflows.

After a successful CI run on `main`, it waits for Vercel production and then verifies:

- the production health endpoint reports the exact expected Git SHA;
- database health is `ok`;
- the environment is `production`;
- `/login` renders;
- an anonymous request to `/` reaches the login flow.

## Vercel production gate

The Vercel project uses:

```text
bash scripts/vercel-ci-gate.sh
```

as its Ignored Build Step command.

For preview branches the script allows builds immediately.

For `main`, it polls the GitHub Actions workflow runs API for the newest `CI` run that is simultaneously `push`, `main`, and the exact deployment SHA. Vercel proceeds only after that run succeeds.

The gate is fail-closed: GitHub API failures, rate limits, malformed responses, unknown states, CI failures, and timeouts all return the Vercel “ignore deployment” exit code. This means a network/API failure cannot accidentally release production.

This means even a direct push to `main` does not automatically become production.

## Database migrations

Production migrations are intentionally not run by PR workflows or Vercel builds.

Rules:

1. SQL migrations are versioned under `drizzle/`.
2. CI validates unique and strictly ordered numeric migration prefixes.
3. Migrations must remain backward-compatible with the currently deployed app.
4. Apply migrations deliberately to Supabase and verify schema/RLS before code that depends on them is promoted.
5. Do not run `drizzle-kit push` automatically against production.

## GitHub main ruleset

Repository-level branch protection is an administration setting, not a repository file.

Recommended rules for `main`:

- require a pull request before merging;
- require **Quality Gate**;
- require **Mobile Browser Gate**;
- require **Vercel Preview** for PRs;
- require the branch to be up to date before merging;
- block force pushes;
- block branch deletion;
- optionally require one approval when the team grows.

The GitHub connector used to implement this pipeline does not have repository administration permission, so it cannot create the ruleset itself. Production deployment is still CI-gated at Vercel even without this GitHub setting.

## Failure behavior

- Production dependency high/critical vulnerability, lint warning/error, type/test/build failure: **Quality Gate** fails and Vercel production is ignored.
- Mobile layout overflow, wrong responsive variant, or PT/EN persistence regression: **Mobile Browser Gate** fails on the PR.
- Vercel Preview failure: **Vercel Preview** fails on the PR.
- Vercel production build failure: the previous production alias remains live.
- Wrong production SHA: **Production Smoke** fails.
- Database/health failure: **Production Smoke** fails.
- A hung route cannot hide indefinitely because health and route smoke requests use explicit timeouts.

## Production health contract

`GET /api/health` exposes non-secret deployment metadata:

```json
{
  "ok": true,
  "dataDriver": "postgres",
  "database": "ok",
  "environment": "production",
  "commit": "<VERCEL_GIT_COMMIT_SHA>"
}
```

This allows CI to prove that the production alias has converged to the same commit that passed the quality gate.
