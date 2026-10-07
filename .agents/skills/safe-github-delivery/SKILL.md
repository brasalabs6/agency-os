---
name: safe-github-delivery
description: Deliver AgencyOS changes through GitHub without overwriting concurrent work or promoting unreviewed code.
---

# Safe GitHub Delivery

## Purpose

Make repository writes concurrency-safe, reviewable and reversible.

This skill applies to branches, commits, PRs and explicitly authorized direct-main changes.

## Preconditions

Run `repo-state-recovery` first.

Know:

- target branch;
- base SHA;
- requested delivery mode;
- relevant CI requirements.

## Delivery mode

### Default: branch + PR

Use unless the user explicitly requests direct-to-main.

Flow:

```text
current main
→ create feature branch
→ create changes
→ provisional commit
→ inspect diff
→ CI/preview
→ open/update PR
→ report
```

Do not merge unless requested.

### Explicit direct-main

Only when the user clearly authorizes it.

Flow:

```text
read main HEAD
→ build provisional tree/commit
→ inspect/validate
→ re-read main HEAD
→ update ref using expected SHA / lease
```

If main changed, stop the ref update, compare the new state and rebuild on top of it.

## Procedure

### 1. Create an isolated working ref

Use a descriptive branch:

```text
feat/<name>
fix/<name>
docs/<name>
ci/<name>
```

Start from the recovered current target SHA.

### 2. Generate changes without moving shared refs

For substantial GitHub-connector edits prefer:

- create blobs;
- create tree from known base;
- create commit;
- inspect commit/diff;
- only then move the feature branch ref.

For direct-main, a provisional unreferenced commit is strongly preferred before moving `main`.

### 3. Run hygiene checks

Inspect all changed files for:

- conflict markers;
- accidental literal `\n`/escape artifacts;
- truncated generated files;
- duplicated imports;
- secrets/private data;
- migration-number conflicts;
- unrelated changes.

Use the PUBLIC-repository rules in `AGENTS.md`.

### 4. Validate behavior

For code changes rely on the real quality gate when available:

- dependency audit;
- migration validation;
- lint zero warnings;
- typecheck;
- tests;
- production build;
- runtime smoke.

For documentation-only changes, still inspect diff and let repository CI run.

### 5. Re-check concurrency before promotion

Immediately before moving a shared branch or merging:

- read current target HEAD again;
- verify expected base;
- compare if changed;
- preserve new concurrent changes.

Never bypass a lease failure by force-pushing.

### 6. Create/update PR

PR description should include:

- problem/objective;
- what changed;
- relevant security/migration implications;
- evidence/tests;
- remaining rollout steps.

If new findings emerge during CI, update both code and PR description.

### 7. Merge only when authorized

Before merge confirm:

- PR still targets current base;
- required checks are green;
- mergeability is clean;
- no unresolved requested review remains.

## Failure handling

### Branch changed during work

Do not overwrite.

Rebuild the tree/commit on top of the new SHA, then rerun validation.

### CI exposes pre-existing defects

Do not weaken CI.

Fix real blockers when in scope, or document a deliberate exception with explicit approval.

### Generated patch is too large/fragile

Split into smaller atomic commits or blobs. Preserve the same final contract.

## Evidence handoff

Report:

```text
Branch:
Base SHA:
Head SHA:
PR:
Files changed:
Checks:
Migration/config/deploy status:
Pending:
```

## Completion criteria

Delivery is complete only when the requested repository state exists and its validation status is known.

A commit existing is not equivalent to production release.

## Common composition

```text
repo-state-recovery
→ safe-github-delivery
→ cicd-release-guardian
```
