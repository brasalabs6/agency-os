# AgencyOS Leads

Mini CRM interno **agent-first** para uma agência de sites, landing pages, automações e sistemas. Humanos usam a interface web; ChatGPT e outros agentes usam o mesmo domínio por um servidor **Remote MCP** em `/mcp`.

## O que está implementado

- Next.js App Router + React + TypeScript.
- UI responsiva com light/dark mode.
- Overview operacional.
- Lista de leads com busca e filtros.
- Cadastro manual de lead.
- Detalhe do lead com oportunidade, score, contatos, presença digital, evidências e timeline.
- Kanban com drag-and-drop e agrupamento dos estados canônicos.
- `Needs Action`: overdue, hoje, sem próxima ação e próximos.
- Tasks por lead com status, prioridade, responsável, data/hora e eventos com duração.
- Tela global `/tasks` com visões My Tasks, Today, Upcoming, Overdue, No Date e Completed.
- Calendário `/calendar` com Month, Week e Agenda, criação contextual e drag-and-drop para reagendar.
- `nextAction` derivada automaticamente da primeira task ativa, mantendo compatibilidade com o modelo legado.
- Notas, registro de contato, próxima ação e movimentação de estágio.
- Regra `DO_NOT_CONTACT` aplicada na camada de domínio.
- Versionamento otimista por `version`/`expectedVersion`.
- Deduplicação antes de criar/upsert.
- Evidence/source ledger.
- Activity timeline com `USER`, `AGENT` e `SYSTEM`.
- Audit log para operações mutáveis de domínio/MCP.
- Data driver `mock` para execução rápida.
- Data driver PostgreSQL via Drizzle ORM.
- Docker Compose para PostgreSQL.
- Seed com 25 empresas fictícias brasileiras e tasks comerciais demonstrativas.
- Remote MCP com Streamable HTTP.
- MCP auth por token para desenvolvimento e validação OAuth/JWT para produção.
- Metadata de protected resource OAuth.
- REST API para a UI e integrações futuras.
- Testes unitários iniciais com Vitest.

## Requisitos

- Node.js 20+ (recomendado Node 22+)
- npm 10+
- Docker apenas se utilizar PostgreSQL local

## Início rápido — modo mock

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`.

O `.env.example` vem com `DATA_DRIVER=mock` e `APP_AUTH_DISABLED=true`, portanto não é necessário banco nem login para explorar o sistema.

> O modo mock é em memória. Alterações são perdidas ao reiniciar o processo.

## PostgreSQL local

```bash
cp .env.example .env.local
docker compose up -d db
```

Altere no `.env.local`:

```env
DATA_DRIVER=postgres
DATABASE_URL=postgres://agencyos:agencyos@localhost:5432/agencyos
```

Instale dependências e aplique o schema:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

`drizzle/0000_initial.sql` contém o schema inicial e `drizzle/0001_lead_tasks_calendar.sql` adiciona Tasks/Calendar com migração idempotente de `next_action` legado.

## Autenticação do app

Para desenvolvimento, o padrão é:

```env
APP_AUTH_DISABLED=true
```

Para ativar a tela de login interna:

```env
APP_AUTH_DISABLED=false
APP_PASSWORD=uma-senha-forte
SESSION_SECRET=um-segredo-aleatorio-longo-com-32-ou-mais-caracteres
```

A sessão usa cookie `httpOnly`, `SameSite=Lax` e HMAC. Para uma organização maior, substitua essa camada por OIDC/SSO sem alterar o domínio.

## Remote MCP

Endpoint:

```text
POST /mcp
```

O servidor usa Streamable HTTP e instancia uma sessão stateless por request. UI, REST e MCP chamam os mesmos services em `src/lib/services`.

### Desenvolvimento com token

```env
MCP_AUTH_MODE=token
MCP_API_TOKEN=gere-um-token-longo
```

Cliente MCP:

```text
Authorization: Bearer <MCP_API_TOKEN>
```

### OAuth/JWT em produção

Configure um authorization server/IdP compatível com OAuth 2.1 e JWT:

```env
MCP_AUTH_MODE=oauth
MCP_OAUTH_ISSUER=https://idp.example.com/
MCP_OAUTH_AUDIENCE=https://crm.example.com/mcp
MCP_OAUTH_JWKS_URL=https://idp.example.com/.well-known/jwks.json
MCP_REQUIRED_SCOPES=leads.read,leads.write
```

O CRM é **resource server**: ele valida os access tokens emitidos pelo IdP; ele não implementa um authorization server próprio.

Protected Resource Metadata:

```text
/.well-known/oauth-protected-resource
/.well-known/oauth-protected-resource/mcp
```

### MCP tools

Leitura:

- `leads_search`
- `lead_get`
- `lead_activity_list`
- `pipeline_summary`

Escrita:

- `leads_upsert`
- `lead_update`
- `lead_move_stage`
- `lead_add_note`
- `lead_add_evidence`
- `lead_set_next_action`
- `lead_record_contact`
- `lead_mark_outcome`
- `lead_task_create`
- `lead_task_update`
- `lead_task_complete`
- `lead_task_cancel`
- `lead_task_reschedule`
- `lead_tasks_reorder`

Leitura adicional:

- `lead_tasks_list`
- `lead_task_get`
- `calendar_list`

Não existe ferramenta `execute_sql`, `raw_query` ou equivalente.

## Estados canônicos

O backend preserva:

```text
DISCOVERED
ENRICHED
SCORED
READY_TO_CONTACT
CONTACTED
QUALIFIED
PERMISSIONED_FOLLOWUP
DIAGNOSIS_SENT
PROPOSAL_SENT
NEGOTIATION
WON
ONBOARDING
NURTURE
LOST
DO_NOT_CONTACT
INVALID
```

O Kanban agrupa esses estados em uma interface menor: Inbox, Contato, Qualificado, Diagnóstico, Proposta, Negociação e Ganho.

## Invariantes importantes

1. `DO_NOT_CONTACT` bloqueia `recordContact`, inclusive via MCP.
2. Toda mudança de estágio gera activity.
3. Toda operação mutável relevante gera audit log.
4. Evidência mantém URL/fonte.
5. O MCP não recebe acesso direto ao banco.
6. Writes podem usar `expectedVersion`; conflito retorna `VERSION_CONFLICT`.
7. Deduplicação forte usa website/telefone/e-mail. Nome + cidade ambíguo não é fundido automaticamente no upsert.
8. Leads ativos sem próxima ação são destacados em `Needs Action`.
9. Tasks de contato (`CALL`, `FOLLOW_UP`, `MEETING`) são bloqueadas para `DO_NOT_CONTACT`.
10. Datas são persistidas em UTC; as visões operacionais usam `America/Sao_Paulo` como timezone padrão.
11. Tasks concluídas/canceladas são terminais; reagendamento usa optimistic concurrency por `version`.

## Estrutura

```text
src/
  app/
    (app)/              # páginas protegidas
    api/                # REST para UI/integrações
    mcp/route.ts        # Remote MCP
  components/           # interface
  lib/
    auth/               # app + MCP auth
    db/                 # Drizzle schema/client
    domain/             # tipos, estados, tasks, timezone, erros
    mcp/                # tools MCP
    mock/               # dataset de demonstração
    repositories/       # adapters mock/postgres
    services/           # regras de negócio compartilhadas
    validation/         # Zod
scripts/
  seed.ts
tests/
drizzle/
```

## API REST principal

```text
GET    /api/leads
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
GET    /api/leads/:id/activities
POST   /api/leads/:id/stage
POST   /api/leads/:id/notes
POST   /api/leads/:id/evidence
POST   /api/leads/:id/next-action
POST   /api/leads/:id/contact
POST   /api/leads/:id/outcome
GET    /api/leads/:id/tasks
POST   /api/leads/:id/tasks
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
POST   /api/tasks/:id/complete
POST   /api/tasks/:id/cancel
POST   /api/tasks/:id/reschedule
POST   /api/tasks/reorder
GET    /api/calendar
GET    /api/dashboard
GET    /api/health
```

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Produção

Antes de publicar:

1. use `DATA_DRIVER=postgres`;
2. ative autenticação do app ou troque por SSO/OIDC;
3. use `MCP_AUTH_MODE=oauth` para um conector multiusuário;
4. armazene secrets somente no ambiente da plataforma;
5. use HTTPS;
6. gere migrations versionadas a partir do schema Drizzle;
7. faça backup do PostgreSQL;
8. aplique rate limiting/WAF no `/mcp` e APIs se expostos publicamente.


## Feature spec

A especificação detalhada de Tasks + Calendar está em `docs/FEATURE-LEAD-TASKS-CALENDAR.md`.
