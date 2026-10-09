# Operação da IA incluída

Contrato: [spec SaaS](../specs/saas-ia-incluida.md). Esta configuração é da equipe operadora. O cliente não precisa conhecer provedores, modelos ou chaves.

## Preparação da plataforma

1. Aplicar as migrations 0248 a 0251 ou o baseline completo pelo fluxo de atualização, em ambiente de homologação primeiro. Conferir tipos gerados, instalação e segunda aplicação sem erro. A 0249 protege gravações diretas no Storage após vencimento; a 0250 limita a RPC auxiliar aos vínculos autenticados; a 0251 versiona e converte créditos preservando a capacidade das condições anteriores.
2. Disponibilizar a credencial do provedor no servidor pelo mecanismo existente de configuração da instalação. Nunca copiar a chave para uma organização, enviar ao navegador ou incluir em log.
3. Em `/admin/ai`, selecionar os modelos e limites por finalidade. Conferir as tarifas na documentação do provedor, registrar a fonte e a data de validação. Ausência de preço impede novas ativações gerenciadas; custo desconhecido permanece visível como desconhecido.
4. Configurar Turnstile com validação no servidor. As chaves oficiais de teste pertencem somente à homologação. Conferir domínio permitido, expiração, repetição de token e a resposta do servidor.
5. Configurar Redis para limites distribuídos. Conferir que o proxy confiável sobrescreve os cabeçalhos de origem e injeta `x-platform-proxy-token` usando o segredo configurado. Cabeçalho enviado diretamente pelo navegador não é prova de IP.
6. Conferir a agenda dos crons existentes, incluindo retenção e recuperação. Revisar respostas incertas na fila administrativa antes de liberar uma reserva.
7. Manter a venda Hotmart desativada até homologar ofertas, correlação, webhooks repetidos e reversões. O pacote de 1.000 créditos/R$49,99 nasce em rascunho. Em `/admin/ai`, cadastrar produto, oferta e link; salvar conserva o rascunho. Conferir preço/quantidade no checkout real e publicar com motivo. A chave geral de checkout também precisa estar habilitada no ambiente homologado. Repetir compra, reembolso e chargeback com eventos de homologação antes de vender.

## Empresas existentes

O baseline cria a conta comercial em modo legado para as empresas existentes. Não altera suas credenciais nem versões publicadas. A migração individual fica na ficha da empresa, exige motivo e registra auditoria. Empresas com agente publicado precisam de período pago confirmado antes da migração.

Antes de migrar, conferir conexão, finalidade/modelos disponíveis, tarifa validada, período e saldo. Depois, confirmar os mesmos agentes, credenciais e ponteiros publicados, o atendimento de teste e a telemetria. Uma falha deve aparecer no admin e na Central, com possibilidade de atendimento humano durante o período contratado.

## Pendências e recuperação

| Situação                | Ação                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Saldo esgotado          | Conferir Faturamento e período; ajuste somente com motivo e auditoria. Atendimento humano continua dentro do período. |
| Período encerrado       | Contratar ou conferir pagamento. Consulta, exportação e suporte continuam disponíveis.                                |
| WhatsApp desconectado   | Abrir a conexão da empresa e concluir a confirmação do número. Não simular conexão no banco.                          |
| Resposta incerta        | Conferir os recibos de todas as partes; preservar a reserva até evidência definitiva.                                 |
| Webhook sem empresa     | Conferir correlação e histórico no financeiro; reprocessar pelo fluxo administrativo idempotente.                     |
| Tarifa ou custo ausente | Conferir provedor/modelo e fonte de preço; não preencher zero para esconder a lacuna.                                 |
| Teste inelegível        | Conferir o vínculo comprovado. Exceção somente com motivo no admin; IP compartilhado sozinho não justifica bloqueio.  |

## Homologação antes de publicar

Rodar `gov:verify`, invariantes com baseline em instalação e atualização, build e E2E pertinentes. Com duas empresas fictícias, verificar API, RLS, Storage, Realtime e contexto de IA; dirigir o onboarding no navegador em desktop e celular. Dublês visuais não comprovam envio WhatsApp, cobrança ou chamada real ao provedor.

A autorização deste trabalho não inclui publicação na VPS, venda real ou mudança da Luana em produção. O relatório de homologação deve separar evidência local, dependências externas e o que ainda impede publicação.
