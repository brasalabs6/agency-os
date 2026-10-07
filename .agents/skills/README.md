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


## Commercial automation skills

| Skill | Use for |
| --- | --- |
| `lead-discovery` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `business-enrichment` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `digital-presence-diagnostic` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `lead-scoring` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `sales-prioritization` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `outreach-copilot` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `whatsapp-conversation-analysis` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `conversation-to-crm` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `lead-qualification` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `whatsapp-assisted-outreach` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `proposal-generation` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `negotiation-copilot` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `contract-generation` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `contract-obligations` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `client-onboarding` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `follow-up-planner` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `pipeline-review` | AI-assisted commercial workflow with explicit autonomy/approval guards |
| `sales-learning` | AI-assisted commercial workflow with explicit autonomy/approval guards |

Commercial workflow composition:

```text
lead-discovery
→ business-enrichment
→ digital-presence-diagnostic
→ lead-scoring
→ sales-prioritization
→ outreach-copilot / whatsapp-assisted-outreach
→ lead-qualification
→ proposal-generation
→ negotiation-copilot
→ contract-generation
→ contract-obligations
→ client-onboarding
→ follow-up-planner / pipeline-review
→ sales-learning
```

Read-only conversation understanding uses `whatsapp-conversation-analysis`; CRM projection uses `conversation-to-crm`.
External actions are A2 and must pass through human `ApprovalRequest`; no agent skill may approve its own action.
