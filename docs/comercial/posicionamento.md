# Posicionamento comercial

Decisão do proprietário em 30/09/2026: produto comercial fechado para clínicas, escritórios e empresas. O cliente contrata uma solução para operar atendimento e vendas; a infraestrutura é administrada pela equipe da plataforma. O README foi atualizado por solicitação posterior do proprietário, junto de VISION.md e do objetivo em AGENTS.md/CLAUDE.md. Documentos técnicos e releases anteriores podem descrever a distribuição legada; os créditos e a licença da base herdada continuam preservados.

## Mensagem

Funcionário comercial com IA: atende no WhatsApp, conduz a venda, registra e atualiza informações no CRM e agenda reuniões, consultas ou avaliações. O cliente controla esse trabalho em uma plataforma comercial completa. Sistema operacional de vendas continua como definição institucional, subordinada à explicação prática do funcionário comercial.

Direção corrigida pelo proprietário: destacar atendimento 24/7, a dor de deixar conversas no vácuo, integração com Google Agenda, relatórios diários e semanais e inteligência comercial. 24/7 depende dos horários e regras configurados, não equivale a SLA de disponibilidade absoluta. Inteligência comercial significa analisar dados da própria operação; não prometer pesquisa externa da concorrência ou dados externos de mercado.

CONFIRMADO em código: os exemplos da landing usam atendimento/continuidade (`lib/agent-engine/agent/human-handoff.ts`), funil (`components/kanban/`), acompanhamentos/Radar (`lib/leads/risk-radar.ts`), agenda (`lib/agenda/`) e gestão pelo WhatsApp (`lib/management/`). O assistente prepara ações permitidas e pede confirmação. A homologação de transporte real não foi reexecutada nesta tarefa.

CONFIRMADO: atualização de estado e espelhamento de etapas no CRM (`lib/agent-engine/agent/lead-state.ts`, `inbound-turn.ts`, `edge/crm/move-lead-stage.ts`); integração Google Calendar (`lib/agenda/google/sync-executor.ts`, `transport.ts`, `oauth.ts`); resumos diários e comparativos semanais com ativação e horários configuráveis (`lib/management/report.ts`, `schedule.ts`, `delivery.ts`). A copy não promete faturamento medido, faltas ou consultas realizadas a partir desses relatórios.

Marca comercial: a referência enviada pelo proprietário substitui os exports da geometria antiga apenas na landing. Novos PNGs transparentes adaptam a fita facetada violeta e as duas esferas. A marca configurável da interface autenticada não foi alterada.

Não usar depoimentos ou indicadores inventados. Exemplos, nomes e números da página são fictícios e explicitamente identificados. Não prometer atendimento ilimitado, faturamento, percentuais de conversão ou garantias clínicas.

Refinamento comercial após análise da Kommo Brasil: o objetivo desejado aparece como “Mais vendas. Menos oportunidades perdidas.”, apoiado por situações de risco e demonstração do mecanismo. O painel tem cinco áreas: Atendimento, Follow-up, Funil, Agenda e Radar. Os cenários Clínica Aurora, Escritório Horizonte e Conecta Serviços são empresas fictícias para demonstrar o uso, explicitamente identificadas como simulações, sem apresentação como depoimentos ou resultados reais.

## Oferta

Refinamento da comunicação: a chamada apresenta disponibilidade, continuidade e controle antes de citar IA. O FAQ explica a tecnologia. Follow-up automático por silêncio recebe destaque no hero, na jornada e nos benefícios, conforme `lib/followup/silence-sweep.ts`, `engine.ts` e `aplicar-inbound.ts`. A retomada segue intervalos, horários e fluxos configurados; pode ajudar o fechamento, mas não o garante. A nova demonstração mostra trechos fictícios de atendimento, retorno e agendamento, com registro de atividade no CRM.

Os textos atuais de `/legal/privacy` e `/legal/terms` ainda descrevem distribuição aberta e ausência de acesso da equipe à infraestrutura. Precisam de revisão específica para a operação comercial, com identificação da empresa e responsabilidades reais. A landing não encaminha o visitante para essas afirmações legadas; oferece dúvidas e atendimento comercial no rodapé. A revisão jurídica não está incluída nesta entrega.

R$ 597,00 é uma hipótese informada pelo proprietário, sem periodicidade ou pacote fechado. A landing usa preço sob consulta e demonstração pelo WhatsApp +55 83 99839-1039. Condições, implantação, suporte e garantias devem ser definidos antes de publicar uma tabela de planos. A página não presume esses termos.

## Living System Checklist — landing

1. Entrada: visitante em GET `/`, permitido pelo guard existente, e capacidades verificadas no código.
2. Saída: `DemoLink` abre conversa comercial; `Link /login` leva à autenticação.
3. Registro: leitura e seleção locais não são mutações da operação. Sem evento de venda ou solicitação salvo; abrir o link não prova envio. Nenhuma telemetria comercial nova foi adicionada.
4. Superfície: `app/page.tsx`, com demonstrações em `components/marketing/LandingPage.tsx`.
5. Porta: raiz pública, menu com âncoras; não é destino da navegação autenticada.
6. Próximo passo: CTAs indicam demonstração no WhatsApp; a página não cria demanda no CRM. O retorno do atendimento comercial depende da equipe externa.
7. Configuração: conteúdo e contato comercial no componente; não há configuração de backend nova. Ausência de domínio comercial impede definir canônica confiável.
8. Continuidade: a página explica a operação IA↔humano, mas não participa de conversas reais.
9. Retorno: testes de UI verificam o contato e interações. Sem decisões automatizadas novas ou laço de aprendizado; conversão comercial não medida.
10. Mapa: `docs/architecture/landing-comercial.architecture.json`, com entrada do visitante/produto e saídas para demonstração/login.
