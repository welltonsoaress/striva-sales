# Créditos e campanha para clínicas — 07/10/2026

## Contrato aprovado

Esta especificação substitui a régua comercial `response_v2` para novas condições. Uma mensagem lógica completa aceita pelo canal consome **10 créditos**, mesmo dividida em partes. Tentativas e reenvios conservam a identidade. Tokens, chamadas auxiliares e custo operacional continuam separados do saldo comercial.

Franquias mensais: Básico 1.000, Pro 3.000 e Empresarial 6.000 créditos. Teste: sete dias ou 1.000 créditos, concedido somente após as verificações e a ativação. Pacote extra: 1.000 créditos por R$49,99, até cem mensagens completas; nasce em rascunho, sem oferta nem venda real habilitada.

O período contratado é semestral ou anual; a franquia renova mensalmente pelo aniversário da assinatura. Não acumula. Extras exigem período pago ativo. Menos de dez créditos utilizáveis impede novas execuções de IA, inclusive auxiliares. Atendimento humano continua dentro do período contratado. Compra ou renovação recompõe saldo e resolve o aviso, sem assumir conversas humanas.

| Plano       | Semestre: equivalente mensal / total | Ano: equivalente mensal / total |
| ----------- | ------------------------------------ | ------------------------------- |
| Básico      | R$197 / R$1.182                      | R$137 / R$1.644                 |
| Pro         | R$297 / R$1.782                      | R$237 / R$2.844                 |
| Empresarial | R$397 / R$2.382                      | R$297 / R$3.564                 |

Valores confirmados pelo proprietário no catálogo local. Checkout público não acessível na revisão: antes de publicar, conferir os seis links e impedir publicação de oferta divergente. Não há parcelamento confirmado. Processador aparece tecnicamente no admin, sem chamada promocional nas páginas do cliente.

## Persistência e compatibilidade

Migration 0251, baseline idempotente, MANIFEST e tipos regenerados acompanham a mudança. `credit_meter` identifica contas, reservas, ledger, contratos e checkouts. Novos registros usam `credit_v3`. Contratos e checkouts anteriores conservam `response_v2`; concessões decorrentes deles são convertidas por dez, preservando a capacidade contratada.

Contas gerenciadas existentes e suas reservas pendentes são convertidas uma vez para a nova unidade. Recibos históricos permanecem intactos, com sua régua. Relatórios de créditos normalizam recibos `response_v2` apenas na leitura; número de mensagens é uma métrica separada. Contas legadas, credenciais e agentes publicados não são migrados automaticamente.

`fn_ai_reserve` serializa a conta e reserva dez, combinando franquia e extras (por exemplo, seis mais quatro). `fn_ai_settle` confirma uma vez depois de todas as partes. Entrega incerta retém a reserva. Falha definitiva devolve cada origem; franquia de ciclo encerrado não retorna e extras devolvidos compensam dívida de estorno primeiro.

`fn_ai_credit_usage` é invoker e mantém RLS na leitura própria. Publicação do pacote exige administrador completo, motivo e auditoria; salvar a oferta devolve o pacote ao rascunho. Catálogo público expõe uma projeção mínima e explica indisponibilidade. Compra é autenticada, vinculada à organização da sessão e confirmada exclusivamente pelo processamento servidor de pagamentos.

## Campanha e onboarding

`/clinicas` compartilha marca, demonstração ilustrativa e preços com a homepage. Apresenta WhatsApp, CRM, encaminhamento, agenda e acompanhamento conforme configuração. Não promete prontuário, diagnóstico, receita ou proteção contra bloqueio do canal. O bloco demonstrativo possui espaço para vídeo futuro; nenhum vídeo real é apresentado como entregue.

O CTA leva a `/signup?segment=clinica`. O servidor valida a sugestão contra o catálogo; convites não a utilizam. Metadata do cadastro transporta apenas essa preferência. Ela não define organização, permissões nem gratuidade. O onboarding prioriza uma escolha já salva e permite alterar a sugestão.

Template clínico versão 2 limita coleta comercial e de agenda, evitando sintomas, histórico médico, exames e fotos clínicas. O organizador não copia detalhes de saúde para CRM/memória. A atualização vale para novos provisionamentos e não sobrescreve personalizações publicadas.

## Sistema Vivo

- Origem e destino: campanha → cadastro → negócio → ativação; saldo → canal → confirmação → faturamento.
- Continuidade: pausa tem motivo, data de renovação e caminho de contratação/compra; equipe mantém controle humano.
- Observabilidade: ledger versionado, partes e incerteza, custos independentes e auditoria da publicação.
- Próximo passo: oferta ausente fica explicada; reconciliação continua no admin.
- Configuração: preço, oferta e publicação têm superfície administrativa; dados do negócio têm fonte canônica.
- Fechamento: renovação/compra resolve pendência de saldo; estorno compensa saldo/dívida, sem concessão duplicada.

## Limites da entrega

Entrega local, sem VPS, cobrança real ou alteração da Luana em produção. Relatório em `docs/reviews/creditos-e-clinicas.md` distingue provas executadas de integração externa. WAHA, fornecedor de IA, ofertas comerciais e compra real exigem homologação própria.
