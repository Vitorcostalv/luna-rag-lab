# RAG vs ferramentas estruturadas

RAG é adequado para documentação, glossários, políticas, schemas, exemplos e contexto semântico. AnalyticsTool é adequada para valores atuais, somas, contagens, médias, agrupamentos e rankings. Operações transacionais precisam de ferramentas próprias e validação adicional.

Perguntar "O que significa OTS?" usa documentos. Perguntar "Qual unidade teve maior OTS?" usa uma consulta ao banco. Perguntar os dois usa HYBRID: retrieval e query autorizada podem executar em paralelo, e a resposta combina evidências identificadas sem inventar valores.

O planner não produz SQL. Ele seleciona dataset, métrica, agregação, dimensões e filtros de uma allowlist validada por Zod. A camada TypeScript constrói consultas Drizzle parametrizadas. O banco permanece a fonte dos números.
