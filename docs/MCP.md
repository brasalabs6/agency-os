# Remote MCP

O MCP fica em `/mcp` e é construído com o SDK TypeScript oficial.

## Fluxo

1. O cliente autentica via Bearer.
2. `authorizeMcpRequest` resolve um `ActorContext` e scopes.
3. O handler instancia `buildMcpServer(actor)`.
4. A tool valida input com Zod.
5. A tool chama os mesmos services utilizados pela interface.
6. O service aplica guards, persiste alterações, activity e audit.
7. O resultado é devolvido ao host MCP.

## Recomendações para ChatGPT

Conecte o endpoint HTTPS implantado, não `localhost`.

Para desenvolvimento privado, `MCP_AUTH_MODE=token` é a configuração mais simples. Para produção e múltiplos usuários, utilize OAuth/JWT com um IdP e configure os três campos `MCP_OAUTH_*`.

Ao pesquisar leads externamente, o agente deve:

1. procurar duplicatas com `leads_search`;
2. usar `leads_upsert` em lotes de até 50;
3. preservar URLs de origem;
4. adicionar claims verificáveis com `lead_add_evidence`;
5. distinguir fatos de inferências;
6. definir próxima ação quando fizer sentido;
7. nunca contatar `DO_NOT_CONTACT`.
