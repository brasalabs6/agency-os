---
name: agencyos-domain-command
description: Implement AgencyOS business mutations as semantic service commands with invariants, optimistic concurrency, actor attribution, activity, audit and derived-state synchronization.
---

# AgencyOS Domain Command

## Purpose

Define the standard shape for meaningful business mutations.

Use this recipe when an operation represents an event in the business, not just editing an ordinary field.

Examples:

- move a lead stage;
- record contact;
- mark outcome;
- complete/cancel/reschedule task;
- revoke credential;
- deactivate user.

## Semantic commands over generic updates

Prefer:

```text
moveLeadStage()
recordContact()
completeTask()
cancelTask()
rescheduleTask()
revokeOwnMcpCredential()
```

over:

```text
updateLead({ status: ... })
updateTask({ status: ... })
updateCredential({ active: false })
```

The code already protects this boundary: ordinary lead update does not own status transitions.

## Canonical command pipeline

A typical command follows:

```text
1. load current entity
2. assert existence
3. assert domain invariant / transition
4. validate related entity references
5. validate schedule/value semantics
6. persist using expectedVersion when applicable
7. convert zero-row optimistic update into DomainError 409
8. append human-readable activity
9. append technical audit
10. synchronize derived state
11. return updated domain view
```

Not every command needs every step, but preserve the order and intent.

## 1. Must-load helpers

Use focused helpers:

```ts
async function mustLead(id: string) { ... }
async function mustTask(id: string) { ... }
```

Missing entities should produce stable `DomainError` codes.

Example:

```ts
throw new DomainError(
  "Task not found",
  "TASK_NOT_FOUND",
  404,
);
```

## 2. Domain guards

Keep reusable pure policy in `src/lib/domain/*` when possible:

```ts
canContact(...)
canTransition(...)
```

Service-specific relational guards may remain private service helpers:

```ts
ensureOwnerExists(...)
assertContactTaskAllowed(...)
validateSchedule(...)
```

The service is authoritative even if the UI also disables the action.

## 3. Optimistic concurrency

For mutable shared entities, take `expectedVersion`.

Repository update should constrain on both:

```text
id
version = expectedVersion
```

A missing result with `expectedVersion` supplied means conflict, not not-found.

Example pattern:

```ts
function ensureVersion<T>(
  result: T | null,
  expectedVersion?: number,
): T {
  if (result) return result;

  if (expectedVersion != null) {
    throw new DomainError(
      "Entity changed since it was read.",
      "VERSION_CONFLICT",
      409,
    );
  }

  throw new DomainError(
    "Entity not found",
    "ENTITY_NOT_FOUND",
    404,
  );
}
```

Do not silently retry a conflict with a newer version.

## 4. Actor attribution

Write commands receive `ActorContext` where business attribution matters.

Actor may be:

```text
USER
AGENT
SYSTEM
```

Do not reconstruct the actor inside repository code.

The service passes actor identity to activity/audit.

## 5. Activity vs audit

These are different outputs.

### Activity

Human-readable timeline event.

Example:

```text
"Tarefa concluída: Enviar proposta"
```

### Audit

Technical operation record.

Example action names:

```text
lead.create
lead.update
task.create
task.complete
task.cancel
task.reschedule
```

MCP writes must be auditable.

Never put secrets into audit input/result.

## 6. Derived-state synchronization

If a mutation changes the source of truth for a projection, update the projection from the source.

Current example:

```text
Task state
  ↓
pickNextTask()
  ↓
Lead.nextAction*
```

Task commands call:

```ts
syncLeadNextAction(leadId)
```

Do not independently edit both task state and the lead projection with unrelated logic.

## 7. Terminal state handling

Terminal entities should have explicit rules.

Current task behavior:

```text
DONE / CANCELED
→ cannot be edited/rescheduled/re-completed
```

Current lead policy centralizes transition rules in domain helpers.

Do not infer terminal behavior from UI labels.

## 8. Error codes are API contracts

Use stable machine codes.

Examples:

```text
LEAD_NOT_FOUND
TASK_NOT_FOUND
VERSION_CONFLICT
TASK_VERSION_CONFLICT
INVALID_OWNER
INVALID_TASK_DATE
INVALID_TASK_TRANSITION
DNC_CONTACT_TASK_BLOCKED
STATUS_UPDATE_REQUIRES_TRANSITION
```

Do not replace a specific domain code with a generic `BAD_REQUEST` unless the domain truly has no better classification.

## 9. Tool attribution

When a service can be called by MCP, accept an optional tool name when useful for audit:

```ts
tool?: string
```

Pass it into audit metadata. Do not branch business logic based on whether the caller is MCP versus REST/UI.

## Example skeleton

```ts
export async function performCommand(
  id: string,
  input: CommandInput,
  actor: ActorContext,
  tool?: string,
) {
  const before = await mustEntity(id);

  assertAllowed(before, input);
  await ensureRelatedEntity(input.ownerId);

  const updated = ensureVersion(
    await repo().update(id, input),
    input.expectedVersion,
  );

  await addActivity({
    entityId: updated.id,
    actor,
    type: "SOMETHING_HAPPENED",
    summary: "...",
  });

  await addAudit({
    actor,
    tool,
    action: "entity.command",
    input: safeAuditInput(input),
    result: {
      id: updated.id,
      version: updated.version,
    },
  });

  await syncProjectionIfNeeded(updated);

  return updated;
}
```

## Anti-patterns

Do not:

- change business status through generic update when a command exists;
- put transition policy only in route/UI;
- let repository decide domain transition;
- silently overwrite a newer version;
- emit audit but forget activity for user-visible business events;
- emit secrets in audit;
- maintain derived fields with duplicated ad hoc logic.

## Completion checklist

```text
[ ] Command has a business verb
[ ] Current state loaded first
[ ] Domain invariants enforced
[ ] Related references validated
[ ] expectedVersion handled if shared mutable entity
[ ] Stable DomainError codes used
[ ] Actor attribution preserved
[ ] Activity emitted when user-visible
[ ] Audit emitted when operationally significant
[ ] Derived state synchronized
[ ] Regression/domain tests added
```
