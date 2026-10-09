# Homologar uma compra de assinatura

A conferência dos seis links comprova preço e periodicidade. A homologação financeira comprova que um evento emitido pela Hotmart concede o contrato e os créditos à empresa correta. Um retorno visual, um webhook fictício ou um pagamento lançado manualmente não substituem essa prova.

## Preparação

1. Usar a mesma release de app, worker e scheduler em ambiente controlado, com banco atualizado e receptor Hotmart compatível. Manter as vendas públicas desabilitadas durante a preparação. Não usar a Clínica Advance como empresa de teste nem migrar seu agente.
2. Criar uma empresa exclusiva de homologação e concluir seu cadastro. Para testar IA, configurar na plataforma o modelo e a tarifa validados, confirmar e-mail e WhatsApp e ativar o atendimento. O recebimento de e-mails reais requer remetente verificado; o simulador do Resend não comprova essa etapa.
3. No painel Hotmart, conferir produto, código, total em BRL e recorrência de cada oferta. Configurar a URL de retorno `https://ENDERECO-DO-APP/pagamento/retorno` e o webhook de compra, versão 2.0.0, incluindo cancelamento de assinatura. O segredo fica exclusivamente na configuração do servidor.
4. Em ambiente de homologação, habilitar a trava de checkout e somente a oferta que será examinada. Não habilitar todas as ofertas públicas para contornar o teste. O administrador da empresa deve iniciar a contratação pelo faturamento do app: esse caminho cria a referência que vincula a compra à empresa.

O mecanismo de teste de webhook do provedor serve para conferir transporte/autenticação e formato do evento. Ele não comprova cobrança, referência real do checkout, recorrência nem reembolso. O cadastro de um comprador, o meio de pagamento e a autorização para pagar precisam vir do responsável pela compra. Não foi realizada uma compra real nesta preparação.

## Compra e retorno

1. Abrir **Contratar plano** dentro do app. Conferir o total do período e a referência preservada no checkout; não copiar um link genérico e depois vincular o comprador por e-mail.
2. Realizar o pagamento autorizado. Enquanto estiver pendente, o app não deve liberar o plano pago nem sugerir pagar novamente. Voltar pelo botão/página configurada no processador, inclusive em outro navegador: sem sessão, deve pedir login; entrar na URL de retorno não concede acesso.
3. Após a aprovação, conferir no admin o evento `applied`, um único pagamento, o contrato, o fim do acesso e o período mensal de créditos da mesma empresa. A quantidade inicial é 1.000, 3.000 ou 6.000 créditos, conforme o plano; o saldo gratuito não passa para o plano pago.
4. Reenviar o mesmo evento pelo painel do provedor, quando disponível, e conferir que pagamento, contrato e concessão não duplicam. Uma outra empresa não pode consultar o checkout, pagamento, contrato ou saldo dessa compra.
5. Enviar uma mensagem completa pelo agente. Após aceitação integral pelo canal, deve haver um débito de 10 créditos, mesmo se o texto foi dividido. A equipe continua podendo assumir a conversa; a compra não tira o controle humano.

## Ciclo e reversões

| Cenário | Resultado necessário |
| --- | --- |
| Renovação mensal de créditos | Uma concessão por aniversário, sem acumular a franquia; contrato de 6/12 meses não precisa de novo pagamento mensal. |
| Próxima cobrança semestral/anual aprovada | Pagamento vinculado à assinatura conhecida e atualização do período pago, sem duplicação por reenvio. |
| Cancelamento de recorrência | Nenhuma próxima cobrança anunciada; período já pago preservado. Pedido no suporte, sozinho, não comprova cancelamento. |
| Reembolso/chargeback | Acesso referente ao pagamento revertido retirado; evento atrasado de aprovação não restaura o pagamento revertido. |
| Créditos insuficientes | IA bloqueada, data da próxima franquia visível e atendimento humano disponível. Extras continuam indisponíveis nesta release. |
| Upgrade | Solicitação pelo app, condições confirmadas pela plataforma e cancelamento comprovado da recorrência anterior antes da proposta; troca somente após pagamento aprovado. |

Renovação real e contestação dependem de eventos do processador: não alterar relógios, datas ou pagamentos de clientes reais para simular esses cenários. Os testes de banco cobrem a lógica de aniversário e concorrência; o relatório deve distinguir essa prova dos eventos efetivamente recebidos do provedor. Reembolso de uma compra real deve ser autorizado e acompanhado no painel.

## Registro e liberação

Registrar para cada uma das seis ofertas: código, preço/periodicidade conferidos, referência do checkout, identificação do evento/transação, datas, resultado no admin e evidência do retorno. Não incluir chave, documento, endereço, telefone ou dados do meio de pagamento. Identificadores do piloto e comprovantes com dados pessoais permanecem em registro privado; no repositório, registrar apenas resultados sem esses dados.

Uma compra aprovada em uma oferta não certifica automaticamente as outras cinco nem a próxima recorrência. Liberar cada oferta somente com sua configuração e evidência revisadas; preservar como pendente o que não foi comprovado. Manter os pacotes extras desabilitados. A release no GitHub, por si só, não libera a contratação e não atualiza a VPS.

Fontes: [contrato oficial do webhook de compra](https://developers.hotmart.com/docs/en/2.0.0/webhook/purchase-webhook/), [cancelamento de assinatura](https://developers.hotmart.com/docs/en/2.0.0/webhook/cancel-subscription-webhook/) e [configuração comercial e e-mails](email-e-jornada-comercial.md).
