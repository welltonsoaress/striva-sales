# Changelog — Striva Sales

Este arquivo registra somente releases publicadas da distribuição Striva Sales.
As notas históricas do produto que serviu de base estão em
[`docs/archive/changelog-deskcommcrm-legacy.md`](docs/archive/changelog-deskcommcrm-legacy.md)
e não participam da seleção de atualizações.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

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

[Não lançado]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.1.1...HEAD
[1.1.1]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.1.0...striva-v1.1.1
[1.1.0]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.0.2...striva-v1.1.0
[1.0.2]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.0.1...striva-v1.0.2
[1.0.1]: https://github.com/welltonsoaress/striva-sales/compare/striva-v1.0.0...striva-v1.0.1
