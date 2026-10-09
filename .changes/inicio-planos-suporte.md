---
impacto: capacidade_nova
secao: adicionado
titulo: Página inicial, primeiros passos, manual e suporte com histórico
---

A página Início reúne boas-vindas, dados da área de trabalho e o progresso da configuração. Agora é possível configurar depois e retomar as etapas sem marcá-las como concluídas.

O manual e o botão Suporte oferecem orientações e encaminhamento para a equipe da plataforma. Administradores da plataforma acompanham e respondem aos chamados em Suporte. O perfil permite selecionar um avatar ou enviar uma foto privada.

O assistente de gestão reconhece ajuda e relatórios diário/semanal por comandos diretos, com as medidas existentes da operação.

O comando de casos pendentes apresenta o que aguarda decisão humana. Uma orientação confirmada do gestor retoma a IA pelo fluxo de Casos, com gravação atômica e proteção contra versões concorrentes.

A landing e Faturamento apresentam Básico, Pro recomendado e Empresarial, com seis ofertas Hotmart semestrais/anuais. Os totais do período acompanham o valor mensal equivalente e a economia anual. Administração → Planos comerciais permite ajustar limites iniciais e condições. Checkout real continua desligado.

A página comercial `/planos` e a landing compartilham o catálogo. A preparação Hotmart inclui cadastro da oferta, referência de checkout vinculada à empresa, webhook idempotente, histórico e fila de eventos para conferência. Cobrança real nasce desligada e aguarda homologação completa; o caminho legado conserva seu comportamento. A extensão SaaS 0248 aplica permissões e saldo às organizações gerenciadas; uma resposta lógica inteira equivale a um crédito. Venda de extras permanece desativada.

As telas novas, o manual e as etapas acompanham o idioma do perfil. A edição dos planos preserva os ajustes quando o salvamento falha, permitindo corrigir e tentar novamente.

Faturamento mostra a contagem de respostas da IA enviadas neste mês e os últimos registros, sem contar fila, falhas ou duplicações de confirmação. A medida começa nesta atualização e preserva a régua histórica por mensagem. O modo gerenciado tem saldo separado e débito por resposta lógica. Cancelamentos de assinatura recebidos da Hotmart atualizam o contrato sem apagar pagamentos nem bloquear acesso automaticamente.

A Edge Function `handle-payment-webhook` usa o mesmo receptor e os mesmos processadores do Next, com segredo de cabeçalho, vínculo confiável e confirmação transacional. O empacotamento parte dos módulos canônicos, sem cópia de regras mantida à mão.

A revisão protege o vínculo financeiro contra reutilização da mesma transação em outro contrato. No suporte, mensagens e mudanças de estado são gravadas juntas; repetir o pedido de atendimento ou encerramento não duplica a ação. Respostas atrasadas da IA são descartadas quando uma pessoa já assumiu ou encerrou o chamado.

Os modelos de confirmação de e-mail e recuperação de senha foram reorganizados com cabeçalho da marca, botão destacado, orientações claras e versão adaptada ao celular. Os links de autenticação são preservados. A aplicação destes modelos no Supabase e a configuração do remetente dependem da etapa posterior de publicação.
