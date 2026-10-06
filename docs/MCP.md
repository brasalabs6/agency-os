# Remote MCP

O MCP fica em `/mcp` e usa os mesmos domain services da interface web.

## Modos de autenticação

```text
none
token
user_query_token
oauth
```

### none

Somente development.

### token

Bearer token global legado:

```http
Authorization: Bearer <MCP_API_TOKEN>
```

Útil para curl, Postman e rollback.

### user_query_token

Modo recomendado para o MVP com contas ChatGPT pessoais.

Cada usuário cria sua própria credential em:

```text
/settings/mcp
```

O AgencyOS gera uma Server URL:

```text
https://<domain>/mcp?key=agmcp_<secret>
```

No ChatGPT, cadastre o custom MCP server usando essa URL e selecione **No authentication**.

O banco nunca armazena o token bruto. Ele guarda apenas:

- SHA-256 do token;
- prefixo curto;
- scopes;
- owner;
- metadata de uso/revogação.

### oauth

Preservado para uma futura implantação OAuth/JWT.

## Identidade

Credenciais pessoais resolvem:

```text
credential
  ↓
AgencyOS User
  ↓
ActorContext

type = AGENT
id = mcp:<credential-id>
name = ChatGPT · <user-name>
principalUserId = <user-id>
credentialId = <credential-id>
```

Assim a timeline distingue humano e ChatGPT:

```text
Guilherme updated lead
ChatGPT · Guilherme created task
Sócio recorded call
ChatGPT · Sócio added note
```

## Tools pessoais

`mcp_whoami` retorna a identidade segura da conexão sem secrets.

As seguintes tools aceitam `mine=true`:

- `leads_search`
- `lead_tasks_list`
- `calendar_list`

As seguintes operações aceitam `assignToMe=true`:

- `lead_task_create`
- `lead_set_next_action`

`ownerId` não pode ser combinado com `mine`/`assignToMe`.

## Revogação

Revogar uma credential bloqueia somente aquela conexão.

Desativar um usuário:

1. revoga suas sessões web;
2. revoga todas as suas credentials MCP.

Credentials de outros usuários não são afetadas.

## Segurança

A query string funciona como uma credencial secreta.

- HTTPS é obrigatório.
- Não logar `request.url` no endpoint MCP.
- Nunca persistir a Server URL completa.
- Nunca incluir `key` no audit.
- O segredo é mostrado uma única vez.
- Rotacione criando nova credential, testando e então revogando a antiga.
- `/mcp?key=...` não deve redirecionar.

## Production rollout status

Production is configured with:

```env
MCP_AUTH_MODE=user_query_token
```

Per-user ChatGPT connections authenticate with their own secret Server URL (`/mcp?key=...`). The legacy global Bearer token remains available in code as a rollback mode, but is not the active production authentication mode.

## ChatGPT integration gate

Antes de mudar produção para:

```env
MCP_AUTH_MODE=user_query_token
```

validar empiricamente duas contas ChatGPT diferentes:

1. cada uma usa uma URL diferente;
2. `mcp_whoami` resolve o usuário correto;
3. discovery funciona;
4. reads funcionam;
5. writes funcionam;
6. `mine` retorna ownership correto;
7. revogar A não afeta B;
8. reconexões preservam o query parameter.

## Lead Tasks & Calendar

As regras existentes continuam valendo:

- `CALL`, `FOLLOW_UP` e `MEETING` são bloqueados em `DO_NOT_CONTACT`;
- writes usam optimistic concurrency;
- tasks terminais não são reabertas;
- writes geram timeline + audit;
- tasks ativas derivam os campos de compatibilidade `nextAction`.
