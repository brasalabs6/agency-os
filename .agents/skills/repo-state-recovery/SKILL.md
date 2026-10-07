---
name: repo-state-recovery
description: Recover the authoritative current state of AgencyOS before planning, editing, debugging, merging or deploying.
---

# Repo State Recovery

## Purpose

Build a trustworthy operational snapshot before taking action.

Use this skill whenever a task depends on an existing repository, deployment, database, PR, migration or decision whose current state may have changed.

This skill is normally read-only. It should run before other implementation or incident skills.

## Trigger

Use when any of the following is true:

- the user says continue, resume, review, implement, fix, merge or deploy an existing project;
- another agent may have changed the repository;
- a prior SHA/branch/PR/migration/deployment is referenced;
- the task crosses GitHub, Vercel, Supabase or MCP state;
- the answer would be wrong if the remembered state is stale.

## Required inputs

Recover or infer:

- repository;
- target branch;
- requested operation;
- affected subsystem;
- whether the user requested PR or direct-main delivery.

Do not ask the user to repeat facts that can be recovered from the repository or connected systems.

## Procedure

### 1. Resolve the authoritative branch state

Read:

- current target branch HEAD SHA;
- relevant tree paths;
- recent commits affecting the target area;
- open PRs/branches when they may overlap the task.

Record the base SHA. This becomes the concurrency reference for later delivery.

### 2. Read project instructions first

Inspect:

- `AGENTS.md`;
- relevant files under `.agents/skills/`;
- the feature spec or architecture docs for the subsystem;
- CI/CD docs if release behavior matters.

Project instructions outrank remembered implementation details.

### 3. Inspect the smallest relevant code surface

Read the actual current files involved in the task.

Examples:

- auth: session resolver, repositories, schema, auth routes;
- MCP: MCP auth, server tools, credential services;
- DB: schema plus all later migrations touching the same objects;
- CI/CD: workflows, release gate script, health route;
- UI: page plus domain/service/API paths it depends on.

Do not infer unseen code from filenames or prior conversation.

### 4. Recover external state when material

For Vercel-related work inspect the current project/deployment configuration and relevant deployment status/logs.

For Supabase/Postgres work inspect applied migrations, schema/RLS/privileges and live state where needed.

For a production incident inspect runtime evidence before changing code.

### 5. Compare memory to reality

Explicitly classify remembered/prior assumptions as:

- confirmed current;
- changed;
- obsolete;
- unknown.

If the repository advanced since the previous work, treat the new state as authoritative.

### 6. Detect concurrent work

Before editing, identify:

- files changed on the target branch since the remembered base;
- PRs touching the same files;
- migrations added after the planned migration number;
- environment/deploy changes that alter rollout order.

Do not overwrite concurrent changes.

### 7. Produce a recovery handoff

The handoff must include:

```text
Repository:
Target branch:
Current HEAD:
Relevant files/docs inspected:
External systems inspected:
Confirmed invariants:
Concurrent changes:
Known blockers/risks:
Next safe action:
```

## Invariants

- Never use prior chat state as the sole source of truth.
- Never begin a destructive write from a stale base SHA.
- Never silently discard changes made by another agent.
- Never choose a migration number before reading the current migration sequence.
- Never claim a deployment/migration/config is active without checking it.

## Completion criteria

This skill is complete when another agent could begin the next action without guessing about:

- current base SHA;
- affected files;
- current deployment/database state where relevant;
- conflicts/concurrent changes;
- the next executable step.

## Common composition

```text
repo-state-recovery
→ feature-spec-first | production-incident-triage | safe-github-delivery
```
