# Agent instructions

- This repository is PUBLIC. Never commit secrets, credentials, tokens, private URLs, personal email addresses, customer data, or other sensitive/private information. Use environment variables or deployment secrets for any sensitive configuration.
- Keep production identities and credentials out of source code; use non-personal placeholder values in committed examples and fallback logic.
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
