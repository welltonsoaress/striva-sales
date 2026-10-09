# Integração Hotmart — preparação e homologação

Atualização de 09/10/2026: migrations 0248–0253 aplicadas no projeto vinculado, com agente e credencial existentes preservados; as seis ofertas continuam desabilitadas para compra. Preparação, evidências e limites em [preparação da release](../reviews/2026-10-09-preparacao-da-release.md). O registro abaixo conserva também as provas históricas do receptor anterior.

Registro inicial de 05/10/2026: seis ofertas fornecidas pelo proprietário, catálogo cadastrado e Edge Function publicada no Supabase `fpvvjjkazwrbrxujcftp`, inicialmente na versão 1. Migrações 0243–0247 aplicadas nesse projeto. Segredo configurado pela gestão de segredos do Supabase, sem gravá-lo no código. Em 09/10/2026 o proprietário autorizou a preparação do banco e a publicação da nova release no GitHub com CI e imagens; isso não autoriza uma compra nem habilita vendas públicas. A atualização da aplicação na VPS é uma etapa separada.

A tentativa anterior de operar o navegador não criou negócios ou produtos na Hotmart. Esta etapa usa os links fornecidos e conferidos nos checkouts públicos, sem criar compra.

## Implementado

- Landing e `/planos` compartilham o catálogo publicado, com seletor semestral/anual, Pro recomendado, total do período, equivalente mensal e economia em relação a dois semestres. As CTAs preservam a oferta escolhida até o faturamento autenticado.
- Administração → Planos comerciais: produto (`ucode`), código da oferta e link direto `https://pay.hotmart.com/…`. Salvar conserva rascunho e desliga a oferta. Publicar condições atualiza a página comercial sem ativar cobrança; ativar pagamento é uma ação separada, exige condições preenchidas e configuração da instalação.
- Checkout autenticado pelo administrador da empresa: referência SCK aleatória, ligada à empresa pelo servidor. Não vincula por e-mail do comprador nem por organização recebida no corpo.
- Webhook `/api/v1/webhooks/hotmart`, versão 2.0.0, cabeçalho `X-HOTMART-HOTTOK`, rejeição sem segredo, deduplicação transacional e bloqueio de regressão por eventos antigos.
- Eventos de compra: aprovação, conclusão, cancelamento da compra, reembolso, contestação, boleto, protesto, expiração e atraso. Renovação usa assinatura previamente vinculada. Valor, moeda, produto e oferta conferem com o checkout salvo.
- Cancelamento de assinatura `SUBSCRIPTION_CANCELLATION`: usa `data.subscriber.code`, data do cancelamento e fim do período informado. Só resolve a empresa pela assinatura previamente vinculada; evento sem vínculo fica para reprocessamento. Preserva pagamentos e elimina a próxima cobrança exibida. Ativação posterior confirmada limpa o cancelamento; evento antigo não reativa a assinatura.
- O recibo histórico mede mensagens aceitas no mês UTC. A nova apresentação comercial mostra créditos consumidos; a régua prospectiva debita 10 créditos por mensagem completa. Fila, falha, mensagem humana e automação fixa não geram esse débito. Replays e ACKs contam uma vez. A origem vem do servidor e não pode ser forjada ou transferida pelo navegador; os recibos não guardam conteúdo da conversa.
- Histórico por empresa em Faturamento; eventos em Administração → Planos comerciais. Vínculo pendente tem conferência e reprocessamento; evento não implementado fica visível, sem alterar contrato.
- Comprador, documentos e endereço são descartados pelo receptor. O segredo não aparece na tela ou no histórico.

## Endpoint publicado

`https://fpvvjjkazwrbrxujcftp.supabase.co/functions/v1/handle-payment-webhook`

O endereço é o mesmo informado pelo proprietário na configuração da Hotmart. A função dispensa JWT Supabase porque autentica o cabeçalho `X-HOTMART-HOTTOK` antes de ler o corpo ou acessar o banco. Nunca colocar o segredo na URL. Evento deve usar versão 2.0.0. Escolher eventos de compra implementados e `SUBSCRIPTION_CANCELLATION`.

O pacote é reproduzível: `node scripts/prepare-hotmart-edge.mjs <pasta-externa>` reúne `index.ts`, `deno.json`, `deno.lock` e os módulos canônicos de `lib/billing/`. Não usar a pasta da função isoladamente sem preparar suas dependências. Deno validou o pacote; `pg` e `zod` têm versões fixas no mapa de importação. A conexão usa `SUPABASE_DB_URL` injetada pela plataforma. O limite da Edge é por isolate (300 notificações autenticadas/minuto); o receptor Next mantém o balde distribuído Upstash.

## Ofertas e limites iniciais

| Plano             | Semestre |      Ano | Equivalente mensal semestral / anual | Usuários | WhatsApps | Créditos/mês |
| ----------------- | -------: | -------: | -----------------------------------: | -------: | --------: | ---------------: |
| Básico            | R$ 1.182 | R$ 1.644 |                      R$ 197 / R$ 137 |        2 |         1 |            1.000 |
| Pro (recomendado) | R$ 1.782 | R$ 2.844 |                      R$ 297 / R$ 237 |        5 |         2 |            3.000 |
| Empresarial       | R$ 2.382 | R$ 3.564 |                      R$ 397 / R$ 297 |       10 |         3 |            6.000 |

CONFIRMADO: valores e UUID do produto foram conferidos nos seis links de checkout fornecidos. PROPOSTA autorizada pelo proprietário: limites iniciais por porte, editáveis em Administração → Planos comerciais. Nenhuma margem ou consumo real foi medido. As ofertas de cada período têm registros próprios; o checkout guarda uma fotografia de valor, produto, oferta e período para o vínculo financeiro.

## Validação publicada

A URL respondeu 401 com segredo inválido, 422 com segredo válido e corpo inválido, e 405 para GET. Uma organização sintética isolada e um checkout Pro anual foram criados temporariamente no projeto autorizado. Aprovação resultou em um pagamento e um contrato; duplicata não repetiu o pagamento; valor divergente ficou `unmatched`; cancelamento deixou a assinatura inativa, preservando o pagamento. As duas mutações produziram auditoria. Fixtures de pagamentos, contratos, checkout, organização e eventos foram removidos ao final; auditoria append-only foi preservada. Não foram usados clientes reais.

Isto prova o receptor publicado e a persistência, **não** uma entrega real emitida pela Hotmart ou uma compra paga. O teste local também intercepta a navegação de checkout, sem pagar.

## Trava de liberação e pendências

`HOTMART_CHECKOUT_ENABLED=false` continua como padrão e `hotmart_offer.enabled=false` nas seis ofertas. Não ativar cobrança enquanto a aplicação não for publicada e o fluxo completo não for homologado. A publicação dos artefatos foi autorizada em 09/10/2026; mantenha a liberação comercial separada, seguindo [o procedimento de homologação](homologar-compra.md).

Falta homologar na Hotmart o retorno real do SCK, a recorrência e o cancelamento. A troca de plano foi definida como solicitação pelo app, confirmação humana das condições e aprovação financeira da proposta; consulte [a jornada comercial](email-e-jornada-comercial.md). Essa implementação também depende de homologação. Eventos não suportados continuam visíveis para conferência.

A implementação SaaS local de 07/10/2026 vincula pagamentos e contratos ao período de acesso e ao saldo, com concessão idempotente, renovação mensal, cancelamento que conserva o período pago e reversões do pagamento correspondente. A régua prospectiva `credit_v3` consome **10 créditos por mensagem completa**, mesmo dividida em vários envios; organizações legadas e contratos anteriores preservam sua régua histórica. O teste oferece 1.000 créditos e o pacote extra preparado oferece 1.000 créditos por R$49,99, com venda pendente de configuração e homologação. O estado de acesso não é inferido somente da data enviada pelo provedor. Consulte [o contrato SaaS](../specs/saas-ia-incluida.md), [créditos e clínicas](../specs/creditos-e-clinicas.md) e [a revisão local](../reviews/2026-10-07-saas-seguranca-e-homologacao.md). A preparação local inclui as migrations 0248–0252; a função publicada não recebeu essas alterações nesta revisão.

O servidor da aplicação também precisa de `HOTMART_HOTTOK`, mesmo quando a Edge recebe os webhooks: a ativação administrativa de ofertas e a criação de checkout conferem essa configuração. O segredo da Edge permanece separado no Supabase. Nunca enviar o segredo ao navegador. O app mantém a trava global de checkout até homologação. Atualizar as condições pela tela, ativar cada oferta revisada e conferir pagamento/histórico da empresa correta. Não vincular compra recebida fora do fluxo pelo e-mail do comprador.

Referências primárias: [webhook de compra](https://developers.hotmart.com/docs/es/2.0.0/webhook/purchase-webhook/), [cancelamento](https://developers.hotmart.com/docs/en/2.0.0/webhook/cancel-subscription-webhook/), [segredos da Edge](https://supabase.com/docs/guides/functions/secrets), [conexão PostgreSQL](https://supabase.com/docs/guides/functions/connect-to-postgres).

A revisão de segurança do Supabase não apontou alerta ERROR/WARN para as tabelas novas. A caixa global `billing_webhook_events` aparece em [RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) com nível INFO por desenho: leitura/escrita ficam restritas a service role, sem policy para anon/authenticated. O acesso da tela passa pelo guard de plataforma; não abrir policy pública para eliminar esse aviso.

## Revisão local posterior à publicação — 05/10/2026

O processador verifica se a transação já pertence a outro contrato **antes** de alterar a assinatura. Divergências ficam em `unmatched`, motivo `transaction_already_bound`, para conferência do operador. A revisão SaaS posterior confirmou, somente por leitura, a Edge Function publicada na versão 2; ela ainda usa processadores anteriores às novas permissões e franquias locais. O pacote foi regenerado localmente com o script canônico, sem publicar. Conferir os resultados e pendências na revisão de 07/10/2026 antes de atualizar a função ou ativar a venda.
