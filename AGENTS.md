# Agent instructions

This repository is PUBLIC. Never commit secrets, credentials, tokens, private URLs, personal email addresses, customer data, or other sensitive/private information. Use environment variables or deployment secrets for sensitive configuration. Keep production identities and credentials out of source code; use non-personal placeholders in committed examples and fallback logic.

## Core operating protocol

These rules apply to every agent and every task in this repository. Skills under `.agents/skills/` add task-specific procedures but never override this core.

### 1. Recover real state before changing anything

- The current repository, infrastructure, database and deployment state are the source of truth.
- Conversation history and memory are context, not authoritative state.
- Before non-trivial work, inspect the current branch/HEAD, relevant files, recent changes, migrations, workflows and any affected external system.
- Do not assume a prior SHA, PR, migration, deployment or environment value is still current.
- If the target branch changes while you work, do not overwrite it. Compare the new state, preserve concurrent work and rebuild/rebase your change on the new base.

### 2. Preserve project invariants

- Preserve canonical lead statuses in `src/lib/domain/types.ts`.
- Do not bypass `src/lib/services` from UI, API, or MCP.
- Never introduce raw SQL tools to MCP.
- Keep `DO_NOT_CONTACT` enforcement in the domain layer.
- MCP writes must remain auditable.
- Preserve optimistic concurrency (`version` / `expectedVersion`).
- Do not silently merge ambiguous duplicates.
- Unknown lead facts must stay unknown; do not invent contact details or evidence.
- Prefer Server Components; use Client Components only for interaction.

### 3. Separate lifecycle stages

Treat these as distinct operations and report them separately:

1. implementation;
2. database migration;
3. deployment/environment configuration;
4. feature activation;
5. production verification.

A code commit is not proof that a migration ran, an environment variable changed, a feature is active, or production is healthy.

### 4. Spec first for cross-cutting work

For authentication, database, MCP, infrastructure, integrations, domain changes or other cross-cutting features, create/update a feature spec before implementation when the task calls for planning or approval.

A feature spec should define objective, context, decisions, non-goals, data model, APIs, UI, security, invariants, migration, compatibility, rollout, rollback, tests, E2E gates and Definition of Done.

When the user asks for spec-only work, do not implement behavior in the same turn.

### 5. Deliver GitHub changes safely

- Default to a branch + PR unless the user explicitly authorizes direct-to-main.
- Use the GitHub connector and internal execution environment for AgencyOS work. Do not use Predator unless the user explicitly requests it.
- Prefer atomic commits with a clear purpose.
- For direct branch updates, use expected-SHA/lease semantics whenever available.
- Before moving a shared branch, re-read its current HEAD.
- Never force-push a shared branch unless the user explicitly requests it and the consequences are understood.
- For large generated changes, create blobs/tree/commit first, review the provisional commit/diff, then update the branch ref.

### 6. Validate generated changes before promotion

At minimum for architectural or dependency-changing code:

- inspect the complete diff;
- check for conflict markers, accidental literal escapes and committed secrets;
- run/observe lint with zero warnings;
- run typecheck;
- run unit tests;
- run production build;
- run relevant smoke/E2E checks.

Do not weaken a gate merely to make it pass. Fix the underlying defect or explicitly document a justified exception.

### 7. Treat production as an empirical system

Do not declare success because code compiled or deployment says READY.

For production-impacting work, verify the actual serving environment using the relevant health endpoint, runtime logs, database state and/or E2E behavior.

When diagnosing incidents, collect evidence from deployment, runtime, database/config and recent diffs before assigning causality. The most recent feature is not automatically the cause.

### 8. Database migrations are explicit production operations

- Keep SQL migrations versioned under `drizzle/` with unique, increasing prefixes.
- Prefer backward-compatible migrations.
- Do not run `drizzle-kit push` or equivalent automatically against production.
- Apply production migrations deliberately, then verify schema, constraints, indexes, RLS and privileges.
- Code depending on a migration is not fully released until that migration is confirmed applied.

### 9. CI/CD must fail closed

- GitHub Actions uses GitHub-hosted public runners unless explicitly changed.
- Production must not be promoted when quality checks fail, are unknown, time out, or cannot be verified.
- Network/API/parsing failures in release gates must block/skip promotion, never permit it.
- Avoid duplicate CI executions and noisy skipped workflows.
- Keep dependency audit, lint, typecheck, tests, build and smoke checks meaningful.

### 10. Protect secrets and credentials

- Never log or audit raw secrets, session tokens, MCP credentials or URLs containing credentials.
- Store high-entropy opaque credentials as hashes when plaintext recovery is unnecessary.
- Make revocation explicit and isolate credentials per principal where applicable.
- Query-string credentials are secrets and must be treated as passwords.

### 11. Report evidence, not assumptions

Every completion report should distinguish:

- what changed;
- what was actually validated;
- what is active in production;
- what remains pending or externally blocked;
- exact branch/PR/commit/deployment identifiers when relevant.

If a validation could not be run, say so. Never imply it passed.

## Skills

Task-specific procedures live under `.agents/skills/`.

Use the smallest set that covers the task:

- `repo-state-recovery`
- `feature-spec-first`
- `safe-github-delivery`
- `production-incident-triage`
- `database-migration-guardian`
- `cicd-release-guardian`
- `mcp-user-identity`

See `.agents/skills/README.md` for composition patterns.


### Commercial automation skill set

For AI-assisted sales work, compose the commercial skills under `.agents/skills/` rather than inventing ad-hoc workflows. The canonical set is:

`lead-discovery`, `business-enrichment`, `digital-presence-diagnostic`, `lead-scoring`, `sales-prioritization`, `outreach-copilot`, `whatsapp-conversation-analysis`, `conversation-to-crm`, `lead-qualification`, `whatsapp-assisted-outreach`, `proposal-generation`, `negotiation-copilot`, `contract-generation`, `contract-obligations`, `client-onboarding`, `follow-up-planner`, `pipeline-review`, `sales-learning`.

Commercial agents must additionally preserve these invariants:

- WhatsApp/history ingestion is read-only analysis by default.
- There is no raw-send MCP tool; external send executes only an already human-approved payload.
- Proposal price/payment terms may remain `HUMAN_REQUIRED`; never fabricate commercial terms.
- Contract generation is tied to an exact proposal/template version and requires human/legal review before send.
- Client projects/obligations may be generated only from a `SIGNED` contract.
- Persist `AiRun` summaries and artifact references, never model chain-of-thought.
