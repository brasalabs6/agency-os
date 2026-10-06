# Feature Spec — Lead Tasks & Calendar

**Produto:** AgencyOS Leads  
**Status:** Implemented  
**Timezone operacional padrão:** `America/Sao_Paulo`

## Objetivo

Adicionar trabalho operacional e agenda ao CRM sem transformá-lo em um gerenciador genérico de projetos. O pipeline responde **onde o lead está**, Tasks responde **o que fazer**, e Calendar responde **quando fazer**.

Toda task pertence obrigatoriamente a um lead. UI, REST e MCP usam o mesmo `TaskService`, os mesmos guards, optimistic concurrency, timeline e audit log.

## Domínio

```ts
type LeadTaskType =
  | "TASK" | "CALL" | "FOLLOW_UP" | "MEETING"
  | "RESEARCH" | "PROPOSAL" | "OTHER"

type LeadTaskStatus = "TODO" | "DOING" | "DONE" | "CANCELED"
type LeadTaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

interface LeadTask {
  id: string
  leadId: string
  title: string
  description?: string | null
  type: LeadTaskType
  status: LeadTaskStatus
  priority: LeadTaskPriority
  dueAt?: string | null
  startAt?: string | null
  endAt?: string | null
  allDay: boolean
  owner?: UserSummary | null
  order: number
  createdByType: "USER" | "AGENT" | "SYSTEM"
  createdById?: string | null
  completedAt?: string | null
  canceledAt?: string | null
  createdAt: string
  updatedAt: string
  version: number
}
```

### Tipos temporais

- **Sem data:** `dueAt`, `startAt` e `endAt` nulos.
- **Deadline:** `dueAt` preenchido, sem intervalo.
- **Evento:** `startAt` e `endAt` preenchidos em conjunto.
- **All day:** `allDay=true`; horário não é enfatizado na UI.

Timestamps são persistidos em UTC. A interface converte entrada e apresentação para `America/Sao_Paulo` por padrão.

## Próxima ação

`Lead.nextAction`, `nextActionAt` e `nextActionOwner` continuam existindo por compatibilidade, porém passam a ser uma projeção derivada das tasks ativas.

A primeira task é escolhida entre `TODO|DOING` por:

1. data efetiva (`dueAt ?? startAt`) mais próxima;
2. prioridade maior;
3. `order` menor;
4. `createdAt` mais antigo.

Depois de create/update/complete/cancel/reschedule/reorder, a projeção do lead é recalculada.

## Regras de negócio

- Tasks concluídas/canceladas são terminais: não podem ser reabertas ou reagendadas.
- `DONE` seta `completedAt`; `CANCELED` seta `canceledAt`.
- `endAt` nunca pode ser anterior a `startAt`.
- Evento exige `startAt` e `endAt` em par.
- Owner informado deve existir.
- `version` + `expectedVersion` evita lost updates.
- Hard delete não faz parte do fluxo normal; cancelamento preserva histórico.
- Lead `DO_NOT_CONTACT` bloqueia criação/reagendamento de `CALL`, `FOLLOW_UP` e `MEETING`.
- Ao mover um lead para `DO_NOT_CONTACT`, tasks de contato abertas são canceladas automaticamente.
- Tasks administrativas/research podem continuar existindo em DNC.

## Timeline e auditoria

Activities adicionadas:

- `TASK_CREATED`
- `TASK_UPDATED`
- `TASK_STARTED`
- `TASK_COMPLETED`
- `TASK_CANCELED`
- `TASK_RESCHEDULED`
- `TASK_REASSIGNED`
- `TASK_REORDERED`

Cada mutação também gera `audit_logs`, incluindo actor, tool (quando MCP), lead, input relevante e resultado/version. Não é armazenado raciocínio interno do agente.

## Banco

Tabela `lead_tasks` com FK para `leads` e owner opcional para `users`.

Índices principais:

- `lead_id`
- `status`
- `owner_id`
- `due_at`
- `start_at`
- `end_at`
- `(owner_id, status, due_at)`
- `(lead_id, status)`

`drizzle/0001_lead_tasks_calendar.sql` inclui migração idempotente de `leads.next_action` existente para uma task inicial.

## UI

### Lead Detail — `/leads/[id]`

Card **Tasks** com:

- quick create;
- título;
- tipo;
- prioridade;
- owner;
- data/hora;
- status TODO/DOING;
- concluir;
- cancelar;
- editar/reagendar;
- reordenar.

O `Next Action` existente continua visível como projeção da lista.

### Tasks — `/tasks`

Visões:

- My Tasks
- Today
- Upcoming
- Overdue
- No Date
- Completed

Filtros por texto, prioridade e responsável. Cada row liga diretamente ao lead e permite edição/conclusão.

### Needs Action — `/actions`

Passa a usar Tasks como fonte operacional:

- Overdue
- Today
- No Next Action
- Upcoming

### Calendar — `/calendar`

Views:

- Month
- Week
- Agenda (14 dias)

Interações:

- clicar em item abre editor;
- clicar em slot/dia cria task contextual;
- drag-and-drop reage agenda preservando duração de eventos;
- calendário consulta somente o intervalo visível.

### Overview

Métricas adicionadas:

- Tasks hoje
- Vencidas
- Contatos hoje
- Reuniões hoje

## REST API

```text
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
POST   /api/tasks/:id/complete
POST   /api/tasks/:id/cancel
POST   /api/tasks/:id/reschedule
POST   /api/tasks/reorder
GET    /api/leads/:id/tasks
POST   /api/leads/:id/tasks
GET    /api/calendar?from=<iso>&to=<iso>
```

As rotas são adapters finos; regras ficam em `src/lib/services/tasks.ts`.

## MCP

Tools adicionadas:

### Read

- `lead_tasks_list`
- `lead_task_get`
- `calendar_list`

### Write

- `lead_task_create`
- `lead_task_update`
- `lead_task_complete`
- `lead_task_cancel`
- `lead_task_reschedule`
- `lead_tasks_reorder`

Todas reutilizam scopes `leads.read` / `leads.write` e passam pelo domínio.

Exemplos suportados:

> “Crie uma ligação para amanhã às 10h para esse lead.”

> “O que eu tenho marcado esta semana?”

> “Reagende a reunião da Clínica Alfa para sexta às 14h.”

> “Conclua a pesquisa do decisor e me mostre a próxima ação.”

## Compatibilidade com operações existentes

`lead_set_next_action` agora cria uma Task em vez de escrever uma fonte paralela de verdade.

`lead_record_contact`, quando recebe `nextAction`, cria `FOLLOW_UP` (ou `MEETING` quando apropriado). Isso mantém UI e MCP convergentes.

## Mock e seed

`createDemoTasks()` cria cenário demonstrativo com:

- atrasadas;
- hoje;
- próximas;
- sem data;
- reuniões com início/fim;
- prioridades variadas;
- concluídas.

O seed PostgreSQL grava as mesmas tasks.

## Testes mínimos

Cobertura adicionada para:

- data efetiva;
- overdue apenas em tasks ativas;
- escolha da próxima task;
- scoping por lead no repository mock;
- optimistic concurrency do repository mock.

Fluxos E2E recomendados quando houver harness de browser:

1. criar task no lead e vê-la no card;
2. criar com data/hora e vê-la no calendário;
3. reagendar via drag-and-drop;
4. concluir e validar timeline/nextAction;
5. criar via MCP e validar UI;
6. bloquear task de contato em `DO_NOT_CONTACT`.

## Fora de escopo desta entrega

- tasks sem lead;
- subtarefas recursivas;
- recorrência;
- dependências/Gantt;
- time tracking;
- notificações push/SMS/WhatsApp;
- sincronização real com Google/Outlook Calendar;
- convidados e videoconferência.

O modelo foi mantido compatível com uma futura integração externa de calendário sem acoplar o CRM a um provedor hoje.

## Critério de aceite

A feature está pronta quando um operador consegue começar o dia no AgencyOS e responder **o que precisa fazer hoje para avançar os leads**, criar/editar/concluir/reagendar essas ações na UI e executar as mesmas operações via MCP, sempre com as mesmas regras de domínio e auditoria.
