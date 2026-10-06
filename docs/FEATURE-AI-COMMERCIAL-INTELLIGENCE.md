# Feature Spec — AI Commercial Intelligence & Workflow Automation

**Status:** Proposed  
**Product:** AgencyOS  
**Source of business truth:** `brasalabs6/agency`  
**Companion architecture:** `brasalabs6/agency/agents/AUTOMATION-ARCHITECTURE.md`

## 1. Objective

Evolve AgencyOS from an agent-accessible CRM into the operational platform for AI-assisted commercial workflows:

```text
discover
→ enrich
→ diagnose
→ score
→ prioritize
→ communicate
→ qualify
→ propose
→ negotiate
→ contract
→ onboard
→ execute obligations
```

The CRM remains the system of record. Skills orchestrate workflows. MCP tools expose atomic, permissioned domain operations.

## 2. Current foundation

Already implemented and preserved:

- Leads with canonical stages.
- Search/filter/upsert/dedup.
- Basic score + reasons + recommended opportunity.
- Evidence ledger.
- Activity timeline.
- Audit logs.
- Tasks and Calendar.
- Multi-user ownership.
- Per-user ChatGPT MCP credentials.
- MCP reads/writes through domain services.
- `DO_NOT_CONTACT` guards.
- Optimistic concurrency.
- No raw SQL tool.

The new architecture must extend these patterns instead of bypassing them.

---

## 3. New domain model

### 3.1 BusinessProfile

A versioned structured snapshot of public/business context.

Fields:

```ts
interface BusinessProfile {
  id: string
  leadId: string
  version: number

  identity: {
    publicName?: string
    legalName?: string
    segment?: string
    subsegment?: string
    locations?: BusinessLocation[]
  }

  contacts: {
    phone?: string
    whatsapp?: string
    email?: string
    website?: string
    googleMapsUrl?: string
    instagramUrl?: string
    otherUrls?: string[]
  }

  businessSignals: {
    productsServices?: string[]
    publicValueProposition?: string
    openingHours?: Record<string, string>
    bookingMethods?: string[]
    observedTechnologies?: string[]
    publicReviewSummary?: {
      rating?: number
      reviewCount?: number
      latestReviewAt?: string
    }
  }

  competition?: BusinessReference[]
  facts: ProfileFact[]
  createdByType: ActorType
  createdById?: string
  createdAt: string
}
```

Each fact stores:
- value;
- classification: FACT | INFERENCE | UNKNOWN;
- source URL;
- observedAt;
- confidence.

Do not overwrite old snapshots. Latest is current projection.

### 3.2 Diagnostic

```ts
type DiagnosticStatus =
  | "DRAFT"
  | "READY"
  | "APPROVED"
  | "SENT"
  | "SUPERSEDED"

interface Diagnostic {
  id: string
  leadId: string
  businessProfileId?: string
  status: DiagnosticStatus
  version: number

  executiveSummary: string
  strengths: DiagnosticFinding[]
  gaps: DiagnosticFinding[]
  recommendations: DiagnosticRecommendation[]

  scores: {
    website?: number
    localPresence?: number
    conversionPath?: number
    trust?: number
    mobile?: number
    technical?: number
    socialPresence?: number
    overall?: number
  }

  recommendedServices: ServiceOpportunity[]
  internalNotes?: string
  publicSummary?: string
  artifactRef?: string

  generatedByType: ActorType
  generatedById?: string
  createdAt: string
  updatedAt: string
}
```

A finding includes:
- dimension;
- severity;
- title;
- explanation;
- evidenceIds[];
- confidence;
- publicSafe boolean.

### 3.3 ScoreAssessment

Replace the current opaque score projection with versioned breakdown.

Dimensions:
- digitalGap: 0–25
- economicPotential: 0–20
- contactability: 0–15
- urgency: 0–15
- serviceFit: 0–15
- proofPotential: 0–10
- total: 0–100
- confidence: 0–100

Current `leads.score` remains a projection of latest approved assessment.

### 3.4 AiRun

Every autonomous or assisted workflow execution gets a run record.

```ts
type AiRunStatus =
  | "QUEUED" | "RUNNING" | "WAITING_APPROVAL"
  | "COMPLETED" | "FAILED" | "CANCELED"

interface AiRun {
  id: string
  skill: string
  skillVersion: string
  leadId?: string
  status: AiRunStatus
  actorId: string
  idempotencyKey?: string
  startedAt?: string
  completedAt?: string
  inputSummary: Record<string, unknown>
  outputSummary: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
}
```

Do not store chain-of-thought.

### 3.5 ChannelConnection / Conversation / Message

Initial provider: WhatsApp connector.

```ts
interface ChannelConnection {
  id: string
  provider: "WHATSAPP"
  accountLabel: string
  status: "CONNECTED" | "DEGRADED" | "DISCONNECTED"
  capabilities: ("READ" | "SEND")[]
  ownerUserId?: string
}

interface Conversation {
  id: string
  connectionId: string
  externalId: string
  leadId?: string
  contactAddress: string
  contactDisplayName?: string
  lastMessageAt?: string
  optOutDetected: boolean
}

interface Message {
  id: string
  conversationId: string
  externalId: string
  direction: "INBOUND" | "OUTBOUND"
  sentAt: string
  sender: string
  text?: string
  mediaType?: string
  deliveryStatus?: string
}
```

Phase 1 sync is read-only.

### 3.6 ApprovalRequest

Shared approval object for WhatsApp, proposals, contracts and future actions.

```ts
type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "EXECUTED"
  | "CANCELED"

interface ApprovalRequest {
  id: string
  leadId?: string
  actionType:
    | "WHATSAPP_SEND"
    | "EMAIL_SEND"
    | "PROPOSAL_SEND"
    | "CONTRACT_SEND"
    | "PRICING_EXCEPTION"
    | "OTHER"

  payload: Record<string, unknown>
  preview: string
  rationale?: string
  policyChecks: PolicyCheck[]

  status: ApprovalStatus
  createdByType: ActorType
  createdById: string

  approvedByUserId?: string
  approvedAt?: string
  rejectedByUserId?: string
  rejectedAt?: string

  executedAt?: string
  executionResult?: Record<string, unknown>

  expiresAt?: string
  version: number
}
```

Agent cannot approve its own request.

### 3.7 Qualification

Stores discovery knowledge separately from generic notes.

Fields:
- decision makers;
- problem statements;
- desired outcome;
- current process;
- urgency;
- explicit budget statement;
- timeline;
- constraints;
- technical dependencies;
- unanswered questions;
- risk flags;
- service fit.

### 3.8 Proposal

Versioned commercial artifact.

Fields:
- leadId;
- diagnosticId;
- qualificationId;
- version/status;
- selected services;
- scope;
- exclusions;
- assumptions;
- client dependencies;
- milestones;
- agency fee;
- external costs;
- payment terms;
- validity;
- rendered artifact;
- approval status;
- sentAt;
- response.

The pricing engine must never invent values. It consumes approved pricing policy or returns `HUMAN_REQUIRED`.

### 3.9 Contract

Versioned contract instance.

Fields:
- lead/client;
- proposal;
- template/version;
- parties;
- structured terms;
- scope reference;
- price/payment terms;
- review limits;
- support window;
- IP/domain/hosting terms;
- responsibilities;
- signature provider metadata;
- status.

### 3.10 Obligation / Project

After a contract is signed, extract executable obligations.

```text
Contract
├─ Agency obligations
├─ Client obligations
├─ Milestones
├─ Acceptance gates
├─ Payment checkpoints
└─ Support obligations
```

A WON lead can become a ClientProject without losing the original lead history.

---

## 4. Lead Detail IA

Target information architecture:

```text
Overview
Business Profile
Diagnostic
Evidence
Conversations
Qualification
Proposals
Contracts
Tasks
Timeline
AI Runs
```

### Overview

Show:
- stage;
- score + breakdown;
- primary opportunity;
- latest diagnostic status;
- latest WhatsApp/contact;
- next action;
- owner;
- pending approvals;
- latest proposal;
- latest contract;
- active AI run.

---

## 5. Diagnostic UI

### Diagnostic Summary
- overall score;
- executive summary;
- strongest positives;
- critical gaps;
- recommended service.

### Dimensions
Cards for:
- Website
- Mobile
- Local Presence
- Conversion Path
- Trust
- Technical
- Social Presence

Each card:
- score;
- findings;
- evidence;
- confidence.

### Internal vs public view
Internal analysis can include operational hypotheses.
Public diagnostic only renders findings marked public-safe and evidence-supported.

### Actions
- Generate diagnostic
- Regenerate
- Compare versions
- Approve
- Render public version
- Create outreach draft
- Create proposal

---

## 6. Prospecting / Research Runs

New workspace: `/prospecting`.

A run stores:
- search objective;
- ICP;
- region;
- segments;
- source set;
- max candidates;
- created by;
- AI run;
- candidates found;
- duplicates;
- rejected;
- imported.

Flow:

```text
Create Research Run
→ agent researches web
→ candidate review
→ dedupe
→ import/enrich
→ diagnosis queue
```

Agents can write candidates directly if deduplication is strong, but ambiguous duplicates remain in review.

---

## 7. WhatsApp phases

### Phase WA-0 — Connection
Connect provider/account and health status.

### Phase WA-1 — Read only
Capabilities:
- sync/list conversations;
- read messages;
- link conversation to lead;
- analyze/summarize;
- extract tasks/commitments;
- detect opt-out.

No send tool.

### Phase WA-2 — Draft + Approval
Agent creates message draft and ApprovalRequest.

Human:
- edits;
- approves;
- rejects.

Executor sends only an approved immutable version.

### Phase WA-3 — Bounded send
Future only.

Examples potentially eligible:
- appointment confirmation;
- promised information;
- client asset reminder;
- follow-up already explicitly authorized.

Still blocked:
- cold first contact without approved policy;
- legal commitments;
- pricing exceptions;
- angry/security/legal conversations.

---

## 8. MCP tools

### Existing tools retained

Read:
- `mcp_whoami`
- `leads_search`
- `lead_get`
- `lead_activity_list`
- `pipeline_summary`
- `lead_tasks_list`
- `lead_task_get`
- `calendar_list`

Write:
- `leads_upsert`
- `lead_update`
- `lead_move_stage`
- `lead_add_note`
- `lead_add_evidence`
- `lead_set_next_action`
- `lead_record_contact`
- `lead_mark_outcome`
- task writes.

### Intelligence tools

```text
business_profile_get
business_profile_snapshot_create

lead_diagnostic_get
lead_diagnostic_list
lead_diagnostic_create
lead_diagnostic_update
lead_diagnostic_finalize
lead_diagnostic_render

lead_score_assessment_get
lead_score_assessment_create

ai_run_get
ai_run_list
```

### WhatsApp read tools

```text
whatsapp_connections_list
whatsapp_conversations_list
whatsapp_conversation_get
whatsapp_messages_list
whatsapp_contact_resolve
```

### Approval tools

Agent:
```text
approval_request_create
approval_request_get
approval_request_list
```

Do **not** expose MCP tools that allow an AGENT principal to self-approve.

Human REST/UI:
```text
approve
reject
edit-and-approve
```

Approved executor:
```text
whatsapp_message_send_approved
proposal_send_approved
contract_send_approved
```

Each executor verifies:
- approval exists;
- approval status is APPROVED;
- payload hash matches approved version;
- approval not expired;
- actor/tool is authorized;
- action not previously executed.

### Qualification

```text
lead_qualification_get
lead_qualification_update
```

### Proposal

```text
proposal_get
proposal_list
proposal_create
proposal_update
proposal_render
proposal_request_approval
proposal_mark_response
```

### Contract

```text
contract_get
contract_list
contract_create_from_proposal
contract_update_draft
contract_render
contract_request_approval
contract_signature_status
contract_obligations_list
```

---

## 9. Scopes

Current `leads.read/write` is too broad for future external channels.

Add:

```text
leads.read
leads.write

diagnostics.read
diagnostics.write

conversations.read
messages.draft
messages.send.approved

approvals.read

proposals.read
proposals.write
proposals.send.approved

contracts.read
contracts.draft
contracts.send.approved

projects.read
projects.write
```

Approval itself remains human UI/API privilege, not agent scope.

---

## 10. Policy Engine

Before external actions, calculate policy checks.

Examples:
- lead is not DO_NOT_CONTACT;
- channel connection allows send;
- permission/context supports WhatsApp;
- message frequency is within policy;
- no prohibited guarantee;
- no unapproved price;
- no unapproved case/logo;
- no unsupported legal commitment;
- approval required.

Store policy check result in ApprovalRequest.

---

## 11. Skill execution contract

AgencyOS does not contain model reasoning. A skill run writes:
- skill id/version;
- run id;
- structured inputs;
- tools called through audit;
- outputs/artifact ids;
- status;
- error category;
- optional approval id.

Use idempotency key for repeatable runs.

Example:

```text
skill: digital-presence-diagnostic@1
lead: <uuid>
input: businessProfile=<id>, evidenceCutoff=<timestamp>
output: diagnostic=<id>
```

---

## 12. Initial skills

### S1 lead-discovery
Web → candidate leads → dedupe/upsert.

### S2 business-enrichment
Lead → structured public business profile + evidence.

### S3 digital-presence-diagnostic
Business profile + website/web research → Diagnostic.

### S4 lead-scoring
Evidence + diagnostic → ScoreAssessment + opportunity.

### S5 sales-prioritization
Pipeline/tasks → prioritized action brief.

### S6 outreach-copilot
Lead + diagnostic → call/message drafts.

### S7 whatsapp-conversation-analysis
WhatsApp read-only → summary/objections/commitments/next action.

### S8 conversation-to-crm
Conversation analysis → notes/tasks/stage recommendations.

These are the recommended first production skills.

---

## 13. Delivery phases

### Milestone AI-01 — Intelligence data model
Deliver:
- BusinessProfile
- Diagnostic
- ScoreAssessment
- AiRun
- migrations
- repositories/services
- REST/MCP
- Lead Detail tabs

No WhatsApp dependency.

### Milestone AI-02 — Research skills
Deliver:
- prospecting runs;
- discovery skill;
- enrichment skill;
- diagnostic skill;
- scoring skill.

Result: autonomous research → CRM diagnostic, no outbound.

### Milestone AI-03 — WhatsApp read-only
Deliver:
- connection;
- sync;
- conversations/messages;
- Lead Detail conversation UI;
- read MCP tools;
- analysis skill.

Result: ChatGPT can read/summarize WhatsApp but not send.

### Milestone AI-04 — Human approval engine
Deliver:
- ApprovalRequest;
- approval inbox;
- edit/approve/reject;
- audit and immutable approved payload.

### Milestone AI-05 — Assisted WhatsApp send
Deliver:
- draft UI/skill;
- send executor;
- receipt;
- contact/timeline update.

Result: agent drafts, human approves, system sends.

### Milestone AI-06 — Qualification + Proposal
Deliver:
- Qualification;
- Proposal/versioning;
- pricing policy integration;
- proposal render/approval/send.

### Milestone AI-07 — Contract lifecycle
Deliver:
- Contract/templates;
- draft generation;
- approval;
- signature provider integration;
- signed artifact storage;
- obligations extraction.

### Milestone AI-08 — Client execution
Deliver:
- ClientProject;
- milestones;
- obligations/tasks;
- WAITING_CLIENT;
- agent onboarding follow-ups.

---

## 14. Acceptance gates

### Diagnostic gate
Given a known lead, the agent can:
1. collect public sources;
2. create business profile snapshot;
3. attach evidence;
4. generate a diagnostic;
5. compute score breakdown;
6. recommend service;
7. display all results in CRM;
8. preserve source links and uncertainty.

### WhatsApp read gate
Given a linked lead/conversation, agent can:
1. read conversation;
2. summarize;
3. identify opt-out;
4. identify commitments;
5. propose next action;
6. create internal tasks;
7. cannot send any message.

### Approval send gate
Agent cannot send without:
1. ApprovalRequest;
2. human approval;
3. exact approved payload;
4. unexpired approval;
5. policy checks;
6. receipt + audit.

### Contract gate
Signed contract must be linked to:
- exact proposal version;
- contract template/version;
- signed artifact;
- responsibilities;
- obligations generated from the signed version.

---

## 15. Non-goals for first release

- fully autonomous cold outreach;
- arbitrary browser actions inside client accounts;
- autonomous contract acceptance;
- autonomous price exceptions;
- generic project management unrelated to leads/clients;
- raw database access;
- storing model chain-of-thought.

---

## 16. Recommended immediate implementation order

1. BusinessProfile schema.
2. Diagnostic schema.
3. ScoreAssessment.
4. AiRun.
5. Lead Detail Diagnostic/Business Profile tabs.
6. MCP/domain tools for 1–4.
7. Prospecting Runs.
8. First four skills.
9. WhatsApp read-only.
10. Approval engine.
11. Assisted send.
12. Proposal.
13. Contract.
14. Obligations/Projects.
