# Revisão das melhorias do Striva Sales

Data: 05/10/2026. Revisão local das alterações ainda não publicadas, com prioridade para segurança, integridade financeira e continuidade do suporte.

## Resultado

Foram corrigidos problemas no vínculo financeiro e na concorrência do suporte. O restante do conjunto foi revisado por leitura do código e dos testes existentes, sem repetir a suíte completa. Nenhuma alteração foi enviada à VPS, ao GitHub ou ao Supabase nesta revisão.

## Achados corrigidos

| Prioridade | Problema | Correção |
|---|---|---|
| Alta | Um evento com transação já pertencente a outro contrato podia modificar a assinatura antes de o pagamento ser recusado. Também podia criar um segundo contrato para a mesma transação. | O processador confere o proprietário da transação antes de qualquer alteração de contrato. A divergência fica pendente para conferência, sem modificar a assinatura ou o pagamento. |
| Média | Mensagem de suporte e mudança de estado eram escritas separadamente. Uma falha podia deixar o pedido de atendimento registrado sem entrar na fila; repetir o pedido retornava sucesso sem concluir a transição. | Mensagem e transição agora são confirmadas na mesma transação. Repetições não duplicam a ação, inclusive após encerramento. |
| Média | Entre a verificação e a gravação da resposta da IA, uma pessoa podia assumir ou encerrar o chamado. A resposta automática ainda podia aparecer depois disso. | A gravação da resposta trava e confere o chamado na mesma transação. Ações do operador usam a mesma trava e preservam a atribuição. |
| Média | A criação concorrente do mesmo chamado apresentou deadlock no teste de regressão. | A criação é serializada por identificador do chamado, antes de verificar a linha e suas constraints únicas. A repetição do teste passou. |
| Baixa | Um teste de suporte ainda exigia Pro a R$ 297 em rascunho, condição anterior às seis ofertas confirmadas. | A expectativa agora confere Pro semestral a R$ 1.782, publicado no catálogo, com pagamento desativado. |

Arquivos centrais: `lib/billing/process-hotmart.ts`, `lib/help/support-store.ts`, `app/api/v1/support/route.ts` e `app/api/v1/admin/support/route.ts`.

## Áreas revisadas

- Planos, valores, ofertas semestrais/anuais, administração, landing e ligação com o faturamento.
- Autenticação do webhook, correlação da compra, cancelamento, duplicação e histórico financeiro.
- Contagem de respostas da IA, origem confiável e isolamento de dados nas migrations.
- Onboarding por organização, adiamento/retomada, painel inicial e configuração do agente.
- Manual, chat, passagem para atendimento humano, avatar privado e verificações de acesso.
- Orientação do gestor pelo WhatsApp, confirmação da proposta e encaminhamento à fila de Casos.
- Ajustes de e-mail, navegação, documentação e empacotamento da função Hotmart.

Estas áreas receberam revisão estática. As execuções desta rodada ficaram concentradas nas correções abaixo; não significam nova homologação de todas as integrações externas.

## Verificações desta rodada

- TypeScript: sem erros.
- ESLint dos seis arquivos de código/teste alterados: sem erros.
- Financeiro: 13 testes de banco aprovados, incluindo as duas regressões de vínculo.
- Suporte: 9 testes de banco aprovados na execução final, incluindo concorrência, rollback, isolamento, atribuição e resposta atrasada.
- Baseline: instalação e reaplicação aprovadas no PostgreSQL descartável usado pelos testes.
- Não houve mudança de schema nesta revisão; migrations já aplicadas foram preservadas.

O primeiro teste concorrente do suporte falhou com deadlock; a causa foi corrigida e somente o arquivo afetado foi repetido. As mensagens de erro de FK nos logs correspondem a testes negativos que exigem rejeitar vínculos entre organizações.

Não foram repetidos build completo, E2E visual ou toda a suíte unitária: as correções desta rodada ficaram na persistência do backend. A validação anterior das telas permanece documentada em `docs/runbooks/validacao-inicio-suporte.md`. As falhas preexistentes da suíte geral continuam separadas destes resultados.

Logs: `C:/Users/fullg/.codex/tmp/striva-evolucao-local/revisao-db.log`, `revisao-suporte-final.log`, `revisao-typecheck.log` e `revisao-lint.log`.

## Pendências preservadas

1. Aplicar limites contratados, saldo mensal e compra de créditos extras.
2. Definir e implementar efeitos sobre acesso em atraso, reembolso e cancelamento, além dos avisos de vencimento.
3. Homologar compra e notificações emitidas pela própria Hotmart, incluindo recorrência e correlação SCK.
4. Validar entrega real de e-mail e operação com WhatsApp/modelo de IA reais antes da liberação.
5. Publicar somente quando o proprietário solicitar. A Edge Function versão 1 publicada anteriormente **ainda não contém a correção financeira desta revisão**; os módulos canônicos deverão ser empacotados novamente na atualização autorizada.

Cobrança real permanece desativada. As correções não completam as funcionalidades financeiras ainda pendentes do plano original.

## Continuidade do sistema

As rotas autenticadas alimentam `support-store`, que grava histórico e estado lidos pelo chat e pela fila administrativa. A auditoria permanece nas rotas. Falhas de gravação revertem a mutação; uma resposta automática que falha após aceitar a pergunta encaminha o chamado aberto para a equipe. O operador pode assumir, responder e encerrar pela superfície existente. O mapa `docs/architecture/inicio-suporte.architecture.json` foi atualizado para refletir a persistência transacional.
