---
name: agencyos-client-mutation
description: Implement AgencyOS interactive client mutations with local UI state, thin API calls, version-aware writes, visible errors and server re-synchronization.
---

# AgencyOS Client Mutation

## Purpose

Define the standard client-side interaction pattern for browser writes.

AgencyOS keeps canonical business state on the server. Client Components own interaction state, not domain authority.

## When to use

Use `"use client"` for:

- forms;
- modals;
- tabs/filters;
- button-driven mutations;
- browser APIs;
- local projections that improve responsiveness.

Do not use this recipe for initial data loading that belongs in a Server Component.

## Canonical flow

```text
server-rendered initial data
        ↓
local UI state
        ↓
user action
        ↓
fetch /api/*
        ↓
parse normalized response
        ↓
update local projection when useful
        ↓
router.refresh()
        ↓
server state becomes canonical again
```

## Mutation request

Typical shape:

```ts
const response = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify(input),
});

const body = await response.json();

if (!response.ok) {
  throw new Error(
    body?.error?.message ?? "Falha na operação",
  );
}

return body;
```

For shared helpers, prefer one typed client utility rather than duplicating subtly different error parsing everywhere.

Do not move business rules into the helper.

## expectedVersion

When mutating a versioned entity, send the version rendered with that entity:

```ts
{
  ...changes,
  expectedVersion: entity.version,
}
```

On conflict, surface the server error and refresh/reload rather than silently retrying over newer data.

## Busy/error state

Interactive mutation UI should generally maintain:

```ts
const [busy, setBusy] = useState(false);
const [error, setError] = useState<string | null>(null);
```

Pattern:

```ts
setBusy(true);
setError(null);

try {
  const result = await mutate();
  applyLocalResult(result);
  router.refresh();
} catch (error) {
  setError(
    error instanceof Error
      ? error.message
      : "Erro inesperado",
  );
} finally {
  setBusy(false);
}
```

Disable destructive/double-submit controls while busy.

## Local projection

When the mutation returns an updated domain view, update the local collection immediately if it improves UX.

Example:

```ts
function upsert(task: LeadTaskView) {
  setTasks((current) =>
    current.some((item) => item.id === task.id)
      ? current.map((item) =>
          item.id === task.id ? task : item
        )
      : [...current, task],
  );

  router.refresh();
}
```

The local update is a projection. The subsequent refresh re-synchronizes server-rendered state and related projections.

## Forms

Existing code commonly uses browser `FormData` for modest forms.

Good fit:

- simple text/select inputs;
- modal forms;
- no need for a separate form-state library.

Convert empty optional values deliberately:

```ts
ownerId: data.get("ownerId") || null
```

Convert browser-local datetimes to ISO before sending:

```ts
const value = data.get("dueAt");
const dueAt = value
  ? new Date(String(value)).toISOString()
  : null;
```

Server Zod remains authoritative for transport validation.

## Modal interactions

Use `ModalShell` rather than implementing raw fixed overlays.

It already provides:

- dialog ARIA;
- Escape handling;
- focus trapping;
- focus restore;
- body scroll lock;
- backdrop dismissal;
- responsive mobile/desktop geometry.

Client code should only manage:

```text
open/mode
busy
error
form content
mutation
```

## Domain guards in UI

UI may improve usability:

```tsx
disabled={lead.doNotContact}
```

But this is not authorization or domain enforcement.

The service must still reject the operation.

Think:

```text
UI guard     = guidance
domain guard = authority
```

## Filtering/view state

For client-only views over already loaded data, use local state + `useMemo`.

Examples:

- task tabs;
- local query;
- priority/owner filter.

For filters that define server result sets, pagination or shareable URLs, prefer server/searchParams rather than loading everything and filtering indefinitely on the client.

## Accessibility

Interactive controls need:

- semantic button/link elements;
- accessible labels for icon-only buttons;
- disabled state;
- visible error state;
- focus-ring classes;
- modal focus behavior through `ModalShell`.

Do not use clickable `div` for actions.

## Anti-patterns

Do not:

- call repositories from client code;
- implement domain transitions in React;
- mutate canonical state only locally without a server write;
- silently ignore 409/version conflicts;
- use `useEffect` as the default initial loader;
- create a global Redux-like store for ordinary MVP page state;
- hand-roll another modal shell;
- hardcode a different API error format.

## Review checklist

```text
[ ] "use client" is actually needed
[ ] Initial data comes from server/page
[ ] Mutation uses /api/*
[ ] expectedVersion included where relevant
[ ] Busy state prevents accidental duplicate write
[ ] Server error visible to user
[ ] Local projection updated only when useful
[ ] router.refresh() re-synchronizes canonical state
[ ] Domain guard remains server-side
[ ] Existing ModalShell/ui-kit reused
[ ] Accessibility labels/states present
```

## Reference examples

- `src/components/lead-actions.tsx`
- `src/components/tasks-workspace.tsx`
- `src/components/mcp-credentials-settings.tsx`
- `src/components/task-form.tsx`
- `src/components/modal-shell.tsx`
