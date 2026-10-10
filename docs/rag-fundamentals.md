# Fundamentos de RAG

RAG recupera evidência de uma base antes de construir a resposta. Recuperar não garante que a evidência seja correta: documentos, ranking e resposta precisam ser avaliados.

Um embedding representa texto como um vetor numérico. A similaridade de cosseno mede o alinhamento de dois vetores: dot(a,b)/(norm(a)*norm(b)). pgvector calcula cosine distance com <=>; similarity = 1 - distance. Modelo e dimensão precisam ser os mesmos para documentos e queries. Este laboratório usa 256 dimensões e impede busca semântica entre modelos diferentes. Ao mudar provider ou modelo, reindexe documentos.

Chunking divide um documento em fragmentos sob um limite de contexto. Overlap compartilha parte do texto entre fragmentos para evitar perder relações nos limites. Nosso chunker estima tokens como caracteres/4, procura headings e quebras de parágrafo e registra offsets no texto normalizado. Essa contagem é aproximada e não substitui um tokenizer específico do modelo.

Top-K limita o número de hits finais. Threshold exclui hits semânticos abaixo de uma similaridade mínima; não é uma medida universal de confiança. Busca lexical usa português e termos explícitos. No modo híbrido, lexical pode recuperar um hit mesmo quando ele não passa o threshold semântico.

RRF combina posições: score(c) = soma de 1/(k + rank(c)) nas listas em que o chunk aparece; rank começa em 1 e k padrão é 60. Reranking heurístico usa cobertura de termos para reordenar candidatos sem segunda chamada ao modelo.

ContextBuilder remove conteúdo duplicado, inclui primeiro fontes de documentos distintos e respeita orçamento de tokens. Grounding significa apoiar afirmações na evidência fornecida. Citações identificam chunks usados, mas a existência de uma citação não comprova que uma afirmação é suportada. O validator deste laboratório comprova apenas a validade dos IDs de fonte.
