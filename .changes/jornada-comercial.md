---
impacto: exige_acao
secao: alterado
titulo: Ativação simples, contratação acompanhada e credenciais reservadas à plataforma
---

Novos clientes recebem navegação simples, preservam o plano escolhido no cadastro e podem conectar o Google Agenda durante a preparação do agente. O fim do teste apresenta contratação sem botão de fechar; faturamento, ajuda, privacidade e segurança continuam acessíveis. Apenas pagamento confirmado pelo servidor libera o atendimento.

Troca, cancelamento e renovação podem ser solicitados no faturamento e chegam ao suporte humano. A plataforma confirma a oferta e envia uma proposta; uma nova recorrência exige cancelamento confirmado da anterior. Créditos extras permanecem indisponíveis. Avisos antecipados têm fila durável, deduplicação e falhas visíveis no financeiro administrativo.

## Requer atenção

Aplicar a migration 0253 e publicar app, workers e scheduler compatíveis. Credenciais de IA passam a ser alteradas somente por administradores completos da plataforma, também para empresas legadas; credenciais e agentes existentes são preservados. Conferir permissões, MFA, Resend e SMTP de autenticação antes de liberar cadastros públicos. Configurar o retorno financeiro em `/pagamento/retorno` e homologar os eventos reais antes de habilitar as seis ofertas. O endereço sslip.io não permite cadastrar os registros de verificação do remetente.
