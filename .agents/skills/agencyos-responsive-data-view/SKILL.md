---
name: agencyos-responsive-data-view
description: Build AgencyOS data-heavy views with touch-first mobile cards and denser desktop tables/workspaces rather than squeezing desktop layouts onto phones.
---

# AgencyOS Responsive Data View

## Purpose

Keep CRM workflows usable on both phone and desktop.

The project is used on mobile, so responsive behavior is a product requirement, not visual polish.

## Core pattern

For data-heavy views:

```text
mobile
→ cards / stacked information / touch-first actions

desktop
→ table / grid / dense workspace
```

Typical Tailwind split:

```text
lg:hidden
hidden lg:block
```

Do not force the desktop table to become the mobile UI through horizontal scrolling unless the data truly requires it.

## Mobile hierarchy

On smaller screens prioritize:

1. primary identity/title;
2. status/priority;
3. next action/date;
4. owner/context;
5. primary action;
6. secondary metadata.

Hide or defer lower-value columns instead of shrinking everything.

## Desktop hierarchy

Desktop can use:

- more columns;
- denser rows;
- side panels;
- compact actions;
- richer filtering.

Do not remove information needed for efficient desktop operation just to mirror mobile cards exactly.

## Controls

Mobile controls should be touch-friendly.

Avoid tiny icon clusters with no spacing.

Icon-only actions need accessible labels.

## Filters

On mobile, filters may stack or collapse into compact controls.

On desktop, inline filter bars are appropriate.

Preserve URL-backed filters when they represent server result state.

## Tables

When a true table remains necessary:

- preserve readable minimum widths;
- avoid wrapping identifiers/status into unreadable fragments;
- provide mobile alternative when the same workflow can be expressed as cards.

## Modals/forms

Responsive data views should compose with `ModalShell` and the form recipe rather than create separate mobile overlays.

## Visual consistency

Reuse:

- status badges;
- priority badges;
- `surface` / `surface-flat`;
- existing spacing tokens/classes;
- muted text hierarchy.

## Anti-patterns

Do not:

- rely on hover for required actions;
- require horizontal scrolling for ordinary lead/task management;
- copy desktop column count into mobile;
- hide the only path to a mutation on mobile;
- make mobile a simplified read-only version unless product rules require it.

## Review checklist

Test mentally or empirically at:

```text
~360-400px phone
tablet-ish width
desktop >= lg
```

Check:

```text
[ ] No clipped primary action
[ ] No required hover interaction
[ ] Touch controls are usable
[ ] Mobile information hierarchy is intentional
[ ] Desktop retains useful density
[ ] Filters/actions remain reachable
[ ] Modal/forms remain within viewport
```
