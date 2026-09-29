export interface LeadParaRevisao {
  id: string;
  title: string;
  contact_id: string | null;
  stage_id: string;
}

export interface AgendamentoParaRevisao {
  id: string;
  title: string;
  contact_id: string | null;
  status: string;
  starts_at: string;
}

export interface EtapaParaRevisao {
  id: string;
  name: string;
}

export interface PropostaDeReconciliacao {
  lead_id: string;
  lead_title: string;
  current_stage_id: string;
  current_stage_name: string;
  suggested_stage_id: string;
  suggested_stage_name: string;
  appointment_id: string;
  appointment_title: string;
  appointment_status: "pending" | "confirmed";
  appointment_starts_at: string;
}

export interface ContatoAmbiguoNaReconciliacao {
  lead_titles: string[];
  appointment_titles: string[];
  reason: "multiple_open_leads" | "multiple_active_appointments";
}

/**
 * Gera apenas sugestões para revisão humana. Um contato com mais de um negócio
 * aberto ou mais de um compromisso vigente nunca recebe um destino automático.
 */
export function criarPreviaDeReconciliacao(input: {
  leads: LeadParaRevisao[];
  appointments: AgendamentoParaRevisao[];
  stages: EtapaParaRevisao[];
  eventStageIds: {
    appointment_pending: string | null;
    appointment_confirmed: string | null;
  };
}): {
  proposals: PropostaDeReconciliacao[];
  ambiguous: ContatoAmbiguoNaReconciliacao[];
} {
  const stageById = new Map(input.stages.map((stage) => [stage.id, stage]));
  const leadsByContact = agrupar(input.leads.filter((lead) => lead.contact_id), (lead) => lead.contact_id!);
  const appointmentsByContact = agrupar(
    input.appointments.filter((appointment) => appointment.contact_id && (appointment.status === "pending" || appointment.status === "confirmed")),
    (appointment) => appointment.contact_id!,
  );
  const proposals: PropostaDeReconciliacao[] = [];
  const ambiguous: ContatoAmbiguoNaReconciliacao[] = [];

  for (const [contactId, appointments] of appointmentsByContact) {
    const leads = leadsByContact.get(contactId) ?? [];
    if (leads.length === 0) continue;

    const precisaRevisao = leads.some((lead) => appointments.some((appointment) => {
      const targetId = destinoDoEvento(appointment.status, input.eventStageIds);
      return targetId !== null && targetId !== lead.stage_id;
    }));
    if (!precisaRevisao) continue;

    if (leads.length > 1) {
      ambiguous.push({
        lead_titles: leads.map((lead) => lead.title),
        appointment_titles: appointments.map((appointment) => appointment.title),
        reason: "multiple_open_leads",
      });
      continue;
    }
    if (appointments.length > 1) {
      ambiguous.push({
        lead_titles: leads.map((lead) => lead.title),
        appointment_titles: appointments.map((appointment) => appointment.title),
        reason: "multiple_active_appointments",
      });
      continue;
    }

    const lead = leads[0];
    const appointment = appointments[0];
    if (!lead || !appointment) continue;
    const targetId = destinoDoEvento(appointment.status, input.eventStageIds);
    const currentStage = stageById.get(lead.stage_id);
    const targetStage = targetId ? stageById.get(targetId) : undefined;
    if (!currentStage || !targetStage || targetStage.id === currentStage.id) continue;

    proposals.push({
      lead_id: lead.id,
      lead_title: lead.title,
      current_stage_id: currentStage.id,
      current_stage_name: currentStage.name,
      suggested_stage_id: targetStage.id,
      suggested_stage_name: targetStage.name,
      appointment_id: appointment.id,
      appointment_title: appointment.title,
      appointment_status: appointment.status as "pending" | "confirmed",
      appointment_starts_at: appointment.starts_at,
    });
  }

  return { proposals, ambiguous };
}

function agrupar<T>(items: T[], chave: (item: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of items) {
    const id = chave(item);
    grupos.set(id, [...(grupos.get(id) ?? []), item]);
  }
  return grupos;
}

function destinoDoEvento(
  status: string,
  destinations: { appointment_pending: string | null; appointment_confirmed: string | null },
): string | null {
  if (status === "pending") return destinations.appointment_pending;
  if (status === "confirmed") return destinations.appointment_confirmed;
  return null;
}
