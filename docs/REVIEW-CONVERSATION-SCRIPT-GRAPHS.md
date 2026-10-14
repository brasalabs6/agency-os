# Conversation Script Graphs — Implementation Review / Release Readiness

**Repository:** brasalabs6/agency-os  
**Implementation:** PR #60, branch feat/conversation-script-graphs  
**Reference:** docs/FEATURE-CONVERSATION-SCRIPT-GRAPHS.md  
**Status:** Review in progress; **not yet approved for production activation**  
**Scope:** Review of every changed application layer, migration and tests. This is not evidence of live deployment.

## 1. Review matrix

| Area | Reviewed implementation | Assessment |
| --- | --- | --- |
| Domain | src/lib/domain/script-flow.ts | Canonical structured nodes/edges, channels/purpose and revision view |
| Validation | src/lib/validation/script-flow.ts | Strict schema, reachability, exit availability, cycles, labels, size and patch validation |
| Database | src/lib/db/schema.ts; drizzle/0009_lead_conversation_scripts.sql | FK scope, constraints, JSONB, RLS, Data API privilege removal; production not migrated |
| Persistence | src/lib/repositories/{script-flow-repository,mock-script-flow-repository,postgres-script-flow-repository,index}.ts | CAS, revisions, create idempotency and audit; mock operations serialized |
| Services | src/lib/services/script-flows.ts | Single domain for REST/MCP, feature flag, evidence ownership, ADMIN publish/restore |
| MCP | src/lib/mcp/{script-flow-tools,server}.ts; src/lib/auth/scopes.ts | Four scoped tools; strict create/replace payload; no agent publish/send tools |
| REST | src/app/api/leads/[id]/scripts/** | List/create/read/patch/replace/publish/restore and historical snapshot read |
| UI | src/app/(app)/leads/[id]/page.tsx; src/components/lead-script-{navigator,map}.tsx | Guided navigation, reaction choices, breadcrumb, return/restart, copy; pan/zoom/minimap map |
| Configuration | .env.example; README.md | Separate flag, migration and re-issued credential instructions |
| CI/tests | .github/workflows/ci.yml; tests/script-flow-*.test.ts | Validation, service auth, mock CAS and REST adapter tests, PG privilege smoke |

## 2. Important findings and corrections

### SEC-01: implicit privilege escalation by migration — corrected

Previous 0009 SQL silently added scripts.read/write to all active pre-existing MCP credentials. This contradicted AGENTS.md and the 0008 migration's explicit no-automatic-scope-widening policy. Removed the grants from 0009; changed CI regression smoke to assert legacy credentials remain unchanged; new capabilities are opted into by explicitly issuing new credentials.

### CONS-02: mock concurrent writes diverged from PG CAS — corrected

Mock previously awaited audit after version check, allowing parallel tasks to pass the same expectedVersion. Serialization now protects create/patch/publish operations in mock. Added parallel-write regression test.

### AUTH-03: write-only MCP patch blocked by read guard — corrected

The service no longer invokes the read-scope path during an already authorized scripts.write patch. The agent can patch with write scope; read endpoints still require scripts.read. Added authorization tests.

### MCP-04: ambiguous upsert schema — corrected

Replaced a single object with optional fields by a discriminated create/replace union with mode-specific mandatory inputs.

### UX-05: stale async version across script selection — corrected

The navigator only exposes the graph/publish controls if the loaded script and view still match the current selection.

### UX-06: map movement incomplete — improved

Added drag-to-pan, zoom controls, minimap and keyboard controls to the SVG map.

## 3. Open items before declaring the spec fully complete

1. **React Flow implementation differs from the approved spec.** The map currently uses an SVG renderer rather than @xyflow/react / dagre. The underlying navigation behavior is present, but strict library/renderer conformity is not. Either implement the library in a reviewed dependency change or explicitly approve an equivalent renderer in the spec.
2. **Browser E2E remains unverified.** Unit/service/REST adapter tests and build smoke are not a substitute for browser checks of tab interaction, mobile viewport, accessibility, long labels, pan/zoom/minimap, and draft/published selection. Validate real browser on preview.
3. **Real production state is unknown.** GitHub CI PostgreSQL runs against an ephemeral test database, NOT the Supabase production project. Confirm project identity, backups, applied migrations and RLS/grants before applying 0009.
4. **Activation is not verified.** Requires authenticated Vercel access to production environment, controlled flag activation and runtime checks on exact deployed commit.
5. **Existing lead authorization model** is reused, including its current ownership/tenant limitations; this feature does not implement a new tenant ACL. If strict tenant isolation is required, address separately before widening access.

## 4. Release protocol (fail-closed)

1. Review the exact final PR diff, approve renderer choice or complete React Flow integration; browser-E2E the preview.
2. Confirm all CI checks green for the **same final HEAD SHA**: npm audit, lint, TS, tests, build, runtime smoke and PostgreSQL.
3. Verify the correct Supabase production project, backup/recovery, current applied migration list, and that 0009 is not already applied; apply the **reviewed committed** SQL only once.
4. Verify in live DB: new tables, constraints, indexes, RLS, effective anon/authenticated grants, schema access for app server role, old MCP credentials unchanged.
5. Merge PR #60 only after gates are satisfied. Observe exact-sha main CI and Vercel production deployment.
6. Enable CONVERSATION_SCRIPTS_ENABLED=true in Vercel production, redeploy, verify /api/health and an authenticated test lead's Scripts tab.
7. Run real MCP credential smoke using a newly issued opted-in credential. Test create/get/patch and UI browse/publish. Confirm no unauthorized send and no changes to Conversation/Qualification.
8. If verification fails: immediately disable feature flag, retain tables and snapshots, investigate. Do not DROP production data.

**No production merge/migration/config change is implied by the presence of this file.**

## 5. Revisão complementar — React Flow e E2E

A divergência registrada na seção 3, item 1, foi fechada: o mapa usa `@xyflow/react@12.12.0`, carregado via `next/dynamic` em Client Component e com a folha de estilos oficial importada após Tailwind. A estrutura de negócio permanece em JSONB, e o mapa continua sem escrita no CRM. Controles nativos de pan/zoom/minimapa, seleção de nós e destaque de trilha estão implementados; o posicionamento usa BFS determinístico com proteção contra ciclos e nós órfãos.

O job `Browser E2E (guided scripts)` passou antes desta troca da biblioteca e foi atualizado para testar controles React Flow. É necessária nova execução verde no HEAD final antes do merge.

A etapa Supabase `20261014194708_lead_conversation_scripts_0009` já foi aplicada e validada. Não reaplicar a migration. A ativação `CONVERSATION_SCRIPTS_ENABLED` depende do deploy de produção validado e permanece desligada até confirmação.
