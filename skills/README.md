# AgencyOS Agent Skills

These workflow contracts define how ChatGPT/agents operate AgencyOS through MCP.

## Autonomy

- **A0**: read, analyze, and draft only.
- **A1**: internal CRM writes are permitted.
- **A2**: any external action requires a human `ApprovalRequest`.
- **A3**: bounded autonomous external action is intentionally not enabled in this release.

Every orchestrated skill should create/use an `AiRun`, preserve evidence, respect scopes, DNC, optimistic concurrency and approval guards, and store summaries rather than private model reasoning.
