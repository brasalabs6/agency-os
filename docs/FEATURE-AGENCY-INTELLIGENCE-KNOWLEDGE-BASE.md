# Feature Spec — Agency Intelligence / Knowledge Base

**Produto:** AgencyOS  
**Status:** Proposed  
**Issue de origem:** #43 — `feat: add Agency Intelligence / Knowledge Base`  
**Escopo desta spec:** modelagem e contratos para implementação futura; nenhuma implementação faz parte deste commit.

## 1. Objetivo

Adicionar ao AgencyOS uma base de conhecimento estruturada da agência para registrar, recuperar, revisar e evoluir inteligência comercial que não pertence a um único lead.

O CRM já preserva fatos, evidências, atividades e decisões operacionais por lead. Esta feature cobre conhecimento organizacional reutilizável entre vários leads, por exemplo:

- nichos que estão convertendo melhor;
- sinais recorrentes de qualificação;
- objeções comuns;
- abordagens que funcionaram ou falharam;
- hipóteses comerciais ainda não confirmadas;
- experimentos e seus resultados;
- playbooks por segmento/região;
- aprendizados sobre ticket, decisores e canais;
- decisões estratégicas e o motivo que as sustentou;
- anti-patterns identificados na operação.

A feature não deve ser uma wiki genérica. Ela deve ser uma camada de **Agency Intelligence** estruturada, auditável e MCP-first.

## 2. Princípios

1. **Conhecimento não é lead.** Um item pode existir sem nenhum lead associado e pode se relacionar a muitos leads.
2. **Inferência não vira fato por conveniência.** Tipo, status, confiança, fontes e evidências são explícitos.
3. **Evidência é preservada.** Fonte, URL, data observada e autoria não são descartadas quando uma conclusão muda.
4. **Histórico não é sobrescrito silenciosamente.** Mudanças relevantes geram revisão/versionamento e audit log.
5. **Contradição é representável.** Um conhecimento novo pode contradizer ou substituir outro sem apagar o anterior.
6. **UI, REST e MCP usam o mesmo domínio.** Regras ficam em services, não em adapters.
7. **Humanos e agentes são atores de primeira classe.** Toda mutação registra `ActorContext`.
8. **Não armazenar chain-of-thought.** Guardar somente dados, evidências, decisões, resumos e resultados estruturados.
9. **MVP enxuto.** O objetivo é acumular inteligência comercial confiável, não construir um editor de wiki ou motor semântico complexo.

## 3. Relação com features existentes

### Lead intelligence

`docs/FEATURE-AI-COMMERCIAL-INTELLIGENCE.md` modela inteligência aplicada a um lead específico: `BusinessProfile`, `Diagnostic`, `ScoreAssessment`, prospecting runs e automações.

Esta feature complementa esse domínio:

```text
Lead / BusinessProfile / Diagnostic
        │
        │ gera observações e evidências
        ▼
Agency Intelligence / Knowledge Base
        │
        │ devolve padrões, playbooks e hipóteses
        ▼
prospecção / scoring / diagnóstico / estratégia
```

Exemplo:

- Lead A, B e C revelam o mesmo padrão.
- Evidências desses leads são ligadas a uma `HYPOTHESIS`.
- Um `EXPERIMENT` testa a hipótese.
- O resultado evolui para `INSIGHT` validado.
- Um `PLAYBOOK` reutiliza esse insight na prospecção futura.

### Lead evidence

`lead_evidence` continua sendo evidência específica de um lead.

A Knowledge Base não deve mover ou duplicar silenciosamente essas evidências. Ela pode referenciar leads e, quando necessário, registrar uma evidência própria com proveniência suficiente para ser compreendida fora do contexto do lead.

### Audit

`audit_logs` continua sendo o ledger técnico global. As mutações desta feature devem usar o mesmo padrão, com `leadId` opcional/nulo quando o evento não for de um lead.

## 4. Tipos e estados

### 4.1 KnowledgeType

```ts
type KnowledgeType =
  | "FACT"
  | "HYPOTHESIS"
  | "INSIGHT"
  | "EXPERIMENT"
  | "PLAYBOOK"
  | "DECISION"
  | "ANTI_PATTERN"
```

Semântica:

- **FACT** — observação verificável apoiada por fonte/evidência direta.
- **HYPOTHESIS** — afirmação testável ainda não suficientemente validada.
- **INSIGHT** — aprendizado derivado de múltiplas observações/evidências.
- **EXPERIMENT** — teste comercial com hipótese, execução, métricas e conclusão.
- **PLAYBOOK** — orientação operacional reutilizável.
- **DECISION** — decisão estratégica ou operacional relevante, com rationale.
- **ANTI_PATTERN** — prática/abordagem que evidências indicam evitar.

### 4.2 KnowledgeStatus

```ts
type KnowledgeStatus =
  | "DRAFT"
  | "ACTIVE"
  | "VALIDATED"
  | "DISPROVED"
  | "ARCHIVED"
```

Regras:

- `DRAFT`: incompleto, não deve ser tratado como conhecimento operacional.
- `ACTIVE`: utilizável como hipótese/orientação, mas ainda sujeito a revisão.
- `VALIDATED`: possui evidência suficiente para o critério definido no item.
- `DISPROVED`: hipótese/afirmação refutada; permanece pesquisável e auditável.
- `ARCHIVED`: não é mais corrente, mas continua preservado.

`VALIDATED` não significa “verdade eterna”. `lastValidatedAt` indica quando a validade foi revisada pela última vez.

### 4.3 Confidence

`confidence` é inteiro de 0 a 100.

Não deve ser calculado implicitamente a partir do tipo. No MVP ele é informado/atualizado pelo ator com justificativa/evidência. Automações futuras podem sugerir confiança, mas devem preservar a origem da alteração.

Regras mínimas:

- `FACT` em `VALIDATED` exige ao menos uma evidência com fonte.
- `HYPOTHESIS` pode ser `ACTIVE`, `VALIDATED` ou `DISPROVED`, mas não muda automaticamente para `FACT`.
- `INSIGHT` validado deve apontar para mais de uma observação, lead, evidência ou relação derivada, salvo exceção explicitamente justificada.
- `DISPROVED` preserva a confiança anterior no histórico; a revisão atual pode reduzir a confiança corrente.

## 5. Modelo de domínio

### 5.1 KnowledgeItem

```ts
interface KnowledgeItem {
  id: string
  type: KnowledgeType
  title: string
  content: string
  status: KnowledgeStatus
  confidence: number

  segment?: string | null
  region?: string | null
  tags: string[]

  sourceType?: string | null
  sourceUrl?: string | null

  metrics: Record<string, unknown>

  createdByType: ActorType
  createdById: string
  createdByName: string

  lastValidatedAt?: string | null
  validatedByType?: ActorType | null
  validatedById?: string | null

  version: number
  createdAt: string
  updatedAt: string
}
```

Observações:

- `content` contém a afirmação/aprendizado operacional, não raciocínio oculto do modelo.
- `segment`, `region` e `tags` são filtros simples do MVP.
- `metrics` é JSON estruturado para acomodar experimentos sem antecipar um motor de métricas complexo.
- `version` participa de optimistic concurrency via `expectedVersion`.

### 5.2 KnowledgeEvidence

Evidência da base de conhecimento é um registro próprio, append-oriented.

```ts
interface KnowledgeEvidence {
  id: string
  knowledgeId: string

  sourceType?: string | null
  sourceUrl?: string | null
  sourceLeadId?: string | null

  observedAt?: string | null
  claim: string
  value: string
  confidence?: number | null

  createdByType: ActorType
  createdById: string
  createdByName: string
  createdAt: string
}
```

Regras:

- Pelo menos um de `sourceUrl` ou `sourceLeadId` deve existir para evidência externa/operacional.
- Evidência não é editada para “corrigir a história”; correções entram como nova evidência/revisão.
- Link para lead usa FK com `ON DELETE SET NULL` para não apagar conhecimento organizacional se um lead for removido.

### 5.3 KnowledgeLeadLink

Relação N:N explícita entre conhecimento e leads.

```ts
interface KnowledgeLeadLink {
  knowledgeId: string
  leadId: string
  relation:
    | "SOURCE"
    | "SUPPORTS"
    | "CONTRADICTS"
    | "APPLIES_TO"
    | "EXAMPLE"
  createdByType: ActorType
  createdById: string
  createdAt: string
}
```

O mesmo lead não deve criar links duplicados idênticos.

### 5.4 KnowledgeRelation

Representa relações entre itens de conhecimento.

```ts
type KnowledgeRelationType =
  | "SUPPORTS"
  | "CONTRADICTS"
  | "DERIVED_FROM"
  | "SUPERSEDES"
  | "RELATED"

interface KnowledgeRelation {
  fromKnowledgeId: string
  toKnowledgeId: string
  type: KnowledgeRelationType
  note?: string | null
  createdByType: ActorType
  createdById: string
  createdAt: string
}
```

Esta tabela resolve a regra de contradição sem sobrescrever história.

Quando A `SUPERSEDES` B:
- B não é apagado;
- B pode ser arquivado;
- a relação permanece navegável;
- buscas padrão podem priorizar A, mas consultas históricas continuam encontrando B.

### 5.5 KnowledgeRevision

Mudanças relevantes devem ser historicamente reconstruíveis.

```ts
interface KnowledgeRevision {
  id: string
  knowledgeId: string
  version: number

  snapshot: {
    type: KnowledgeType
    title: string
    content: string
    status: KnowledgeStatus
    confidence: number
    segment?: string | null
    region?: string | null
    tags: string[]
    sourceType?: string | null
    sourceUrl?: string | null
    metrics: Record<string, unknown>
    lastValidatedAt?: string | null
  }

  changeSummary?: string | null
  actorType: ActorType
  actorId: string
  actorName: string
  createdAt: string
}
```

No MVP, uma revisão é criada antes/depois de cada mutação relevante do item principal. Evidence e relations são append-oriented e não precisam ser duplicadas no snapshot.

## 6. Experimentos

`EXPERIMENT` usa o mesmo `KnowledgeItem`, sem criar um segundo sistema no MVP.

Convenção para `metrics`:

```ts
interface ExperimentMetrics {
  hypothesis?: string
  startedAt?: string
  endedAt?: string
  sampleSize?: number
  targetMetric?: string
  baseline?: number | null
  result?: number | null
  unit?: string | null
  outcome?: "POSITIVE" | "NEGATIVE" | "INCONCLUSIVE" | "RUNNING"
  notes?: string
}
```

Regras:

- métricas desconhecidas ficam ausentes; não inventar valores;
- `outcome` `RUNNING` não pode sustentar sozinho uma validação definitiva;
- conclusão do experimento deve ser registrada em `content`, `metrics` e/ou item derivado;
- um `INSIGHT`/ `DECISION` derivado deve usar `DERIVED_FROM`.

## 7. Persistência PostgreSQL

Tabelas propostas:

```text
knowledge_items
knowledge_evidence
knowledge_lead_links
knowledge_relations
knowledge_revisions
```

Índices mínimos:

### knowledge_items
- `type`
- `status`
- `segment`
- `region`
- `confidence`
- `updated_at`
- GIN em `tags` se a implementação mantiver array/JSONB
- busca textual simples por `title/content` pode começar com `ILIKE`; FTS/embeddings ficam fora do MVP

### knowledge_evidence
- `knowledge_id`
- `source_lead_id`
- `observed_at`

### knowledge_lead_links
- `knowledge_id`
- `lead_id`
- unique `(knowledge_id, lead_id, relation)`

### knowledge_relations
- `from_knowledge_id`
- `to_knowledge_id`
- unique `(from_knowledge_id, to_knowledge_id, type)`

### knowledge_revisions
- unique `(knowledge_id, version)`
- `created_at`

## 8. Repository e services

Adicionar um boundary próprio:

```text
KnowledgeRepository
├─ search
├─ getById
├─ create
├─ update
├─ listEvidence
├─ addEvidence
├─ listLeadLinks
├─ linkLeads
├─ listRelations
├─ addRelation
└─ listRevisions
```

Adapters:

```text
MockKnowledgeRepository
PostgresKnowledgeRepository
```

Service:

```text
src/lib/services/knowledge.ts
```

Responsabilidades do service:

- validação de tipo/status/confiança;
- guards de transição;
- optimistic concurrency;
- criação de revisões;
- manutenção de `lastValidatedAt`;
- regras mínimas para `VALIDATED`;
- vínculo com leads;
- relações de contradição/supersessão;
- audit logs;
- paginação e filtros;
- normalização de tags/segment/region;
- nenhuma regra de negócio duplicada em REST/MCP/UI.

## 9. Busca

`KnowledgeSearchFilters`:

```ts
interface KnowledgeSearchFilters {
  query?: string
  types?: KnowledgeType[]
  statuses?: KnowledgeStatus[]
  segment?: string
  region?: string
  tags?: string[]
  confidenceMin?: number
  confidenceMax?: number
  leadId?: string
  updatedAfter?: string
  limit?: number
  offset?: number
}
```

Comportamento:

- busca textual em `title` + `content`;
- filtros combináveis;
- paginação obrigatória;
- ordenação padrão: `VALIDATED` corrente primeiro, depois `updatedAt desc`;
- itens `ARCHIVED` e `DISPROVED` devem continuar encontráveis quando explicitamente solicitados;
- resposta deve sempre expor `type`, `status`, `confidence`, `version` e `updatedAt`.

## 10. Niche Profile

`niche_profile_get` é uma **read model**, não uma segunda fonte de verdade.

Entrada sugerida:

```ts
{
  segment: string
  region?: string
}
```

Saída:

```ts
{
  segment: string
  region?: string
  leadStats: {
    total: number
    byStatus: Record<string, number>
    won: number
    lost: number
    active: number
    averageScore?: number | null
  }
  knowledge: {
    validatedInsights: KnowledgeItem[]
    activeHypotheses: KnowledgeItem[]
    playbooks: KnowledgeItem[]
    antiPatterns: KnowledgeItem[]
    recentExperiments: KnowledgeItem[]
  }
}
```

Importante:

- estatísticas de performance devem ser calculadas a partir dos dados reais de leads/outcomes disponíveis;
- a API não deve declarar “melhor nicho” sem definir a métrica;
- quando a amostra for insuficiente, retornar contagens e sinalizar a limitação em vez de inventar uma conclusão;
- explicações de “por quê” devem apontar para knowledge items/evidências, não para texto gerado sem fonte.

## 11. REST API

Rotas sugeridas:

```text
GET    /api/knowledge
POST   /api/knowledge
GET    /api/knowledge/:id
PATCH  /api/knowledge/:id

GET    /api/knowledge/:id/evidence
POST   /api/knowledge/:id/evidence

GET    /api/knowledge/:id/leads
POST   /api/knowledge/:id/leads

GET    /api/knowledge/:id/relations
POST   /api/knowledge/:id/relations

GET    /api/knowledge/:id/revisions

GET    /api/knowledge/niche-profile?segment=<...>&region=<...>
```

As rotas são adapters finos e usam `KnowledgeService`.

Não incluir hard delete no fluxo normal. Arquivamento preserva histórico.

## 12. MCP

### Scopes

Adicionar:

```text
knowledge.read
knowledge.write
```

Credenciais existentes não devem ganhar `knowledge.write` silenciosamente em produção. A migração/rollout deve definir explicitamente como scopes antigos são expandidos.

### Read tools

#### knowledge_search

Busca paginada com:
- query;
- types;
- statuses;
- segment;
- region;
- tags;
- confidenceMin / confidenceMax;
- leadId;
- updatedAfter.

#### knowledge_get

Retorna:
- item;
- evidence;
- linked leads;
- relations;
- revision metadata.

#### niche_profile_get

Agrega dados reais de leads + knowledge base para um nicho/região.

### Write tools

#### knowledge_upsert

No MVP, preferir semântica explícita:
- com `id`: update;
- sem `id`: create.

Campos de atualização exigem `expectedVersion` quando `id` é informado.

O tool não pode promover automaticamente uma inferência para `FACT`.

#### knowledge_add_evidence

Adiciona evidência append-only com proveniência.

#### knowledge_update_status

Transição explícita de status, com:
- `expectedVersion`;
- `status`;
- `changeSummary`;
- opcionalmente `confidence`.

Aplicar guards de validação.

#### knowledge_link_leads

Liga um item a um ou mais leads com relação explícita.

### Tool opcional recomendado

`knowledge_add_relation` deve ser incluído no MVP técnico se `CONTRADICTS`/`SUPERSEDES` forem implementados, pois sem ele agentes não conseguem preservar contradições pelo MCP.

### Exemplos de uso

> “Quais hipóteses temos sobre clínicas odontológicas no DF?”

> “Registre como hipótese que clínicas com forte prova social e sem site próprio parecem ter alta prioridade. Confiança 55, baseada nestes três leads.”

> “Adicione este lead como evidência de suporte à hipótese.”

> “O experimento terminou. Marque a hipótese como refutada, registre o resultado e preserve a versão anterior.”

> “Quais nichos estão performando melhor e quais evidências explicam isso?”

## 13. UX

Adicionar entrada principal na navegação:

```text
Inteligência
```

Rota sugerida:

```text
/intelligence
/intelligence/[id]
```

### 13.1 Lista

Exibir:

- busca;
- filtros de tipo;
- status;
- segmento;
- região;
- confiança;
- tags;
- cards/rows com tipo, status, confiança, título, segmento/região, última atualização.

Visualmente deve ser fácil distinguir:

- validado;
- hipótese ativa;
- refutado;
- arquivado.

### 13.2 Detail

Seções:

```text
Resumo
Evidências
Leads relacionados
Relações
Métricas / experimento
Histórico de revisões
Auditoria resumida
```

A tela deve expor claramente:

- autoria;
- status epistemológico;
- confiança;
- fontes;
- última validação;
- versão;
- itens contraditórios/superseded.

### 13.3 Create/Edit

Formulário enxuto:

- type;
- title;
- content;
- status;
- confidence;
- segment;
- region;
- tags;
- source type/url;
- metrics somente quando necessário.

Não exigir todos os campos opcionais para criar um `DRAFT`.

### 13.4 Mobile

A feature deve seguir o shell responsivo atual:

- filtros em drawer/sheet ou área colapsável;
- cards de conhecimento empilhados;
- evidence/relations sem tabelas horizontalmente quebradas;
- ações críticas acessíveis sem hover;
- nenhuma dependência de layout desktop para uso operacional.

## 14. Regras de transição

Transições permitidas:

```text
DRAFT      -> ACTIVE | ARCHIVED
ACTIVE     -> VALIDATED | DISPROVED | ARCHIVED
VALIDATED  -> ACTIVE | DISPROVED | ARCHIVED
DISPROVED  -> ACTIVE | ARCHIVED
ARCHIVED   -> ACTIVE
```

Observações:

- reativar um item exige nova revisão e `changeSummary`;
- validar seta `lastValidatedAt=now` e ator validador;
- sair de `VALIDATED` não apaga a data da validação histórica, apenas altera a projeção corrente;
- `expectedVersion` protege múltiplos humanos/agentes de lost updates.

## 15. Auditoria

Ações mínimas:

```text
KNOWLEDGE_CREATED
KNOWLEDGE_UPDATED
KNOWLEDGE_STATUS_CHANGED
KNOWLEDGE_EVIDENCE_ADDED
KNOWLEDGE_LEADS_LINKED
KNOWLEDGE_RELATION_ADDED
KNOWLEDGE_ARCHIVED
```

Cada ação registra:

- actor;
- tool MCP, quando aplicável;
- knowledgeId;
- versão antes/depois quando relevante;
- input resumido;
- resultado resumido.

Se `audit_logs` continuar com schema centrado em `leadId`, a implementação deve adicionar `entityType/entityId` ou equivalente de forma compatível, em vez de falsificar um `leadId`.

## 16. Segurança e permissões

- Web UI continua exigindo sessão autenticada.
- MCP exige scope apropriado.
- `knowledge.read` não implica `knowledge.write`.
- Conteúdo da KB não deve conter secrets/tokens.
- URLs externas devem ser tratadas como dados, não executadas automaticamente.
- Renderização de `content` deve ser segura contra XSS.
- Nenhum tool expõe SQL arbitrário.
- Agentes não podem falsificar `createdBy`; autoria vem do `ActorContext`.

Para o MVP interno, ADMIN e MEMBER podem ler/escrever conhecimento. Permissões editor/reviewer mais granulares ficam fora do primeiro release.

## 17. Concorrência e idempotência

- updates usam `expectedVersion`;
- adicionar o mesmo link/relation deve ser idempotente por unique key;
- `knowledge_upsert` não deve tentar deduplicar automaticamente itens semanticamente parecidos no MVP;
- antes de criar, agentes são orientados a chamar `knowledge_search`;
- duplicatas descobertas depois podem ser relacionadas com `SUPERSEDES`/`RELATED`, sem merge destrutivo.

## 18. Métricas de produto

Métricas úteis após implementação:

- total de knowledge items por tipo/status;
- hipóteses ativas;
- hipóteses validadas/refutadas;
- itens sem evidência;
- itens validados não revisados há X dias;
- experimentos ativos/concluídos;
- % de knowledge items ligados a leads;
- nichos com maior volume de evidência;
- uso das tools MCP de knowledge.

Essas métricas não precisam entrar no primeiro UI dashboard.

## 19. Testes mínimos

### Domain/service

- criar item independente de lead;
- validar enums e confidence 0–100;
- optimistic concurrency;
- transições válidas e inválidas;
- `FACT + VALIDATED` sem evidência falha;
- revisão criada em update relevante;
- evidência append-only;
- links N:N idempotentes;
- relação `CONTRADICTS` preserva ambos os itens;
- `SUPERSEDES` não apaga item anterior;
- auditoria usa actor correto.

### Repository

Testar mock e PostgreSQL com o mesmo contrato:

- filtros combinados;
- paginação;
- filtro por lead ligado;
- ordering;
- revisions por versão;
- constraints/unique keys.

### REST

- autenticação;
- validação de payload;
- 404;
- 409 em `expectedVersion` stale;
- filtros;
- status transitions;
- ausência de hard delete.

### MCP

- scopes read/write;
- `knowledge_search`;
- `knowledge_get`;
- create/update;
- add evidence;
- status update;
- link leads;
- niche profile;
- identidade `mcp_whoami` refletida em autoria/audit.

### E2E

1. humano cria hipótese pela UI;
2. ChatGPT encontra a hipótese via MCP;
3. ChatGPT liga três leads e adiciona evidências;
4. humano abre a UI e vê origem/autoria;
5. ChatGPT tenta validar com version stale e recebe conflito;
6. após reload, valida/refuta corretamente;
7. revisão anterior continua visível;
8. busca por nicho/região retorna o item;
9. `niche_profile_get` combina estatísticas de leads e knowledge;
10. mobile consegue pesquisar, abrir e editar sem overflow impeditivo.

## 20. Critérios de aceite

A feature é considerada pronta quando:

- [ ] conhecimento pode existir independente de qualquer lead;
- [ ] item possui tipo, status e confiança explícitos;
- [ ] evidências preservam origem e autoria;
- [ ] um item pode ser ligado a vários leads;
- [ ] contradições/supersessões não apagam o histórico;
- [ ] alterações relevantes preservam versões/revisões;
- [ ] optimistic concurrency protege writes concorrentes;
- [ ] UI permite pesquisar, filtrar, consultar e editar conhecimento;
- [ ] UI funciona em desktop e mobile;
- [ ] MCP consegue pesquisar, obter, criar/atualizar, adicionar evidência, mudar status e ligar leads;
- [ ] `niche_profile_get` usa dados reais e explicações rastreáveis;
- [ ] hipóteses podem evoluir para `VALIDATED` ou `DISPROVED`;
- [ ] autoria diferencia humano/agente;
- [ ] todas as mutações geram audit;
- [ ] o ChatGPT consegue responder “quais nichos estão performando melhor e por quê?” citando dados persistidos/itens da KB, sem inventar evidência.

## 21. Fora de escopo do MVP

- embeddings/vector database;
- RAG semântico complexo;
- geração automática de conhecimento sem write explícito;
- deduplicação semântica automática;
- approval workflow editorial multi-stage;
- comentários estilo wiki;
- anexos/binários;
- grafo visual avançado;
- scraping interno;
- execução automática de playbooks;
- atualização autônoma de estratégia sem registro/auditoria;
- métricas estatísticas avançadas/A-B engine dedicada.

A modelagem deve permitir evoluir nessas direções sem torná-las requisito para o primeiro release.

## 22. Ordem recomendada de implementação

### KB-01 — Domain + migration
- tipos;
- tabelas;
- constraints;
- migration;
- repository contracts;
- mock/postgres adapters.

### KB-02 — Service + audit
- CRUD sem hard delete;
- filters;
- optimistic concurrency;
- revisions;
- evidence;
- lead links;
- relations;
- status guards;
- audit.

### KB-03 — REST
- list/detail/create/update;
- evidence;
- links;
- relations;
- revisions;
- niche profile.

### KB-04 — MCP
- scopes;
- `knowledge_search`;
- `knowledge_get`;
- `knowledge_upsert`;
- `knowledge_add_evidence`;
- `knowledge_update_status`;
- `knowledge_link_leads`;
- `knowledge_add_relation`;
- `niche_profile_get`.

### KB-05 — UI
- navegação;
- list/filter;
- detail;
- create/edit;
- evidence/links/relations/revisions;
- mobile/responsividade.

### KB-06 — Validation
- unit/integration;
- MCP round-trip;
- UI/MCP consistency;
- mobile E2E;
- production migration verification.

## 23. Exemplo canônico

Hipótese inicial:

```text
Type: HYPOTHESIS
Title: Clínicas odontológicas com forte prova social e sem site próprio
Status: ACTIVE
Confidence: 55
Segment: Clínicas odontológicas
Region: DF
Content:
Clínicas odontológicas no DF que possuem forte prova social em Google/Instagram,
mas não possuem site próprio, parecem ser ICP de alta prioridade para oferta de site.
```

Evolução:

```text
HYPOTHESIS
  ├─ SOURCE/SUPPORTS -> Lead A
  ├─ SOURCE/SUPPORTS -> Lead B
  ├─ SOURCE/SUPPORTS -> Lead C
  ├─ evidence URLs/observations
  └─ DERIVED_FROM/RELATED -> EXPERIMENT
                                 ├─ sample
                                 ├─ target metric
                                 ├─ result
                                 └─ conclusion
                                      │
                                      ├─ validates hypothesis
                                      └─ DERIVED_FROM -> INSIGHT / PLAYBOOK
```

O objetivo final não é apenas lembrar que a hipótese existiu, mas permitir reconstruir **por que surgiu, como foi testada, quais dados a sustentaram, quem alterou sua interpretação e como isso mudou a operação comercial**.
