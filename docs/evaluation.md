# Avaliação

evals/questions.json contém casos de conhecimento, analytics, híbrido, memória e esclarecimento. O evaluator compara tipo planejado, tool escolhida, filtros esperados e palavras-chave. Resultados, configuração e summary ficam persistidos no banco.

Hit Rate@K: presença de pelo menos uma fonte relevante. Precision@K: proporção de hits retornados que pertencem às fontes esperadas. Recall@K: proporção de fontes esperadas distintas encontradas. MRR: inverso da posição da primeira fonte relevante. Métricas sem ground truth são null, não zero.

Citation coverage neste laboratório mede fontes citadas/fontes fornecidas. Não é cobertura de afirmações. Citation correctness mede validade dos IDs antes da remoção de citações inválidas. Keyword checks e essas métricas não demonstram groundedness semântica. Latência do evaluator é end-to-end; o trace permite medir cada search isoladamente.

Executar pnpm eval produz reports/latest-evaluation.json e .md. O mock é uma baseline determinística de plumbing, não uma avaliação de embeddings reais. Uma avaliação com provider pago requer modelos configurados e consome quota. Não há LLM judge obrigatório.
