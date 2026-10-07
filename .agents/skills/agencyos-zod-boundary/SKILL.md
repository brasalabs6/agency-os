---
name: agencyos-zod-boundary
description: Validate AgencyOS external input with Zod at transport boundaries while leaving relational and business semantics to services/domain rules.
---

# AgencyOS Zod Boundary

## Purpose

Keep transport validation consistent without turning Zod schemas into a second domain layer.

Use for REST bodies, query parameters, form payloads and other external input.

## Responsibility split

```text
Zod
= shape and primitive validity

Service/domain
= business meaning
```

Examples:

```text
Zod:
ownerId is UUID

Service:
ownerId belongs to an active assignable user
```

```text
Zod:
startAt/endAt are datetimes

Service:
endAt >= startAt
```

## File location

Prefer focused schemas under:

```text
src/lib/validation/
```

Examples:

- `lead.ts`
- `task.ts`

## Schema composition

Prefer reuse:

```ts
export const updateSchema = createSchema
  .partial()
  .omit({ immutableField: true })
  .extend({
    expectedVersion: z.number().int().positive().optional(),
  });
```

Avoid copying field definitions across create/update/query schemas.

## Query parsing

For new endpoints, prefer one Zod query schema over scattered manual coercion.

Normalize string values into:

- booleans;
- integers;
- arrays/enums;
- optional UUIDs;
- dates.

Keep URL/search-param mechanics outside repositories.

## Nullable vs optional

Be deliberate:

```text
optional
= field omitted, keep current/default behavior

nullable
= explicit null clears value
```

Do not collapse them unless the domain contract says they are equivalent.

## Dates

Validate ISO/datetime shape at boundary. Convert to `Date` only where persistence/domain helpers need it.

Browser-local datetime conversion belongs in client interaction; domain schedule validity belongs in service.

## Error handling

Let Zod errors flow through the established `errorResponse()` path.

Do not create ad hoc response structures per route.

## Anti-patterns

Do not put these in Zod:

- DB existence checks;
- active-user lookup;
- transition matrix;
- DNC enforcement;
- dedupe merge decisions;
- authorization;
- optimistic-concurrency resolution.

## Review checklist

```text
[ ] External input has a schema
[ ] Schemas reuse existing domain constants
[ ] Query coercion centralized
[ ] nullable/optional semantics intentional
[ ] Relational rules stay in service
[ ] Authorization stays outside Zod
[ ] API route remains thin
```
