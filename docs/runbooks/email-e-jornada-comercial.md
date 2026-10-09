# E-mail e continuidade da contratação

Estado em 09/10/2026. Conferência externa realizada em 08/10/2026. Entrega local; nenhuma atualização da VPS ou compra real realizada por esta frente.

## Resend com o endereço provisório

O app pode continuar em `https://161-97-145-186.sslip.io`. Esse serviço fornece resolução DNS para o IP, mas a operação não controla sua zona para publicar DKIM e CNAME. Portanto, adicionar registros no Resend não os publica no DNS. A inspeção da API mostrou esse domínio em `not_started`.

Foi enviada uma mensagem fictícia de `onboarding@resend.dev` para `delivered@resend.dev`; o evento retornado foi `delivered`. Isso comprova a chave e o simulador, não envio a clientes nem e-mails do Supabase Auth. A chave fornecida não foi gravada no código ou no relatório.

Enquanto não houver domínio controlado, manter testes internos com destinatários simulados. Para cadastro público com confirmação/recuperação, obter um domínio ou subdomínio cujo DNS possa ser editado. O domínio do remetente pode ser diferente do endereço atual do app; não exige trocar agora a URL da VPS.

Depois da verificação real:

1. Publicar os registros exatos informados pelo Resend no provedor DNS desse domínio e aguardar `verified`.
2. Instalar `RESEND_API_KEY` exclusivamente no ambiente do servidor e definir `RESEND_FROM_EMAIL` com remetente desse domínio. Nunca usar chave em `NEXT_PUBLIC_*`.
3. Configurar separadamente o SMTP do Supabase Auth: host `smtp.resend.com`, porta `465`, usuário `resend`, senha igual à chave privada e remetente verificado. A configuração REST do app não configura o Auth automaticamente.
4. Conferir Site URL e URLs de confirmação/recuperação permitidas no Auth; usar o endereço HTTPS efetivo do app.
5. Fazer um cadastro e uma recuperação com caixa real controlada, além de um aviso comercial. Verificar recebimento e links, sem divulgar senha/chave no log.

Fontes: [domínios verificados](https://resend.com/docs/dashboard/domains/introduction), [simulador oficial](https://resend.com/docs/dashboard/emails/send-test-emails), [Supabase: limites do provedor padrão](https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider), [serviço de resolução por IP](https://nip.io/).

## Fluxo comercial implementado

O plano informado no link é uma preferência validada como UUID, preservada em `next` e nos metadados do cadastro. Não concede saldo nem permissões. Após a ativação, o usuário volta ao faturamento do plano escolhido.

O checkout salva uma referência em cookie HttpOnly. O retorno público `/pagamento/retorno` inicia uma navegação no próprio domínio para o faturamento, preservando a proteção SameSite dos cookies. A consulta de pagamento exige autenticação e filtra empresa e referência. Retorno, parâmetros de URL e seleção visual nunca liberam acesso: a aprovação financeira no servidor é indispensável. Se o webhook atrasar, a tela orienta aguardar e conferir novamente, sem sugerir pagar duas vezes.

Configurar a página de retorno de cada oferta para `https://SEU-ENDERECO/pagamento/retorno`. O app não consegue alterar essa configuração externa apenas por gerar o link.

No fim do teste por tempo ou créditos, as áreas operacionais mostram o paywall sem fechar ou Escape. Faturamento, ajuda, exportação/privacidade, perfil e segurança continuam disponíveis. Operação e IA continuam sujeitas aos controles de acesso do servidor. Administradores da plataforma e sessões de suporte conservam seus escopos próprios.

Créditos extras estão indisponíveis na interface, no catálogo retornado e no checkout. Saldos extras já existentes seguem as condições originais. Não publicar a venda do pacote nesta versão.

## Troca durante período já pago

Regra decidida pelo proprietário: solicitação pelo app; a plataforma confirma o valor e efetiva a troca. Não existe prorrateio automático definido.

1. O administrador da empresa solicita a troca no faturamento. O pedido abre chamado humano, com plano alvo e auditoria; o saldo e o contrato não mudam.
2. Um administrador completo da plataforma assume o chamado e confirma as condições com o cliente. A proposta usa a oferta homologada do catálogo, com total e período explícitos. Se o valor acordado for diferente, preparar e homologar a oferta correspondente antes de enviar; não ajustar dinheiro por parâmetro do navegador.
3. Antes de criar a proposta, encerrar a recorrência anterior no processador e aguardar o webhook de cancelamento. O período já pago permanece preservado. O servidor rejeita uma nova proposta enquanto houver recorrência anterior sem cancelamento confirmado.
4. O admin envia a proposta no chamado. O cliente abre o faturamento e aceita o pagamento. O checkout é único por empresa e solicitação; repetição não cria proposta duplicada.
5. A troca só acontece após aprovação financeira. Confirmação visual ou mensagem de suporte não equivale à aprovação. Mudança posterior no preço/oferta invalida o uso da proposta até revisão.

Cancelamento e renovação também abrem solicitações humanas. A confirmação no processador e os eventos recebidos determinam o estado efetivo. Não prometer gestão automática do cartão ou cancelamento já concluído quando houver apenas pedido.

## Lembretes e falhas

`commercial-notices` é chamado pelo scheduler a cada hora, no minuto 23. Padrões operacionais: aviso 24 horas antes do fim do teste e 7 dias antes do vencimento contratado, editáveis por `COMMERCIAL_TRIAL_NOTICE_HOURS` e `COMMERCIAL_RENEWAL_NOTICE_DAYS`. A duração dos contratos não muda.

A fila `commercial_notices` pertence à empresa e ao administrador destinatário, com identificação única do evento. O aviso interno aparece na Central e a fila de e-mail no financeiro do admin. Contratação/renovação, fim da janela ou revogação do membro cancelam avisos superados. Sem Resend configurado, a fila informa `not_configured` e não finge envio. A contagem `sent` retornada pelo cron e a coluna `delivered_at` registram a aceitação da API do Resend; não comprovam recebimento na caixa do cliente. A entrega efetiva deve ser conferida no provedor.

Lease, retentativa e chave idempotente limitam concorrência. Após 23 horas de uma tentativa sem confirmação, a entrega exige conferência humana em vez de repetir fora da janela do provedor. O operador confere o envio no Resend e usa o suporte humano quando necessário. Esses avisos não cobram nem alteram saldo ou acesso; não foram acrescentados disparos de WhatsApp sem política definida.

## Seis ofertas: conferência pública

Todos os links abaixo responderam HTTP 200. O HTML público informou o total em BRL e a periodicidade correspondente. As verificações não realizaram compra.

| Oferta | Código | Total | Periodicidade pública |
| --- | --- | ---: | --- |
| Básico, 6 meses | `ywwwcw8z` | R$1.182 | `biannual` |
| Pro, 6 meses | `k8dnfot7` | R$1.782 | `biannual` |
| Empresarial, 6 meses | `vgjipy7o` | R$2.382 | `biannual` |
| Básico, 1 ano | `n35rbszu` | R$1.644 | `annual` |
| Pro, 1 ano | `xeibh38j` | R$2.844 | `annual` |
| Empresarial, 1 ano | `32t83f4b` | R$3.564 | `annual` |

Produto público: `1e932b14-f2e8-4139-bf8e-3374ea86ca2c`. URL base: `https://pay.hotmart.com/Q107903903G?off=CODIGO&checkoutMode=6`.

**Ainda pendente:** prova com o processador de referência/correlação, aprovação, retorno, recorrência, cancelamento, reembolso e chargeback. Eventos fictícios no banco comprovaram concessão idempotente para as seis ofertas; não certificam o processador. As ofertas permanecem desativadas. Só habilitar a trava global e cada oferta após registrar essas provas.
