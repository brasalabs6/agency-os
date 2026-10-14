# Feature Spec — Conversation Script Graphs (roteiros comerciais navegáveis)

**Produto:** AgencyOS Leads  
**Status:** In progress (implementation PR #60; not deployed or production-enabled)  
**Prioridade:** P1 — planejamento para implementação futura  
**Base de análise:** main @ 8e9c48d010bdc9d904347f3f1563eabcbca8a775 (2026-10-14)  
**Escopo desta spec:** contrato aprovado no PR #59. A implementação ocorre no PR #60; migration, feature flag e deploy de produção permanecem operações separadas.

## 1. Objetivo

Permitir que agentes conectados por MCP criem e mantenham **roteiros comerciais ramificados por lead**, contendo falas, perguntas e possíveis reações da outra pessoa. Na página de cada lead, o usuário poderá:

1. selecionar um roteiro de contato/qualificação/negociação;
2. navegar passo a passo: ler o texto do nó atual, escolher a reação e avançar;
3. voltar, reiniciar, copiar o texto e visualizar a trilha percorrida;
4. alternar para um mapa interativo do grafo, com o caminho da exploração destacado;
5. consultar versões publicadas ou rascunhos, sem que uma edição do agente substitua silenciosamente o roteiro em uso.

**Princípio de produto:** o navegador guiado é a interface principal; o diagrama é o mapa do mesmo grafo, não um artefato separado.

## 2. Contexto e limites de responsabilidade

O AgencyOS já possui:

- página de lead em src/app/(app)/leads/[id]/page.tsx; hoje não há sistema de abas para o detalhe;
- Conversation / ChannelMessage para histórico real do WhatsApp, Qualification para descoberta, AiRun para observabilidade;
- serviços compartilhados de domínio consumidos por UI, REST e Remote MCP em /mcp;
- persistência mock/PostgreSQL, Drizzle, audit_logs, lead_activities, controle de versão e credenciais MCP pessoais com scopes persistidos;
- docs/FEATURE-AGENCY-INTELLIGENCE-KNOWLEDGE-BASE.md, spec **Proposed** para conhecimento genérico e PLAYBOOK reutilizável.

**Separação obrigatória:**

| Entidade | O que representa | Fonte da verdade |
| --- | --- | --- |
| Knowledge Base / PLAYBOOK (proposto, não implementado) | Orientações comerciais reutilizáveis entre leads | Knowledge Base quando implementada |
| Conversation Script Graph | Possibilidades e falas *planejadas* para um lead | Esta feature |
| Conversation / ChannelMessage | Mensagens e reações *realmente ocorridas* | Módulos existentes |
| Qualification | Fatos e informações obtidos durante qualificação | Módulo existente |
| LeadTask / Next Action | Trabalho executável com responsável e data | Módulo existente |
| ApprovalRequest | Autorização humana para efeitos externos | Módulo existente |

Roteiros podem *ler* contexto desses domínios, mas não duplicar seus modelos, criar mensagens reais, alterar automaticamente Qualification, mudar etapas ou enviar comunicação. Qualquer integração de execução futura usa os services e gates de aprovação já existentes.

## 3. Decisões arquiteturais

1. **Grafo estruturado em JSONB** como fonte canônica; não persistir Mermaid, SVG, screenshot ou dados internos do React Flow como representação de negócio.
2. **Nós são falas/perguntas/encerramentos**; arestas são possíveis **reações do lead**. O ponto de entrada é startNodeId; não existe nó do tipo DECISION neste MVP.
3. **Múltiplos scripts por lead**, diferenciados por channel, purpose e título, sem UNIQUE(lead_id) nem restrição exclusiva por canal.
4. **Rascunho e versão publicada separados**, apontando para snapshots imutáveis. Agentes editam rascunhos; somente humano ADMIN publica.
5. **Optimistic concurrency no script**, independente da versão do Lead; expectedVersion é obrigatório para substituir, aplicar patch ou publicar.
6. **Patch atômico e granular** para edições econômicas por MCP; upsert com modos discriminados create/replace para criação e substituição integral.
7. **Mesmo service para REST/MCP/UI**; sem SQL arbitrário e sem novo motor/orquestrador.
8. **Feature flag independente** CONVERSATION_SCRIPTS_ENABLED, incluindo gating coerente em UI, REST e discovery de tools MCP.
9. **Navegação simulada e read-only** no MVP; trilha temporária no cliente, sem gravar reações hipotéticas no CRM.
10. **Texto renderizado como texto** (React escapado); conteúdo de agentes e fontes externas é dado não confiável.

## 4. Objetivos funcionais / histórias

- **Agente:** após obter o lead e suas evidências, criar um roteiro contextualizado para WhatsApp, telefone, email ou uso geral.
- **Agente:** consultar roteiro, editar texto de um nó ou acrescentar uma ramificação sem reenviar todo o grafo; receber version/revision atualizados.
- **Agente:** criar uma revisão em rascunho mesmo quando existe uma versão publicada, sem alterar esta última.
- **Vendedor:** abrir /leads/:id na aba “Script de conversa”, escolher roteiro e iniciar exploração no nó inicial.
- **Vendedor:** selecionar uma reação, avançar para o próximo script, voltar, reiniciar, copiar fala e ver o histórico de escolhas.
- **Vendedor:** alternar para “Mapa” e navegar/pesquisar nós com zoom/pan; visualizar a trilha selecionada.
- **ADMIN:** inspecionar a versão em edição, conferir avisos de validação e publicar explicitamente; voltar a uma revisão anterior por recuperação controlada.
- **Todos:** enxergar de forma inequívoca o que está publicado, o que está em edição e qual revisão está sendo explorada.

## 5. Não objetivos do MVP

- Não criar editor visual drag-and-drop de nós/arestas, linguagem de condições ou executor de workflow.
- Não criar motor de IA, MCP server, banco de grafos ou Knowledge Base alternativos.
- Não sincronizar automaticamente trilha exploratória com Conversation, mensagens, Qualification, tasks ou estágio do lead.
- Não enviar WhatsApp/email, não ligar, não gerar aprovação implícita e não interpretar reações automaticamente a partir de mensagens.
- Não permitir publicação MCP nem aprovação automática de alterações produzidas pelo agente.
- Não implementar tenant/ACL inteiramente novo; utilizar as permissões atuais e registrar o risco de isolamento existente.
- Não incluir edição humana complexa de grafos; ADMIN publica, usuários exploram, agentes redigem. Um editor humano poderá vir em outra fase.
- Não executar migrações em produção automaticamente.

## 6. Contrato do grafo (schemaVersion = 1)

~~~ts
type ScriptChannel = "WHATSAPP" | "PHONE" | "EMAIL" | "GENERAL";
type ScriptPurpose =
  | "FIRST_CONTACT" | "QUALIFICATION" | "FOLLOW_UP"
  | "NEGOTIATION" | "OTHER";
type ScriptNodeType = "MESSAGE" | "QUESTION" | "END";

interface ScriptNode {
  id: string;                 // estável e único no grafo
  type: ScriptNodeType;
  title: string;              // rótulo visual curto
  script: string;             // fala sugerida, inclusive em END
  guidance?: string;          // orientação interna ao vendedor
  evidenceIds?: string[];     // IDs em lead_evidence pertencentes a este lead
}

interface ScriptEdge {
  id: string;
  source: string;
  target: string;
  reaction: {
    label: string;            // reação que o usuário escolhe no navegador
    code?: string;            // código estável opcional para integrações futuras
  };
}

interface ScriptGraph {
  schemaVersion: 1;
  startNodeId: string;
  nodes: ScriptNode[];
  edges: ScriptEdge[];
}

interface ConversationScript {
  id: string;
  leadId: string;
  title: string;
  channel: ScriptChannel;
  purpose: ScriptPurpose;
  version: number;                 // CAS da entidade inteira
  draftRevisionId: string | null;
  publishedRevisionId: string | null;
  createdByType: ActorType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface ScriptRevision {
  id: string;
  scriptId: string;
  revisionNumber: number;         // monotônico por script, sem sobrescrita
  baseRevisionId: string | null;
  graph: ScriptGraph;              // snapshot imutável
  changeSummary?: string | null;
  createdByType: ActorType;
  createdById: string;
  createdAt: string;
}
~~~

Regras:

- Um script novo possui draftRevisionId apontando para a revisão 1 e publishedRevisionId = null.
- Uma alteração cria nova revisão imutável, atualiza draftRevisionId e incrementa version em uma única transação; publishedRevisionId fica inalterado.
- Sem rascunho corrente, editar parte da última revisão publicada (copy-on-write). Isso **não modifica** o snapshot publicado.
- Publicar valida o draft novamente dentro da transação, troca publishedRevisionId pelo draftRevisionId, limpa draftRevisionId e incrementa version.
- Reabrir uma revisão histórica significa **copiar** o snapshot para um novo rascunho com nova revisionNumber; não retroceder contadores nem sobrescrever históricos.
- GET de versão publicada deve servir o ID imutável usado no momento do carregamento; a UI mantém esse revisionId fixo durante a exploração.
- Sem versão publicada, a UI exibe rascunho claramente identificado como “Prévia — não publicado”; nunca o apresenta como roteiro vigente.

### Exemplo mínimo

~~~json
{
  "schemaVersion": 1,
  "startNodeId": "opening",
  "nodes": [
    {"id":"opening","type":"MESSAGE","title":"Abertura","script":"Posso apresentar uma ideia rapidamente?"},
    {"id":"pricing","type":"QUESTION","title":"Objeção de preço","script":"Podemos entender o objetivo antes de falar em investimento?"},
    {"id":"end","type":"END","title":"Encerrar","script":"Obrigado pelo seu tempo."}
  ],
  "edges": [
    {"id":"e-price","source":"opening","target":"pricing","reaction":{"label":"Perguntou o preço"}},
    {"id":"e-close","source":"opening","target":"end","reaction":{"label":"Não tem interesse"}},
    {"id":"e-done","source":"pricing","target":"end","reaction":{"label":"Prefere encerrar"}}
  ]
}
~~~

## 7. Validação: estrutural, publicação e limites

A validação vive em src/lib/validation/script-flow.ts e é reutilizada no service. São dois níveis distintos:

### 7.1 Invariantes de escrita (incluindo DRAFT)

- schemaVersion reconhecido; payload estritamente tipado, sem propriedades arbitrárias.
- IDs de nós/arestas não vazios, estáveis, únicos; updateNode não pode renomear id.
- Toda aresta aponta para source e target existentes; não persistir referência pendente, mesmo temporariamente.
- Se houver nós, startNodeId deve apontar para um existente. Rascunhos vazios só são aceitos com startNodeId vazio e edges vazias.
- evidenceIds devem existir e pertencer ao mesmo lead; não copiar conteúdo de evidência para o script automaticamente.
- Limites iniciais propostos: **100 nós, 250 arestas, 5.000 caracteres por script, 500 por guidance, 120 por title, 120 por reação** e **1 MiB** para JSON serializado. Validar após cada lote de patch, antes de gravar.
- No mesmo nó, labels de reação não podem ser duplicadas após trim + normalização case-insensitive. Codes informados também devem ser únicos entre saídas do mesmo nó.
- Texto e IDs são tratados como dados, não expressões/código; strings são normalizadas e limites conferidos no servidor.
- Referenciar lead inexistente: 404; IDs cruzando leads: 404/403 (não vazar a existência de recurso privado).

### 7.2 Invariantes adicionais para publicação

- Grafo possui pelo menos um nó e exatamente um startNodeId válido.
- Todos os nós são alcançáveis a partir do inicial.
- Todo nó que não seja END possui ao menos uma aresta de saída.
- Nenhum nó END possui arestas de saída.
- Deve haver ao menos um END.
- Cada nó alcançável pode, por algum caminho, chegar a um END (não há componentes presos para sempre).
- Ciclos são **permitidos**, inclusive retornos de objeção à pergunta anterior.
- Diagnósticos incluem código, nodeId/edgeId quando aplicável e descrição legível.
- Publicação inválida recebe 422 SCRIPT_GRAPH_INVALID; rascunhos podem permanecer incompletos, mas nunca estruturalmente corrompidos.

Exemplo de validação eficiente: BFS/DFS do início para alcançabilidade; busca reversa partindo dos END para verificar capacidade de terminar. Ambas lineares em nós + arestas.

### 7.3 Navegação em ciclos

- Cada avanço segue exatamente uma aresta selecionada, sem avaliação automática de condições.
- Trilha é uma sequência de IDs de nós **e arestas**, não apenas IDs de nós; isso preserva qual reação foi escolhida.
- Nós podem repetir na trilha. Impor limite de segurança de **100 passos por exploração** com opção de reiniciar/voltar; não proibir grafos cíclicos.
- Ao trocar de roteiro ou de revisão, a trilha é reiniciada para impedir apontar para nós inexistentes.

## 8. Persistência / migration planejada

Próximo número disponível na main analisada: **drizzle/0009_lead_conversation_scripts.sql**. Reconfirmar sequência imediatamente antes de implementar.

### 8.1 lead_conversation_scripts

- id UUID PK, lead_id UUID NOT NULL FK leads ON DELETE CASCADE;
- title TEXT NOT NULL, channel TEXT NOT NULL, purpose TEXT NOT NULL;
- version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0);
- draft_revision_id UUID NULL, published_revision_id UUID NULL;
- creation_key TEXT NOT NULL, creation_actor_id TEXT NOT NULL, creation_payload_hash TEXT NOT NULL (SHA-256 de JSON canônico dos dados de criação);
- created_by_type, created_by_id, created_at, updated_at;
- UNIQUE(lead_id, creation_actor_id, creation_key) para idempotência de create; UNIQUE(lead_id, id) para escopo explícito nas queries.
- índices em lead_id, updated_at, channel/purpose conforme necessidade real.

### 8.2 lead_conversation_script_revisions

- id UUID PK, script_id UUID NOT NULL FK scripts ON DELETE CASCADE;
- revision_number INTEGER NOT NULL CHECK > 0, base_revision_id UUID NULL;
- graph JSONB NOT NULL com schemaVersion = 1; change_summary TEXT NULL;
- created_by_type, created_by_id, created_at;
- UNIQUE(script_id, revision_number).
- FKs/correlação exigem que draftRevisionId, publishedRevisionId e baseRevisionId apontem a revisões **do mesmo script**. Utilizar FKs compostas/constraints deferrable quando viável; de toda forma validar atomicamente no serviço e testar integridade no banco.
- Revisões são insert-only: serviços jamais executam UPDATE/DELETE sobre snapshots; bloquear mutações pela política/estrutura de banco quando viável.

Implementar criação transacional (script + primeira revisão), patch/replace transacional com CAS (UPDATE ... WHERE id AND version = expectedVersion RETURNING), publicação transacional e autoria/audit. Para operações Postgres, inserir a auditoria de sucesso **na mesma transação** por meio de writer que aceite o transaction client (ou outbox transacional); não usar audit separado após commit como garantia de atomicidade. Não implementar leitura + escrita separadas sem bloqueio/CAS.

### 8.3 Segurança DB

Seguir o padrão de drizzle/0008_ai_commercial_automation.sql:

- habilitar RLS nas tabelas internas;
- revogar privilégios de anon/authenticated/public no Data API;
- aplicação acessa via conexão PostgreSQL server-side;
- índices e integridade verificáveis por migration check;
- nenhuma alteração destrutiva em leads/conversations/qualifications;
- backups e verificação de schema antes de habilitar flag.

## 9. Serviços, repositórios e erros

**Camada única:** src/lib/services/script-flows.ts, com getScriptFlowRepository() escolhendo Mock | PostgreSQL como os adapters existentes.

Contrato proposto:

~~~ts
interface ScriptFlowRepository {
  listByLead(leadId: string, filters: { channel?: ScriptChannel; purpose?: ScriptPurpose; limit: number; offset: number }): Promise<{items: ConversationScript[]; total: number}>;
  getByIdAndLead(scriptId: string, leadId: string): Promise<ConversationScript | null>;
  getRevision(scriptId: string, revisionId: string): Promise<ScriptRevision | null>;
  createWithDraft(input: CreateScriptInput, actor: ActorContext): Promise<ScriptView>;
  commitDraft(input: { leadId: string; scriptId: string; expectedVersion: number; graph: ScriptGraph; summary?: string }, actor: ActorContext): Promise<ScriptView>;
  publishDraft(input: { leadId: string; scriptId: string; expectedVersion: number; expectedDraftRevisionId: string }, actor: ActorContext): Promise<ScriptView>;
}
~~~

O patch é aplicado/validado no **service**, que entrega ao repository um snapshot completo. Os repositories não avaliam condições de negócio.

- API e MCP chamam o mesmo service: list, get, upsert, patch, publish, restore.
- Carregamentos de revisão checam que script pertence ao lead.
- Não incrementar version de Lead para edição de script.
- Logs retornam o mínimo seguro; snapshots vivem na tabela de revisões, não em audit_logs.
- Os adapters mock têm a mesma semântica de CAS, imutabilidade, idempotência e publicação do PostgreSQL; testar ambos.

Erros canônicos:

| Código | HTTP | Situação |
| --- | --- | --- |
| SCRIPT_NOT_FOUND | 404 | Script inexistente ou fora do lead autorizado |
| SCRIPT_REVISION_NOT_FOUND | 404 | Revisão inexistente ou de outro script |
| SCRIPT_GRAPH_INVALID | 422 | Payload estruturalmente inválido ou falha de publicação |
| SCRIPT_LIMIT_EXCEEDED | 422 | Limites de conteúdo/nós/arestas |
| SCRIPT_VERSION_CONFLICT | 409 | expectedVersion obsoleto |
| SCRIPT_DRAFT_CONFLICT | 409 | expectedDraftRevisionId diferente |
| SCRIPT_CREATION_KEY_CONFLICT | 409 | Mesma chave de criação com payload divergente |
| SCRIPT_FORBIDDEN | 403 | Autor/role/scope sem permissão |
| CONVERSATION_SCRIPTS_DISABLED | 503 | Feature desabilitada; nenhum acesso a tabelas não migradas |

## 10. MCP: contratos e operações

Registrar src/lib/mcp/script-flow-tools.ts em buildMcpServer() em src/lib/mcp/server.ts, **somente** quando a feature estiver habilitada. Reutilizar annotations, requireScope(actor, ...), mcpTextResult e o ActorContext existentes.

| Tool | Scope | Semântica |
| --- | --- | --- |
| lead_scripts_list | scripts.read | Listar scripts de um lead, com channel/purpose, paginação e apontadores de revisão |
| lead_script_get | scripts.read | Retornar metadados e grafo de published, draft ou revisionId específico |
| lead_script_upsert | scripts.write | create (creationKey/idempotente) ou replace (scriptId + expectedVersion) de rascunho |
| lead_script_patch | scripts.write | Aplicar lote atômico de operações tipadas e criar nova revisão |

~~~ts
type UpsertScriptInput =
  | { mode: "create"; leadId: string; creationKey: string;
      title: string; channel: ScriptChannel; purpose: ScriptPurpose; graph: ScriptGraph }
  | { mode: "replace"; leadId: string; scriptId: string;
      expectedVersion: number; graph: ScriptGraph; summary?: string };

type ScriptPatchOperation =
  | { op: "addNode"; node: ScriptNode }
  | { op: "updateNode"; nodeId: string; changes: Partial<Omit<ScriptNode, "id">> }
  | { op: "removeNode"; nodeId: string }
  | { op: "addEdge"; edge: ScriptEdge }
  | { op: "updateEdge"; edgeId: string; changes: Partial<Omit<ScriptEdge, "id">> }
  | { op: "removeEdge"; edgeId: string }
  | { op: "setStartNode"; nodeId: string };

interface PatchInput {
  leadId: string;
  scriptId: string;
  expectedVersion: number;
  operations: ScriptPatchOperation[];   // 1..100
  summary?: string;
}
~~~

- Ordenar operações de patch conforme recebidas, validar o **resultado final** antes de salvar, persistindo tudo ou nada. A ordem interna não pode permitir escrita parcial.
- removeNode exige que as arestas que o referenciam também sejam removidas no mesmo lote ou devolve 422; não apagar arestas silenciosamente.
- Sem extensão arbitrária do JSON por ferramentas MCP.
- create com a mesma creationKey e mesmo payload retorna o recurso existente; com conteúdo diferente devolve 409; não criar duplicatas em retries.
- Todas as writes retornam scriptId, version, draftRevisionId, publishedRevisionId e resumo de validação. Reads expõem revisionId explícito; não depender de “latest” implícito.
- Ferramentas de publicação/restauração **não** são expostas a agentes no MVP.
- Sem tool execute_sql / raw_query / send_raw ou qualquer envio.

## 11. REST: UI autenticada

| Método | Rota | Resultado |
| --- | --- | --- |
| GET | /api/leads/:leadId/scripts | Lista paginada, channel/purpose opcionais |
| POST | /api/leads/:leadId/scripts | Criação idempotente de script + draft |
| GET | /api/leads/:leadId/scripts/:scriptId?view=published|draft | Metadados + revisão selecionada |
| GET | /api/leads/:leadId/scripts/:scriptId/revisions/:revisionId | Snapshot histórico com controle de acesso |
| PUT | /api/leads/:leadId/scripts/:scriptId | Substituição completa de draft, expectedVersion |
| PATCH | /api/leads/:leadId/scripts/:scriptId | Operações de patch, expectedVersion |
| POST | /api/leads/:leadId/scripts/:scriptId/publish | ADMIN somente; expectedVersion + expectedDraftRevisionId |
| POST | /api/leads/:leadId/scripts/:scriptId/restore | ADMIN somente; copia revisionId para novo draft, expectedVersion |

- Rotas seguem apiActor(), ok()/created(), errorResponse(); writes também verificam assertSameOrigin(request) e autenticação da sessão.
- O service garante autorização por operação, não apenas o route handler. A autorização por lead segue a política atual do CRM; **não presumir** que ownerId seja ACL pronta.
- List/get filtram por lead real, conferindo associação script→lead→revision em cada consulta.
- Respostas de APIs com texto de scripts são privadas (Cache-Control: no-store); não expor em CDN/caches compartilhados.
- Publicação/restauração são ações explícitas de humano ADMIN e nunca mudanças colaterais de PUT/PATCH.

## 12. UI / UX

### 12.1 Navegação no lead

Integrar a aba **Script de conversa** em src/app/(app)/leads/[id]/page.tsx. Preservar todas as seções atuais; introduzir tabs sem reimplementar Oportunidade, Histórico, Tasks ou LeadAutomationPanel. Preferir Server Components para fetch; Client Components somente para interação.

A aba contém:

1. seletor de roteiro: título, canal, finalidade;
2. estado visível: Publicado (revisionId e data) ou Prévia/Rascunho;
3. alternância “Guiado” (padrão) e “Mapa”;
4. comando “Ver rascunho” para usuário autorizado, sem trocar versão em uso por engano;
5. para ADMIN, revisão de validações + “Publicar” com confirmação e optimistic lock.

### 12.2 Navegador guiado — entrega prioritária

- Painel principal mostra título, script completo, orientação opcional e “Copiar texto”.
- Abaixo, **um botão por aresta de saída**, mostrando reaction.label. Pressionar avança ao nó target.
- Voltar retorna ao passo anterior *da trilha*, reiniciar retorna ao startNodeId; breadcrumb dos nós e reações.
- END não tem botões de reação; exibir encerramento e controles de volta/reinício.
- Ao reabrir a aba ou alterar draft/publicado, navegação começa no início (exploração **não é** histórico real).
- Controlar loops e 100 passos com aviso, voltar/reiniciar sempre acessíveis.
- Acessibilidade: botões, foco visível, navegação por teclado, textos legíveis, layout mobile sem depender do canvas.

### 12.3 Mapa (React Flow)

- Usar @xyflow/react em Client Component com carregamento sob demanda; em Next.js App Router, qualquer next/dynamic com ssr:false deve ficar em componente client (não diretamente no Server Component).
- Gerar nós/arestas visuais a partir do grafo de domínio, sem misturar posições de layout ao JSONB canônico.
- Layout automático com @dagrejs/dagre ou equivalente leve, pan/zoom, fitView, minimap e seleção de nó.
- Clicar num nó do mapa seleciona e mostra seu script; **não registra reação** nem avança trilha sem uma aresta selecionada.
- Trilha do Guiado reflete destaque de nós/arestas no Mapa; selecionar outro roteiro/revisão zera ambos.
- Fallback do Guiado funciona mesmo se canvas não carregar, JS gráfico falhar ou tela for pequena.
- A representação deve suportar tema claro/escuro e textos longos truncados apenas no mapa, nunca no painel de script.

### 12.4 Semântica de preview e sessão

- A página sempre mostra qual revisionId está sendo visualizada; durante navegação a revisão é fixa.
- Se uma nova publicação acontecer em outra sessão, exibir “Há nova versão” e botão de recarregar; nunca trocar o roteiro no meio de uma exploração.
- Não armazenar trilha exploratória no banco, audit_logs ou Qualification.
- Opt-out/DO_NOT_CONTACT aparece como alerta; visualização interna permanece possível, mas a UI não habilita comandos de contato.

## 13. Papéis, scopes, identidade e segurança

### 13.1 Matriz de permissões

| Ator | Ler/explorar | Criar/editar draft | Publicar/restaurar |
| --- | --- | --- | --- |
| USER ADMIN | Sim | Sim | Sim |
| USER MEMBER | Sim | Sim | Não |
| AGENT com scripts.read | Sim | Não | Não |
| AGENT com scripts.write (e read, se concedido) | Sim | Sim | Não |
| Qualquer ator sem scope | Não | Não | Não |

- Adicionar scripts.read / scripts.write em src/lib/auth/scopes.ts → AGENT_SCOPES; scripts.publish apenas no conjunto humano ADMIN (não em AGENT_SCOPES ou credenciais MCP).
- Respeitar tipo USER vs AGENT e checar role ADMIN no service de publish/restore (scope sozinho não basta).
- Credenciais pessoais guardam scopes como JSONB; atualizar AGENT_SCOPES **não atualiza as já emitidas**. **Não** conceder novos scopes automaticamente via schema migration: usuários devem revogar/reemitir credenciais para aderir explicitamente à feature. Esta decisão respeita AGENTS.md e o contrato da migration 0008; scripts.publish nunca pertence a credenciais MCP.
- Testar duas credenciais diferentes; revogar uma não afeta outra. Não expor tokens / URLs com key em logs ou auditoria.

### 13.2 Segurança do conteúdo

- Nodes/reactions provenientes de agentes, sites e dados de lead são **dados não confiáveis**.
- Renderizar com escaping de React; proibir dangerouslySetInnerHTML, eval, execução de scripts, markdown com HTML, handlers dinâmicos e URLs ativas derivadas de script.
- Validar no server (Zod + regras de grafo); client valida apenas para UX.
- Não tratar texto de script como instrução para o sistema/agente; não executar comandos colocados nos nós.
- Jamais inventar fatos, preços, prazos ou promessas; argumentos factuais devem apoiar-se em evidência referenciada do mesmo lead quando disponíveis. Referências são verificadas, não pressupostas verdadeiras.
- Limitar payload/quantidades, paginação e resultado MCP para evitar abuso e excesso de contexto.
- RLS + revogação de grants e queries server-side como no módulo comercial existente.
- Não utilizar grafo para contornar DO_NOT_CONTACT, bloqueios de mensagens ou aprovações humanas.

### 13.3 Auditoria e observabilidade

Usar audit_logs existente via padrão automationAudit/getLeadRepository().addAudit com:

- actor, credential/principal quando disponível, tool, leadId, entityType = lead_conversation_script, entityId;
- action = created / draft_updated / published / draft_restored;
- metadata **resumida** (revisionId, version, contagem de nós/arestas, lista de IDs de operações, validações, duration) sem conteúdo integral do script;
- revisões imutáveis preservam conteúdo/a autoria. Opcional lead_activity concisa para criação/publicação, evitando uma activity por operação interna de patch.
- Não armazenar chain-of-thought de modelo.

## 14. Tratamento de conflitos, atomicidade e idempotência

- expectedVersion exigido nas mutações de script existente (replace, patch, publish e restore) e aplicado dentro da transação.
- CAS falhou: 409 SCRIPT_VERSION_CONFLICT sem gravar snapshot, audit de sucesso ou alterar ponteiros.
- Publicação requer **também** expectedDraftRevisionId; evita publicar rascunho inesperado mesmo que o client errou a seleção.
- Operações de patch são **all-or-nothing** e criam exatamente uma revisão por lote bem-sucedido.
- Criação com creationKey é idempotente, testada sob concorrência e com payload hash; retry não duplica roteiro.
- Um publish não muda o conteúdo da revisão; rascunhos posteriores começam por copy-on-write.
- IDs de revisão nunca se reciclam. Restauração cria **nova** revisão de rascunho e não altera a história.
- Se a gravação de snapshot, ponteiros ou auditoria transacional falhar, a transação inteira é revertida e não se anuncia sucesso parcial. Erros técnicos são registrados com payload sanitizado e sem segredos.

## 15. Compatibilidade e rollout

**Feature gate independente:** CONVERSATION_SCRIPTS_ENABLED=false por padrão no PostgreSQL. Em mock, a ativação deve ser explícita nos testes e no ambiente, para não mascarar ausência de migration.

Sequência obrigatória:

1. Implementação em branch/PR após aprovação desta spec; testes mock, PostgreSQL e E2E.
2. Migration 0009 aplicada **deliberadamente** em produção, com verificação de tabelas, FKs, índices, RLS e privilégios; credenciais MCP existentes mantêm exatamente seus scopes.
3. Deploy de código ainda com feature flag desligada.
4. Ativação controlada da feature flag em ambiente que já possua migration.
5. Smoke autenticado UI + REST + MCP com agentes pessoalmente credenciados e papéis diferentes.
6. Só então registrar estado como ativo em produção; monitorar erros 409/422/403 e latência da aba.

Não quebrar /mcp discovery existente, outras tools, dashboards, tabs ou páginas de leads não migrados. A feature desabilitada não pode consultar tabela inexistente e deve manter a página principal funcional.

### Rollback

- Desabilitar CONVERSATION_SCRIPTS_ENABLED: esconder aba/novas tools e retornar erro controlado nas APIs; preservar toda informação.
- Reverter deploy se necessário; **não** fazer DROP de scripts/revisions em rollback emergencial.
- Preservar os scopes de credenciais existentes; nenhuma mudança automática de credencial é necessária durante rollback.
- Reativar após correção com os mesmos snapshots e versões.

## 16. Arquivos esperados na implementação futura

| Objetivo | Arquivos |
| --- | --- |
| Tipos e regras | src/lib/domain/script-flow.ts; src/lib/validation/script-flow.ts |
| Serviço | src/lib/services/script-flows.ts |
| Interfaces e adapters | src/lib/repositories/script-flow-repository.ts; mock-script-flow-repository.ts; postgres-script-flow-repository.ts; src/lib/repositories/index.ts |
| Banco | src/lib/db/schema.ts; drizzle/0009_lead_conversation_scripts.sql |
| MCP | src/lib/mcp/script-flow-tools.ts; src/lib/mcp/server.ts; src/lib/auth/scopes.ts |
| REST | src/app/api/leads/[id]/scripts/**/route.ts |
| UI | src/app/(app)/leads/[id]/page.tsx; src/components/lead-script-navigator.tsx; src/components/lead-script-map.tsx |
| Tests | tests/script-flow-validation.test.ts; tests/script-flow-service.test.ts; tests/script-flow-mcp.test.ts; integração PostgreSQL e E2E de UI |
| Docs | README.md e docs/MCP.md **quando implementado**, sem anunciar feature antes da ativação |

Reaproveitar auth, audit, services, ApprovalRequest, Conversation e Qualification. Não criar packages novos além da biblioteca visual necessária.

## 17. Testes e critérios de aceite

### 17.1 Testes automatizados

- Zod: schemaVersion inválido, IDs duplicados, arestas órfãs, começo ausente, labels duplicadas, limites e evidenceIds cruzando leads.
- Publicação: nó órfão, nó sem saída, END com saída, ciclo sem saída, ciclo com saída e múltiplos fins válidos.
- Navegação: diferentes reações, ciclos, avançar/voltar/reiniciar, trilha com arestas, limite de 100 passos.
- Service/mock/Postgres: create idempotente, replace, patch atômico, CAS concorrente, publicação separada de draft, restore e imutabilidade de revisions.
- Segurança: cross-lead access, ADMIN vs MEMBER, AGENT sem scopes, sem scripts.publish, credential revogada; conteúdo HTML/JS renderizado como texto.
- Sem regressões de lead details, Qualification, Conversations, tasks, MCP discovery, audit e DO_NOT_CONTACT.
- RLS/grants testados com papéis Data API e acesso somente server-side.

### 17.2 Cenários E2E obrigatórios

1. Agente cria roteiro de WhatsApp para lead com dois caminhos, revisa um nó com patch e a UI carrega versão atual.
2. Usuário explora um caminho, volta e percorre outro; nenhuma mensagem real/qualificação/tarefa é criada.
3. O mapa destaca o percurso da navegação e permite navegar/zoom; modo guiado continua utilizável sem mapa.
4. Agente edita o draft enquanto v1 publicada está sendo explorada; navegação conserva v1 até recarregar explicitamente.
5. MEMBER tenta publicar e recebe 403; ADMIN publica com expectedVersion/expectedDraftRevisionId válidos.
6. Dois agentes tentam patches com mesma expectedVersion; um vence, outro recebe 409 e não perde alterações.
7. Retry de create com mesma creationKey não duplica; chave reaproveitada com conteúdo divergente gera 409.
8. Recuperação de revisão antiga cria novo draft, mantendo as revisões anteriores imutáveis.
9. Credencial MCP emitida **antes** da migration mantém os scopes antigos; após reemissão voluntária a nova credencial possui scripts.read/write; credencial revogada continua inválida.
10. Script com markup perigoso permanece visível apenas como texto; tentativas de uso de lead/evidência de terceiro são bloqueadas.
11. Em produção, flag desligada antes da migration preserva /leads/:id; com migration + flag ligada, UI/REST/MCP funcionam para contas distintas.

### 17.3 Quality gates

- npm run lint (sem warnings), npm run typecheck, npm test, npm run build.
- Testes de migration em PostgreSQL real, incluindo rollback via flag e verificação de acesso.
- Testes de responsividade mobile, acessibilidade básica teclado/foco e light/dark.
- Inspeção do diff, ausência de secrets/URLs privadas e CI verde no PR.
- **Não declarar sucesso de produção** apenas por commit, build ou deployment READY; exigir smoke empírico.

## 18. Definition of Done (implementação)

- [ ] Feature habilitada somente após migration verificada.
- [ ] Roteiros N:1 por lead e listagem por channel/purpose.
- [ ] Agente pode listar/get/upsert/patch por MCP com autenticação, scopes e audit.
- [ ] Revisions imutáveis; published preservada durante edição; ADMIN publica/restaura.
- [ ] expectedVersion obrigatório e realmente atômico em PostgreSQL/mock.
- [ ] Validação publicável com alcançabilidade, saída, fins e ciclos.
- [ ] Aba do lead com **Modo Guiado funcionando sem depender do mapa**.
- [ ] Modo Mapa React Flow com seleção e trilha sincronizada.
- [ ] Conteúdo seguro e nenhuma persistência de reações simuladas como reais.
- [ ] Dois usuários/credenciais, preservação dos scopes antigos, reemissão voluntária e revogação testados.
- [ ] Lint, typecheck, unit, build, integração, E2E e smoke aprovados.
- [ ] README/MCP docs refletem o estado efetivamente implementado.
- [ ] Rollout e verificação de produção registrados separadamente.

## 19. Pendências e gate de aprovação

Esta spec é o contrato da **implementação em andamento**, não uma declaração de feature ativa em produção. Antes de iniciar código, aprovar explicitamente:

1. política editorial **ADMIN publica; MEMBER/AGENT editam rascunhos**;
2. reemissão voluntária de credenciais MCP (sem auto-concessão por migration);
3. limites iniciais do grafo e o comportamento de preview de draft;
4. nome de feature flag e escopo de entrega (navegador guiado + mapa, sem acompanhamento real).

Após aprovação: abrir **PR de implementação separado**, atualizar status desta spec para In progress e seguir repo-state-recovery → implementação → migrations → deploy → ativação → verificação de produção. Este PR permanece **somente documental**.
