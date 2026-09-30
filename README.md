<div align="center">

🇧🇷 Português · [🇺🇸 English](README.en.md) · [🇪🇸 Español](README.es.md)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/brand/striva-sales-dark.svg">
  <img src="docs/brand/striva-sales-light.svg" alt="Striva Sales" width="330">
</picture>

# Striva Sales — seu comercial, sempre presente

**Atendimento, follow-up, agenda e CRM conectados para aproveitar oportunidades e organizar sua operação comercial.**

[Conhecer a solução](https://wa.me/5583998391039) · [Como funciona](#como-funciona) · [Recursos](#o-que-a-plataforma-reúne) · [Documentação técnica](#documentação-técnica-e-operação)

</div>

## A proposta atual

O **Striva Sales é um produto comercial fechado**, operado pela equipe responsável pela plataforma. O cliente contrata a solução para sua empresa e utiliza o atendimento e a gestão comercial em uma plataforma integrada. A equipe responsável opera a infraestrutura, a implantação e as atualizações; o cliente configura e acompanha sua operação conforme os acessos concedidos.

Esta proposta, definida em **30 de setembro de 2026**, substitui a apresentação anterior de um CRM open source para instalação própria. Instalação em VPS e ferramentas de desenvolvimento são recursos técnicos da equipe que opera a plataforma, e não etapas que o cliente precisa cumprir para contratar o produto.

Preço, periodicidade, composição da oferta e condições de suporte são definidos na contratação. Este README não estabelece atendimento ilimitado, ausência de mensalidade ou SLA. Para conhecer a oferta, [fale com a equipe comercial](https://wa.me/5583998391039).

## Como funciona

1. **A operação é configurada para o seu negócio.** Canais, equipe, funis, agenda, conhecimento e regras de atendimento são preparados conforme o segmento e a rotina da empresa.
2. **Seu funcionário comercial digital atende pelo WhatsApp.** Ele responde com o conhecimento configurado, entende a necessidade, acompanha a negociação e pode agendar reuniões ou consultas com integração ao Google Agenda.
3. **A conversa alimenta o CRM.** O agente registra informações e organiza oportunidades nas etapas autorizadas, conforme as evidências do atendimento. As atividades ficam visíveis para a equipe.
4. **O acompanhamento continua depois da primeira mensagem.** Follow-ups configuráveis retomam conversas quando o contato deixa de responder. O Radar sinaliza negócios em risco e demandas sem próximo passo.
5. **O gestor acompanha e decide.** Funil, atendimento, agenda, tarefas, avisos e relatórios ajudam a enxergar o que aconteceu, o que exige atenção e o que fazer a seguir. Quando necessário, uma pessoa assume com contexto para continuar.

O objetivo é ajudar sua empresa a perder menos oportunidades e manter a estrutura comercial organizada. Resultados dependem da operação, da configuração e das decisões da equipe; a plataforma não garante fechamento de vendas.

## Para quem

**Clínicas, escritórios e empresas de serviços**, além de outras operações comerciais que usam WhatsApp para atender, negociar e agendar. O vocabulário e os funis podem ser adaptados ao negócio: pacientes, clientes, oportunidades, propostas ou pedidos, conforme a operação.

## O que a plataforma reúne

| Área | O que você acompanha e faz |
|---|---|
| **Atendimento** | Conversas de WhatsApp, atendimento digital e humano, histórico e transferência com contexto. |
| **Follow-up** | Retomadas automáticas por silêncio e fluxos configuráveis para dar continuidade às negociações. |
| **Funil comercial** | Oportunidades, etapas, responsáveis e registros das movimentações. O agente respeita os funis autorizados. |
| **Agenda** | Agendamentos, disponibilidade e integração com Google Agenda, conforme a configuração da empresa. |
| **Radar e tarefas** | Negócios em risco, demandas sem próximo passo e tarefas que precisam de atenção. |
| **Assistente de gestão** | Consultas pelo WhatsApp do gestor verificado, relatórios diários e semanais configuráveis e comandos que exigem confirmação antes de alterar o CRM. |
| **Conhecimento e melhoria** | Base de informações, memória da operação, execuções e propostas de melhoria do agente com revisão humana. |
| **Equipe e controle** | Permissões por papel, atribuição de atendimento, histórico de atividades e auditoria. |

O funcionário digital usa inteligência artificial, com limites e ferramentas definidos pela operação. Atendimento 24 horas por dia é uma possibilidade de configuração, e não um SLA implícito. Recursos e integrações dependem da configuração e das condições contratadas.

Os relatórios trazem **inteligência comercial a partir dos dados da própria operação**. O diário organiza movimento, pendências e prioridades; o semanal compara períodos, explica resultados e sugere próximos passos. Isso não equivale a pesquisa externa de mercado, faturamento contábil ou indicadores clínicos não registrados.

## Gestão e dados

A plataforma separa as organizações e aplica permissões no backend. O gestor controla a operação pelas telas disponíveis e pelo assistente autorizado. Alterações solicitadas pelo WhatsApp exigem confirmação; a IA não recebe acesso irrestrito ao sistema.

Há recursos de privacidade, anonimização e auditoria. As responsabilidades de tratamento de dados, acesso, suporte e infraestrutura devem constar dos termos da contratação; hospedagem, por si só, não define quem é o controlador dos dados.

## Documentação técnica e operação

Esta seção é destinada à **equipe autorizada que desenvolve e opera a plataforma**. A infraestrutura atual usa Next.js 16, React 19, TypeScript 6, Supabase, canais de WhatsApp e workers de automação.

| Documento | Finalidade |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Posicionamento comercial confirmado e limites das promessas. |
| [VISION.md](VISION.md) | Visão do produto e da operação. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Arquitetura técnica. |
| [AGENTS.md](AGENTS.md) e [CLAUDE.md](CLAUDE.md) | Convenções, segurança e critérios de conclusão para desenvolvimento. |
| [Documentação](docs/index.md) | Especificações e regras de negócio. |
| [Runbook de deploy](docs/runbooks/deploy.md) | Publicação e manutenção pela equipe operadora. |
| [Kit de operação](hostgator-setup-kit/README.md) | Instalação e atualização da infraestrutura. |
| [Changelog](CHANGELOG.md) | Histórico de versões. |

Parte da documentação técnica e de releases anteriores descreve o modelo legado de distribuição. Para a oferta comercial atual, prevalecem o posicionamento acima e as condições contratadas. O kit de infraestrutura existente não representa uma oferta de instalação pelo cliente final.

Para desenvolvimento autorizado: Node ≥22 e pnpm 9.15.9. Os comandos de verificação são `pnpm typecheck`, `pnpm lint` e os testes relevantes à alteração. Mudanças de banco exigem `pnpm test:db`; fluxos de usuário exigem prova visual e E2E com ambiente local isolado. A fonte dos comandos é o [package.json](package.json).

## Licenças e origem

O posicionamento comercial fechado do Striva Sales não remove os créditos ou os direitos dos componentes herdados. O arquivo [LICENSE](LICENSE) preserva a licença MIT e o aviso de autoria da base de origem; dependências mantêm suas próprias licenças. Releases e código anteriormente disponibilizados sob MIT continuam sujeitos a essa licença.

A contratação do produto e os termos de uso comercial são distintos da licença da base de código. Este README não substitui a licença existente nem cria, por si só, uma nova licença proprietária para todos os arquivos do repositório.

## Contato

[Solicite uma demonstração pelo WhatsApp](https://wa.me/5583998391039).

Striva Sales: atendimento que continua, oportunidades organizadas e gestão com contexto para decidir.
