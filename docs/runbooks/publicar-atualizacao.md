# Publicar uma atualização do Striva Sales

## O que cada parte faz

O GitHub guarda o código e executa as verificações. Uma imagem Docker é o pacote pronto que a VPS baixa: existem pacotes separados para o site, o processamento de atendimentos e o agendamento de tarefas. Publicar esses pacotes não atualiza uma VPS por si só.

## Ordem da entrega

1. Trabalhe em uma branch e abra o pull request com o fragmento de release e as provas da mudança. Confira os checks de código, banco, interface e imagens aplicáveis antes de integrar à `main`.
2. A integração dispara a publicação do desenvolvimento. A tag `latest` acompanha a `main`; ela não representa a última release aprovada para clientes.
3. Prepare a release pelo processo de [versionamento](../doctrine/versionamento.md). A tag própria `striva-vX.Y.Z` deve apontar para um commit contido na `main`. O CI rejeita tags fora desse contrato.
4. Confira a execução **Publicar imagem Docker (GHCR)**. Ela constrói os três pacotes em paralelo e só promove `stable` depois dos builds e da verificação de inicialização do app. O número da versão identifica a entrega que a instalação deve usar.
5. Escolha a janela, faça backup e aplique a atualização pelo procedimento de [deploy](deploy.md). Confira o domínio, a entrada no sistema, WhatsApp e atendimentos depois da atualização.

## Tempo medido e cache

**CONFIRMADO em 05/10/2026**, pela execução [da release 1.2.0](https://github.com/welltonsoaress/striva-sales/actions/runs/36790329851), concluída em 30/09/2026:

| Medida | Duração |
| --- | ---: |
| Publicação completa | 2min21s |
| Build e publicação do app, etapa de build | 82s |
| Build e publicação do worker, etapa de build | 95s |
| Build e publicação do scheduler, etapa de build | 8s |
| Build do app para o teste de inicialização | 50s |

As tarefas se sobrepõem; não se somam esses tempos para estimar a duração total. O workflow já usa matriz paralela e cache separado por imagem. Esta entrega não altera esse mecanismo nem afirma redução de tempo.

Para investigar uma execução lenta, compare a etapa de build com a fila do runner e o envio ao registro. Confira se o cache foi encontrado e quais arquivos invalidaram suas camadas. Um primeiro build sem cache e um build de uma mudança pequena têm custos diferentes; compare execuções equivalentes antes de alterar os Dockerfiles.

Não acrescente um segundo gatilho de publicação por evento `release`: o push da tag já inicia a entrega, e duplicar os eventos pode reconstruir e mover uma versão publicada. Não publique imagens locais para atualizar clientes; o CI constrói o artefato da plataforma de destino.

## E-mails de acesso

**CONFIRMADO por código:** confirmação e recuperação usam textos em português com a marca resolvida da instalação. O link leva a `/auth/confirm` com tipo e `token_hash`; a rota verifica o token e encaminha ao primeiro acesso, aceite de convite ou redefinição de senha. O convite de equipe é enviado pelo serviço de e-mail da aplicação; confirmação e recuperação são enviados pelo Auth do Supabase.

Fontes: `lib/email/templates/acesso-gotrue.ts`, `app/auth/confirm/route.ts`, `app/actions/auth/signUp.ts`, `app/actions/auth/requestPasswordReset.ts` e `lib/email/resend.ts`. Os testes desses caminhos verificam conteúdo, rejeição de links inválidos e destinos. Não provam entrega no domínio de produção.

**PENDENTE na instalação:** verificar remetente/domínio, URLs autorizadas, envio real de confirmação, recuperação e convite, e abertura dos links em outro navegador. Use o procedimento de e-mails do kit e [deploy](deploy.md); não registre tokens ou destinatários em logs. A falta de configuração do serviço de e-mail agora gera somente um aviso de configuração.
