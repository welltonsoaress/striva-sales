# Validação da evolução de Início e suporte

Execução local em 05/10/2026, Windows, Supabase local e dados sintéticos. Fonte da implementação: [especificação](../specs/inicio-planos-suporte.md).

## Provas concluídas

- Build de produção, incluindo TypeScript: aprovado novamente após os ajustes finais da edição de planos e tradução. Typecheck separado também aprovado. O ambiente do build foi o da suíte local; isso não constitui deploy na VPS.
- Lint geral: sem erros, com avisos no repositório. Lint dos arquivos alterados e dos últimos ajustes: sem erros. Gates de canal e papel: aprovados.
- Baseline: instalação e reaplicação em modo update aprovadas com `ON_ERROR_STOP=1`.
- Banco focado: 49 testes aprovados em `suporte-da-plataforma` e `rls-completude-varredura`. Prova positiva do próprio tenant e negativa cruzada nos dois sentidos; colega sem acesso ao histórico pessoal; FK composta; escrita autenticada e acesso anônimo bloqueados; Pro em rascunho e bucket privado.
- E-mails e suporte: 25 testes aprovados, cobrindo modelos de acesso, confirmação, destinos, links inválidos e resposta de contingência pelo manual.
- Unitários relacionados à mudança: 82 testes aprovados em 16 arquivos, em duas execuções. Cinco arquivos que não iniciaram na primeira tentativa foram repetidos com um worker em threads e passaram (43 testes).
- Gates de tradução e Tailwind, mais recuperação da edição de planos: 21 testes aprovados em três arquivos. Traduções em espanhol incluem as novas telas, o manual e as etapas. O formulário conserva valores após rejeição ou falha de conexão e bloqueia edição no acesso de leitura.
- Jornada nova: os quatro cenários de `inicio-primeiros-passos.spec.ts` aprovados juntos no build final (44 segundos). Adiar e retomar, progresso real, busca no manual, Pro de referência, seleção/upload/remoção de foto, atendimento humano com encerramento e edição do preço pelo operador sem publicação. O valor alterado pelo teste é restaurado. A retomada aguarda o redirecionamento que comprova o término da gravação antes de voltar a Início.
- Regressão do assistente: os 13 cenários de `wizard-do-funcionario.spec.ts` aprovados após atualizar a expectativa da configuração técnica para clientes. Na execução conjunta, o teste novo de avatar ainda falhava por esperar `null` em metadado removido; foi corrigido e os três cenários novos foram repetidos e aprovados separadamente.
- Fragmento de release: aprovado por `release:conferir`; nenhuma release foi escrita ou publicada.

As imagens em `.superpowers/evidence/inicio-primeiros-passos/` foram conferidas: `.superpowers/evidence/inicio-desktop.png`, `.superpowers/evidence/inicio-mobile.png`, `.superpowers/evidence/suporte.png` e `.superpowers/evidence/planos-administrativos.png`. Foram geradas com contas de teste. Não há rolagem horizontal na resolução de 390 pixels testada. A spec está na lista do workflow de E2E.

## Limites da validação

As suítes **gerais** de unitários e banco não têm aprovação completa nesta entrega. Foram interrompidas depois de falhas e lentidão numa máquina de 8 GB com menos de 500 MB livres durante parte da execução. A suíte unitária foi executada em um worktree sem arquivos privados de ambiente.

Entre as falhas observadas estão varreduras de arquivos, geração de PDF e testes de webhook; o invariante que examina `onConflict` levou 61 segundos, acima do timeout de 30 segundos. Não se conclui automaticamente que todas essas falhas são anteriores à mudança: é necessário reproduzir as falhas num ambiente adequado e comparar com a base. Os testes novos de isolamento foram medidos separadamente e passaram.

Uma comparação limpa contra o commit-base `efbf41e31d36275efd2bd5e58ab6db4cead61e64`, sem arquivos privados de ambiente e com o mesmo runtime, reproduziu 22 falhas em cinco arquivos: `leads-import-route`, `lgpd-pdf-replies`, `performed-at-um-relogio-so`, `guarda-da-release-reconhece-o-corte` e `evidencia-citada` (72 testes: 50 aprovados e 22 reprovados). Essa medição comprova a reprodução desses grupos na base, sem atribuir automaticamente as outras falhas à mesma causa. As falhas introduzidas de tradução e espaçamento foram corrigidas e seus gates passaram.

Esta validação não cobre entrega real de e-mail no domínio, atendimento por um modelo real, WAHA pareado, pagamento, créditos contratados nem instalação fresca de VPS. O código e a migration permanecem locais, sem commit, push, release ou deploy. O gate geral e a homologação aplicável precisam ficar verdes antes da liberação.

## Decisões ainda necessárias

O usuário confirmou placeholders e Pro recomendado por R$ 297, Hotmart como provedor, um crédito por resposta enviada pela IA e orientação do gestor para a IA pelo fluxo de Casos. Periodicidade, limites finais, pacotes e políticas após eventos financeiros ainda precisam ser definidos antes de liberar contratação. O [runbook Hotmart](hotmart.md) descreve a trava e a homologação restante.

## Continuação: Hotmart e orientação de casos

- 81 testes aprovados em 13 arquivos: parsing/minimização Hotmart, propostas e confirmação de casos, gravação atômica da resposta/fila, comandos, navegação, tradução e tokens.
- Baseline com migration 0244: instalação e update aprovados. Oito invariantes financeiros passaram em execução separada com worker threads: concorrência/deduplicação, renovação, eventos antigos, correspondência de oferta/valor, referência consumida, isolamento RLS e FK composta.
- Na execução conjunta, 54 testes passaram em três arquivos (casos, gestão e varredura RLS), mas o worker do quarto arquivo terminou inesperadamente. A repetição separada desse arquivo financeiro passou; não há aprovação da suíte geral por esse resultado.
- Repetição final com threads: os quatro arquivos passaram juntos, 62 testes, com instalação e update verdes. O processo foi encerrado normalmente e o banco efêmero removido.
- Build de produção desta continuação aprovado, incluindo TypeScript. Lint dos arquivos alterados zerado; gates de canal e papel aprovados; fragmento de release aprovado, sem escrever release.
- Travas de checkout: cinco testes aprovados; junto com tradução e tokens, 23 testes passaram em três arquivos. A configuração padrão recusa a cobrança antes de acessar o banco; origem externa, ausência de papel e acompanhamento de suporte são recusados.
- O controle do navegador Hotmart não inicializou: erro `failed to write kernel assets` / caminho inexistente. Nenhum negócio ou produto criado; nenhuma credencial obtida; nenhuma página publicada na Hotmart. As páginas e a configuração descritas são locais.
- Os cinco cenários E2E passaram juntos (59,6 segundos): imagem nova de dashboard, configuração retomável, manual/avatar/suporte, edição de planos, checkout interceptado, Hottok inválido, aprovação e duplicação, contrato e histórico. O primeiro teste de periodicidade usava igualdade exata no texto de um label que contém as opções do select; o seletor foi corrigido, sem alterar o produto.
- Conferência visual de desktop, celular, página de vendas e Faturamento concluída com dados sintéticos. O teste financeiro restaura o plano original e remove os próprios registros de compra.
- A revisão dos logs encontrou um erro de auditoria: ID textual de evento estava no campo UUID `resource_id`. Corrigido para metadado `event_id`; a jornada financeira passou a exigir uma única entrada de auditoria após aprovação e repetição. O build foi repetido e aprovado após a correção e as traduções dos estados financeiros.
- Jornada financeira final aprovada isoladamente (23,6 segundos), incluindo a entrada única de auditoria e o histórico. A primeira repetição isolada não tinha a precondição de setup adiado da empresa, que os outros cenários entregavam; a fixture agora declara essa precondição e permite rodar só o teste financeiro. Lint final zerado e dez testes de trava/tradução aprovados após os ajustes.
- Gates de marca, arquitetura e ambiente: quatro arquivos passaram; o teste de sincronização do ambiente inicialmente encontrou um template desatualizado no worktree de QA (arquivos `.env*` haviam sido excluídos da cópia). Somente `.env.example` foi atualizado nesse worktree; ambos os testes do template passaram depois. Nenhum arquivo privado foi copiado.

## Continuação: contagem de respostas e cancelamento de assinatura

- Migrations 0245 e 0246 aplicadas no banco local e acompanhadas por baseline/MANIFEST. O gate de instalação e reaplicação do baseline passou com `ON_ERROR_STOP`. Tipos regenerados pela CLI Supabase, sem edição manual.
- 60 testes passaram juntos em três arquivos de banco: consumo de respostas, faturamento Hotmart e varredura RLS. A origem de IA não pode ser forjada ou transferida pelo browser, mesmo com acesso às duas empresas. ACK/replay conta uma vez; fila/falha/mensagem fixa não conta; exclusão da mensagem preserva recibo sem conteúdo. As funções dos triggers não são RPCs executáveis por anon, authenticated ou service role.
- O financeiro ganhou mais um teste de evento recebido antes do vínculo. O arquivo completo passou novamente: 11 testes, incluindo cancelamento sem mudar pagamentos, concorrência, evento antigo, reativação, pendência e reprocessamento após aprovação. Não atribuir esse resultado à suíte geral.
- Unitários: 40 testes passaram em quatro arquivos (Hotmart, janela UTC, tradução e marca). Outros 38 passaram em cinco arquivos de envio, automação, follow-up fixo, guardas de checkout e template de ambiente. O handler usa contexto interno e ignora metadata pública na classificação do consumo; follow-up fixo do runtime também é excluído.
- Gates finais de mapa/tradução passaram: 130 testes em dois arquivos. Tradução/tokens passaram anteriormente: 18 testes em dois arquivos. Contagens incluem repetição de tradução, não devem ser somadas como casos únicos.
- Typecheck aprovado com heap de 6144 MB; a primeira tentativa com heap padrão esgotou memória. Lint geral terminou com zero erros e 347 avisos; lint dos arquivos desta etapa terminou sem saída. Canal, papel e fragmento de release passaram. Nenhuma release foi escrita.
- Build de produção aprovado após as mudanças finais, com TypeScript e controle de host local no bundle. A prova não usa o banco de produção.
- Cinco cenários E2E passaram juntos (1 minuto). A jornada financeira prova cancelamento/duplicação, assinatura cancelada sem próxima cobrança, pagamento preservado, falha com zero consumo e envio/ACK com uma resposta registrada. A fila administrativa identifica “Assinatura atualizada”.
- Repetição final financeira aprovada (26,4 segundos), acrescentando auditoria única do cancelamento, espera do refresh concluído e ausência de rolagem horizontal em 390 pixels. As capturas foram refeitas no topo da página e conferidas: `.superpowers/evidence/faturamento-consumo-cancelamento.png` e `.superpowers/evidence/faturamento-consumo-mobile.png` em `.superpowers/evidence/inicio-primeiros-passos/`.
- Hotmart real segue sem acesso: a ferramenta de navegador falha na inicialização por caminho ausente do Windows. Nenhum negócio/produto/página criado e nenhuma credencial obtida. Testes interceptam checkout e simulam eventos; não houve cobrança nem envio externo. Venda/saldo de créditos, permissões, políticas financeiras e avisos permanecem pendentes. Código local, sem commit/push/deploy; os limites da validação geral acima continuam válidos.


## Seis ofertas e receptor Supabase — 05/10/2026

- Preços e UUID do produto conferidos nos seis checkouts públicos fornecidos. Migration 0247 aplicada localmente; 0243–0247 também aplicadas no projeto Supabase indicado pelo proprietário antes de sua instrução para manter a aplicação local.
- Edge Function `handle-payment-webhook`, versão 1, publicada com autenticação própria Hottok, segredo configurado no Supabase. Pacote Deno validado; mesmos módulos canônicos do receptor Next. Sem segredo no repositório (varredura negativa).
- Recepção publicada: 401 sem credencial válida; 422 com credencial válida e corpo inválido; 405 para método inválido. Checkout e empresa de QA temporários: valor divergente `unmatched`, aprovação `applied`, replay `duplicate`, cancelamento `applied`. Um pagamento, assinatura inativa e duas auditorias. Fixtures financeiras/empresa/eventos removidas; auditoria append-only preservada. Não houve compra real nem webhook emitido pela Hotmart.
- Testes relevantes: 49 unitários (receptor, parsing, guards, branding, i18n); 17 invariantes financeiros/consumo, com baseline install/update verdes; rodada final de guards/publicação, i18n e mapa: 136 testes verdes (há sobreposição, não somar). Build final aprovado, com TypeScript e prova de bundle apontando para Supabase local. Lint dos arquivos alterados sem erros.
- Revisão visual da extensão feita nesta conversa: desktop semestral e mobile anual, com totais/equivalentes/economia e Pro destacado; nenhuma rolagem horizontal a 390px. DESIGN.md e sidecar existentes preservados, porque a extensão usa a identidade incumbente. Detector emitiu avisos de escala, sem alterar drift fora do escopo.
- Os seis cenários de interface passaram juntos no build final. A jornada de planos foi fortalecida e repetida separadamente: escolher Pro anual, autenticar e conferir a mesma oferta selecionada no faturamento, com R$ 2.844,00 por ano. A fixture declara que a organização já adiou o onboarding; a tentativa isolada anterior redirecionava corretamente a empresa nova para os primeiros passos.
- Publicar condições comerciais continua separado de ativar pagamentos. Checkout real desligado. Nenhum deploy na VPS, push ou publicação de versão; o proprietário determinou aguardar seu pedido para essas ações. Pendências funcionais financeiras e do plano maior continuam registradas no runbook Hotmart.

Logs ficam no scratch `C:/Users/fullg/.codex/tmp/striva-evolucao-local/`: `unit-0247.log`, `unit-0247-final.log`, `db-0247.log`, `deno-0247.log`, `live-hotmart-0247.log`, `build-0247-verified.log`, `lint-0247-final.log`, `e2e-0247-verified.log`, `e2e-0247-escolha-login-final.log`. Evidências de planos: `.superpowers/evidence/inicio-primeiros-passos/planos-landing-desktop.png` e `.superpowers/evidence/planos-landing-mobile.png`, dados sintéticos locais. A régua geral anterior continua separada; os gates relevantes verdes desta etapa não corrigem os testes preexistentes que já estavam vermelhos.

As capturas mencionadas nesta revisão são registros locais fora do versionamento, não arquivos entregues pelo clone. Para evidência reproduzível da release, consulte os artefatos de E2E do [PR #18](https://github.com/welltonsoaress/striva-sales/pull/18).
