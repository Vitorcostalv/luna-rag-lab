# Guia de retrieval

## Estratégias

Busca semântica usa cosine similarity via pgvector. Busca lexical usa full-text search do PostgreSQL em português com conteúdo, título e heading. Hybrid combina listas por Reciprocal Rank Fusion. Hybrid Rerank adiciona heurística de cobertura de termos.

## RRF

Cada lista contribui com 1 / (k + rank), começando rank em 1. k padrão é 60. RRF combina posições, não soma scores incomparáveis de vetores e texto.

## Contexto

Top-K limita candidatos. Threshold filtra similaridade semântica. ContextBuilder remove duplicatas e preserva diversidade documental dentro do orçamento de contexto. IDs S1 e S2 permitem validar citações.
