---
name: agencyos-ui-language
description: Preserve the AgencyOS visual language by reusing existing design tokens, primitives, badges and interaction classes before introducing new styling.
---

# AgencyOS UI Language

## Purpose

Keep UI produced by different agents visually coherent.

Before inventing new styles, search for an existing primitive/token.

## Existing vocabulary

Common classes/tokens include:

```text
surface
surface-flat
border-default
text-muted
var(--panel)
var(--panel-2)
var(--accent)
var(--accent-soft)
focus-ring
```

Common primitives include:

```text
PageHeader
EmptyState
ModalShell
StatusBadge
TaskStatusBadge
TaskPriorityBadge
```

And button/control classes in the UI kit.

## Rule: semantic tokens over raw colors

Prefer:

```tsx
className="surface-flat border-default text-muted"
```

over ad hoc:

```tsx
className="bg-white border-gray-300 text-gray-500"
```

unless the component intentionally represents a semantic alert/status not covered by existing tokens.

## Reuse before extension

Before adding a new component/style:

1. search `src/components`;
2. inspect `ui-kit.tsx`;
3. inspect similar page/component;
4. reuse or extend the closest primitive.

Create a new primitive only when the pattern will recur or existing primitives genuinely do not fit.

## Typography/hierarchy

Prefer a compact CRM hierarchy:

- page title via `PageHeader`;
- small section headings;
- muted secondary metadata;
- badges for status/priority;
- dense but readable data views.

Do not introduce unrelated marketing-site typography into app surfaces.

## Interaction states

Use existing focus/hover/disabled conventions.

Every interactive element needs:

- visible focus;
- disabled state when unavailable;
- semantic button/link element;
- accessible label when icon-only.

## Dark mode

Use project variables/classes so dark mode inherits correctly.

Avoid raw white/black assumptions unless the semantic component explicitly requires them and both modes are handled.

## Status color semantics

Reuse existing badge components instead of duplicating status-to-color maps.

One status should not receive different colors in different pages.

## Empty/loading/error states

Prefer existing `EmptyState` and established error containers.

Do not make empty states look like failures.

Do not hide errors in console-only messages.

## Responsive consistency

UI-language decisions should compose with `agencyos-responsive-data-view`.

Mobile may change layout, not brand vocabulary.

## Anti-patterns

Do not:

- introduce one-off color systems;
- duplicate badge logic;
- create new button styling per component;
- use raw gray/white values where theme tokens exist;
- add a new design library for a single feature;
- encode business status only through color.

## Review checklist

```text
[ ] Existing primitive searched first
[ ] Theme variables/tokens reused
[ ] Status badge logic reused
[ ] Focus/disabled states present
[ ] Dark mode preserved
[ ] Mobile and desktop share visual language
[ ] No unnecessary new design dependency
```
