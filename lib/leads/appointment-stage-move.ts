import { observeServiceOrigin } from "@/lib/atendimento/origem";
import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import { emitLeadActivity, stageChangeReason } from "@/lib/leads/activity-emitter";
import { registraFalhaDeAtividade } from "@/lib/leads/activity-write-failure";
import type { Transicao } from "@/lib/agenda/laco";
import { LEGACY_EVENT_STAGE_SLUGS } from "@/lib/pipelines/flow-config";

/**
 * Espelha a transição de um agendamento (`calendar_appointments.status`) no
 * funil do CRM. Funis novos escolhem o destino pelo id ativo; instalações
 * antigas continuam usando os slugs históricos até que o dono configure um
 * destino pela tela.
 *
 * ⚠️ SÓ `pending` E `confirmed` AVANÇAM O CARD, de propósito. As demais
 * transições (`rescheduled`, `cancelled`, `completed`, `no_show`) não têm
 * entrada no mapa: cancelar ou faltar a UM compromisso não é o negócio
 * esfriando — o cliente pode remarcar, e quem decide que o negócio morreu
 * continua sendo o agente (`crm_stages.agent_stage_hint = 'lost'`) ou um
 * humano arrastando o card, nunca o agendamento sozinho.
 */
export const SLUG_ETAPA_POR_TRANSICAO: Partial<Record<Transicao, string>> = {
  pending: LEGACY_EVENT_STAGE_SLUGS.appointment_pending,
  confirmed: LEGACY_EVENT_STAGE_SLUGS.appointment_confirmed,
};

export interface ResultadoDoMovimentoDeAgendamento {
  moveu: boolean;
  motivo:
    | "movido"
    | "transicao_nao_mapeada"
    | "sem_etapa_mapeada"
    | "ja_esta_la"
    | "lead_nao_encontrado"
    | "lead_fechado"
    | "conflito_humano"
    | "falha_de_escrita"
    | "destino_invalido"
    | "indisponivel";
}

export async function moverLeadParaEtapaDeAgendamento(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    leadId: string;
    transicao: Transicao;
  },
): Promise<ResultadoDoMovimentoDeAgendamento> {
  const slugAlvo = SLUG_ETAPA_POR_TRANSICAO[input.transicao];
  if (!slugAlvo) {
    return { moveu: false, motivo: "transicao_nao_mapeada" };
  }

  const { data: lead, error: erroLead } = await admin
    .from("crm_leads")
    .select("id, pipeline_id, stage_id, contact_id, status")
    .eq("id", input.leadId)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (erroLead) {
    logger.warn("[appointment-stage-move] leitura do lead falhou", {
      lead_id: input.leadId,
      organization_id: input.organizationId,
      error: erroLead.message,
    });
    return { moveu: false, motivo: "indisponivel" };
  }
  if (!lead) {
    return { moveu: false, motivo: "lead_nao_encontrado" };
  }
  const leadRow = lead as {
    id: string;
    pipeline_id: string;
    stage_id: string;
    contact_id: string | null;
    status: string;
  };

  // Negócio já fechado (ganho/perdido) não volta a se mexer por causa de um
  // agendamento — moveria um card que a organização já considera encerrado.
  if (leadRow.status !== "open") {
    return { moveu: false, motivo: "lead_fechado" };
  }

  const evento = input.transicao === "pending" ? "appointment_pending" : "appointment_confirmed";
  const { data: pipeline, error: erroPipeline } = await admin
    .from("crm_pipelines")
    .select("settings")
    .eq("is_archived", false)
    .eq("id", leadRow.pipeline_id)
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (erroPipeline) {
    logger.warn("[appointment-stage-move] leitura da configuração do funil falhou", {
      lead_id: leadRow.id,
      organization_id: input.organizationId,
      error: erroPipeline.message,
    });
    return { moveu: false, motivo: "indisponivel" };
  }
  if (!pipeline) return { moveu: false, motivo: "destino_invalido" };
  const settings = (pipeline?.settings ?? {}) as { flow?: { event_stage_ids?: Record<string, string | null | undefined> } };
  const destinos = settings.flow?.event_stage_ids;
  const temConfig = destinos !== undefined && Object.prototype.hasOwnProperty.call(destinos, evento);
  const stageIdConfigurado = temConfig ? destinos?.[evento] ?? null : null;
  if (temConfig && !stageIdConfigurado) {
    logger.warn("[appointment-stage-move] destino do agendamento não configurado", {
      lead_id: leadRow.id,
      organization_id: input.organizationId,
      pipeline_id: leadRow.pipeline_id,
      transition: input.transicao,
    });
    return { moveu: false, motivo: "sem_etapa_mapeada" };
  }

  let etapaQuery = admin
    .from("crm_stages")
    .select("id, name, is_won, is_lost")
    .eq("organization_id", input.organizationId)
    .eq("pipeline_id", leadRow.pipeline_id)
    .eq("is_archived", false);
  etapaQuery = stageIdConfigurado
    ? etapaQuery.eq("id", stageIdConfigurado)
    : etapaQuery.eq("slug", slugAlvo);
  const { data: etapa, error: erroEtapa } = await etapaQuery.maybeSingle();
  if (erroEtapa) {
    logger.warn("[appointment-stage-move] leitura da etapa alvo falhou", {
      lead_id: leadRow.id,
      organization_id: input.organizationId,
      error: erroEtapa.message,
    });
    return { moveu: false, motivo: "indisponivel" };
  }
  if (!etapa) {
    return { moveu: false, motivo: "sem_etapa_mapeada" };
  }
  const etapaRow = etapa as { id: string; name: string; is_won: boolean; is_lost: boolean };
  // O resultado da etapa pode ter sido editado depois da associação.
  if (etapaRow.is_lost || ((input.transicao === "pending") && etapaRow.is_won)) {
    logger.warn("pipeline_event_destination_invalid", { organization_id: input.organizationId, pipeline_id: leadRow.pipeline_id, stage_id: etapaRow.id });
    return { moveu: false, motivo: "destino_invalido" };
  }

  if (leadRow.stage_id === etapaRow.id) {
    return { moveu: false, motivo: "ja_esta_la" };
  }

  // Nome da origem só enfeita o texto da timeline — erro descartado de
  // propósito, mesmo raciocínio de `agent-stage-sync.ts` e `handoff-stage-move.ts`.
  const { data: origem } = await admin
    .from("crm_stages")
    .select("name")
    .eq("id", leadRow.stage_id)
    .maybeSingle();

  const serviceOrigin = await observeServiceOrigin(admin, input.organizationId, leadRow.contact_id);
  const { data: atualizadas, error: erroUpdate } = await admin
    .from("crm_leads")
    .update({ stage_id: etapaRow.id })
    .eq("id", leadRow.id)
    .eq("organization_id", input.organizationId)
    .eq("pipeline_id", leadRow.pipeline_id)
    .eq("status", "open")
    // Trava otimista pelo estágio de ORIGEM: se um humano moveu o card entre a
    // leitura e a escrita, a decisão dele vence.
    .eq("stage_id", leadRow.stage_id)
    .select("id");
  if (erroUpdate) {
    logger.warn("[appointment-stage-move] update de stage_id falhou", {
      lead_id: leadRow.id,
      organization_id: input.organizationId,
      error: erroUpdate.message,
    });
    return { moveu: false, motivo: "falha_de_escrita" };
  }
  if ((atualizadas ?? []).length === 0) {
    return { moveu: false, motivo: "conflito_humano" };
  }

  const atividade = await emitLeadActivity(admin, {
    organizationId: input.organizationId,
    leadId: leadRow.id,
    contactId: leadRow.contact_id,
    type: "stage_changed",
    sourceModule: "agenda",
    sourceId: leadRow.id,
    actor: { type: "webhook_source", id: "appointment-stage-move" },
    reason: stageChangeReason((origem as { name: string } | null)?.name ?? null, etapaRow.name),
    payload: { motivo_do_movimento: `agendamento:${input.transicao}`, de: leadRow.stage_id, para: etapaRow.id },
  });
  if (!atividade.ok) {
    await registraFalhaDeAtividade(admin, {
      organizationId: input.organizationId,
      leadId: leadRow.id,
      tipo: "stage_changed",
      origem: "lib/leads/appointment-stage-move",
      erro: atividade.error,
    });
  }

  // Mesmo evento que `agent-stage-sync.ts` e `handoff-stage-move.ts` emitem ao
  // mover o card — para que regras de automação e follow-up que escutam
  // `lead.stage_changed` reajam igual, seja qual for a mão que moveu o card.
  const { error: erroEvento } = await admin.rpc("emit_event" as never, {
    p_event_type: "lead.stage_changed",
    p_entity_kind: "crm_lead",
    p_entity_id: leadRow.id,
    p_payload: {
      service_origin: serviceOrigin,
      pipeline_id: leadRow.pipeline_id,
      from_stage_id: leadRow.stage_id,
      to_stage_id: etapaRow.id,
      status: etapaRow.is_won ? "won" : "open",
    },
    p_metadata: { actor_kind: "system", source: "appointment-stage-move", transicao: input.transicao },
    p_organization_id: input.organizationId,
  } as never);
  if (erroEvento) {
    logger.error("[appointment-stage-move] emit_event lead.stage_changed falhou", {
      lead_id: leadRow.id,
      organization_id: input.organizationId,
      error: (erroEvento as { message?: string }).message ?? String(erroEvento),
    });
  }

  return { moveu: true, motivo: "movido" };
}
