# Regras de negócio sintéticas

## Períodos

Manhã compreende horas 06 a 11 inclusive. O seed contém abril e outubro de 2026, com 28 dias em cada mês. Perguntas sobre ontem usam America/Sao_Paulo. Períodos sem registros produzem lista vazia, não um valor estimado.

## Agregação

ots, observers, v e vd são volumes aditivos. attention_time, dwell_time e percent_v usam média simples. Não inferir valores usando um documento: consultar AnalyticsTool. Ranking ordena valores de forma decrescente. A segunda unidade preserva métrica e filtros da intenção anterior.

## Ambiguidade

Loja Central SP e Loja Central RJ são entidades distintas. Solicitar uma seleção quando o nome Loja Central não especifica a unidade.
