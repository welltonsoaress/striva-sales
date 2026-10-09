# Changelog — Striva Sales

Este arquivo registra somente releases publicadas da distribuição Striva Sales.
As notas históricas do produto que serviu de base estão em
[`docs/archive/changelog-deskcommcrm-legacy.md`](docs/archive/changelog-deskcommcrm-legacy.md)
e não participam da seleção de atualizações.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

## [2.0.0] — 2026-10-09

### ⚠️ Requer atenção

- **Ativação simples, contratação acompanhada e credenciais reservadas à plataforma** Aplicar a migration 0253 e publicar app, workers e scheduler compatíveis. Credenciais de IA passam a ser alteradas somente por administradores completos da plataforma, também para empresas legadas; credenciais e agentes existentes são preservados. Conferir permissões, MFA, Resend e SMTP de autenticação antes de liberar cadastros públicos. Configurar o retorno financeiro em `/pagamento/retorno` e homologar os eventos reais antes de habilitar as seis ofertas. O endereço sslip.io não permite cadastrar os registros de verificação do remetente.

### Adicionado

- **Créditos comerciais e campanha para clínicas** Nova régua de dez créditos por mensagem completa, teste de sete dias ou mil créditos, reservas com franquia e extras e preservação das condições anteriores. Pacote de mil créditos por R$49,99 preparado em rascunho, com publicação administrativa auditada após homologação da oferta.

  Página pública `/clinicas`, cadastro com sugestão editável do segmento e coleta clínica mínima. Planos exibem equivalente mensal e total do semestre ou ano; consumo e avisos usam créditos. Sem implantação, venda real ou alteração de agentes em produção.

  O faturamento renova o ciclo antes de consultar o consumo, evitando misturar saldo novo e histórico do mês anterior. A identificação dos planos consulta somente os checkouts dos contratos exibidos, preservando o vínculo em empresas com histórico longo.

- **Página inicial, primeiros passos, manual e suporte com histórico** A página Início reúne boas-vindas, dados da área de trabalho e o progresso da configuração. Agora é possível configurar depois e retomar as etapas sem marcá-las como concluídas.

  O manual e o botão Suporte oferecem orientações e encaminhamento para a equipe da plataforma. Administradores da plataforma acompanham e respondem aos chamados em Suporte. O perfil permite selecionar um avatar ou enviar uma foto privada.

  O assistente de gestão reconhece ajuda e relatórios diário/semanal por comandos diretos, com as medidas existentes da operação.

  O comando de casos pendentes apresenta o que aguarda decisão humana. Uma orientação confirmada do gestor retoma a IA pelo fluxo de Casos, com gravação atômica e proteção contra versões concorrentes.

  A landing e Faturamento apresentam Básico, Pro recomendado e Empresarial, com seis ofertas Hotmart semestrais/anuais. Os totais do período acompanham o valor mensal equivalente e a economia anual. Administração → Planos comerciais permite ajustar limites iniciais e condições. Checkout real continua desligado.

  A página comercial `/planos` e a landing compartilham o catálogo. A preparação Hotmart inclui cadastro da oferta, referência de checkout vinculada à empresa, webhook idempotente, histórico e fila de eventos para conferência. Cobrança real nasce desligada e aguarda homologação completa; o caminho legado conserva seu comportamento. A extensão SaaS 0248 aplica permissões e saldo às organizações gerenciadas; uma resposta lógica inteira equivale a um crédito. Venda de extras permanece desativada.

  As telas novas, o manual e as etapas acompanham o idioma do perfil. A edição dos planos preserva os ajustes quando o salvamento falha, permitindo corrigir e tentar novamente.

  Faturamento mostra a contagem de respostas da IA enviadas neste mês e os últimos registros, sem contar fila, falhas ou duplicações de confirmação. A medida começa nesta atualização e preserva a régua histórica por mensagem. O modo gerenciado tem saldo separado e débito por resposta lógica. Cancelamentos de assinatura recebidos da Hotmart atualizam o contrato sem apagar pagamentos nem bloquear acesso automaticamente.

  A Edge Function `handle-payment-webhook` usa o mesmo receptor e os mesmos processadores do Next, com segredo de cabeçalho, vínculo confiável e confirmação transacional. O empacotamento parte dos módulos canônicos, sem cópia de regras mantida à mão.

  A revisão protege o vínculo financeiro contra reutilização da mesma transação em outro contrato. No suporte, mensagens e mudanças de estado são gravadas juntas; repetir o pedido de atendimento ou encerramento não duplica a ação. Respostas atrasadas da IA são descartadas quando uma pessoa já assumiu ou encerrou o chamado.

  Os modelos de confirmação de e-mail e recuperação de senha foram reorganizados com cabeçalho da marca, botão destacado, orientações claras e versão adaptada ao celular. Os links de autenticação são preservados. A aplicação destes modelos no Supabase e a configuração do remetente dependem da etapa posterior de publicação.

- **IA incluída e operação SaaS com configuração inicial por negócio** IA incluída para novos clientes, com teste ativado após confirmação de e-mail e WhatsApp, reserva transacional de créditos e controle de período contratado. Organizações existentes conservam o modo legado até migração administrativa.

  Onboarding por segmento prepara atendimento e organizador, com agenda opcional baseada em disponibilidade real. O admin reúne empresas de todas as origens, saldo, consumo, custos conhecidos/desconhecidos, pagamentos e ações auditadas. Dashboard e primeiros passos usam cores de estado e movimento com redução de animação.

  Migrations 0248 a 0250 e baseline acompanham a implementação, incluindo a restrição de gravações no Storage após o período contratado e o escopo da RPC auxiliar. A publicação dos artefatos não habilita a cobrança real: as ofertas precisam de configuração comercial e homologação. Pacotes extras permanecem indisponíveis. Consulte `docs/specs/saas-ia-incluida.md` para regras e limites da verificação.

  Leituras e remoções de arquivos privados conferem também a empresa proprietária do objeto. Um caminho adulterado em contato, mensagem ou fonte de conhecimento não permite assinar, baixar ou apagar arquivos de outra empresa.

### Alterado

- **Ativação simples, contratação acompanhada e credenciais reservadas à plataforma** Novos clientes recebem navegação simples, preservam o plano escolhido no cadastro e podem conectar o Google Agenda durante a preparação do agente. O fim do teste apresenta contratação sem botão de fechar; faturamento, ajuda, privacidade e segurança continuam acessíveis. Apenas pagamento confirmado pelo servidor libera o atendimento.

  Início é a entrada padrão. Quem personalizou as áreas do vínculo continua entrando pela primeira área de trabalho escolhida, com Início e Ajuda disponíveis para orientação e recuperação. A troca de empresa também resolve essa entrada no servidor. O suporte carrega o histórico antes de liberar a digitação, preservando o envio da pergunta.

  Troca, cancelamento e renovação podem ser solicitados no faturamento e chegam ao suporte humano. A plataforma confirma a oferta e envia uma proposta; uma nova recorrência exige cancelamento confirmado da anterior. Créditos extras permanecem indisponíveis. Avisos antecipados têm fila durável, deduplicação e falhas visíveis no financeiro administrativo.

### Corrigido

- **Dependências atualizadas para corrigir os avisos de segurança da publicação** O Next.js recebe as correções de segurança 16.3.8 e o SDK de MCP recebe a correção de OAuth. Os pisos das dependências transitivas de URI, endereços IP, expansão de padrões, HTTP e mapas de código também foram atualizados, preservando as versões principais de cada árvore. A atualização acompanha o lockfile e as imagens construídas pelo CI; não exige configuração nova na instalação.

  O contexto Docker também exclui a pasta de backups e evidências privadas da sessão, além das credenciais de testes e do estado local do Supabase. Essa exclusão protege construções locais; as imagens publicadas pelo CI são construídas a partir do checkout versionado.

- **Créditos e acesso respeitados também nas automações** Automações de mensagens usam a mesma reserva de dez créditos do atendimento e preservam a identidade em repetição. Timeout e envio interrompido mantêm o saldo reservado para conferência; a recuperação não gera um segundo envio. Comandos pelo WhatsApp e automações de CRM respeitam o período contratado, mantendo o atendimento humano quando só os créditos acabam.

  O organizador conserva suas instruções ao salvar e restaurar agentes; versões publicadas continuam imutáveis. A retomada do cadastro conserva a descrição e o fuso da empresa, o dashboard reconhece os três passos da ativação gerenciada e o admin permite conferir novamente eventos financeiros com falha. Recibos novos identificam a origem do custo e a régua dos ajustes; registros históricos são preservados.

## [1.2.0] — 2026-09-30

### Adicionado

- **Apresente o sistema com uma página comercial na entrada** A entrada pública apresenta um funcionário digital que atende, conduz vendas, retoma conversas com follow-up automático, atualiza o CRM e agenda com integração ao Google Agenda. A landing inclui jornada ilustrativa com mensagens detalhadas, situações comerciais exploráveis e um painel de Atendimento, Follow-up, Funil, Agenda e Radar. Relatórios diários e semanais, gestão pelo WhatsApp e cenários fictícios para clínicas, escritórios e empresas demonstram a organização da operação. A identidade comercial usa a nova marca fornecida pelo proprietário, fotografias ilustrativas com conversas acessíveis sobrepostas e cores de apoio nos ícones. Um convite de demonstração aparece após 40 segundos de aba visível, uma vez por sessão, sem bloquear a página. O visitante solicita demonstração pelo contato comercial e acessa a plataforma em Entrar: sem sessão, abre o login; com sessão validada, retoma o sistema. A comunicação apresenta os benefícios antes da tecnologia e segue o posicionamento de produto comercial fechado, com preço sob consulta.

### Alterado

- **Relatórios de gestão explicam resultados e prioridades** Os relatórios pelo WhatsApp passam a organizar atividade, resultados, pendências e prioridades em seções. O semanal compara dois períodos de sete dias locais completos, mostra variações e sugere ações conforme entrada de oportunidades, perdas, movimentações, tarefas e falhas registradas. A régua distingue agenda confirmada, mensagens, negócios encerrados e o retrato atual do Radar.

  O ciclo de melhoria deixa de avaliar novamente turnos que já possuem veredito e serializa rodadas concorrentes antes de chamar a IA. O Operador recebe negócios e etapas reais dos funis autorizados; o espelhamento do atendimento também respeita esse escopo e anuncia o status efetivamente gravado após ganho/perda. Webhooks do WhatsApp não tentam decifrar o marcador legado de segredo vazio. Retentativas de um mesmo erro atualizam um aviso, evitando a pilha de popups.

  O README apresenta a proposta comercial fechada e a operação pela equipe da plataforma, preservando os créditos e a licença da base herdada.

## [1.1.1] — 2026-09-29

### Corrigido

- **Continue a atualização pelo sistema após um rollback** Quando uma tentativa antiga falhar, a tela preserva o erro e permite iniciar pelo sistema uma release Striva diferente que já foi verificada. Ela não oferece repetição automática da mesma release que falhou.

## [1.1.0] — 2026-09-29

### Alterado

- **Crie funis por modelos de negócio e conecte etapas ao atendimento** Na tela Funis, escolha um modelo por tipo de negócio, revise etapas, critérios e destinos da agenda ou do handoff, e crie o quadro com as associações já salvas. As mesmas orientações do catálogo aparecem no onboarding e ficam disponíveis ao agente. As ligações usam IDs de etapa, preservam o histórico e continuam válidas após renomear colunas. Etapas da agenda podem ser revisadas para não encerrar como ganho antes da hora.

  A criação mostra o próximo passo para autorizar o agente pela versão publicada. Edições de etapas atualizam as regras na mesma tela, falhas de criação aparecem no diálogo e salvamentos concorrentes são recusados sem sobrescrever configurações. Agenda e handoff revalidam o destino, e a revisão de oportunidades considera outros funis do contato.

- **Veja a nova identidade visual do Striva Sales** O símbolo de fita roxa contínua e a assinatura horizontal “Striva SALES” agora aparecem no login, no menu e no favicon padrão. As curvas têm espessura uniforme e os dois pontos ficam separados do traço; a imagem não tem fundo. Marcas configuradas pela instalação ou pela organização continuam sendo respeitadas.

## [1.0.2] — 2026-09-28

### Corrigido

- **A IA respeita a data e os avisos da agenda** Quando a IA envia a data pedida junto com um período relativo redundante, a consulta usa a data específica. A ferramenta também informa se a agenda Google está parcialmente sincronizada, para o agente não oferecer horários sem essa confirmação.

## [1.0.1] — 2026-09-27

### Corrigido

- **A migração inicial executa a atualização dentro da pasta instalada** A ponte de migração agora muda para o diretório da instalação antes de chamar o atualizador. Assim, o Compose encontra os arquivos do projeto mesmo quando o comando inicial é executado a partir de outra pasta.

## [1.0.0] — 2026-09-27

### ⚠️ Requer atenção

- **Lançamento da distribuição independente Striva Sales** Esta é a primeira release própria, Striva Sales 1.0.0. A atualização é manual e fica disponível somente para a administração da plataforma. Ela reinicia os serviços compartilhados por todas as organizações desta instalação; escolha uma janela adequada. O atualizador valida as três imagens, faz backup antes de alterar código ou banco e mantém o runtime anterior quando não consegue iniciar a nova imagem.

  O produto passa a consultar somente releases próprias `striva-v*` do repositório Striva Sales. Versões homônimas e changelogs do projeto de origem não entram na comparação ou nas notas. O build em execução passa a informar sua distribuição, versão, tag e revisão.

  A interface recebe a identidade Striva Sales, símbolo S geométrico e paleta violeta. Marcas configuradas por instalação e por organização continuam prevalecendo. No atendimento, sugestões de resposta podem ser fechadas e reabertas sem perder o rascunho; Casos ganha acesso direto, indicador de pendências aguardando ação humana e aviso flutuante não bloqueante.

### Adicionado

- **Lançamento da distribuição independente Striva Sales** Esta é a primeira versão da distribuição independente Striva Sales, numerada como 1.0.0.

### Corrigido

- **Revisão da marca, sugestões, casos e execução do Operador** Login e cadastro passam a usar o nome da instalação salvo no banco, como o logo e as cores. Sugestões concluídas permitem gerar uma nova resposta pelo controle compacto. Alterações nos casos atualizam também a lista em tempo real.

  O Operador recebe orientação explícita para conferir o lead e as etapas autorizadas antes de mover o funil. A métrica de ação considera somente escritas concluídas, excluindo consultas e recusas; turnos antigos sem confirmação são identificados separadamente. Bloqueios de reserva explicam como revisar os funis permitidos, mantendo as permissões existentes.

  Atualiza as dependências transitivas Hono e js-yaml para versões corrigidas dos avisos de segurança identificados antes da publicação.

  O atualizador interrompe a instalação se o backup ou a aplicação do banco falhar e confere app, worker e scheduler antes de declarar a instalação atualizada.

<!-- release-base: 0.0.0 -->

[Não lançado]: https://github.com/welltonsoaress/striva-sales/compare/striva-v2.0.0...HEAD
[2.0.0]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.2.0...striva-v2.0.0
[1.2.0]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.1.1...striva-v1.2.0
[1.1.1]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.1.0...striva-v1.1.1
[1.1.0]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.0.2...striva-v1.1.0
[1.0.2]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.0.1...striva-v1.0.2
[1.0.1]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.0.0...striva-v1.0.1
