---
name: agencyos-form-modal
description: Build AgencyOS modal forms using the existing ModalShell, accessible focus behavior, predictable busy/error state and API mutation flow.
---

# AgencyOS Form Modal

## Purpose

Standardize modal forms and avoid reimplementing accessibility and overlay behavior.

## Use ModalShell

Use:

```text
src/components/modal-shell.tsx
```

Do not create a raw fixed-position overlay for ordinary product forms.

The existing shell provides:

- `role=dialog`;
- `aria-modal`;
- labelled/described dialog structure;
- Escape close;
- focus trap;
- focus restoration;
- body scroll lock;
- backdrop dismissal;
- responsive mobile/desktop treatment.

## Component state

Typical modal state:

```ts
open / mode
busy
error
initial entity
```

Keep form submission state local unless there is a demonstrated cross-page need.

## Submission pattern

```text
submit
→ set busy
→ clear error
→ collect/normalize form values
→ call /api/*
→ parse normalized error
→ update local projection
→ router.refresh()
→ close
```

Disable duplicate submission while busy.

## FormData

For modest forms, browser `FormData` is acceptable and consistent with the project.

Normalize empty optional fields intentionally.

Example:

```ts
ownerId: data.get("ownerId") || null
```

Convert datetime-local values to ISO before API submission.

## Edit forms

When modal body state depends on the selected entity, prefer mounting/resetting by a stable key rather than synchronizing large form state in a `useEffect`.

This avoids effect-driven state resets and lint/react-hooks issues.

## Validation

Client may provide required/min/max hints for UX.

Server Zod and service/domain rules remain authoritative.

Do not duplicate complex domain validation in the form.

## Accessibility

Every field needs a real label or accessible label.

Icon-only buttons need `aria-label`.

Errors should be visible in the dialog and not rely on console output.

## Destructive actions

For revoke/cancel/delete-like actions:

- make wording explicit;
- disable while busy;
- confirm when accidental activation would be costly;
- never imply hard-delete if the domain uses revocation/archive.

## Responsive behavior

Modal should remain usable on mobile:

- bounded viewport height;
- scrollable content;
- touch-friendly controls;
- no desktop-only fixed widths.

Use existing shell behavior before adding layout exceptions.

## Anti-patterns

Do not:

- implement another focus trap;
- use clickable divs;
- close before mutation succeeds unless deliberately optimistic;
- hide server error details from the user;
- persist raw form state globally without need;
- enforce business authorization only in UI.

## Review checklist

```text
[ ] Uses ModalShell
[ ] Focus/Escape handled by shell
[ ] Busy state prevents duplicate writes
[ ] Errors visible
[ ] Form values normalized
[ ] Server remains validation authority
[ ] Successful mutation refreshes canonical state
[ ] Mobile layout remains usable
```
