# Feature Spec — Team Authentication & Multi-User Access

**Produto:** AgencyOS Leads  
**Status:** Implemented  
**Prioridade:** P0

## Objetivo

Permitir que cada humano opere o AgencyOS com identidade própria, mantendo o CRM compartilhado. Authentication identifica quem executa a ação; ownership indica quem é responsável pelo Lead/Task; role controla administração.

## Modelo

Users possuem:

- `id`
- `name`
- `email` normalizado
- `password_hash`
- `role: ADMIN | MEMBER`
- `active`
- `last_login_at`
- timestamps

Sessions são server-side:

- token aleatório de 256 bits no cookie;
- somente SHA-256 do token no banco;
- expiry configurável;
- revogação por sessão/usuário;
- cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção.

Passwords usam Node.js `scrypt` com salt aleatório e parâmetros registrados no próprio hash. Não existe senha em plaintext no banco.

## Roles

### ADMIN

Pode operar o CRM e também:

- acessar Settings;
- acessar Team;
- criar usuários;
- mudar role;
- editar identidade de membros;
- resetar senha;
- ativar/desativar contas.

### MEMBER

Opera o CRM normalmente:

- Leads;
- Pipeline;
- Tasks;
- Calendar;
- Needs Action;
- contatos;
- notas;
- outcomes;
- ownership.

Não administra usuários nem configurações sensíveis.

Todos os usuários ativos enxergam o CRM inteiro no MVP. Ownership é responsabilidade operacional, não ACL.

## Rotas

### Auth

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
PATCH /api/auth/profile
POST /api/auth/change-password
```

### Team — ADMIN

```text
GET   /api/team
POST  /api/team
PATCH /api/team/:id

POST /api/team/:id/reset-password
POST /api/team/:id/deactivate
POST /api/team/:id/activate
```

### UI

```text
/login
/settings/profile
/settings/team
/settings
```

## Session → ActorContext

A identidade do browser nunca vem do payload da UI.

```text
Cookie session
  ↓
User session repository
  ↓
Current User
  ↓
ActorContext { type: USER, id, name, role }
  ↓
Domain Service
  ↓
Timeline / Audit
```

MCP continua autenticando separadamente com Bearer/OAuth e produz `AGENT` actors.

## Team invariants

- usuário inativo não autentica;
- desativação revoga sessões;
- reset de senha revoga sessões;
- troca da própria senha revoga outras sessões;
- não existe signup público;
- self-deactivation é bloqueada;
- nunca pode existir zero ADMINs ativos;
- usuário desativado não é apagado;
- histórico e ownership permanecem visíveis.

## Ownership

Leads e Tasks usam usuários ativos como opções de atribuição.

Leads suportam:

- All;
- Me;
- usuário específico;
- Unassigned.

Pipeline suporta o mesmo filtro.

Needs Action e Calendar suportam:

- All team;
- Mine;
- usuário específico.

Lead Detail possui `Assign to me`.

`My Tasks` usa o id do usuário autenticado real.

Reatribuição de Lead gera activity `ASSIGNED`; Task já gera `TASK_REASSIGNED`.

## Segurança

- erros de login são genéricos;
- login possui rate limit in-memory básico por email + IP;
- mutations novas de auth/team validam Origin/Host;
- cookies não ficam em localStorage;
- session token não é armazenado em plaintext;
- MEMBER não recebe tela administrativa;
- servidor sempre revalida role;
- `APP_AUTH_DISABLED=true` gera erro se usado em `NODE_ENV=production`.

Para exposição pública em múltiplas instâncias, substituir o rate limiter in-memory por um store distribuído.

## PostgreSQL migration

`drizzle/0002_team_auth.sql`:

- adiciona password hash / active / last login;
- cria `user_sessions`;
- cria índices de sessão;
- preserva usuários/ownership existentes.

## Primeiro admin

Após aplicar migrations:

```bash
DATA_DRIVER=postgres npm run admin:create
```

O script solicita nome, email e senha interativamente.

## Mock mode

Com:

```env
DATA_DRIVER=mock
APP_AUTH_DISABLED=false
```

credenciais demo padrão:

```text
guilherme@agency.local / admin-agencyos-2026
comercial@agency.local / partner-agencyos-2026
```

As senhas podem ser alteradas com:

```env
DEV_ADMIN_PASSWORD=
DEV_MEMBER_PASSWORD=
```

Nunca reutilizar essas credenciais em produção.

## Definição de pronto

- login individual;
- logout;
- sessão revogável;
- ADMIN/MEMBER;
- Profile;
- Change Password;
- Team;
- create/update/activate/deactivate/reset;
- last-admin guard;
- current user como actor;
- My Tasks real;
- owner filters;
- Assign to me;
- timeline/audit identificando ator;
- MCP independente;
- testes de password/session repository.
