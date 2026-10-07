---
name: feature-spec-first
description: Produce an implementation-ready feature specification before cross-cutting AgencyOS changes.
---

# Feature Spec First

## Purpose

Turn a feature request into a versioned, reviewable contract before implementation.

Use this for changes where a wrong assumption can propagate across domain, database, UI, API, MCP, authentication, infrastructure or security.

## Trigger

Use for:

- authentication/authorization;
- database/schema changes;
- MCP capabilities or identity;
- external integrations;
- major workflow/domain changes;
- infrastructure/release architecture;
- any task where the user explicitly asks to plan/spec before implementation.

Do not use for tiny isolated fixes whose behavior is already unambiguous.

## Preconditions

Run `repo-state-recovery` first.

Read existing related specs. Extend or supersede them deliberately instead of creating conflicting documentation.

## Spec location

Default:

```text
docs/FEATURE-<UPPERCASE-DESCRIPTIVE-NAME>.md
```

Keep one canonical spec per feature when possible.

## Required sections

A production-quality spec should cover:

1. title, status and priority;
2. objective;
3. context/problem;
4. architectural decision;
5. functional goals;
6. non-goals;
7. domain/data model;
8. database/schema changes;
9. service/repository contracts;
10. API/MCP contracts;
11. UI/UX flow;
12. roles/permissions;
13. security properties;
14. invariants and conflict rules;
15. audit/observability;
16. migrations;
17. backward compatibility;
18. rollout phases;
19. rollback;
20. automated tests;
21. manual/E2E acceptance;
22. expected files;
23. production gates;
24. Definition of Done;
25. implementation status.

Use only sections that materially apply, but never omit security, rollout, tests or Definition of Done for a cross-cutting feature.

## Decision rules

### Separate desired behavior from implementation choice

State both:

```text
Requirement:
Each ChatGPT connection must be independently revocable.

Decision:
Use one opaque credential per AgencyOS user connection, stored by SHA-256 hash.
```

### Record rejected complexity

For MVP work, explicitly list what will not be built now.

Examples:

- OAuth;
- SSO;
- multi-tenant ACL;
- distributed rate limiter;
- automatic production migrations.

This prevents later agents from reintroducing unnecessary complexity.

### Make identity semantics explicit

For auth/MCP work distinguish:

- authenticated human;
- agent;
- principal user;
- credential;
- role;
- scope;
- ownership.

### Treat rollout as multiple stages

Specify separately:

- implementation;
- migration;
- deployment/configuration;
- activation;
- E2E/production verification.

## Spec-only rule

If the user asked for a spec before implementation:

- write only documentation;
- do not implement behavior;
- mark status as Proposed/Awaiting approval;
- end with the exact approval gate required before implementation.

When implementation is later approved, update status and any changed decisions.

## Evidence and precision

- Reference current file paths and existing contracts.
- Never invent current behavior; inspect it.
- Use concrete error codes/fields/routes when they are part of the contract.
- Call out known infrastructure risks explicitly.

## Handoff

A spec is ready when an implementation agent can answer:

- what to build;
- what not to build;
- where state lives;
- who is authorized;
- what invariants cannot break;
- how to migrate;
- how to roll back;
- how to prove it works.

## Completion criteria

- spec committed/versioned;
- no functional code changed when spec-only was requested;
- current status clearly marked;
- Definition of Done is testable;
- rollout and rollback are explicit.

## Common composition

```text
repo-state-recovery
→ feature-spec-first
→ user approval
→ safe-github-delivery
→ database-migration-guardian (if needed)
→ cicd-release-guardian
```
