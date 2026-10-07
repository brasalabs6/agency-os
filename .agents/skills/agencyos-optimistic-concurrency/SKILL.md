---
name: agencyos-optimistic-concurrency
description: Implement AgencyOS version-aware writes with expectedVersion, conditional persistence and explicit 409 conflicts.
---

# AgencyOS Optimistic Concurrency

## Purpose

Prevent silent overwrites when two users/agents edit the same mutable entity.

Use for shared entities that expose a `version` field.

## Canonical flow

```text
read entity version = 7
→ client/agent sends expectedVersion = 7
→ repository updates WHERE id = ? AND version = 7
→ success increments version to 8

zero rows + expectedVersion supplied
→ VERSION_CONFLICT
→ HTTP 409
```

## Service contract

Commands/updates should accept:

```ts
expectedVersion?: number
```

When concurrency matters, propagate it unchanged from boundary to repository.

## Repository behavior

For versioned updates:

```text
WHERE id = :id
AND version = :expectedVersion
```

and increment:

```text
version = version + 1
```

Return `null` when no row matched.

Do not decide 404 vs 409 inside the repository.

## Service disambiguation

Pattern:

```ts
if (updated) return updated;

if (input.expectedVersion != null) {
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
```

Use entity-specific codes when the existing service does so.

## Client behavior

Send the version rendered with the entity.

On 409:

- show the server error;
- refresh/reload the canonical state;
- let the user/agent reconsider the mutation.

Do not silently retry with the latest version.

## MCP behavior

MCP writes that mutate versioned entities should accept/propagate `expectedVersion` when the underlying command uses it.

Agents must not bypass conflict detection.

## Testing

Test:

- successful expected version;
- stale expected version returns conflict;
- version increments once;
- no silent overwrite occurs.

## Anti-patterns

Do not:

- omit `expectedVersion` from a UI/API path while another path uses it for the same mutation;
- convert conflict to generic 400;
- automatically re-read and retry;
- increment version in UI/client;
- rely on timestamps instead of the established version contract.

## Review checklist

```text
[ ] Entity exposes version
[ ] Boundary accepts expectedVersion
[ ] Repository conditions on version
[ ] Successful write increments version
[ ] Service maps stale write to 409
[ ] Client surfaces conflict
[ ] MCP path preserves concurrency
[ ] Tests cover stale version
```
