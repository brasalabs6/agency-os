---
name: agencyos-domain-derived-state
description: Maintain AgencyOS denormalized/compatibility projections from an authoritative source instead of independently mutating duplicated state.
---

# AgencyOS Derived State

## Purpose

Prevent drift when one concept is represented both as authoritative data and as a compatibility/summary projection.

## Current model example

Lead next-action fields are derived from active tasks:

```text
LeadTask collection
      ↓
pickNextTask()
      ↓
Lead.nextAction
Lead.nextActionAt
Lead.nextActionOwnerId
```

Task data is the source of truth.

The lead fields are a projection for compatibility/query convenience.

## Rule: identify source of truth

For every duplicated/denormalized field, document:

```text
source:
projection:
sync function:
events that trigger sync:
```

Do not let two independent writers decide the same concept.

## Synchronization

Put projection sync in a focused service/domain helper.

Example:

```ts
await syncLeadNextAction(leadId);
```

Call it after mutations that can change the projection:

- task create;
- task update;
- complete/cancel;
- reschedule;
- reassignment;
- reorder when ordering affects selection.

## Pure selection logic

Prefer pure helpers for deciding the projection:

```ts
pickNextTask(tasks)
```

Test this independently from persistence.

## Failure behavior

If authoritative mutation succeeds but projection sync fails, treat it as a real service failure/consistency issue.

Do not silently ignore sync errors.

For future high-scale flows, an event/outbox architecture may be appropriate, but do not introduce asynchronous consistency for this MVP without a demonstrated need.

## API/UI behavior

Consumers may read the projection for convenience, but new writes should target the authoritative source.

Do not add a second generic write path that edits the projection directly.

If legacy compatibility requires direct projection commands, document how they coexist with the source and avoid divergence.

## Migration considerations

When introducing a projection:

1. add fields/table backward-compatibly;
2. backfill from source if needed;
3. deploy sync logic;
4. verify parity;
5. only then rely on projection for reads.

## Audit

Audit the authoritative business mutation.

Projection synchronization usually should not create a duplicate user-visible activity unless it is itself a meaningful business event.

## Testing

Test:

- pure selector;
- creation changes projection;
- completion/cancel selects next valid source;
- no active source clears projection;
- ordering/date rules;
- owner projection consistency.

## Anti-patterns

Do not:

- update source and projection with two unrelated algorithms;
- let UI write projection directly because it is convenient;
- treat denormalized field as authoritative without explicit decision;
- forget sync on one mutation path;
- duplicate activity for internal projection maintenance.

## Review checklist

```text
[ ] Source of truth identified
[ ] Projection purpose documented
[ ] One sync helper exists
[ ] All source mutations trigger sync
[ ] Selector is pure/tested where practical
[ ] Projection is not independently writable
[ ] Backfill/rollout considered if schema changes
```
