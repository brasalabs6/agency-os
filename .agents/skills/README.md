# AgencyOS agent skills

These skills encode repeatable operating procedures learned from real AgencyOS implementation, incident-response and release work.

They are intentionally composable. `AGENTS.md` is always the mandatory core; a skill narrows the procedure for a specific class of work.

## Skill catalog

| Skill | Use for |
| --- | --- |
| `repo-state-recovery` | Recover current repository/infrastructure state before work |
| `feature-spec-first` | Write implementation-ready feature specs before cross-cutting changes |
| `safe-github-delivery` | Create branches/commits/PRs or explicit direct-main changes safely |
| `production-incident-triage` | Diagnose production failures from evidence before changing code |
| `database-migration-guardian` | Design, apply and verify PostgreSQL/Supabase migrations |
| `cicd-release-guardian` | Build/review fail-closed CI/CD and release gates |
| `mcp-user-identity` | Implement per-user MCP credentials, identity and personal semantics |

### Coding recipes

| Skill | Use for |
| --- | --- |
| `agencyos-vertical-slice` | Default end-to-end recipe for implementing AgencyOS features |
| `agencyos-api-route` | Thin REST handlers: auth, Zod, service, normalized HTTP response |
| `agencyos-domain-command` | Semantic business mutations and orchestration |
| `agencyos-domain-guard` | Authoritative business invariants shared by UI/API/MCP |
| `agencyos-optimistic-concurrency` | Version-aware writes and explicit 409 conflicts |
| `agencyos-repository-adapter` | Repository interface + mock + PostgreSQL persistence pattern |
| `agencyos-zod-boundary` | External shape validation without leaking domain policy into Zod |
| `agencyos-server-page` | Server-first Next.js pages and service-based reads |
| `agencyos-client-mutation` | Client interaction, API writes, local projection and server refresh |
| `agencyos-form-modal` | Accessible modal/form recipe using ModalShell |
| `agencyos-responsive-data-view` | Mobile cards + dense desktop data views |
| `agencyos-ui-language` | Existing design tokens, primitives and visual vocabulary |
| `agencyos-auditable-mutation` | Activity timeline + technical audit with actor attribution |
| `agencyos-domain-derived-state` | Source-of-truth → projection synchronization |
| `agencyos-testing-recipe` | Domain, repository, security and regression test selection |

## Common compositions

### New cross-cutting feature

```text
repo-state-recovery
→ feature-spec-first
→ safe-github-delivery
→ database-migration-guardian (when DB changes)
→ cicd-release-guardian
→ production verification
```

### Typical product feature

```text
repo-state-recovery
→ agencyos-vertical-slice
   ├─ agencyos-zod-boundary
   ├─ agencyos-domain-command
   │  ├─ agencyos-domain-guard
   │  ├─ agencyos-optimistic-concurrency
   │  ├─ agencyos-auditable-mutation
   │  └─ agencyos-domain-derived-state (when projections exist)
   ├─ agencyos-repository-adapter (when persistence changes)
   ├─ agencyos-api-route (for browser/external transport)
   ├─ agencyos-server-page
   ├─ agencyos-client-mutation (when interaction is needed)
   │  ├─ agencyos-form-modal
   │  ├─ agencyos-responsive-data-view
   │  └─ agencyos-ui-language
   └─ agencyos-testing-recipe
→ safe-github-delivery
→ cicd-release-guardian
```

### Production incident

```text
repo-state-recovery
→ production-incident-triage
→ safe-github-delivery
→ cicd-release-guardian
→ production verification
```

### ChatGPT / MCP identity integration

```text
repo-state-recovery
→ feature-spec-first
→ mcp-user-identity
→ database-migration-guardian
→ safe-github-delivery
→ cicd-release-guardian
→ multi-account E2E
```

## Skill execution contract

Every skill should leave enough evidence for the next skill to continue without guessing.

Minimum handoff:

- current base branch and SHA;
- relevant files/systems inspected;
- decisions/invariants discovered;
- changes made or planned;
- validation performed and result;
- unresolved blockers/risks;
- next executable action.

Never treat Todo lists, previous chat summaries or memory as a replacement for current repository/infrastructure state.


## AgencyOS coding pattern

The default code flow is:

```text
Server Component read
Page
  ↓
Service
  ↓
Repository interface
  ↓
Mock | PostgreSQL

Browser write
Client Component
  ↓
/api/*
  ↓
Zod
  ↓
Actor/Auth
  ↓
Service / Domain command
  ↓
Repository
  ↓
Activity + Audit + derived-state sync
```

Important distinction:

- validation proves external shape;
- services/domain prove business meaning;
- repositories persist state;
- UI guides the user but does not own domain authority.

When adding code, prefer the closest existing vertical slice and these recipes over inventing a new local pattern.


## Coding recipe families

### Architecture and backend

```text
agencyos-vertical-slice
agencyos-api-route
agencyos-domain-command
agencyos-domain-guard
agencyos-optimistic-concurrency
agencyos-repository-adapter
agencyos-zod-boundary
agencyos-auditable-mutation
agencyos-domain-derived-state
```

### Frontend

```text
agencyos-server-page
agencyos-client-mutation
agencyos-form-modal
agencyos-responsive-data-view
agencyos-ui-language
```

### Testing

```text
agencyos-testing-recipe
```
