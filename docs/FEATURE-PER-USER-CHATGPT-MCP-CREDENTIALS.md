# FEATURE SPEC — Per-User ChatGPT MCP Credentials

**Produto:** AgencyOS Leads  
**Feature:** MCP Credentials per User / Personal ChatGPT Connections  
**Status:** Implemented  
**Prioridade:** P0  
**Tipo:** MCP / Authentication / Agent Identity / Team Collaboration  
**Última atualização:** 2026-10-06

---

## 1. Objetivo

Permitir que cada usuário humano do AgencyOS conecte seu próprio ChatGPT ao mesmo MCP do AgencyOS sem exigir OAuth e sem subir um serviço adicional de identidade/autorização.

Cada usuário deverá possuir uma ou mais credenciais MCP próprias.

Exemplo:

~~~text
Guilherme
  └── ChatGPT Personal
      └── token A
          └── https://agency-os.example.com/mcp?key=<token-A>

Sócio
  └── ChatGPT Personal
      └── token B
          └── https://agency-os.example.com/mcp?key=<token-B>
~~~

No ChatGPT, cada pessoa cadastra sua própria URL como custom MCP server e seleciona **No authentication**.

O token da URL é validado pelo AgencyOS antes de qualquer chamada chegar ao servidor MCP.

---

## 2. Contexto e restrição do ChatGPT

O ChatGPT suporta custom MCP servers com OAuth, No authentication e OAuth or no authentication.

Para MCP customizado, o ChatGPT não oferece um campo genérico para fornecer uma API key arbitrária em um header customizado/Bearer escolhido pelo usuário.

Para este MVP:

~~~text
ChatGPT authentication mode = No authentication
AgencyOS application gate = query-string credential
~~~

Isso não é OAuth e não deve ser descrito como mecanismo oficial MCP de autenticação. É uma proteção de aplicação baseada na posse de uma URL secreta.

Referências oficiais:

- https://developers.openai.com/api/docs/guides/custom-mcp-server
- https://developers.openai.com/plugins/build/auth

---

## 3. Decisão arquitetural

Não subir:

- Auth0;
- Clerk;
- Keycloak;
- servidor OAuth separado;
- authorization server separado;
- reverse proxy dedicado;
- outro serviço apenas para o MCP.

Arquitetura:

~~~text
ChatGPT
   ↓
HTTPS
   ↓
AgencyOS / Next.js / Vercel
   ↓
MCP credential resolver
   ↓
MCP domain tools
   ↓
PostgreSQL / Supabase
~~~

A autenticação humana continua independente:

~~~text
Human browser
   ↓
email + password
   ↓
user_sessions
~~~

A autenticação do ChatGPT:

~~~text
ChatGPT
   ↓
/mcp?key=<opaque credential>
   ↓
mcp_credentials
   ↓
AGENT ActorContext linked to User
~~~

---

## 4. Objetivos funcionais

A feature deve permitir:

1. cada usuário gerar sua própria credencial MCP;
2. cada usuário cadastrar seu MCP no próprio ChatGPT;
3. distinguir o ChatGPT de cada usuário no AgencyOS;
4. revogar apenas uma credencial sem afetar os outros;
5. rotacionar credenciais sem downtime;
6. bloquear credenciais de usuários desativados;
7. registrar qual credential executou cada operação;
8. preservar AGENT como tipo de ator;
9. associar o agente a um usuário humano do AgencyOS;
10. suportar semântica de "meu/minhas" nas tools;
11. nunca armazenar token bruto;
12. preservar Bearer token e OAuth como modos opcionais/futuros.

---

## 5. Fora de escopo

Não implementar agora:

- OAuth 2.1;
- PKCE;
- Dynamic Client Registration;
- CIMD;
- refresh tokens;
- consent screen;
- autorização por organização externa;
- multi-tenant MCP;
- publicação pública do plugin;
- API keys recuperáveis após criação;
- ACL específica por lead;
- ferramentas administrativas via MCP;
- Team management via MCP.

---

## 6. Entidade MCP Credential

Criar uma entidade de credencial MCP vinculada a User.

~~~ts
interface McpCredential {
  id: string
  userId: string
  name: string
  tokenHash: string
  tokenPrefix: string
  scopes: string[]
  active: boolean
  createdAt: string
  lastUsedAt?: string | null
  revokedAt?: string | null
  expiresAt?: string | null
}
~~~

Um User pode possuir múltiplas credentials.

Isso permite:

- ChatGPT Personal;
- futura conexão de outro cliente;
- rotação sem downtime;
- credenciais separadas por uso.

---

## 7. Database schema

Nova tabela:

~~~text
mcp_credentials
~~~

Campos:

~~~text
id              uuid primary key
user_id         uuid not null -> users.id
name            text not null
token_hash      text not null unique
token_prefix    text not null
scopes          jsonb not null
active          boolean not null default true
created_at      timestamptz not null
last_used_at    timestamptz nullable
revoked_at      timestamptz nullable
expires_at      timestamptz nullable
~~~

Índices:

~~~text
token_hash UNIQUE
user_id
active
revoked_at
expires_at
~~~

Não usar hard delete. Credenciais revogadas permanecem para audit/histórico.

---

## 8. Token format

O token precisa possuir pelo menos 256 bits de entropia.

Formato recomendado:

~~~text
agmcp_<base64url(32 random bytes)>
~~~

O token bruto será mostrado uma única vez.

---

## 9. Token storage

Nunca persistir:

- raw token;
- full MCP URL.

Persistir somente:

~~~text
SHA-256(raw token)
token prefix
metadata
~~~

Lookup:

~~~text
request key
   ↓
sha256(key)
   ↓
SELECT ... WHERE token_hash = hash
~~~

Como o segredo tem alta entropia, não precisamos inserir credential id dentro do token.

---

## 10. MCP URL

Formato:

~~~text
https://<agency-os-domain>/mcp?key=<raw-token>
~~~

Cada usuário recebe URL diferente.

---

## 11. ChatGPT setup flow

Para cada usuário:

1. entrar no AgencyOS;
2. abrir Settings → ChatGPT;
3. clicar Create ChatGPT connection;
4. informar nome da credential, default ChatGPT Personal;
5. AgencyOS gera token;
6. AgencyOS mostra uma única vez token e Server URL;
7. usuário copia a Server URL;
8. abre ChatGPT;
9. cria custom MCP server;
10. cola a Server URL;
11. Authentication = No authentication;
12. executa Scan Tools;
13. cria/instala o plugin;
14. testa uma tool read-only.

Cada conta ChatGPT recebe uma credential diferente.

---

## 12. Tela AgencyOS

Nova rota:

~~~text
/settings/mcp
~~~

Acessível por:

~~~text
ADMIN
MEMBER
~~~

A tela gerencia apenas as credentials do current user.

---

## 13. UI — My ChatGPT Connections

Exemplo:

~~~text
ChatGPT & MCP

Connect your personal ChatGPT to AgencyOS.

ChatGPT Personal
Active
Created: Oct 6
Last used: 2 min ago
Token: agmcp_a8d1••••••

[ Revoke ]

+ Create connection
~~~

Administração global pode ser P1.

---

## 14. Credential creation UX

Modal:

~~~text
Create ChatGPT connection

Name
[ ChatGPT Personal ]

Scopes
[x] Read CRM
[x] Write CRM

[ Create ]
~~~

P0 pode fixar scopes em:

~~~text
leads.read
leads.write
~~~

Mesmo assim, o schema persiste scopes para evolução futura.

---

## 15. One-time secret UX

Após criação:

~~~text
Your MCP connection is ready.

Server URL
https://.../mcp?key=...

[ Copy URL ]

This URL contains a secret credential.
It will not be shown again.
~~~

Depois que o modal fechar:

- não reconstruir URL;
- não revelar raw token;
- mostrar apenas tokenPrefix.

---

## 16. Rotation

Fluxo:

~~~text
Old credential ACTIVE
        ↓
Create new credential
        ↓
Add new URL in ChatGPT
        ↓
Test
        ↓
Revoke old credential
~~~

Por isso o banco suporta múltiplas credentials por usuário desde P0.

---

## 17. Revocation

Endpoint:

~~~text
POST /api/mcp-credentials/:id/revoke
~~~

Efeito:

~~~text
active = false
revoked_at = now()
~~~

Revogação deve ser imediata.

---

## 18. User deactivation

Quando User.active = false, todas as credentials desse usuário deixam de autenticar.

Além da validação de User ativo durante cada request, o Team service deve revogar explicitamente todas as credentials ao desativar usuário.

Resultado:

~~~text
deactivate user
   ↓
revoke human sessions
   ↓
revoke MCP credentials
~~~

---

## 19. Repository

Adicionar McpCredentialRepository.

~~~ts
interface McpCredentialRepository {
  listForUser(userId: string): Promise<McpCredential[]>
  create(input): Promise<McpCredential>
  findActiveByTokenHash(tokenHash: string): Promise<{
    credential: McpCredential
    user: AppUser
  } | null>
  revoke(credentialId: string, userId: string): Promise<McpCredential | null>
  revokeAllForUser(userId: string): Promise<number>
  touchLastUsed(credentialId: string): Promise<void>
}
~~~

Implementações:

~~~text
mock-mcp-credential-repository.ts
postgres-mcp-credential-repository.ts
~~~

---

## 20. Auth modes

Adicionar:

~~~text
MCP_AUTH_MODE=user_query_token
~~~

Modos finais:

~~~text
none
token
user_query_token
oauth
~~~

### none

Somente development.

### token

Bearer token global legado para curl/Postman/outros clientes.

### user_query_token

Modo do MVP ChatGPT.

Resolve token no banco e identifica usuário.

### oauth

Preservado para evolução futura.

---

## 21. Environment

Produção:

~~~env
MCP_AUTH_MODE=user_query_token
~~~

Não criar MCP_QUERY_TOKEN global.

Cada credential fica no banco.

MCP_API_TOKEN continua existindo somente para MCP_AUTH_MODE=token.

---

## 22. authorizeMcpRequest

Refatorar o fluxo atual.

Hoje o código exige Authorization Bearer cedo demais.

Novo fluxo:

~~~text
read MCP_AUTH_MODE
        ↓
┌───────┼──────────────────┐
│       │                  │
none   token       user_query_token
│       │                  │
dev    Bearer             ?key=
                           │
                           ▼
                     credential lookup
                           │
                           ▼
                         user
                           │
                           ▼
                     ActorContext
~~~

OAuth continua branch independente.

---

## 23. Query-token authentication

Pseudo-code:

~~~ts
if (mode === "user_query_token") {
  const url = new URL(request.url)
  const raw = url.searchParams.get("key")

  if (!raw) reject()

  const tokenHash = sha256(raw)

  const result =
    await credentialRepository.findActiveByTokenHash(tokenHash)

  if (!result) reject()
  if (!result.user.active) reject()
  if (credentialExpired(result.credential)) reject()

  touchLastUsed(result.credential.id)

  return actorFromCredential(result)
}
~~~

---

## 24. Invalid credential behavior

Não enviar OAuth challenge em user_query_token.

O handler atual usa WWW-Authenticate para erros 401. Isso deve existir somente quando apropriado para OAuth/Bearer.

Para query token inválido, P0 recomendado:

~~~text
403 MCP_CREDENTIAL_INVALID
~~~

Mensagem genérica. Nunca ecoar token.

---

## 25. Actor identity

Não transformar ChatGPT em USER.

Continuar:

~~~text
actor.type = AGENT
~~~

Adicionar ao ActorContext:

~~~ts
principalUserId?: string
credentialId?: string
~~~

Exemplo:

~~~ts
ActorContext {
  type: "AGENT"
  id: "mcp:<credential-id>"
  name: "ChatGPT · Guilherme"
  scopes: ["leads.read", "leads.write"]
  principalUserId: "<guilherme-user-id>"
  credentialId: "<credential-id>"
}
~~~

---

## 26. Timeline

Exemplos esperados:

~~~text
Guilherme updated lead.
ChatGPT · Guilherme added evidence.
Sócio recorded phone call.
ChatGPT · Sócio created follow-up task.
~~~

Isso preserva a diferença entre humano e agente agindo em nome dele.

---

## 27. Audit

Chamadas MCP:

~~~text
actorType = AGENT
actorId = mcp:<credential-id>
actorName = ChatGPT · <user-name>
tool = <tool-name>
~~~

Credential revogada não é apagada, mantendo mapeamento histórico.

---

## 28. Semântica "me"

A principal user associada à credential será:

~~~text
actor.principalUserId
~~~

Nunca usar actor.id como User id, porque actor.id identifica o agente/credential.

---

## 29. Tool mcp_whoami

Adicionar tool read-only:

~~~text
mcp_whoami
~~~

Retorno:

~~~json
{
  "agent": "ChatGPT",
  "user": {
    "id": "...",
    "name": "Guilherme",
    "role": "ADMIN"
  },
  "credential": {
    "name": "ChatGPT Personal"
  },
  "scopes": [
    "leads.read",
    "leads.write"
  ]
}
~~~

Nunca retornar token, tokenHash ou URL secreta.

---

## 30. Leads — mine

Expandir leads_search com:

~~~ts
mine?: boolean
~~~

Se mine=true:

~~~text
ownerId = actor.principalUserId
~~~

Sem principal user:

~~~text
MCP_PRINCIPAL_REQUIRED
~~~

---

## 31. Tasks — mine

Expandir lead_tasks_list com:

~~~ts
mine?: boolean
~~~

Resolve para principalUserId.

Assim a pergunta:

~~~text
Quais são minhas tarefas de hoje?
~~~

pode ser respondida diretamente para o usuário daquele ChatGPT.

---

## 32. Calendar — mine

Expandir calendar_list com:

~~~ts
mine?: boolean
~~~

Resolve para principalUserId.

---

## 33. Assignment through MCP

Adicionar opção explícita:

~~~ts
assignToMe?: boolean
~~~

em operações relevantes de criação.

Se true:

~~~text
ownerId = actor.principalUserId
~~~

Não atribuir automaticamente tudo ao usuário sem pedido explícito.

---

## 34. Selector conflicts

Não aceitar simultaneamente:

~~~text
ownerId + mine
ownerId + assignToMe
~~~

Erro:

~~~text
MCP_OWNER_SELECTOR_CONFLICT
~~~

---

## 35. Credential API

### List own credentials

~~~text
GET /api/mcp-credentials
~~~

Retorna somente credentials do current user.

### Create

~~~text
POST /api/mcp-credentials
~~~

Body:

~~~json
{
  "name": "ChatGPT Personal"
}
~~~

Response somente na criação:

~~~json
{
  "credential": {
    "id": "...",
    "name": "ChatGPT Personal",
    "tokenPrefix": "agmcp_a8d1",
    "createdAt": "..."
  },
  "secret": "agmcp_...",
  "serverUrl": "https://.../mcp?key=agmcp_..."
}
~~~

### Revoke

~~~text
POST /api/mcp-credentials/:id/revoke
~~~

Usuário só revoga credential própria.

---

## 36. Admin behavior

P0:

ADMIN não visualiza token de ninguém.

ADMIN consegue desativar usuário; isso revoga suas credentials.

P1 opcional:

~~~text
User
Credential name
Created
Last used
Active / Revoked
~~~

Somente metadata.

---

## 37. Navigation

Adicionar para ADMIN e MEMBER:

~~~text
Profile
ChatGPT
~~~

ADMIN mantém:

~~~text
Team
Settings
~~~

---

## 38. Security properties

A URL contém uma credencial secreta.

Quem possui a URL possui acesso MCP daquela credential.

Regras:

1. token com 256 bits de entropia;
2. HTTPS obrigatório;
3. raw token mostrado uma vez;
4. raw token nunca salvo no banco;
5. raw token nunca logado pela aplicação;
6. query string nunca incluída em audit;
7. erros nunca ecoam URL/token;
8. nenhuma tool retorna credential;
9. revogação imediata;
10. user inactive invalida credential;
11. credential não libera Team/Auth administrative tools;
12. scopes são validados em toda tool.

---

## 39. Query-string logging risk

Risco conhecido: URLs com query podem aparecer em camadas de infraestrutura que registrem URLs completas.

Para o MVP, aceitamos conscientemente porque:

- são poucos usuários;
- sistema é interno;
- credentials são rotacionáveis;
- não queremos implementar OAuth agora.

Mitigações:

- não fazer console.log(request.url);
- não persistir raw URL;
- não enviar URL para audit;
- não usar analytics no endpoint /mcp;
- documentar rotação;
- revogar imediatamente em caso de exposição;
- revisar logs do ambiente de produção.

---

## 40. Redirect invariant

/mcp?key=... nunca deve redirecionar.

Redirect pode perder query string, propagar credential ou quebrar transporte MCP.

---

## 41. ChatGPT query preservation gate

Antes de considerar concluído, validar empiricamente em duas contas ChatGPT distintas que o Server URL mantém query parameter em:

- initialize;
- tool discovery;
- read calls;
- write calls;
- reconexões.

Esse é um gate real de integração.

---

## 42. Multiple ChatGPT acceptance scenario

### Guilherme

~~~text
AgencyOS user = Guilherme
Credential = ChatGPT Guilherme
Token = A
ChatGPT Server URL = /mcp?key=A
~~~

### Sócio

~~~text
AgencyOS user = Sócio
Credential = ChatGPT Sócio
Token = B
ChatGPT Server URL = /mcp?key=B
~~~

Expected:

~~~text
A -> ChatGPT · Guilherme
B -> ChatGPT · Sócio
~~~

---

## 43. Revocation isolation

Se A for revogado:

~~~text
ChatGPT Guilherme -> denied
ChatGPT Sócio     -> continues working
~~~

Se sócio for desativado:

~~~text
all Sócio credentials -> denied
Guilherme credentials -> unaffected
~~~

---

## 44. Scopes

P0 default:

~~~text
leads.read
leads.write
~~~

Não criar scopes administrativos.

P1 pode granularizar tasks/calendar, mas não é necessário agora.

---

## 45. Tool authorization

Toda tool continua chamando requireScope.

Scopes vêm da credential persistida.

Nunca confiar em scopes enviados pelo cliente.

---

## 46. lastUsedAt

Atualizar last_used_at quando credential for usada.

P0 pode atualizar por request devido ao baixo tráfego.

P1 pode fazer throttle, por exemplo uma atualização a cada 5 minutos por credential.

---

## 47. Mock mode

Mock repository deve suportar credentials.

Não incluir segredo real no source.

Tokens determinísticos somente dentro dos testes.

---

## 48. Migration

Criar:

~~~text
drizzle/0007_mcp_user_credentials.sql
~~~

A migration:

- cria mcp_credentials;
- não remove MCP_API_TOKEN;
- não altera user_sessions;
- não remove código OAuth;
- não muda dados existentes de Leads/Tasks.

---

## 49. Rollout

### Phase 1 — schema/repositories

- migration;
- domain types;
- mock repository;
- Postgres repository.

### Phase 2 — credential services

- generate;
- list;
- revoke;
- resolve;
- revoke all for user.

### Phase 3 — MCP auth

- user_query_token;
- ActorContext principal;
- no OAuth challenge nesse modo;
- lastUsedAt.

### Phase 4 — UI/API

- /settings/mcp;
- create credential;
- one-time URL display;
- copy button;
- revoke.

### Phase 5 — personal semantics

- mcp_whoami;
- mine em leads/tasks/calendar;
- assignToMe.

### Phase 6 — integração real

- deploy;
- gerar credential Guilherme;
- gerar credential sócio;
- cadastrar cada URL em seu ChatGPT;
- validar reads;
- validar writes;
- validar actor identity;
- validar revocation isolation.

### Phase 7 — production mode

Somente após E2E:

~~~env
MCP_AUTH_MODE=user_query_token
~~~

---

## 50. Backward compatibility

Manter:

~~~text
MCP_AUTH_MODE=token
MCP_API_TOKEN
~~~

para ferramentas manuais e rollback.

Manter:

~~~text
MCP_AUTH_MODE=oauth
~~~

para futuro.

Nenhum desses modos será removido.

---

## 51. Rollback

Se ChatGPT não preservar query params corretamente:

1. não ativar user_query_token em produção;
2. manter token mode;
3. preservar schema/credentials;
4. considerar OAuth dentro do próprio AgencyOS em spec futura.

---

## 52. Automated tests

Cobrir:

### Token

- formato;
- entropia;
- hash;
- raw != stored;
- prefix;
- missing token;
- invalid token.

### Repository

- create;
- list by user;
- resolve by hash;
- revoke;
- revoke all;
- expired;
- inactive user;
- lastUsedAt.

### Authorization

~~~text
token A -> principal A
token B -> principal B
A revoked -> denied
B remains valid
inactive user -> denied
~~~

### Ownership semantics

- leads_search mine=true;
- lead_tasks_list mine=true;
- calendar_list mine=true;
- assignToMe=true;
- selector conflict;
- missing principal.

### Audit

Esperado:

~~~text
actorType = AGENT
actorId = mcp:<credential-id>
actorName = ChatGPT · User
~~~

### Security

- APIs não retornam tokenHash;
- list não retorna raw token;
- revoke não pode afetar credential de outro MEMBER;
- query key não aparece em audit.

---

## 53. Manual E2E — ChatGPT Guilherme

1. cadastrar URL A;
2. selecionar No authentication;
3. Scan Tools;
4. executar mcp_whoami;
5. esperar Guilherme;
6. listar "minhas tarefas";
7. criar uma nota;
8. verificar timeline como ChatGPT · Guilherme.

---

## 54. Manual E2E — ChatGPT sócio

1. cadastrar URL B;
2. selecionar No authentication;
3. Scan Tools;
4. executar mcp_whoami;
5. esperar sócio;
6. listar "minhas tarefas";
7. criar follow-up;
8. verificar timeline como ChatGPT · nome-do-sócio.

---

## 55. Manual E2E — isolation/rotation

1. revogar A;
2. ChatGPT A perde acesso;
3. ChatGPT B continua;
4. gerar A2;
5. cadastrar A2;
6. ChatGPT A volta;
7. histórico anterior continua associado a A revogada.

---

## 56. Expected files

Prováveis novos arquivos:

~~~text
drizzle/0003_mcp_user_credentials.sql

src/lib/repositories/
  mcp-credential-repository.ts
  mock-mcp-credential-repository.ts
  postgres-mcp-credential-repository.ts

src/lib/services/
  mcp-credentials.ts

src/app/api/mcp-credentials/
  route.ts

src/app/api/mcp-credentials/[id]/revoke/
  route.ts

src/app/(app)/settings/mcp/
  page.tsx

src/components/
  mcp-credentials-settings.tsx

tests/
  mcp-credential.test.ts
  mock-mcp-credential-repository.test.ts
  mcp-user-auth.test.ts
~~~

Arquivos existentes provavelmente alterados:

~~~text
src/lib/auth/mcp-auth.ts
src/lib/domain/types.ts
src/lib/db/schema.ts
src/lib/repositories/index.ts
src/lib/mcp/server.ts
src/lib/services/team.ts
src/components/app-shell.tsx
src/app/mcp/route.ts
.env.example
docs/MCP.md
README.md
~~~

---

## 57. Security gate before production

Não considerar concluído sem verificar:

- HTTPS;
- raw credential ausente de app logs;
- raw credential ausente de audit;
- endpoint sem redirect;
- user inactive invalida token;
- revoke invalida imediatamente;
- cada ChatGPT resolve usuário correto;
- risco de logging na infraestrutura conhecido e aceito.

---

## 58. Definition of Done

A feature estará pronta quando:

1. mcp_credentials existir;
2. credential estiver vinculada a User;
3. raw token for mostrado somente uma vez;
4. banco guardar apenas hash;
5. cada usuário puder criar/revogar a própria credential;
6. ADMIN e MEMBER acessarem Settings → ChatGPT;
7. MCP_AUTH_MODE=user_query_token funcionar;
8. Bearer legacy continuar disponível;
9. OAuth continuar disponível;
10. query token válido resolver credential + user;
11. user inactive bloquear acesso;
12. revoked token bloquear acesso;
13. ActorContext continuar AGENT;
14. Agent possuir principalUserId;
15. timeline distinguir os dois ChatGPTs;
16. audit distinguir credentials;
17. mcp_whoami retornar principal correto;
18. mine funcionar para Leads;
19. mine funcionar para Tasks;
20. mine funcionar para Calendar;
21. assignToMe funcionar;
22. dois ChatGPTs funcionarem simultaneamente;
23. revogar um não afetar o outro;
24. rotação funcionar sem downtime;
25. testes automatizados passarem;
26. E2E real passar nas duas contas ChatGPT.

---

## 59. Decisão recomendada

Para o AgencyOS MVP:

~~~text
Human auth:
email + password + user_sessions

ChatGPT auth:
per-user opaque query credentials

ChatGPT configuration:
No authentication

MCP identity:
AGENT linked to principal USER
~~~

Isso entrega isolamento por usuário, audit e revogação individual sem OAuth ou serviço adicional.

---

## 60. Estado da implementação

Implementação aprovada e executada no repositório. O gate restante para ativação em produção é aplicar a migration, validar o E2E real nas duas contas ChatGPT e somente então mudar `MCP_AUTH_MODE` para `user_query_token`.
