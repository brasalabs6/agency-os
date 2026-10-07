---
name: agencyos-server-page
description: Build AgencyOS Next.js pages as Server Components that authenticate and read through services, then pass data to focused client islands only when interaction is required.
---

# AgencyOS Server Page

## Purpose

Keep initial page rendering server-first.

AgencyOS pages under `src/app/(app)/**/page.tsx` should normally be Server Components that:

- authenticate on the server;
- parse route/search parameters;
- call services directly for reads;
- compose the page from existing components;
- pass already-loaded data into Client Components only when interaction is needed.

## Default pattern

```tsx
export default async function ExamplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCurrentUser();
  const raw = await searchParams;
  const filters = parseFilters(raw);

  const result = await searchSomething(filters);

  return <>
    <PageHeader
      title="..."
      description="..."
    />
    <InteractiveComponent
      initialData={result.items}
      currentUserId={user.id}
    />
  </>;
}
```

Not every page needs a Client Component.

## Authentication

Use the most specific server helper:

```ts
requireCurrentUser()
requireAdminUser()
requireAppActor()
```

Do not defer initial auth to a client `useEffect`.

Protected layout already establishes authenticated app scope, but pages may still need the current user/actor for ownership or role-specific data.

## Service reads

Call services directly:

```ts
await searchLeads(...)
await listTasks(...)
await listUsers(...)
```

Do not do this inside a Server Component:

```ts
await fetch("/api/leads")
```

The REST API exists for browser/external transport. The page already runs on the server and can use the service layer directly.

## Search params

Normalize search params on the server and convert them into domain filter types.

Current lead-list pattern:

```text
searchParams
→ normalize string/string[]
→ quick/filter semantics
→ LeadSearchFilters
→ searchLeads()
```

Prefer shared Zod/query helpers when a stable filter contract already exists.

Do not copy URL-specific values directly into repository queries.

## 404/domain errors

For detail pages:

- translate a known 404 `DomainError` to Next `notFound()`;
- rethrow unexpected errors.

Pattern:

```ts
try {
  data = await getEntity(id);
} catch (error) {
  if (
    error instanceof DomainError &&
    error.status === 404
  ) {
    notFound();
  }
  throw error;
}
```

Do not catch every error and render “not found”.

## Composition

Pages should mostly compose:

- `PageHeader`;
- server-rendered detail sections;
- focused interactive client components;
- existing badges/primitives.

Keep orchestration in the page; move reusable presentation into components.

## Server vs Client decision

Stay Server Component when behavior is:

- initial data load;
- auth;
- URL/query parsing;
- static rendering from current server state;
- composition.

Use a Client Component for:

- click handlers;
- local filters/tabs;
- modal state;
- forms;
- optimistic/local interaction;
- browser APIs.

Do not add `"use client"` to a page merely because a child is interactive.

## Data handoff to client

Pass serializable domain views and IDs.

Good:

```tsx
<TasksWorkspace
  tasks={tasks.items}
  leads={leads.items}
  users={users}
  currentUserId={actor.id}
/>
```

Avoid passing repository instances, database rows, functions or server-only secrets.

## Responsive page structure

Page-level layout should support existing responsive components rather than forcing desktop-only geometry.

Prefer:

```text
flex-col → larger breakpoint row
single column → xl split content/aside
client component handles mobile cards vs desktop table
```

## Anti-patterns

Do not:

- fetch internal API routes from Server Components for normal reads;
- put repository access in pages;
- use client effects for initial page load;
- turn the entire page into a Client Component to support one button;
- swallow service errors into arbitrary UI states;
- duplicate domain filtering logic that already exists in a service/domain helper.

## Review checklist

```text
[ ] Page remains Server Component unless truly necessary
[ ] Auth happens server-side
[ ] Reads go through services
[ ] Search/route params normalized
[ ] 404 handling is specific
[ ] Client islands receive serializable initial data
[ ] Existing page/UI primitives reused
[ ] No repository/database import
[ ] No internal REST fetch for server reads
```

## Reference examples

- `src/app/(app)/leads/page.tsx`
- `src/app/(app)/leads/[id]/page.tsx`
- `src/app/(app)/tasks/page.tsx`
- `src/app/(app)/layout.tsx`
