import { z } from "zod";

/**
 * Configuração legível do fluxo, guardada em crm_pipelines.settings.
 * IDs de etapa são escopados pelo funil e continuam válidos quando o nome muda.
 */
export const flowConfigSchema = z.object({
  stage_guidance: z.record(
    z.string().uuid(),
    z.object({ purpose: z.string().trim().min(1).max(280) }),
  ).default({}),
  event_stage_ids: z.object({
    appointment_pending: z.string().uuid().nullable().optional(),
    appointment_confirmed: z.string().uuid().nullable().optional(),
    human_handoff: z.string().uuid().nullable().optional(),
  }).default({}),
});

/** Slugs usados antes de `settings.flow.event_stage_ids`; só valem sem config explícita. */
export const LEGACY_EVENT_STAGE_SLUGS = {
  appointment_pending: "agendamento-solicitado",
  appointment_confirmed: "agendado",
  human_handoff: "chamar-humano",
} as const;

export interface PipelineFlowConfig {
  stage_guidance: Record<string, { purpose: string }>;
  event_stage_ids: {
    appointment_pending: string | null;
    appointment_confirmed: string | null;
    human_handoff: string | null;
  };
  template_id?: string | null;
}

export const flowConfigWriteSchema = flowConfigSchema.extend({
  stage_guidance: z.record(
    z.string().uuid(),
    z.object({ purpose: z.string().trim().min(1).max(280) }),
  ),
  event_stage_ids: z.object({
    appointment_pending: z.string().uuid().nullable(),
    appointment_confirmed: z.string().uuid().nullable(),
    human_handoff: z.string().uuid().nullable(),
  }),
});

export function lerFlowConfig(settings: unknown): PipelineFlowConfig {
  const r = settings && typeof settings === "object" ? (settings as Record<string, unknown>).flow : null;
  const parsed = flowConfigSchema.safeParse(r);
  if (!parsed.success) {
    return { stage_guidance: {}, event_stage_ids: { appointment_pending: null, appointment_confirmed: null, human_handoff: null } };
  }
  const templateId = r && typeof r === "object" && typeof (r as Record<string, unknown>).template_id === "string"
    ? (r as Record<string, unknown>).template_id as string
    : null;
  return {
    stage_guidance: parsed.data.stage_guidance,
    event_stage_ids: {
      appointment_pending: parsed.data.event_stage_ids.appointment_pending ?? null,
      appointment_confirmed: parsed.data.event_stage_ids.appointment_confirmed ?? null,
      human_handoff: parsed.data.event_stage_ids.human_handoff ?? null,
    },
    template_id: templateId,
  };
}
