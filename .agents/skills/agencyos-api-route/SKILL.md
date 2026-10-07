---
name: agencyos-api-route
description: Implement thin AgencyOS REST route handlers that authenticate, validate input, call services and normalize HTTP responses without owning business logic.
---

# AgencyOS API Route

## Purpose

Keep REST endpoints boring, predictable and thin.

Route handlers are transport adapters. They translate HTTP into service calls and service/domain errors back into HTTP.

They are not the domain layer.

## Canonical dependencies

Use helpers from:

```text
src/lib/services/http.ts
```

including:

```ts
apiActor()
apiUser()
ok()
created()
errorResponse()
assertSameOrigin()
```

Use Zod schemas from `src/lib/validation/*`.

Call services from `src/lib/services/*`.

## Canonical write route

Preferred shape:

```ts
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await apiActor();
    const { id } = await params;
    const input = schema.parse(await request.json());

    return ok(await command(id, input, actor));
  } catch (error) {
    return errorResponse(error);
  }
}
```

For create semantics:

```ts
return created(await createSomething(input, actor));
```

## Canonical read route

```ts
export async function GET(request: NextRequest) {
  try {
    await apiActor();
    const query = querySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    return ok(await listSomething(query));
  } catch (error) {
    return errorResponse(error);
  }
}
```

Prefer a Zod query schema over scattered manual coercion when adding new endpoints.

## Authentication selection

### Domain operation attributed to a human actor

Use:

```ts
const actor = await apiActor();
```

Pass `actor` to the service.

### User/account operation

Use:

```ts
const user = await apiUser();
```

### Admin-only behavior

Authorization should live in the appropriate auth/team service helper, not a client-side check.

## CSRF / same-origin

For cookie-authenticated mutable endpoints whose existing family uses same-origin protection, call:

```ts
assertSameOrigin(request);
```

Do not rely on hidden buttons or UI reachability as authorization.

## Validation responsibilities

Route/Zod layer validates transport structure:

- JSON shape;
- required fields;
- enums;
- UUIDs;
- dates;
- ranges;
- query coercion.

Service validates business meaning:

- transition allowed;
- owner active;
- entity exists;
- DNC;
- version conflict;
- permission/domain invariant.

## Params

Next route params are asynchronous in the current app pattern:

```ts
{ params }: { params: Promise<{ id: string }> }

const { id } = await params;
```

Use the current project convention instead of mixing framework-era patterns.

## Empty bodies

For commands where request body is optional, follow the existing defensive pattern:

```ts
const input = schema.parse(
  await request.json().catch(() => ({})),
);
```

Do not use this when a body is required; let malformed/missing input fail validation.

## Response shape

Success:

```text
ok(data)      → HTTP 200
created(data) → HTTP 201
```

Errors are normalized by:

```ts
errorResponse(error)
```

Domain error response contract:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": {}
  }
}
```

Do not invent different error response formats per endpoint.

## Semantic endpoint design

Prefer routes matching business commands:

```text
POST /api/leads/:id/stage
POST /api/leads/:id/contact
POST /api/tasks/:id/complete
POST /api/tasks/:id/cancel
POST /api/tasks/:id/reschedule
POST /api/mcp-credentials/:id/revoke
```

Use generic `PATCH /resource/:id` for ordinary field editing, not important state-machine transitions.

## Route handler should NOT

Do not:

- import `getDb()`;
- import concrete repositories;
- enforce DNC directly;
- implement transition matrices;
- increment versions manually;
- add activity/audit directly when the service owns the mutation;
- duplicate a service calculation;
- contain UI-specific labels;
- swallow errors and return ad hoc 500 responses.

## Quick review checklist

```text
[ ] Auth helper called
[ ] Params parsed
[ ] Zod validates external input
[ ] Route calls exactly the intended service command
[ ] Actor/user passed when required
[ ] Uses ok()/created()/errorResponse()
[ ] No repository/database import
[ ] No business rules in route
[ ] Semantic transition has semantic endpoint
```

## Reference examples

- `src/app/api/leads/route.ts`
- `src/app/api/leads/[id]/route.ts`
- `src/app/api/leads/[id]/stage/route.ts`
- `src/app/api/leads/[id]/contact/route.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/[id]/complete/route.ts`
