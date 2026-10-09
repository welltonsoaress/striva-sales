/** Conteúdo versionado: usado pelo manual e pela busca de orientações do suporte. */
export const MANUAL = [
  {
    id: "comecar",
    titulo: "Começar e configurar sua empresa",
    resumo: "Prepare o atendimento em etapas simples, sem perder o progresso.",
    passos: [
      "Abra Início e acompanhe a seção Primeiros passos.",
      "Informe o que sua empresa faz e as orientações que o agente deve seguir.",
      "Conecte o WhatsApp, prepare o agente, organize o funil e faça uma conversa de teste.",
      "Use Configurar depois para entrar no sistema. As etapas ainda pendentes continuam em Início.",
    ],
    href: "/app/inicio",
    acao: "Ver primeiros passos",
    minRole: "viewer",
    termos: "começar inicio configurar onboarding primeiros passos progresso",
  },
  {
    id: "whatsapp",
    titulo: "Conectar o WhatsApp",
    resumo: "Conecte o número da empresa e confira se ele está pronto para atender.",
    passos: [
      "Quem administra a empresa abre Conexões e escolhe o número de atendimento.",
      "Abra Aparelhos conectados no WhatsApp do celular e leia o QR code exibido no sistema.",
      "Aguarde o estado conectado antes de testar o atendimento.",
      "Se a conexão cair, siga o aviso do sistema e confira o número em Conexões.",
    ],
    href: "/app/connections",
    acao: "Abrir conexões",
    minRole: "admin",
    termos: "whatsapp qr code conectar telefone numero desconectado",
  },
  {
    id: "agente",
    titulo: "Preparar e testar seu agente",
    resumo: "Dê contexto ao agente e confira as respostas antes de publicar.",
    passos: [
      "Abra Agente de IA e escolha o agente da empresa.",
      "Defina o nome, o jeito de falar, os serviços e as regras que ele deve respeitar.",
      "Adicione informações reais na base de conhecimento; evite preços ou condições que ainda não foram aprovados.",
      "Teste uma pergunta comum, uma dúvida sem resposta e uma situação que precisa da equipe humana.",
      "Confira o número, o modelo e as permissões antes de publicar a versão.",
    ],
    href: "/app/ai/agents",
    acao: "Ver agentes",
    minRole: "admin",
    termos: "agente ia inteligencia prompt conhecimento resposta treino publicar testar",
  },
  {
    id: "conversas",
    titulo: "Atender e continuar uma conversa",
    resumo: "Encontre o histórico e mantenha o próximo passo do cliente visível.",
    passos: [
      "Abra Conversas e selecione o atendimento.",
      "Leia o histórico e confira se o atendimento está com uma pessoa ou com a IA.",
      "Quando precisar assumir, use a ação de atendimento humano disponível na conversa.",
      "Deixe a orientação e o próximo passo registrados antes de devolver o atendimento à IA.",
    ],
    href: "/app/inbox",
    acao: "Abrir conversas",
    minRole: "viewer",
    termos: "conversa atendimento inbox mensagem assumir humano retomar",
  },
  {
    id: "oportunidades",
    titulo: "Organizar oportunidades e tarefas",
    resumo: "Acompanhe cada negociação e o que precisa acontecer depois.",
    passos: [
      "Abra Oportunidades e encontre a negociação no funil.",
      "Mova para a etapa que corresponde à situação real da venda.",
      "Registre o responsável e crie uma tarefa quando houver uma ação pendente.",
      "Consulte o Radar para identificar oportunidades sem resposta e a lista de Tarefas para acompanhar prazos.",
    ],
    href: "/app/kanban",
    acao: "Ver oportunidades",
    minRole: "viewer",
    termos: "funil pipeline oportunidade venda tarefa radar prazo lead",
  },
  {
    id: "agenda",
    titulo: "Usar a agenda",
    resumo: "Veja compromissos, responsáveis e disponibilidade.",
    passos: [
      "Abra Agenda para consultar os compromissos que seu acesso permite ver.",
      "Quem administra configura os tipos de atendimento e a disponibilidade da equipe.",
      "Confirme cliente, responsável e horário antes de criar um agendamento.",
      "Para sincronizar com Google Agenda, use a integração oferecida nas configurações da empresa.",
    ],
    href: "/app/agenda",
    acao: "Abrir agenda",
    minRole: "viewer",
    termos: "agenda calendario google marcar consulta compromisso horario",
  },
  {
    id: "casos",
    titulo: "Orientar a IA em um caso pendente",
    resumo: "Ajude o agente a continuar quando ele precisa da sua decisão.",
    passos: [
      "Abra Casos e escolha a pendência que precisa de orientação.",
      "Confira o resumo, a pergunta e o histórico antes de responder.",
      "Escreva a orientação que a IA pode usar para continuar o atendimento.",
      "Acompanhe o resultado; enviar uma orientação não significa que a demanda do cliente já foi resolvida.",
    ],
    href: "/app/ai/cases",
    acao: "Ver casos",
    minRole: "agent",
    termos: "caso pendente orientar ia resposta humano duvida",
  },
  {
    id: "gestor",
    titulo: "Consultar o assistente de gestão",
    resumo: "Peça informações e prepare ações pelo WhatsApp verificado do gestor.",
    passos: [
      "Quem administra abre Assistente de gestão nas configurações e verifica o WhatsApp do gestor.",
      "Peça um resumo da operação, pendências, agenda ou oportunidades em risco.",
      "Envie ajuda para ver os comandos. Relatório diário e relatório semanal trazem as medidas com período e fuso da empresa.",
      "Ajuste o envio dos relatórios nas configurações disponíveis.",
      "Mudanças preparadas pelo assistente exigem confirmação. Confira a proposta antes de enviar o código.",
      "Envie casos pendentes para ver o que aguarda uma decisão humana. Informe o caso e sua orientação; confirme o texto para encaminhá-lo à IA.",
    ],
    href: "/app/settings/management",
    acao: "Configurar assistente",
    minRole: "admin",
    termos: "gestor assistente whatsapp relatorio comando resumo",
  },
  {
    id: "perfil",
    titulo: "Personalizar seu perfil",
    resumo: "Atualize seu nome, avatar, idioma e fuso horário.",
    passos: [
      "Abra seu perfil nas configurações.",
      "Escolha um avatar ou envie uma imagem do seu computador.",
      "Confira seu nome, o idioma e o fuso horário.",
      "Salve e confira a alteração no menu da sua conta.",
    ],
    href: "/app/settings/profile",
    acao: "Editar perfil",
    minRole: "viewer",
    termos: "perfil avatar foto imagem nome idioma fuso",
  },
  {
    id: "faturamento",
    titulo: "Consultar plano e faturamento",
    resumo: "Confira a oferta disponível e as condições cadastradas para sua empresa.",
    passos: [
      "Quem administra abre Faturamento nas configurações.",
      "Confira o nome do plano e as condições informadas antes de contratar.",
      "Valores de referência e ofertas em preparação precisam ser confirmados pela equipe da plataforma.",
      "Consulte o uso da IA para acompanhar o consumo; custo operacional e créditos contratados são medidas diferentes.",
    ],
    href: "/app/settings/billing",
    acao: "Ver faturamento",
    minRole: "admin",
    termos: "plano pro preço valor pagamento fatura credito ia consumo",
  },
] as const;

export function buscarNoManual(pergunta: string) {
  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const palavras = [
    ...new Set(
      normalizar(pergunta)
        .split(/\W+/)
        .filter((palavra) => palavra.length > 2),
    ),
  ];
  return MANUAL.map((artigo) => ({
    artigo,
    pontos: palavras.reduce(
      (total, palavra) =>
        total +
        (normalizar(`${artigo.titulo} ${artigo.resumo} ${artigo.termos}`).includes(palavra)
          ? 1
          : 0),
      0,
    ),
  }))
    .filter((item) => item.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 3)
    .map((item) => item.artigo);
}
