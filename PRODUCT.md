# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CONFIRMADO pelo proprietário em 30/09/2026: clínicas, escritórios e empresas diversas, com o mesmo destaque. Gestores precisam acompanhar oportunidades e equipe; atendentes precisam de contexto para dar continuidade às conversas.

## Product Purpose

Sistema operacional de vendas: conectar atendimento pelo WhatsApp, agentes de IA, oportunidades, agenda, tarefas e acompanhamento comercial.

## Positioning

CONFIRMADO pelo proprietário: produto comercial fechado, operado pela equipe responsável pela plataforma. O cliente final contrata a solução; código aberto, instalação própria e detalhes de infraestrutura não são argumentos comerciais. Esta decisão substitui o posicionamento legado para a comunicação comercial; a atualização do README fica para uma etapa posterior solicitada pelo proprietário.

## Capabilities and Constraints

CONFIRMADO em código: atendimento com IA e passagem para humanos (`lib/agent-engine/agent/human-handoff.ts`), funis e oportunidades (`components/kanban/`), follow-ups e radar (`lib/leads/risk-radar.ts`), agenda (`lib/agenda/`), assistente de gestão pelo WhatsApp com comandos confirmados (`lib/management/actions.ts`, `consultation.ts`, `report.ts`), conhecimento e melhoria de agentes com revisão humana.

Os recursos dependem de configuração da operação. Não prometer receita, conversão, atendimento ilimitado ou resultado clínico. O assistente de gestão não equivale a acesso irrestrito: alterações exigem confirmação e respeitam as permissões. A homologação externa do canal não foi medida nesta tarefa.

## Brand Commitments

Preservar o nome do produto e a afinidade com o violeta da plataforma. Correção do proprietário: a marca comercial atual é a fita violeta facetada com duas esferas, enviada em imagem de referência enviada em 29/09/2026. Ela substitui a geometria antiga de `lib/branding/desenho.ts` na landing. A configuração de marca própria da operação permanece independente. Voz clara, comercial e brasileira. Explicar benefícios sem jargão de infraestrutura.

Direção comercial confirmada: funcionário comercial com IA que atende, vende, agenda e atualiza o CRM, sob controle do gestor em uma plataforma completa. Atendimento 24/7 é uma possibilidade de configuração da operação, não um SLA. Integração Google Agenda e relatórios diários/semanais são capacidades confirmadas em `lib/agenda/google/` e `lib/management/{report,schedule,delivery}.ts`. Inteligência comercial refere-se aos dados da própria operação; não há fonte de pesquisa externa de mercado confirmada.

Refinamento confirmado pelo proprietário: apresentar o benefício antes da tecnologia, evitando “IA” na chamada principal. Usar funcionário comercial digital e explicar a inteligência artificial no FAQ. Destacar follow-up automático quando o contato deixa de responder, apoiando a continuidade da negociação sem garantir fechamento. Gatilhos por silêncio, fluxos configuráveis e tratamento da resposta estão em `lib/followup/{silence-sweep,engine,aplicar-inbound}.ts`. Conversas ilustrativas devem demonstrar atendimento, retomada e próximo passo com detalhes legíveis.

## Evidence on Hand

Código e especificações de funcionalidades existentes. Sem depoimentos, clientes, indicadores de resultado ou fotografias fornecidos. Demonstrações devem usar dados fictícios e identificados como ilustrativos.

Pedido de refinamento comercial: o visitante deve reconhecer o custo de oportunidades abandonadas e entender como atendimento, follow-up e organização da operação ajudam as negociações a avançar. A Kommo Brasil foi indicada como referência de profundidade e demonstração interativa; a identidade Striva e a jornada já aprovadas permanecem. Resultado de venda é objetivo, não garantia. Prova comercial externa continua pendente; a página usa situações e painéis demonstrativos claramente identificados.

O proprietário pediu exemplos inventados de empresas. A implementação usa Clínica Aurora, Escritório Horizonte e Conecta Serviços como cenários fictícios de uso, com identificação explícita de simulação; nenhum deles é apresentado como cliente real ou endosso comercial.

## Open Decisions

CONFIRMADO em 05/10/2026: proprietário forneceu seis links Hotmart (Básico, Pro e Empresarial, semestral e anual). Valores conferidos nos checkouts públicos: Básico R$ 1.182/semestre ou R$ 1.644/ano; Pro R$ 1.782/semestre ou R$ 2.844/ano; Empresarial R$ 2.382/semestre ou R$ 3.564/ano. Pro recomendado, equivalente a R$ 297/mês no semestral ou R$ 237/mês no anual. O valor total do período deve aparecer junto do equivalente mensal; não apresentar mensalidade independente nem inventar parcelamento.

CONFIRMADO pelo proprietário em 07/10/2026: Básico 2 usuários, 1 WhatsApp e 1.000 créditos/mês; Pro 5 usuários, 2 WhatsApps e 3.000 créditos/mês; Empresarial 10 usuários, 3 WhatsApps e 6.000 créditos/mês. Dez créditos correspondem a uma mensagem lógica completa integralmente aceita pelo canal, mesmo dividida em envios. Limites editáveis, sem medição de custo real que permita afirmar margem. Condições anteriores preservam a capacidade por versionamento e conversão de unidades.

CONFIRMADO por decisão e implementação local em 07/10/2026: clientes novos usam IA incluída, teste de sete dias ou 1.000 créditos após verificação e ativação, reserva transacional de dez créditos, renovação mensal e acesso ligado aos pagamentos. Cancelamento preserva o período pago; reversões retiram o acesso correspondente. Organizações existentes conservam o modo legado até migração explícita, sem alterar agentes publicados ou credenciais. Custos desconhecidos permanecem desconhecidos; tarifas validadas são condição para ativação gerenciada. Pacote de 1.000 créditos/R$49,99 definido, com oferta e homologação comercial pendentes. Página `/clinicas` pública, demonstração fictícia e segmento sugerido/editável no cadastro; coleta mínima comercial e de agenda, sem prontuário. Contrato atual: `docs/specs/creditos-e-clinicas.md`; infraestrutura SaaS: `docs/specs/saas-ia-incluida.md`.

CONFIRMADO: o webhook foi publicado no projeto Supabase fornecido e testado com eventos sintéticos. Não houve compra real nem medição de entrega diretamente pela Hotmart. O proprietário determinou manter a aplicação local e não publicar nova versão/VPS até solicitação posterior. Checkout real continua desligado. WhatsApp comercial confirmado: +55 83 99839-1039. Não há domínio comercial confirmado para URL canônica. Contrato e pendências: `docs/specs/inicio-planos-suporte.md` e `docs/runbooks/hotmart.md`.
