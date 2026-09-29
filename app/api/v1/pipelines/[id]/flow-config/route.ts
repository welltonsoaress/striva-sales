import { requireSupportWrite } from "@/lib/impersonate/support";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { savePipelineSettings } from "@/lib/pipelines/save-settings";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { flowConfigWriteSchema, lerFlowConfig, LEGACY_EVENT_STAGE_SLUGS } from "@/lib/pipelines/flow-config";
import { createClient } from "@/lib/supabase/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { logger } from "@/lib/logger";
import { criarPreviaDeReconciliacao } from "@/lib/pipelines/reconciliation-preview";

export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

async function carregar(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string, pipelineId: string) {
  const { data: pipeline, error: erroFunil } = await supabase
    .from("crm_pipelines")
    .select("id, settings, updated_at")
    .eq("id", pipelineId)
    .eq("organization_id", orgId)
    .eq("is_archived", false)
    .maybeSingle();
  if (erroFunil) throw new Error(erroFunil.message);
  if (!pipeline) return null;

  const { data: stages, error: erroEtapas } = await supabase
    .from("crm_stages")
    .select("id, name, slug, is_won, is_lost, agent_stage_hint, is_archived")
    .eq("organization_id", orgId)
    .eq("pipeline_id", pipelineId)
    .eq("is_archived", false)
    .order("position", { ascending: true });
  if (erroEtapas) throw new Error(erroEtapas.message);
  const activeStages = stages ?? [];
  const flow = lerFlowConfig(pipeline.settings);
  const settingsFlow = pipeline.settings && typeof pipeline.settings === "object" ? (pipeline.settings as Record<string, unknown>).flow : null;
  const rawDestinations = settingsFlow && typeof settingsFlow === "object" ? (settingsFlow as Record<string, unknown>).event_stage_ids : null;
  const explicit = rawDestinations && typeof rawDestinations === "object" ? rawDestinations as Record<string, unknown> : {};
  const legado = (evento: keyof typeof LEGACY_EVENT_STAGE_SLUGS) => activeStages.find((stage) => stage.slug === LEGACY_EVENT_STAGE_SLUGS[evento])?.id ?? null;
  const eventStageIds = {
    appointment_pending: Object.hasOwn(explicit, "appointment_pending") ? flow.event_stage_ids.appointment_pending : legado("appointment_pending"),
    appointment_confirmed: Object.hasOwn(explicit, "appointment_confirmed") ? flow.event_stage_ids.appointment_confirmed : legado("appointment_confirmed"),
    human_handoff: Object.hasOwn(explicit, "human_handoff") ? flow.event_stage_ids.human_handoff : legado("human_handoff"),
  };
  return { pipeline, stages: activeStages, flow: { ...flow, event_stage_ids: eventStageIds } };
}

async function carregarPreviaDeReconciliacao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  result: Awaited<ReturnType<typeof carregar>> & {},
) {
  const leadsResult = await supabase
    .from("crm_leads")
    .select("id, title, contact_id, stage_id")
    .eq("organization_id", orgId)
    .eq("pipeline_id", result.pipeline.id)
    .eq("status", "open")
    .limit(500);
  if (leadsResult.error) throw new Error(leadsResult.error.message);
  const leads = leadsResult.data ?? [];
  const contactIds = [...new Set(leads.map((lead) => lead.contact_id).filter((id): id is string => id !== null))];
  if (contactIds.length === 0) return { available: true as const, truncated: leads.length === 500, proposals: [], ambiguous: [] };

  // A ambiguidade é por contato na organização, inclusive em outros funis.
  const candidatesResult = await supabase.from("crm_leads")
    .select("id, title, contact_id, stage_id", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("status", "open")
    .in("contact_id", contactIds)
    .limit(1000);
  if (candidatesResult.error) throw new Error(candidatesResult.error.message);
  if (candidatesResult.count == null || candidatesResult.count > (candidatesResult.data ?? []).length) {
    return { available: true as const, truncated: true, proposals: [], ambiguous: [] };
  }

  const appointmentsResult = await supabase
    .from("calendar_appointments")
    .select("id, title, contact_id, status, starts_at", { count: "exact" })
    .eq("organization_id", orgId)
    .in("contact_id", contactIds)
    .in("status", ["pending", "confirmed"])
    .order("starts_at", { ascending: false })
    .limit(1000);
  if (appointmentsResult.error) throw new Error(appointmentsResult.error.message);

  if (appointmentsResult.count == null || appointmentsResult.count > (appointmentsResult.data ?? []).length) {
    return { available: true as const, truncated: true, proposals: [], ambiguous: [] };
  }
  const preview = criarPreviaDeReconciliacao({
    leads: candidatesResult.data ?? [],
    appointments: appointmentsResult.data ?? [],
    stages: result.stages,
    eventStageIds: {
      appointment_pending: result.flow.event_stage_ids.appointment_pending,
      appointment_confirmed: result.flow.event_stage_ids.appointment_confirmed,
    },
  });
  return {
    available: true as const,
    truncated: leads.length === 500 || (appointmentsResult.data ?? []).length === 1000,
    ...preview,
  };
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "pipeline_flow_config" });
  if (!authz.ok) return authz.response;
  const { id } = await ctx.params;
  try {
    const supabase = await createClient();
    const result = await carregar(supabase, authz.org.orgId, id);
    if (!result) return fail("not_found", traduzir("Funil não encontrado.", authz.user.idioma), 404, { requestId });
    let reconciliationPreview: Awaited<ReturnType<typeof carregarPreviaDeReconciliacao>> | { available: false; truncated: false; proposals: []; ambiguous: [] };
    try {
      reconciliationPreview = await carregarPreviaDeReconciliacao(supabase, authz.org.orgId, result);
    } catch (previewError) {
      logger.warn("pipeline_reconciliation_preview_failed", {
        organization_id: authz.org.orgId,
        pipeline_id: id,
        request_id: requestId,
        error: previewError instanceof Error ? previewError.message : String(previewError),
      });
      reconciliationPreview = { available: false, truncated: false, proposals: [], ambiguous: [] };
    }
    return ok({ stages: result.stages, ...result.flow, reconciliation_preview: reconciliationPreview }, { requestId });
  } catch (err) {
    logger.error("pipeline_flow_config_read_failed", { organization_id: authz.org.orgId, pipeline_id: id, request_id: requestId, error: err instanceof Error ? err.message : String(err) });
    return fail("internal_error", traduzir("Não consegui carregar as regras deste funil. Tente novamente.", authz.user.idioma), 500, { requestId });
  }
}

export async function PUT(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "pipeline_flow_config" });
  if (!authz.ok) return authz.response;
  const { id } = await ctx.params;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  let json: unknown;
  try { json = await req.json(); } catch { return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId }); }
  const parsed = flowConfigWriteSchema.safeParse(json);
  if (!parsed.success) return fail("unprocessable_entity", t("Revise as descrições e os destinos escolhidos."), 422, { requestId, details: parsed.error.flatten() });

  const supabase = await createClient();
  try {
    const atual = await carregar(supabase, authz.org.orgId, id);
    if (!atual) return fail("not_found", t("Funil não encontrado."), 404, { requestId });
    const stages = atual.stages as Array<{ id: string; is_won: boolean; is_lost: boolean }>;
    const porId = new Map(stages.map((stage) => [stage.id, stage]));
    const idsConfigurados = Object.keys(parsed.data.stage_guidance);
    if (idsConfigurados.length !== stages.length || stages.some((stage) => !parsed.data.stage_guidance[stage.id])) {
      return fail("unprocessable_entity", t("Escreva uma orientação para cada etapa ativa do funil."), 422, { requestId });
    }
    const destinations = parsed.data.event_stage_ids;
    const escolhidos = [destinations.appointment_pending, destinations.appointment_confirmed, destinations.human_handoff].filter((id): id is string => id !== null);
    if (escolhidos.some((id) => !porId.has(id))) {
      return fail("unprocessable_entity", t("Escolha destinos ativos deste funil."), 422, { requestId });
    }
    const pendente = destinations.appointment_pending ? porId.get(destinations.appointment_pending) : null;
    const confirmado = destinations.appointment_confirmed ? porId.get(destinations.appointment_confirmed) : null;
    const handoff = destinations.human_handoff ? porId.get(destinations.human_handoff) : null;
    if (pendente && (pendente.is_won || pendente.is_lost)) {
      return fail("unprocessable_entity", t("Um agendamento solicitado precisa ir para uma etapa em andamento."), 422, { requestId });
    }
    if (confirmado?.is_lost) {
      return fail("unprocessable_entity", t("Uma confirmação de agendamento não pode levar para uma etapa de perda."), 422, { requestId });
    }
    if (handoff && (handoff.is_won || handoff.is_lost)) {
      return fail("unprocessable_entity", t("A transferência para uma pessoa precisa ir para uma etapa em andamento."), 422, { requestId });
    }

    const settingsAtuais = atual.pipeline.settings && typeof atual.pipeline.settings === "object"
      ? atual.pipeline.settings as Record<string, unknown>
      : {};
    const flowAtual = settingsAtuais.flow && typeof settingsAtuais.flow === "object"
      ? settingsAtuais.flow as Record<string, unknown>
      : {};
    const settings = {
      ...settingsAtuais,
      flow: { ...flowAtual, ...parsed.data, template_id: atual.flow.template_id ?? null },
    };
    const saved = await savePipelineSettings(supabase, { organizationId: authz.org.orgId, pipelineId: id, expectedUpdatedAt: atual.pipeline.updated_at, settings });
    if (!saved) return fail("state_conflict", t("As configurações mudaram enquanto você editava. Atualize a página e revise antes de salvar."), 409, { requestId });
    await audit({
      action: "pipeline.config_updated",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_pipeline",
      resourceId: id,
      requestId,
      metadata: { stages_configured: idsConfigurados.length, appointment_pending: !!destinations.appointment_pending, appointment_confirmed: !!destinations.appointment_confirmed, human_handoff: !!destinations.human_handoff },
    });
    return ok({ ...parsed.data, stages: atual.stages }, { requestId });
  } catch (err) {
    logger.error("pipeline_flow_config_write_failed", { organization_id: authz.org.orgId, pipeline_id: id, request_id: requestId, error: err instanceof Error ? err.message : String(err) });
    return fail("internal_error", t("Não consegui salvar as regras deste funil. Tente novamente."), 500, { requestId });
  }
}
