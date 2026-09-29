/**
 * OS QUADROS PRONTOS, POR TIPO DE NEGÓCIO.
 *
 * Existem por duas razões, e a segunda é a que importa mais:
 *
 * 1. São o PLANO B. Quando a chave de IA não está no lugar, não tem saldo, ou o
 *    provedor devolve algo que não vira funil, o passo continua entregando um
 *    quadro que faz sentido — em vez de devolver a pessoa ao funil de
 *    e-commerce que o gatilho semeou. Falhar fechado na ação, aberto na
 *    informação: a tela diz que a sugestão não veio e mostra os prontos.
 *
 * 2. São a RÉGUA. É contra estes exemplos que a sugestão da IA é pedida e
 *    comparada. Sem um alvo concreto, "sugira um funil" devolve cinco colunas
 *    com nomes de manual de vendas ("Prospecção", "MQL", "Fundo de funil") que
 *    não são o que o dono de uma clínica chama as coisas.
 *
 * ⚠️ TODA ETAPA CARREGA O PASSO. Um pacote que só desse os nomes trocaria um
 * quadro errado por um quadro certo e igualmente parado — ver o cabeçalho de
 * `proposta-de-funil.ts` para a medição.
 */
import type { PropostaDeFunil } from "@/lib/onboarding/proposta-de-funil";

export interface PacoteDeFunil {
  id: string;
  /**
   * Como o dono reconhece o próprio negócio nesta lista. Não é o nome do nicho
   * no material de marketing ("vertical de saúde") — é o que ele responderia se
   * alguém perguntasse o que ele faz.
   */
  comoSeApresenta: string;
  /** Explica o ciclo de venda que o modelo organiza. */
  descricao: string;
  /** Próximos ajustes sugeridos, usando follow-ups e automações já existentes. */
  sugestoes: readonly string[];
  proposta: PropostaDeFunil;
  /** Chaves de etapas do próprio modelo; o servidor resolve para ids após criar as etapas. */
  destinosDeAgendamento?: Partial<Record<"pending" | "confirmed", string>>;
}

export const PACOTES: readonly PacoteDeFunil[] = [
  {
    id: "clinica",
    comoSeApresenta: "Clínica, consultório ou salão",
    descricao: "Do primeiro contato até a consulta marcada, com os desfechos de ganho e perda explicados antes de ativar a agenda.",
    sugestoes: ["Em Follow-ups, programe uma retomada para quem ficou em «Quer agendar».", "Em Automações, use a mudança de etapa para avisar a equipe quando uma consulta for confirmada."],
    destinosDeAgendamento: { pending: "escolhendo_horario", confirmed: "consulta_marcada" },
    proposta: {
      nome: "Agendamentos",
      etapas: [
        { nome: "Novo contato", chave: "novo_contato", passo: "new", orientacao: "A pessoa chegou pelo WhatsApp, telefone ou formulário e ainda não recebeu a primeira resposta." },
        { nome: "Já respondi", chave: "respondido", passo: "contacted", orientacao: "A equipe ou o agente respondeu e aguarda entender o que a pessoa procura." },
        { nome: "Entendendo o caso", chave: "entendendo_caso", passo: "qualifying", orientacao: "A conversa está identificando serviço, objetivo, urgência e informações necessárias para orientar o atendimento." },
        { nome: "Quer agendar", chave: "quer_agendar", passo: "qualified", orientacao: "A pessoa demonstrou intenção de marcar e já é possível oferecer o tipo de atendimento adequado." },
        { nome: "Escolhendo horário", chave: "escolhendo_horario", passo: "negotiating", orientacao: "Um horário foi solicitado e a agenda ainda não confirmou a marcação." },
        { nome: "Consulta marcada", chave: "consulta_marcada", passo: "won", orientacao: "A agenda confirmou o horário. Este modelo sugere encerrar a oportunidade como ganho; altere o destino se a venda só terminar depois do atendimento." },
        { nome: "Não vai marcar", passo: "lost", orientacao: "A pessoa informou que não seguirá com o agendamento. Use somente quando a decisão de encerrar estiver clara." },
      ],
    },
  },
  {
    id: "imobiliaria",
    comoSeApresenta: "Imobiliária ou corretor",
    descricao: "Da descoberta do que a pessoa procura até visita, fechamento ou desistência.",
    sugestoes: ["Em Follow-ups, programe uma retomada para interessados que ainda não agendaram uma visita.", "Use Automações para avisar o corretor quando o negócio entrar em «Visitando imóveis»."],
    proposta: {
      nome: "Interessados",
      etapas: [
        { nome: "Novo interessado", chave: "novo_interessado", passo: "new", orientacao: "Um pedido de compra, aluguel ou informação chegou e ainda não recebeu resposta." },
        { nome: "Já respondi", chave: "respondido", passo: "contacted", orientacao: "O interessado recebeu a primeira resposta e aguarda continuidade." },
        { nome: "Entendendo o que procura", chave: "entendendo_busca", passo: "qualifying", orientacao: "Estão sendo levantados tipo de imóvel, região, faixa de preço, prazo e requisitos." },
        { nome: "Sei o que oferecer", chave: "oferta_definida", passo: "qualified", orientacao: "Os critérios estão claros e já é possível recomendar imóveis compatíveis." },
        { nome: "Visitando imóveis", chave: "visitando", passo: "negotiating", orientacao: "Há interesse concreto e a visita, proposta ou negociação está em andamento." },
        { nome: "Fechou negócio", chave: "fechado", passo: "won", orientacao: "Compra ou locação foi concluída e confirmada pela equipe." },
        { nome: "Desistiu", chave: "desistiu", passo: "lost", orientacao: "O interessado confirmou que não continuará com esta oportunidade." },
      ],
    },
  },
  {
    id: "servicos",
    comoSeApresenta: "Serviços, agência ou obra",
    descricao: "Da chegada do pedido à compreensão do projeto, proposta, negociação e desfecho.",
    sugestoes: ["Em Follow-ups, retome propostas sem resposta após o prazo definido pela sua equipe.", "Use Automações para notificar a equipe quando uma proposta for aceita ou recusada."],
    proposta: {
      nome: "Orçamentos",
      etapas: [
        { nome: "Pedido novo", chave: "pedido_novo", passo: "new", orientacao: "Uma solicitação de serviço chegou e ainda não recebeu a primeira resposta." },
        { nome: "Já respondi", chave: "respondido", passo: "contacted", orientacao: "A solicitação recebeu uma resposta inicial e aguarda levantamento de detalhes." },
        { nome: "Entendendo o projeto", chave: "entendendo_projeto", passo: "qualifying", orientacao: "A equipe identifica escopo, prazo, local, materiais e resultado esperado." },
        { nome: "Orçamento enviado", chave: "orcamento_enviado", passo: "qualified", orientacao: "O escopo foi entendido e a proposta comercial foi apresentada ao cliente." },
        { nome: "Negociando", chave: "negociando", passo: "negotiating", orientacao: "Preço, prazo, escopo ou condições estão sendo ajustados com o cliente." },
        { nome: "Fechou", chave: "fechou", passo: "won", orientacao: "O cliente aceitou a proposta e confirmou a contratação." },
        { nome: "Não fechou", chave: "nao_fechou", passo: "lost", orientacao: "O cliente recusou ou confirmou que não seguirá com esta proposta." },
      ],
    },
  },
  {
    id: "curso",
    comoSeApresenta: "Curso, mentoria ou infoproduto",
    descricao: "Do interesse inicial até matrícula, negociação ou desistência.",
    sugestoes: ["Em Follow-ups, retome interessados que ficaram com dúvidas ou condições pendentes.", "Use Automações para avisar a equipe quando a matrícula for confirmada."],
    proposta: {
      nome: "Matrículas",
      etapas: [
        { nome: "Novo interessado", chave: "novo_interessado", passo: "new", orientacao: "Uma pessoa demonstrou interesse no curso e ainda não recebeu resposta." },
        { nome: "Já respondi", chave: "respondido", passo: "contacted", orientacao: "A pessoa recebeu uma resposta inicial e aguarda orientação sobre o curso." },
        { nome: "Tirando dúvidas", chave: "tirando_duvidas", passo: "qualifying", orientacao: "A conversa esclarece objetivos, conteúdo, formato, disponibilidade e dúvidas do curso." },
        { nome: "Quer entrar", chave: "quer_entrar", passo: "qualified", orientacao: "A pessoa confirmou que o curso atende ao que procura e quer avançar para matrícula." },
        { nome: "Fechando condições", chave: "fechando_condicoes", passo: "negotiating", orientacao: "A pessoa está avaliando preço, forma de pagamento ou condições de matrícula." },
        { nome: "Matriculado", chave: "matriculado", passo: "won", orientacao: "A matrícula foi concluída e confirmada pela equipe." },
        { nome: "Desistiu", chave: "desistiu", passo: "lost", orientacao: "A pessoa confirmou que não fará a matrícula nesta oportunidade." },
      ],
    },
  },
  {
    id: "loja",
    comoSeApresenta: "Loja — online ou de rua",
    descricao: "Da escolha de produto ao pagamento ou encerramento da oportunidade.",
    sugestoes: ["Em Follow-ups, retome pedidos que aguardam pagamento após conferência da equipe.", "Use Automações para avisar a equipe quando o pedido for confirmado. O pagamento não é detectado automaticamente sem integração própria."],
    proposta: {
      nome: "Vendas",
      etapas: [
        { nome: "Novo contato", chave: "novo_contato", passo: "new", orientacao: "Uma pessoa perguntou sobre produtos e ainda não recebeu resposta." },
        { nome: "Já respondi", chave: "respondido", passo: "contacted", orientacao: "A pessoa recebeu a primeira resposta e aguarda apoio para escolher." },
        { nome: "Escolhendo o produto", chave: "escolhendo_produto", passo: "qualifying", orientacao: "A equipe entende preferência, disponibilidade, tamanho, modelo ou outras características." },
        { nome: "Vai levar", chave: "vai_levar", passo: "qualified", orientacao: "A pessoa escolheu um produto e demonstrou intenção clara de compra." },
        { nome: "Aguardando pagamento", chave: "aguardando_pagamento", passo: "negotiating", orientacao: "O pedido foi combinado e falta confirmar o pagamento. O sistema não confirma pagamento sem integração própria." },
        { nome: "Pedido pago", chave: "pedido_pago", passo: "won", orientacao: "A equipe confirmou a compra. Esta etapa não é atualizada por integração de pagamento automaticamente." },
        { nome: "Não comprou", chave: "nao_comprou", passo: "lost", orientacao: "A pessoa confirmou que não fará esta compra." },
      ],
    },
  },
  {
    id: "generico",
    // Último de propósito: quem não se reconhece em nenhum dos outros já leu
    // todos antes de chegar aqui.
    comoSeApresenta: "Outro tipo de negócio",
    descricao: "Um ciclo comercial adaptável, da primeira conversa até ganhar ou perder.",
    sugestoes: ["Em Follow-ups, retome oportunidades que aguardam resposta do cliente.", "Em Automações, escolha quais mudanças de etapa devem gerar um aviso interno."],
    proposta: {
      nome: "Clientes",
      etapas: [
        { nome: "Novo contato", chave: "novo_contato", passo: "new", orientacao: "Um pedido ou interesse chegou e ainda não recebeu resposta." },
        { nome: "Já respondi", chave: "respondido", passo: "contacted", orientacao: "A pessoa recebeu a primeira resposta e aguarda entender a necessidade." },
        { nome: "Entendendo a necessidade", chave: "entendendo_necessidade", passo: "qualifying", orientacao: "O agente ou a equipe identifica problema, objetivo, prazo e informações para recomendar uma solução." },
        { nome: "Proposta enviada", chave: "proposta_enviada", passo: "qualified", orientacao: "A necessidade está clara e uma proposta adequada foi apresentada." },
        { nome: "Negociando", chave: "negociando", passo: "negotiating", orientacao: "Preço, prazo, escopo ou condições estão sendo discutidos." },
        { nome: "Fechou", chave: "fechou", passo: "won", orientacao: "O cliente aceitou e confirmou a contratação ou pedido." },
        { nome: "Não fechou", chave: "nao_fechou", passo: "lost", orientacao: "O cliente informou que não seguirá com esta oportunidade." },
      ],
    },
  },
] as const;

/**
 * O pacote de último recurso.
 *
 * Existe como CONSTANTE e não como `PACOTES[0]` porque quem chama precisa de uma
 * garantia de que sempre há um: um índice fixo numa lista editável é a promessa
 * que se quebra na primeira reordenação, e o desfecho seria uma tela de
 * onboarding com `undefined` no lugar do quadro.
 */
export const PACOTE_PADRAO: PacoteDeFunil =
  PACOTES.find((p) => p.id === "generico") ??
  (() => {
    throw new Error("PACOTES sem o pacote genérico — ele é o último recurso do passo do funil");
  })();
