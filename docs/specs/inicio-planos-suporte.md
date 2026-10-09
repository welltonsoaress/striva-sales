# Início, primeiros passos e suporte — 05/10/2026

## Decisões do produto

**CONFIRMADO pelo pedido:** página inicial inspirada na hierarquia da referência fornecida, com identidade da instalação; onboarding por organização, com adiamento, retomada e percentual; manual, suporte com chat e escolha/envio de avatar.

**CONFIRMADO pelo usuário:** Básico, Pro recomendado e Empresarial, com ofertas semestrais/anuais fornecidas na Hotmart. Valores conferidos nos links; Pro equivale a R$ 297/mês no semestral e R$ 237/mês no anual. O usuário autorizou definir limites iniciais editáveis. Nenhum cadastro implica compra ou liberação de acesso.

**CONFIRMADO pelo usuário:** Hotmart como provedor; um crédito equivale a uma resposta enviada pela IA; a orientação do gestor pelo WhatsApp alimenta a IA pelo fluxo de Casos existente, após confirmação.

**ATUALIZAÇÃO 06/10/2026:** o contrato e a implementação local de IA incluída estão em [SaaS e IA incluída](saas-ia-incluida.md). Os trechos abaixo descrevem a primeira entrega e o caminho legado; as regras novas prevalecem para organizações gerenciadas. Pacotes continuam sem venda e homologação real permanece pendente.

## Comportamento implementado

- `/app/inicio` é a entrada padrão dos membros. Administradores veem dados reais da organização e as etapas da configuração; membros convidados seguem para sua área de trabalho.
- A primeira entrada de um administrador abre o assistente se `onboarded_at` e `onboarding_state.dismissed_at` estiverem vazios. `Configurar depois` grava apenas o adiamento e retorna a Início. Não conclui configuração nem marca o teste como aprovado.
- O percentual usa cinco etapas: negócio, WhatsApp conectado, agente preparado, funil e teste respondido. Etapas puladas não contam. Recursos configurados fora do assistente podem comprovar as quatro primeiras. Agente preparado não significa agente publicado: o teste permanece necessário.
- O assistente reutiliza os fluxos existentes de agente padrão, capacidades, memória, funil e teste. Não cria agentes nem envia mensagens automaticamente ao visitar a página inicial.
- O funil padrão já nasce com a organização pelo gatilho existente e é reconhecido pelo progresso. Configuração técnica de IA fica com o operador da plataforma; clientes escolhem nome, jeito de conversar e orientações. Bloqueio de publicação informa rascunho e oferece continuar.
- `/app/ajuda` contém orientações versionadas, busca e links que respeitam o papel do membro.
- `SupportChat` grava perguntas e respostas pessoais por organização. A IA usa somente o manual, sem ferramentas; quando o modelo não está disponível, há orientação do manual identificada. Pergunta sem orientação ou pedido explícito encaminha à fila humana.
- `/admin/support` permite assumir, responder e encerrar. O chamado conserva o histórico. Realtime observa mensagens pessoais e metadados da fila; o conteúdo administrativo passa por guard de plataforma. Há atualização de contingência a cada 30 segundos.
- A chamada de IA usa o motor existente com telemetria e orçamento da organização. Sua disponibilidade e custo dependem da configuração existente; a jornada funciona sem modelo por meio do manual e da fila.
- O catálogo global `commercial_plans` é editável somente pelo administrador da plataforma; salvar alterações conserva rascunho e desliga a oferta. Publicar condições atualiza a página sem cobrar; ativar pagamento é uma ação separada e depende de condições completas e liberação da instalação após homologação. Faturamento separa custo operacional em USD do preço comercial em BRL e informa custos incompletos.
- Avatares locais são selecionáveis no cadastro e no perfil. Upload no perfil aceita PNG/JPG de até 512 KB; valida assinatura do arquivo e guarda em bucket privado. A API entrega bytes ao dono ou a membro ativo da mesma organização. A seleção do avatar é salva com o perfil; o upload salva a foto imediatamente.
- O caminho de e-mail sem Resend configurado registra apenas a falta da configuração; não registra destinatário, assunto ou corpo.
- O assistente de gestão reconhece `ajuda`, `comandos`, `menu` e relatório diário/semanal. Os relatórios usam a régua existente diretamente, sem depender da interpretação do modelo. A ajuda só oferece ações com confirmação quando habilitadas.
- As telas novas, o conteúdo do manual e as etapas usam o idioma do perfil. O catálogo administrativo preserva valores após erro de gravação ou conexão para permitir corrigir e reenviar.

## Living System Checklist

1. **Entrada e saída:** navegação Início/Ajuda, botões para etapas, Faturamento e widget Suporte; fila administrativa responde no mesmo chamado.
2. **Continuidade:** manual/IA → solicitação humana → resposta no histórico → encerramento; após encerramento, uma pergunta abre outro chamado.
3. **Log:** `onboarding.deferred`, `commercial_plan.updated`, `profile.avatar_updated` e `support.*` passam pelo audit canônico. Falhas são registradas sem texto livre ou dados pessoais no logger.
4. **Próximo passo:** etapa pendente aponta à configuração correspondente. Chamado aguardando equipe aparece na fila; erro preserva a mensagem e oferece atualização/atendimento humano.
5. **Informação com propósito:** progresso deriva de estado e recursos; contagens falhadas aparecem como indisponíveis. Nenhuma assinatura ou franquia é inventada.
6. **Superfície:** `/admin/plans`, `/admin/support`, perfil, manual e dashboard expõem configuração e andamento.
7. **Laço de retorno:** revalidação, realtime e refresh no foco atualizam dados. Compare-and-set evita reabrir chamado encerrado por resposta atrasada. Falha no modelo mantém manual/fila; falha no armazenamento mostra recuperação na tela.

## Banco e distribuição

Migrations `0243` a `0250`, apêndices idempotentes no baseline e MANIFEST acompanham os recursos. Chamados e mensagens têm RLS pessoal, chave estrangeira composta de organização/chamado e escrita somente por rotas autenticadas. A fila exige admin de plataforma e MFA quando configurado. Fotos permanecem privadas; consumidores administrativos conferem também a empresa proprietária do caminho de arquivo. `HOTMART_HOTTOK` e `HOTMART_CHECKOUT_ENABLED` são opcionais; cobrança nasce desligada e não quebra instalações existentes.

## Ordem do restante do plano

1. Validar preço/periodicidade/limites dos rascunhos e homologar o provedor Hotmart escolhido.
2. Usar o [guia de publicação](../runbooks/publicar-atualizacao.md): a release 1.2.0 levou 2min21s, com matriz e cache separado por imagem. Não há redução de tempo introduzida nesta entrega.
3. Revisar as demais telas por clareza. A configuração inicial local já oferece IA incluída e agente por segmento; modelos, credenciais e tarifas são responsabilidade da operação da plataforma.
4. Auditar e testar entrega dos e-mails reais no domínio da instalação, confirmação, convite e recuperação. A retirada de dados pessoais do log não é uma prova de entrega.
5. Homologar permissões, avisos, reservas, franquias e renovações já implementados localmente pelo contrato SaaS aprovado. Pacotes extras continuam sem venda até quantidade, preço e oferta completos; a integração real de cobrança permanece pendente.
6. Homologar o assistente de gestão com WAHA pareado. A implementação permite consultar casos pendentes e propor orientação exata do gestor; confirmação vincula usuário, caso, organização e versão. A resposta e a fila de retomada da IA são gravadas no mesmo commit, sem enviar o texto diretamente ao cliente.

## Hotmart e continuidade dos casos

O [runbook Hotmart](../runbooks/hotmart.md) registra o escopo, os eventos pendentes e a trava de liberação. `/planos` é a página comercial local. Checkout autenticado → referência SCK → webhook verificado → contrato/extrato → Faturamento e fila administrativa. Eventos sem vínculo têm próximo passo de conferência e reprocessamento; eventos antigos não regridem o estado. No modo legado, contratos não alteram o runtime. No modo gerenciado, a migration 0248 aplica permissões e saldo transacionalmente; consulte a especificação SaaS.

Gestor → proposta confirmada → `commitHumanCaseReply` → resolução do caso e `case_reply_turn` na mesma transação → worker existente → IA. Falha ou versão concorrente não duplica a orientação; execução incerta mantém o estado da confirmação existente e não repete automaticamente. Auditoria usa `ai.case_replied` e a tela de Casos conserva o histórico.

## Consumo de respostas e cancelamento de assinatura

**CONFIRMADO por implementação:** origem de IA registrada pelo handler/worker, não pelo body ou metadata. Um envio aceito (`sent`, `delivered` ou `read`) gera um recibo único e auditoria `ai.response_counted` no mesmo commit. Fila, falha, mensagens humanas, notificações determinísticas da agenda e automações fixas não geram unidade. Exclusão de conteúdo conserva o recibo sem dado pessoal; escrita direta na tabela de consumo é vedada. A contagem começa nesta atualização, sem backfill de mensagens antigas.

Faturamento oferece total no mês UTC, últimos 20 registros, indisponibilidade explícita e atualização manual. Custo operacional em dólares permanece separado dessa medida. No caminho legado, esta tela conserva a contagem histórica. O caminho gerenciado apresenta saldo, concessões e bloqueios; venda de pacotes permanece desativada.

`SUBSCRIPTION_CANCELLATION` segue o contrato oficial Hotmart 2.0.0, ligado somente a uma assinatura previamente identificada por compra aprovada. Atualiza cancelamento e período informado, preserva pagamentos, deduplica e rejeita regressão temporal. Reprocessamento usa o mesmo vínculo confiável. Não define expiração de acesso; ativação posterior confirmada limpa o cancelamento. Homologação real continua pendente.

## Verificação

Testes de progresso, navegação, manual, origem, propriedade de avatar e isolamento de suporte acompanham o código. A spec `inicio-primeiros-passos` está registrada no CI e produz evidências de desktop, celular e chat usando somente dados sintéticos. Resultados efetivamente executados devem ser consultados na entrega; a presença de uma spec não constitui aprovação.

## Ofertas fornecidas e webhook publicado — 05/10/2026

O catálogo agora contém Básico, Pro recomendado e Empresarial, cada um com oferta semestral e anual, preços conferidos nos checkouts fornecidos e limites iniciais definidos com autorização do proprietário. A franquia de respostas é mensal. Migration 0247 amplia os períodos e registra o período no checkout. Landing e `/planos` usam o mesmo catálogo público; a escolha segue no parâmetro `plan` até Faturamento, sem vinculação por e-mail. O valor mensal é equivalente; a cobrança corresponde ao total do período.

A Edge `handle-payment-webhook` foi publicada no Supabase informado e usa os processadores canônicos, preparados pelo script de empacotamento. Autenticação por Hottok ocorre antes do corpo/banco. Aprovação, duplicação, valor divergente e cancelamento foram validados com uma organização sintética temporária; fixtures removidas, auditoria preservada. Nenhuma compra real ou entrega originada da Hotmart foi realizada. Detalhes e preços: `docs/runbooks/hotmart.md`.

Checkout real permanece desligado. No modo gerenciado, pagamentos aplicam saldo, período e limites pela migration 0248. O modo legado é preservado; a venda de extras continua desativada. Não houve deploy da aplicação nem publicação de versão. O proprietário determinou que VPS e versão só sejam atualizadas após novo pedido explícito.
