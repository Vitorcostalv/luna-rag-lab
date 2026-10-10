# Integração futura em sistemas enterprise

Mantenha Planner, Access, Orchestrator, Handlers/Tools e ResponseAgent como responsabilidades separadas. Uma aplicação Java pode usar os mesmos contratos de intenção e retrieval sem compartilhar bibliotecas de frontend.

Fluxo conceitual: Planner → conhecimento de domínio → resolução de intenção/dataset → Access → procedure/tool autorizada → dados estruturados + contexto recuperado → ResponseAgent. A resolução de conhecimento preliminar precisa respeitar os mesmos controles de acesso de qualquer retrieval.

Migre allowlists, validação de filtros, política de contexto, identificação de fontes e métricas de avaliação como contratos de domínio. Não migre o seletor demo para autenticação real. Integre quotas e logs com os controles institucionais. RAG complementa procedures autorizadas e não as substitui. Este repositório contém somente dados e regras sintéticas.
