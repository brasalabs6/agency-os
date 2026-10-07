---
name: agencyos-domain-guard
description: Encode and enforce AgencyOS business invariants in domain/services so UI, REST and MCP share the same authoritative rules.
---

# AgencyOS Domain Guard

## Purpose

Keep business policy in one authoritative place so every caller observes the same rules.

Use for rules such as:

- lead transition eligibility;
- DO_NOT_CONTACT restrictions;
- active-owner requirements;
- terminal task restrictions;
- schedule/date validity;
- duplicate/merge safety;
- permission/domain eligibility.

## Authority model

Use this hierarchy:

```text
UI guard     = guidance
API guard    = transport/auth boundary
Domain guard = authority
```

A disabled button is not enforcement. A hidden route is not enforcement.

If a rule matters, the service/domain layer must reject invalid operations regardless of caller.

## Pure vs orchestration guards

Prefer pure helpers under `src/lib/domain/*` for deterministic policy:

```ts
canTransition(from, to)
canContact(status)
isTerminalTask(status)
```

Use private service helpers for relational checks:

```ts
ensureOwnerExists(ownerId)
ensureAssignableUser(ownerId)
assertContactTaskAllowed(lead)
validateSchedule(input)
```

## Stable failure contract

Reject invalid operations with `DomainError` and stable machine codes.

Examples:

```text
INVALID_OWNER
INVALID_TASK_DATE
INVALID_TASK_TRANSITION
DNC_CONTACT_TASK_BLOCKED
STATUS_UPDATE_REQUIRES_TRANSITION
LAST_ADMIN_REQUIRED
```

Do not encode policy by returning `false` from deep service code when the caller needs a real domain failure.

## Cross-channel consistency

A rule must behave identically through:

- UI;
- REST;
- MCP;
- future agents/automations.

Do not add a special MCP bypass or UI-only exception unless the product spec explicitly requires it.

## Mutation flow

Apply guards before persistence:

```text
load current state
→ guard
→ related-entity validation
→ repository write
→ activity/audit
```

Do not write first and compensate later for predictable invalid commands.

## Review checklist

```text
[ ] Rule lives in domain/service layer
[ ] UI duplicates rule only for UX
[ ] Stable DomainError code exists
[ ] REST and MCP share the same service
[ ] Invalid command cannot persist partial state
[ ] Pure policy is unit tested
[ ] Negative case is tested
```

## Reference patterns

- `src/lib/domain/status.ts`
- `src/lib/domain/task.ts`
- `src/lib/services/leads.ts`
- `src/lib/services/tasks.ts`
- `src/lib/services/team.ts`
