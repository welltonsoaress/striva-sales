# Produção e jornada do cliente — 09/10/2026

## Parecer

**O código local oferece uma entrada simplificada para empresas novas, mas ainda não há evidência suficiente para liberar venda pública desta atualização.** O próximo estágio é homologar uma versão candidata com as integrações efetivas e publicar de forma controlada.

O cliente novo não precisa fornecer chave, selecionar modelo ou montar agentes e funis do zero. Isso depende de a equipe Striva configurar previamente a IA, o canal, a autenticação e as ofertas. Os seis ajustes da jornada foram implementados localmente. Áreas avançadas continuam acessíveis pelo perfil completo, conforme as permissões da empresa.

Esta revisão inclui implementação local, regressões de banco, verificações de código e consultas públicas às ofertas. O catálogo remoto foi consultado em modo de leitura; a API do Resend foi validada com destinatário simulado. Não houve implantação na VPS, compra real, instalação da chave no ambiente nem alteração da Luana. O estado do destino precisa ser medido antes da atualização. Referências históricas nos runbooks não comprovam a versão hoje instalada.

## Jornada implementada

| Etapa | O cliente encontra | O sistema faz / condição |
| --- | --- | --- |
| Descoberta | Homepage, `/planos` e `/clinicas`; demonstração identificada como fictícia; teste como CTA principal | Catálogo compartilhado, Pro recomendado, equivalente mensal e total semestral/anual. A página clínica sugere segmento, sem conceder acesso. |
| Cadastro | Nome da empresa, e-mail, senha/confirmar senha, avatar e verificação de segurança | Validação e limites no servidor. A confirmação do e-mail provisiona organização e vínculo administrativo de forma idempotente. A empresa criada pelo site entra no conjunto consultado pelo admin. |
| Negócio | Nome já preenchido, segmento, descrição do atendimento, região/fuso e aceite dos termos | Guarda informações em memória canônica. O cliente continua responsável por informar serviços e condições reais; o template não inventa preços ou horários. |
| WhatsApp | Conexão guiada por QR e confirmação da conexão/número | Verificação pertence ao servidor. O celular e a conexão real são indispensáveis; não há ativação válida apenas por marcar uma opção. |
| Agente | Agente preparado, resumo de capacidades, conversa de teste, consentimento e botão de ativação | Prepara agente, funil e organizador do segmento. A agenda é opcional e pede nome, duração, dias e expediente quando habilitada. Modelos/tarifas e chave são da plataforma. |
| Teste gratuito | Sete dias ou 1.000 créditos, um usuário e um WhatsApp | Começa na ativação confirmada. Dez créditos por mensagem lógica completa: até cem mensagens. E-mail, WhatsApp, elegibilidade e segurança são verificados; conta criada sozinha não inicia o relógio. |
| Uso | Início com saldo e atalhos para conversas, agenda e oportunidades; CRM e atendimento humano | Atendimento e organização usam contexto da empresa. Envios divididos/repetidos conservam identidade e não debitam novamente. Funções avançadas permanecem disponíveis conforme papel, configuração e acesso. |
| Contratação | Plano, seis meses ou um ano, equivalente mensal e total visível | Checkout é criado para a empresa autenticada e redireciona ao processador. Somente aprovação financeira recebida pelo servidor concede acesso/saldo. As travas e ofertas ainda precisam ser liberadas após homologação. |
| Franquia esgotada | Aviso de pausa e data da próxima franquia no faturamento; compra de extras indisponível | Menos de dez créditos utilizáveis impede nova IA. Atendimento humano continua durante o período ativo. Extras só podem ser usados com assinatura paga ativa. |
| Renovação mensal | Nova franquia pelo aniversário da assinatura | O banco renova de forma idempotente na leitura/execução comercial; não precisa de pagamento todo mês em um contrato semestral/anual. Franquia não acumula, extras acumulam. |
| Renovação da assinatura | Situação do contrato e próxima cobrança, quando informada pelo processador | Aprovação de uma nova transação vinculada estende acesso. Cobrança automática é configuração da oferta externa e ainda requer homologação. Sem pagamento que estenda o período, o acesso operacional vence. |
| Vencimento/reversão | Consulta, exportação, suporte e contratação | Vencimento impede operação nova. Cancelamento conserva o período já pago; reembolso/chargeback retiram o acesso ou saldo correspondente. |

Fontes principais: `lib/onboarding/passos.ts`, `components/auth/SignupForm.tsx`, `app/auth/confirm/route.ts`, `lib/auth/provision.ts`, `app/actions/onboarding/business-agent.ts`, `app/onboarding/setup-ai/_managed.tsx`, `app/app/inicio/`, `app/app/settings/billing/page.tsx`, `app/api/v1/billing/checkout/route.ts`, `lib/billing/process-hotmart.ts` e migrations 0248/0251/0252/0253.

## Créditos e duas renovações diferentes

**CONFIRMADO no contrato e código local:**

| Condição nova | Créditos | Capacidade de mensagens completas do agente |
| --- | ---: | ---: |
| Teste | 1.000 no teste | Até 100 |
| Básico | 1.000/mês | Até 100/mês |
| Pro | 3.000/mês | Até 300/mês |
| Empresarial | 6.000/mês | Até 600/mês |
| Pacote extra | 1.000 por R$49,99 | Até 100 adicionais |

Isso conta mensagens completas emitidas pelo agente, não clientes atendidos nem conversas. Um atendimento com cinco mensagens completas consome cinquenta créditos. Uma mensagem dividida em várias partes continua consumindo dez.

**Exemplo ilustrativo:** um Pro semestral custa R$1.782, equivalente a R$297/mês. O acesso contratado cobre seis meses; a franquia de 3.000 créditos é recomposta mensalmente. No fim dos seis meses, é necessário um novo período pago. O sistema recebe a confirmação; ele próprio não executa uma cobrança em cartão.

**RECOMENDAÇÃO comercial:** validar essa capacidade com um piloto antes de escalar marketing. Cem mensagens mensais podem ser consumidas rapidamente numa operação com conversas longas. Medir mensagens por atendimento e custo operacional real, incluindo organizador, áudio e conhecimento; não alterar franquias/preços sem nova decisão do proprietário.

## Seis ajustes aplicados à jornada — revisão de 09/10/2026

1. **IMPLEMENTADO LOCALMENTE: navegação simples para novos vínculos.** A migration 0253 muda somente o padrão de novos membros. O perfil permite alternar entre menu simples e completo; permissões e módulos existentes são preservados. Conversas, agenda, CRM, agente, conexão e faturamento têm acesso pelo modo simples.
2. **IMPLEMENTADO LOCALMENTE: conexão de IA exclusiva da plataforma.** Credenciais, bindings e escolha de chave em versões exigem administrador completo da plataforma com MFA em dia. Tenant, suporte e plataforma somente leitura não podem alterar. A regra cobre rotas, Server Actions e acesso direto autenticado ao banco. Inclui legado, conforme decisão posterior do proprietário, preservando os valores existentes. A edição do atendimento e das capacidades continua disponível.
3. **IMPLEMENTADO LOCALMENTE: continuidade do plano escolhido.** Login → cadastro conserva `next`; o cadastro guarda a preferência validada e a ativação encaminha ao faturamento correspondente. Parâmetros públicos não concedem acesso ou saldo. O Google Agenda aparece como conexão opcional na preparação, com retorno do OAuth ao onboarding e possibilidade de continuar sem conectar.
4. **IMPLEMENTADO LOCALMENTE: retorno e acompanhamento de pagamento.** `/pagamento/retorno` conduz à consulta autenticada de referência HttpOnly, limitada à empresa. A tela distingue espera, confirmação, reversão e falha temporária. O paywall não fecha após selecionar plano ou voltar do processador. O retorno real das seis ofertas ainda precisa ser configurado e homologado externamente.
5. **IMPLEMENTADO LOCALMENTE: solicitação humana de troca, renovação e cancelamento.** O pedido no faturamento abre chamado humano e auditoria sem cobrar ou alterar acesso. O admin assume, confirma condições e prepara uma proposta única, usando oferta homologada. Uma nova recorrência exige cancelamento confirmado da anterior; aprovação financeira efetiva a troca. Não há rateio automático definido pelo proprietário. A compra de extras fica indisponível na UI e no servidor.
6. **IMPLEMENTADO LOCALMENTE: lembretes duráveis e falhas visíveis.** Avisos internos e fila de e-mail antecipam fim do teste, vencimento contratado e pagamentos não confirmados. Há deduplicação, lease, retentativa dentro da janela e cancelamento de avisos superados. A fila aparece no financeiro do admin. O Resend confirmou entrega a destinatário simulado; envio a clientes e SMTP de autenticação ainda dependem de domínio controlado e verificado. Não foram acrescentados disparos de WhatsApp sem política específica.

O fim do teste, por tempo ou créditos, mostra **paywall sem botão de fechar ou Escape** nas áreas operacionais. Faturamento, ajuda, privacidade/exportação, perfil e segurança continuam acessíveis. A liberação depende do pagamento aprovado pelo servidor. Não se trata de esconder um modal e deixar a IA operar: os controles comerciais existentes continuam aplicados no servidor.

Reservas de agenda exigem disponibilidade real. Follow-ups proativos exigem fluxo e política; integrações de loja e calendários exigem conexões próprias. Esses recursos continuam existentes, mas o onboarding básico não os ativa todos. A promessa viável é iniciar atendimento e CRM com configuração curta, depois habilitar recursos adicionais conforme necessidade.

## Preservação do produto existente

**CONFIRMADO pela estrutura local e revisão anterior:** conversas, CRM/funis/contatos/tarefas, agenda, conhecimento/memória, agentes e versões, automações/follow-ups, casos/alertas, relatórios, integrações, papéis e suporte continuam no produto. A nova entrada usa esses módulos em vez de substituí-los.

Contas anteriores permanecem legadas até migração administrativa explícita. Credenciais, versões publicadas e dados próprios não são sobrescritos pelos templates. A Luana não foi modificada em produção. Isso comprova intenção e mecanismos de compatibilidade; não é comprovação de que cada integração antiga já foi exercitada na VPS com esta versão.

## Condições para publicação

| Prioridade | Condição concreta | Estado da evidência |
| --- | --- | --- |
| Bloqueador | Homologar com o processador aprovação, referência, retorno e recorrência das seis ofertas; habilitar somente após prova | Os seis links públicos responderam 200 com totais/periodicidades iguais ao catálogo. Concessão e repetição foram testadas com eventos fictícios no banco. Compra real e recorrência pendentes; ofertas desativadas. |
| Decisão vigente | Créditos extras indisponíveis | Bloqueados no catálogo, na UI e no checkout; não é requisito habilitá-los para esta publicação. |
| Bloqueador | Configurar IA da plataforma e preços verificados por finalidade; validar atendimento, organizador, áudio e conhecimento usados na oferta | Controles implementados. Credenciais/tarifas reais e cobertura de custo precisam ser conferidas pelo operador. |
| Bloqueador | Remetente verificado, confirmação/recuperação por e-mail, Turnstile, proxy confiável e Redis distribuído | O endereço sslip.io pode servir ao app, mas não oferece DNS controlado para DKIM/CNAME. Resend validado com simulador; SMTP do Auth e recebimento real pendentes. Não ativar remetente não verificado. |
| Bloqueador | Confirmar conexão/envio/recebimento WAHA e recuperação de sessão; workers e scheduler ativos | Código/monitoramento existentes. Evidência fictícia não comprova integração real. |
| Bloqueador | Publicar banco, app/workers/scheduler e receptor financeiro em versões compatíveis | Atualização local inclui 0248–0253; medir quais faltam no destino. Última inspeção registrada da Edge usava processadores anteriores. Nenhuma atualização do destino nesta frente. |
| Pré-venda | Concluir homologação da experiência e configurar integrações reais | Os seis ajustes foram implementados. O Google é opcional; requer OAuth da plataforma para conectar de verdade. Templates não exigem essa conexão para ativação básica. |
| Liberação técnica | Versão candidata fechada, checks finais aplicáveis, trio de imagens numeradas do CI, backup e recuperação ensaiada | Revisão local tem evidências; não há nova release publicada por esta análise. |

O runbook de IA cita 0248–0251 na preparação inicial; esta versão candidata também exige 0252 e 0253. Não aplicar migrations pelo número presumido: medir o schema do destino e usar o fluxo canônico de atualização. Detalhes de e-mail, retorno, propostas e ofertas em [e-mail e jornada comercial](../runbooks/email-e-jornada-comercial.md).

## Sequência recomendada

1. Fechar os ajustes da experiência e preparar uma versão candidata; registrar claramente quais capacidades comerciais estão disponíveis.
2. Configurar uma homologação com condições equivalentes à operação real e duas empresas fictícias. Exercer uma jornada completa com IA/canal efetivos e eventos financeiros do processador, incluindo atraso, reversão e renovação.
3. Validar uma vez o candidato final com os gates pertinentes. Reutilizar provas anteriores quando aplicáveis; não repetir suítes extensas sem motivo. Build/E2E anteriores não certificam alterações posteriores nem configurações externas.
4. Publicar a release e as três imagens pelo CI. Fazer backup, conferir restauração/compatibilidade, atualizar o banco e coordenar a atualização do app, workers e Edge. Preservar configuração do proxy e sessões WhatsApp; rollback de imagem não desfaz migration.
5. Conferir domínio, login/cadastro, consumo, canal e pagamentos num piloto controlado. Só então habilitar ofertas verificadas e ampliar aquisição. Manter clientes legados no modo atual até migração individual.

## Evidência reaproveitada e limites

A revisão atual confirmou 70 testes unitários selecionados e seis novos invariantes da jornada comercial. Outros 85 invariantes de isolamento, vocabulário e faturamento passaram nesta frente. O harness aplicou o baseline em instalação e atualização. A conferência das seis ofertas usa eventos financeiros fictícios no banco; não envolve compra externa. O typecheck final passou, incluindo os ajustes de recuperação de agentes legados e os testes adaptados à administração exclusiva de credenciais. Dezessete testes finais de autorização, tradução e navegação passaram. Não foi repetida a suíte unitária completa.

O `test:shell` completo passou, com um adaptador local para executar o Python real e normalizar a saída LF no Windows; nenhum produto foi alterado para contornar as asserções. A imagem do scheduler construiu localmente, sem publicação. O lint dirigido anterior registrou zero erros e seis avisos existentes; a última conferência dos arquivos ajustados encerrou sem erros ou avisos.

A prova visual desta frente confirmou a navegação do plano escolhido até o cadastro e a etapa opcional do Google Agenda com dados fictícios. A execução completa do novo paywall, retorno e pedido de troca não concluiu: o Next reiniciou ao atingir o limite de memória no ambiente local; a tentativa seguinte também ficou limitada à compilação/cache e foi encerrada. A jornada nova permanece pendente no Playwright em ambiente adequado. Não há prova visual atual de desktop/celular do paywall nem um novo build do app nesta frente. As specs correspondentes foram acrescentadas à suíte existente; os testes financeiros e de autorização concluídos não substituem essa homologação.

A revisão dos dois planos registra 233 testes unitários relevantes, 159 testes de banco, typecheck e lint sem erros. Build e seis jornadas E2E locais foram realizados na fase anterior e reaproveitados; não foram repetidos depois das últimas correções. O relatório não declara novo `gov:verify` integral verde. Nenhuma prova local com dublês deve ser apresentada como compra real, pareamento/envio real ou homologação da VPS.

Referências: [revisão dos dois planos](revisao-dois-planos.md), [operação da IA incluída](../runbooks/saas-ia-incluida.md), [integração financeira](../runbooks/hotmart.md), [atualização/deploy](../runbooks/deploy.md).
