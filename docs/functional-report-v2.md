# Relatório de funcionalidades — Luna RAG Lab V2

O laboratório está publicado em https://luna-rag-lab.vercel.app. A demonstração pública usa dados sintéticos e execuções mock gravadas. Não há chamada de IA, ingestão ou gravação em banco durante um replay público.

| Área | Funcionalidade | Demonstração pública | Local / owner configurado |
| --- | --- | --- | --- |
| Início | Três exemplos guiados de conhecimento, números e pergunta híbrida | Abre o workbench e reproduz a pergunta automaticamente | Executa o pipeline local |
| Workbench | Quatro estratégias, resposta, citações clicáveis, fontes, scores e traces | 16 perguntas gravadas × 4 estratégias; configuração original explícita | Perguntas livres dentro dos padrões documentados |
| Memória | Herança de filtros, continuação e desambiguação | Inspeção dos estados das conversas gravadas; não cria uma conversa persistente nova | Estado persistido com propriedade verificada |
| Inspector | Pipeline com duração, decisões tipadas, retrieval, contexto, qualidade e tokens | Inspeciona fatos observados na execução original | Eventos de execução durante a consulta; resposta após validação |
| Learning mode | Embedding, cosine, topK, RRF e montagem de contexto | Explicações ligadas ao trace; orçamento de contexto interativo no navegador | Mesmos controles sobre a execução selecionada |
| Knowledge | Documentos e chunks, conteúdo e modelo de embedding | Consulta apenas os nove documentos exportados | Upload Markdown/TXT/JSON/CSV/PDF, reindexação e exclusão autorizadas |
| Chunking | Segmentação com tamanho e overlap configuráveis | Preview determinístico; sem indexação nem persistência | Preview dos documentos autorizados |
| Knowledge graph | Document, Chunk, Metric, Dataset, Entity, Tool e BusinessRule | Corpus público versionado; zoom, pan, busca, filtros, teclado e detalhes | Mesmo grafo público; uploads privados não são publicados nele |
| A/B experiments | Chunk size, overlap, topK, threshold, strategy, rerank, context budget e modelo | Seleção de quatro configurações realmente executadas; export JSON/CSV | Execução persistida em índices PostgreSQL separados por ID/modelo |
| Experimentos | Recall, precision, MRR, latência, tokens, fontes e resposta final | Métricas originais identificadas como mock | Métricas observadas; ground truth ausente resulta em N/A |
| Datasets | Schema, métricas, filtros e tradução de pergunta para intent | Preview puro e consulta analítica gravada; sem execução SQL arbitrária | AnalyticsTool com allowlists, roles e filtros parametrizados |
| Evaluations | Sete categorias, histórico, baseline/current, variação percentual, export Markdown | Quatro benchmarks gravados e casos de segurança/permissão | Executa os 15 casos do pipeline e persiste resultados |
| Safety | Injection, conflito, role spoof, citação inválida, evidência ausente, outro projeto, dataset negado e fora de escopo | Oito resultados gravados com esperado, observado, pass/fail e trace | Suíte automatizada usa mock e autorização real no PostgreSQL local |
| Owner access | Sessão assinada, expiração, cookie HttpOnly/Secure/SameSite, origem verificada | Indisponível; escritas e chamadas pagas bloqueadas no servidor | Requer PostgreSQL e secrets de autenticação; sem senha padrão |
| Health | Disponibilidade da aplicação, modo, estado agregado do banco, versão e horário | App disponível; banco não configurado, sem afirmar conexão | Falha de conexão retorna HTTP 503 |
| Operação | Bootstrap de produção, migrations e seed idempotente | Nenhuma credencial necessária | `pnpm db:bootstrap:production` valida conexão/pgvector e cria apenas fixtures sintéticas |

O seletor de identidade continua disponível no ambiente local para estudar permissões. Em produção, ele não autentica ninguém: o servidor exige sessão owner válida e limita o owner ao projeto sintético demo. O público não consulta mensagens de outros usuários, uploads privados, índices live nem dados internos da Luna.

As medidas mock não comprovam qualidade semântica de embeddings reais. O reranker é heurístico. Validação de citações verifica IDs, não entailment. A proteção contra injection cobre padrões conhecidos, e os oito testes não são uma garantia geral. Contagens de contexto usam estimativa de caracteres/4. O preview de intent no Dataset Explorer não aceita SQL nem concede permissões.

O Neon gratuito não foi instalado: a integração exige aceite de termos pelo titular da conta. Não foi criado recurso pago. Para habilitar owner/live em produção, faltam `DATABASE_URL`, `OWNER_AUTH_SECRET` e `OWNER_PASSWORD_HASH`; IA real também requer `OPENAI_API_KEY` e modelos configurados. A versão pública funciona sem esses valores.
