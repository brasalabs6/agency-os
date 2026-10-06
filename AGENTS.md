# Agent instructions

- Preserve canonical lead statuses in `src/lib/domain/types.ts`.
- Do not bypass `src/lib/services` from UI, API, or MCP.
- Never introduce raw SQL tools to MCP.
- Keep `DO_NOT_CONTACT` enforcement in the domain layer.
- MCP writes must remain auditable.
- Preserve optimistic concurrency (`version` / `expectedVersion`).
- Do not silently merge ambiguous duplicates.
- Unknown lead facts must stay unknown; do not invent contact details or evidence.
- Prefer Server Components; Client Components only for interaction.
- Run typecheck, lint, tests, and build after dependency-changing or architectural changes.
