---
name: agencyos-auditable-mutation
description: Implement AgencyOS mutations with the correct human-readable activity timeline and technical audit trail while preserving actor/tool attribution and excluding secrets.
---

# AgencyOS Auditable Mutation

## Purpose

Ensure meaningful state changes are explainable to users and operationally traceable.

AgencyOS uses two related but distinct records:

```text
Activity
= human-readable business timeline

Audit
= technical operation record
```

## When to emit Activity

Emit activity for user-visible business events such as:

- lead stage change;
- contact recorded;
- owner assignment;
- task created/completed/canceled/rescheduled;
- proposal/outcome event.

Activity summary should be understandable without reading raw JSON.

## When to emit Audit

Audit mutable operations that matter operationally, especially:

- MCP writes;
- auth/team administration;
- credential creation/revocation;
- lead/task mutations;
- important configuration-related commands.

## Actor attribution

Preserve the incoming `ActorContext`.

Possible actor types:

```text
USER
AGENT
SYSTEM
```

Do not rewrite an AGENT as USER merely because it has a `principalUserId`.

For MCP, keep enough metadata to distinguish:

- agent identity;
- linked principal user;
- credential/tool when relevant.

## Audit shape

Capture stable information such as:

```text
actor
tool
action
entity
safe input
result IDs/version
timestamp
```

Action names should be stable machine-readable strings:

```text
lead.create
lead.update
task.complete
credential.revoke
```

## Secret hygiene

Never audit:

- passwords;
- session tokens;
- raw MCP credentials;
- full query-string credential URLs;
- authorization headers;
- connection strings.

If correlation is needed, store non-secret identifiers/prefixes.

## Order relative to persistence

Typical command flow:

```text
persist successful mutation
→ activity
→ audit
→ derived-state sync if needed
```

If the mutation fails, do not emit a success activity.

Auth failures may have dedicated failure audits when the service intentionally records them.

## Human summary quality

Activity summary should answer:

```text
what changed?
to what?
by whom is already encoded by actor
```

Avoid raw payload dumps in timeline summaries.

## MCP tool attribution

When service accepts `tool?: string`, pass the MCP tool name into audit metadata.

Business logic must not diverge based on tool name.

## Testing

For important security/business operations, verify that:

- correct action is emitted;
- actor type/id is preserved;
- other user's action is distinguishable;
- secrets are absent;
- revoked/inactive credentials remain historically attributable by stable IDs.

## Anti-patterns

Do not:

- treat activity and audit as the same record;
- audit raw request objects wholesale;
- emit success activity before successful persistence;
- lose actor type;
- omit audit from MCP writes;
- use human prose as the only audit action identifier.

## Review checklist

```text
[ ] User-visible event has Activity
[ ] Operational mutation has Audit
[ ] ActorContext preserved
[ ] MCP tool attribution preserved when relevant
[ ] Stable action code used
[ ] Secrets excluded
[ ] Result/version captured where useful
[ ] Failure path does not emit success activity
```
