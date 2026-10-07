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
