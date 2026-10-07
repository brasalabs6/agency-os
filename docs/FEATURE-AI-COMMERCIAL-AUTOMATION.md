# Feature — AI Commercial Automation

## Objective

Transform AgencyOS from a lead CRM into an auditable AI-assisted commercial operating system while preserving human control over external actions.

The implemented lifecycle is:

```text
prospecting
→ business enrichment
→ digital-presence diagnostic
→ scoring / prioritization
→ assisted outreach
→ qualification
→ proposal
→ negotiation
→ contract
→ signature
→ contract-derived project / obligations
→ onboarding / follow-up / learning
```

## Core decisions

- Agents may research, analyze, draft and write internal CRM state according to granular MCP scopes.
- External actions are approval-gated. Agents cannot approve their own requests.
- There is no raw WhatsApp send MCP tool.
- Approval records bind the exact payload/version approved by a human.
- DO_NOT_CONTACT is checked both when approval is requested and again at execution time.
- Proposal price/payment terms may remain `HUMAN_REQUIRED`; commercial terms are never fabricated.
- Contracts are tied to exact proposal/template versions.
- Client projects and obligations are generated only from a `SIGNED` contract.
- AI workflow observability stores `AiRun` metadata/summaries, not private model chain-of-thought.
- External providers are adapters configured by environment rather than hard-coded vendors.

## Autonomy model

| Level | Meaning |
| --- | --- |
| A0 | read/analyze/draft only |
| A1 | internal CRM writes allowed |
| A2 | external action requires human ApprovalRequest |
| A3 | intentionally not enabled in this release |

## Data model

Migration: `drizzle/0008_ai_commercial_automation.sql`.

New entities:

- `business_profiles`: versioned researched public business state and fact classification.
- `diagnostics`: versioned digital-presence diagnostics and rendered artifact content.
- `score_assessments`: multidimensional score inputs, total, confidence, reasons and recommended service.
- `ai_runs`: skill/version/status/idempotency and safe input/output summaries.
- `prospecting_runs`: ICP/research batch envelope and counters.
- `channel_connections`: WhatsApp connection registry and capabilities.
- `conversations`: synced channel threads linked optionally to leads.
- `channel_messages`: idempotent external message snapshots.
- `approval_requests`: immutable external-action payload hash, preview, checks, human decision and execution receipt.
- `qualifications`: structured discovery / qualification.
- `proposals`: versioned scope, pricing, assumptions, dependencies and approval state.
- `contracts`: versioned contract drafts, signature metadata and exact proposal linkage.
- `client_projects`: client execution object created from signed contract.
- `project_obligations`: deliverables, dependencies, payments and support commitments derived from the signed contract.

Audit logs now support generic `entity_type` / `entity_id` in addition to lead references.

RLS is enabled on the new internal tables and public/anon/authenticated Data API privileges are revoked. Server-side application access remains the intended path.

## Domain services

The UI, REST API and MCP use service-layer boundaries:

- `src/lib/services/intelligence.ts`
- `src/lib/services/communications.ts`
- `src/lib/services/sales-automation.ts`
- `src/lib/services/client-projects.ts`
- `src/lib/services/automation-utils.ts`

Repositories:

- `AutomationRepository`
- `MockAutomationRepository`
- `PostgresAutomationRepository`

## Approval safety

Approval lifecycle:

```text
PENDING
→ APPROVED | REJECTED | EXPIRED | CANCELED
APPROVED
→ EXECUTED
```

Rules:

1. agent creates request;
2. human reviews/edits exact preview + structured payload;
3. AgencyOS recalculates the payload hash at human approval;
4. executor accepts only `APPROVED`;
5. executor rejects expired, stale-version, changed-payload or failing-policy requests;
6. contact actions re-check current DO_NOT_CONTACT immediately before execution;
7. execution receipt is persisted and audited.

Human approval/rejection is intentionally absent from MCP scopes/tools.

## WhatsApp

### Read-only ingestion

Authenticated gateway endpoint:

`POST /api/integrations/whatsapp/ingest`

Header:

`Authorization: Bearer <WHATSAPP_INGEST_TOKEN>`

Messages are upserted by external identity and conversation. Opt-out detection can project a lead to `DO_NOT_CONTACT`.

### Approved send

MCP agents can only call `whatsapp_message_send_approved` with an already approved request.

Adapter configuration:

- `WHATSAPP_SEND_MODE=mock` for local/test.
- `WHATSAPP_SEND_WEBHOOK_URL` for production gateway.
- `WHATSAPP_API_TOKEN` optional gateway bearer token.

## Proposal and contract delivery

Approved proposal/contract delivery uses a provider-neutral adapter:

- `DOCUMENT_SEND_MODE=mock` for local/test.
- `DOCUMENT_SEND_WEBHOOK_URL` for production.
- `DOCUMENT_SEND_API_TOKEN` optional bearer token.

Approval payload includes the exact document version and delivery target. Execution rejects stale document versions.

## Signature status

Provider-neutral callback:

`POST /api/integrations/signatures/status`

Header:

`Authorization: Bearer <SIGNATURE_WEBHOOK_TOKEN>`

A signed contract projects the lead to `WON`. Creating a client project from that signed contract projects `WON → ONBOARDING`.

## REST surface

Human-authenticated endpoints cover:

- business profiles / diagnostics / scoring;
- prospecting runs;
- WhatsApp connections and conversations;
- approval inbox, approve/reject and approved execution;
- qualification;
- proposals and proposal response;
- contracts, contract review/send and signature status;
- contract-derived projects and obligations.

Integration-only webhooks use dedicated bearer tokens and do not require an app session.

## MCP surface

Granular agent-safe scopes cover:

- diagnostics;
- prospecting;
- conversations;
- approved message send;
- approval request/read;
- proposals;
- approved proposal send;
- contract draft/read;
- approved contract send;
- projects;
- AI runs.

Existing active per-user credentials receive these safe scopes in migration 0008.

There is intentionally no `approvals.approve` scope in agent credentials.

## Agent skills

Commercial workflow contracts live under `.agents/skills/`:

- lead-discovery
- business-enrichment
- digital-presence-diagnostic
- lead-scoring
- sales-prioritization
- outreach-copilot
- whatsapp-conversation-analysis
- conversation-to-crm
- lead-qualification
- whatsapp-assisted-outreach
- proposal-generation
- negotiation-copilot
- contract-generation
- contract-obligations
- client-onboarding
- follow-up-planner
- pipeline-review
- sales-learning

Each skill declares objective, autonomy, permitted AgencyOS tools, workflow, guardrails and Definition of Done.

## UI

New global workspaces:

- `/prospecting`
- `/conversations`
- `/approvals`

Lead detail now includes:

- Business Profile;
- diagnostic / scorecard;
- WhatsApp conversation summary;
- qualification;
- proposal;
- contract;
- project / obligations;
- AI run ledger.

The approval inbox supports human payload/preview editing before approve/reject and explicit execution after approval.

## Compatibility

- Existing lead/task APIs and MCP tools remain available.
- Canonical lead status values are unchanged.
- One transition is intentionally added: `WON → ONBOARDING`.
- Existing MCP credentials are migrated to the new safe agent scopes.
- No agent receives the human approval scope.

## Migration and rollout

Implementation, migration, integration configuration and production activation are separate operations.

Recommended rollout:

1. merge code after CI passes;
2. deploy backward-compatible code;
3. apply migration 0008 deliberately;
4. verify indexes/RLS/privileges and new tables;
5. configure WhatsApp ingest token and gateway;
6. configure approved WhatsApp send adapter;
7. configure document delivery adapter;
8. configure signature webhook token/provider;
9. run multi-user MCP E2E;
10. verify human approval UI and execution receipts;
11. activate real external sends only after mock/staging validation.

## Rollback

- Disable external execution by removing provider URLs/tokens.
- Keep ingestion read-only if needed.
- Revert application code independently of provider activation.
- Do not drop new tables during incident rollback; retain audit/history unless a dedicated data migration is approved.

## Test gates

Added unit coverage includes:

- `WON → ONBOARDING` and terminal-state behavior;
- optimistic approval versioning;
- AI-run idempotency lookup;
- agents cannot self-approve;
- pending WhatsApp cannot execute;
- an exact human-approved WhatsApp payload executes in mock mode.

Repository CI remains the required gate:

- migration sequence;
- lint;
- typecheck;
- unit tests;
- production build;
- runtime smoke;
- Vercel preview.

## Definition of Done

Code-level DoD:

- all domain/repository/service/API/MCP/UI surfaces implemented;
- 18 workflow skills versioned in repo;
- no raw external-send MCP path;
- human approval required and audited;
- migration included;
- CI green;
- PR reviewable from current `main`.

Production DoD is separate and additionally requires:

- migration 0008 applied/verified;
- provider secrets configured;
- external adapters verified;
- multi-account MCP E2E;
- real-message/doc/signature smoke with approved test recipients;
- production health verification after deployment.
