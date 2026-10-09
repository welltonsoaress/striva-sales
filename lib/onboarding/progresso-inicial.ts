import type { OnboardingState } from "@/lib/schemas/onboarding";

/** O progresso mede configuração feita. Sair ou pular o assistente não conclui etapas. */
export const ETAPAS_INICIAIS = [
  {
    id: "negocio",
    titulo: "Conte sobre seu negócio",
    descricao: "Nome, atividade e horário da sua empresa ajudam o agente a atender com contexto.",
    href: "/onboarding/welcome",
  },
  {
    id: "whatsapp",
    titulo: "Conecte seu WhatsApp",
    descricao: "Leia o QR code com o celular que sua empresa usa para atender.",
    href: "/onboarding/connect-whatsapp",
  },
  {
    id: "agente",
    titulo: "Prepare seu agente",
    descricao: "Escolha o jeito de falar e explique os serviços e as regras do negócio.",
    href: "/onboarding/setup-ai",
  },
  {
    id: "funil",
    titulo: "Organize suas oportunidades",
    descricao: "Comece com um funil pronto e adapte as etapas ao seu processo de venda.",
    href: "/onboarding/funil",
  },
  {
    id: "teste",
    titulo: "Veja seu agente atender",
    descricao: "Faça uma conversa de teste e confira a resposta antes de atender clientes.",
    href: "/onboarding/testar",
  },
] as const;

export interface EvidenciasIniciais {
  negocio?: boolean;
  whatsapp?: boolean;
  agente?: boolean;
  funil?: boolean;
}

export function progressoInicial(
  state: OnboardingState,
  evidencias: EvidenciasIniciais = {},
  options: { managed?: boolean } = {},
) {
  const feitos: Record<(typeof ETAPAS_INICIAIS)[number]["id"], boolean> = {
    negocio: !!state.welcome || !!evidencias.negocio,
    whatsapp:
      (!!state.whatsapp?.session_id &&
        state.whatsapp.status === "WORKING" &&
        !state.whatsapp.skipped) ||
      !!evidencias.whatsapp,
    agente: (!!state.ai?.agent_id && !state.ai.skipped) || !!evidencias.agente,
    funil: (!!state.funil?.pipeline_id && !state.funil.skipped) || !!evidencias.funil,
    teste: state.teste?.respondeu === true && !state.teste.skipped,
  };
  // A ativação gerenciada já reúne revisão e autorização do agente.
  // Não encaminhar o cliente para o teste ou o funil do assistente legado.
  const source = options.managed
    ? ETAPAS_INICIAIS.filter((etapa) => ["negocio", "whatsapp", "agente"].includes(etapa.id))
    : ETAPAS_INICIAIS;
  const etapas = source.map((etapa) => ({
    ...etapa,
    ...(options.managed && etapa.id === "agente"
      ? {
          titulo: "Revise e ative seu agente",
          descricao: "Confira o atendimento preparado e autorize seu agente a atender.",
        }
      : {}),
    concluida:
      options.managed && etapa.id === "agente" ? !!state.ai?.activated_at : feitos[etapa.id],
  }));
  const concluidas = etapas.filter((etapa) => etapa.concluida).length;
  return {
    etapas,
    concluidas,
    total: etapas.length,
    percentual: Math.round((concluidas / etapas.length) * 100),
    proxima: etapas.find((etapa) => !etapa.concluida) ?? null,
  };
}

/** Membros convidados entram no trabalho; só o admin configura a organização. */
export function deveAbrirPrimeirosPassos(input: {
  onboardedAt: string | null;
  dismissedAt?: string;
  role: string;
  support?: boolean;
}) {
  return input.role === "admin" && !input.support && !input.onboardedAt && !input.dismissedAt;
}
