---
name: mcp-user-identity
description: Implement or review per-user ChatGPT MCP credentials, agent identity, ownership semantics and isolated revocation in AgencyOS.
---

# MCP User Identity

## Purpose

Allow multiple humans to connect their own ChatGPT instances to the same AgencyOS MCP while preserving distinct identity, ownership, audit and revocation.

Use this skill for MCP authentication modes, credentials, `mcp_whoami`, personal ownership semantics and multi-account E2E.

## Identity model

Keep these concepts distinct:

```text
Human User
  └── MCP Credential
        └── ChatGPT / Agent Actor
              └── principalUserId → Human User
```

Do not turn the ChatGPT actor into `USER`.

Expected actor semantics:

```ts
{
  type: "AGENT",
  id: "mcp:<credential-id>",
  name: "ChatGPT · <human-name>",
  principalUserId: "<human-user-id>",
  credentialId: "<credential-id>",
  scopes: [...]
}
```

## Authentication modes

Preserve supported modes unless a migration/spec explicitly removes one:

```text
none
token
user_query_token
oauth
```

Typical roles:

- `none`: development only;
- `token`: global Bearer fallback/manual clients;
- `user_query_token`: per-user ChatGPT MVP;
- `oauth`: future/advanced official auth.

Do not accidentally force Bearer parsing before branching on `user_query_token`.

## Credential design

Use high-entropy opaque secrets.

Recommended shape:

```text
agmcp_<32 random bytes encoded base64url>
```

Rules:

- raw secret shown only once;
- never store raw token;
- store SHA-256 lookup hash;
- store short non-secret prefix for UI;
- support multiple credentials per user;
- retain revoked credential metadata for audit;
- never hard-delete identity history merely to revoke access.

## Query-token security

A URL such as:

```text
/mcp?key=<secret>
```

contains a credential.

Treat the whole URL as secret.

Never:

- log `request.url` on MCP paths;
- persist full Server URL;
- include query credential in audit;
- return it from MCP tools;
- echo it in error messages.

Prefer HTTPS and immediate revocation on suspected exposure.

## Per-user credential management

Each authenticated AgencyOS user should manage their own credentials.

Typical operations:

- list own credential metadata;
- create new connection;
- show secret/Server URL once;
- revoke own credential;
- rotate by creating new → testing → revoking old.

ADMIN does not need to recover another user's raw secret.

## User deactivation

When a human user becomes inactive:

1. web sessions are revoked;
2. all MCP credentials belonging to that user are revoked/invalidated;
3. other users' credentials remain unaffected;
4. historical audit remains attributable.

Authorization should also check current user active state, not only credential.active.

## Scopes

Persist scopes on the credential.

The server, not the ChatGPT client, decides effective scopes.

Every tool continues through `requireScope` or equivalent domain authorization.

Do not give MCP administrative Team/Auth capabilities by default.

## Personal semantics

Use `actor.principalUserId` for "me".

### Read selectors

Tools may expose:

```ts
mine?: boolean
```

When true:

```text
ownerId = actor.principalUserId
```

### Write selectors

Relevant writes may expose:

```ts
assignToMe?: boolean
```

When true, assign to principal user.

Reject ambiguity:

```text
ownerId + mine
ownerId + assignToMe
→ MCP_OWNER_SELECTOR_CONFLICT
```

If no human principal exists for a personal operation:

```text
MCP_PRINCIPAL_REQUIRED
```

## mcp_whoami

Provide a read-only diagnostic tool that returns safe identity metadata:

- agent id/name/type;
- linked human id/name/role when present;
- credential id/name;
- scopes.

Never return secret, token hash or secret URL.

This tool is the first E2E check after connecting ChatGPT.

## Audit/timeline

Expected distinction:

```text
User A updated lead.
ChatGPT · User A created task.
Partner recorded call.
ChatGPT · Partner added note.
```

Store enough stable IDs to distinguish credentials even after revocation.

## Repository/data model

For per-user credentials use a dedicated repository/service boundary.

Expected concerns:

- list by user;
- create;
- resolve active by token hash;
- revoke one;
- revoke all for user;
- touch last-used timestamp.

Do not let routes/UI query credential tables directly.

## Production activation gate

Do not switch production to `MCP_AUTH_MODE=user_query_token` merely because code deployed.

First verify:

1. migration applied;
2. UI can create separate credentials for both users;
3. each ChatGPT is configured with its own Server URL;
4. query parameter survives discovery/calls/reconnection;
5. `mcp_whoami` resolves correct user;
6. read tools work;
7. write tools work;
8. "my tasks/leads/calendar" resolves principal ownership;
9. revoking A does not affect B;
10. rotating A works;
11. inactive user is denied.

Only then activate production mode.

## Rollback

Keep legacy `token` mode available until multi-user E2E is proven.

If ChatGPT stops preserving query parameters or another integration constraint appears:

- revert auth mode/config;
- leave credential schema/data intact;
- do not destructively remove credentials;
- design OAuth/alternative transport separately.

## Completion criteria

MCP identity work is complete only when:

- identity model is correct;
- secrets are not persisted/logged;
- per-user isolation is proven;
- audit remains AGENT + principal;
- two-account E2E passes when production activation is requested.

## Common composition

```text
repo-state-recovery
→ feature-spec-first
→ mcp-user-identity
→ database-migration-guardian
→ safe-github-delivery
→ cicd-release-guardian
→ two-account E2E
```
