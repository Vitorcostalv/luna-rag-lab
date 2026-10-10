# Experimentos

pnpm experiment compara três configurações: chunk 300/overlap 0/topK 3/semantic; chunk 600/overlap 100/topK 5/hybrid; chunk 900/overlap 150/topK 10/threshold 0.3/hybrid rerank. Reindexa a base e restaura a configuração padrão ao terminar, inclusive em caso de erro.

Resultados são gravados em reports/latest-experiment.json. Como vários parâmetros mudam ao mesmo tempo, essa comparação ilustra configurações completas; não identifica causalidade de um parâmetro. Para isolar uma variável, mantenha as demais constantes ao editar as configurações do script.

No workbench, Compare retrieval strategies usa a mesma pergunta, topK e threshold em quatro modos. MRR aparece apenas quando a pergunta coincide com ground truth. Cache de embeddings e banco aquecido afetam latência. Não comparar tempo de primeira inicialização com tempo após aquecimento sem registrar isso.
