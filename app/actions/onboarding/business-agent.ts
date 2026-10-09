"use server";
import { selectedPlanHint } from "@/lib/billing/journey";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireOnboardingCtx, loadOnboardingState } from "./_shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { managedSettings } from "@/lib/billing/managed-ai-server";
import {
  BUSINESS_TEMPLATES,
  businessPrompts,
  CONVERSATION_CAPABILITIES,
  ORGANIZER_CAPABILITIES,
  TEMPLATE_VERSION,
} from "@/lib/onboarding/business-templates";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";
import { TOOL_CATALOG } from "@/lib/mcp/tools/catalog";
import { audit } from "@/lib/audit";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { trustedIp } from "@/lib/auth/trusted-ip";
import { deviceIdentity, trialHash } from "@/lib/auth/trial-identity";
import { authRateLimited } from "@/lib/auth/rate-limit";
import { z } from "zod";
import { onboardingAgenda } from "@/lib/onboarding/simple-agenda";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { CREDIT_METER } from "@/lib/billing/credits";

const ERROR_COPY: Record<string, string> = {
  ai_platform_unavailable:
    "A IA está sendo preparada pela equipe. Você pode conectar o WhatsApp e usar o atendimento humano.",
  ai_platform_credential_missing: "A equipe precisa concluir a conexão da IA da plataforma.",
  ai_model_price_missing: "A equipe precisa validar a configuração de IA antes da ativação.",
  whatsapp_verification_required: "Conecte e confirme seu WhatsApp antes de preparar o agente.",
  pipeline_requires_review:
    "Seu funil já está em uso. Revise o agente em Configurações sem substituir seus dados.",
};
export async function prepareBusinessAgent(raw: unknown = {}) {
  const ctx = await requireOnboardingCtx();
  const admin = createAdminClient();
  try {
    await managedSettings(ctx.orgId, "agent_test");
    const { state } = await loadOnboardingState(ctx.orgId);
    const segment = state.welcome?.business_segment ?? "generico";
    const t = BUSINESS_TEMPLATES[segment];
    const options = z.object({ agenda: z.unknown().optional() }).parse(raw);
    const storedAgenda = (state.ai as unknown as { agenda?: unknown } | undefined)?.agenda;
    const choice = options.agenda === undefined ? storedAgenda : options.agenda;
    if (choice && !t.agenda)
      return {
        ok: false as const,
        error:
          "Este segmento não inclui agenda no passo inicial. Configure os agendamentos nas opções avançadas.",
      };
    const agenda = choice
      ? onboardingAgenda(choice, state.welcome?.timezone ?? "America/Sao_Paulo")
      : null;
    const funnelId = t.funnel === "ecommerce" ? "loja" : t.funnel;
    const funnel =
      PACOTES.find((p) => p.id === funnelId) ?? PACOTES.find((p) => p.id === "generico")!;
    const proposta = structuredClone(funnel.proposta);
    if (t.agenda && segment !== "clinica") {
      proposta.etapas = proposta.etapas.map((stage) => ({
        ...stage,
        nome: stage.nome.replace(/Consulta/g, "Atendimento").replace(/consulta/g, "atendimento"),
        orientacao: stage.orientacao?.replace(/consulta/g, "atendimento"),
      }));
    }
    const prompts = businessPrompts(segment, ctx.orgName, !!agenda);
    const safe = (ids: readonly string[]) =>
      ids
        .map((id) => `crm_${id}`)
        .filter((id) =>
          TOOL_CATALOG.some(
            (entry) => entry.name === id && entry.risco !== "critico" && !entry.apenasHumano,
          ),
        );
    // Sem agenda configurada, capacidades de reserva não são concedidas pelo pacote.
    const conversation = safe(
      CONVERSATION_CAPABILITIES.filter((id) => ["search_knowledge", "get_org_memory"].includes(id)),
    );
    if (agenda)
      conversation.push(
        ...safe(
          CONVERSATION_CAPABILITIES.filter(
            (id) => !["search_knowledge", "get_org_memory"].includes(id),
          ),
        ),
      );
    if (TOOL_CATALOG.some((c) => c.name === "crm_request_human_handoff"))
      conversation.push("crm_request_human_handoff");
    if (["roupas", "eletronicos"].includes(segment))
      conversation.push(...safe(["search_products", "list_contact_orders"]));
    const { data, error } = await admin.rpc("fn_prepare_business_agent", {
      p_org: ctx.orgId,
      p_user: ctx.userId,
      p_segment: segment,
      p_template: TEMPLATE_VERSION,
      p_prompt: prompts.conversation,
      p_operator_prompt: prompts.organizer,
      p_tools: conversation,
      p_operator_tools: safe(ORGANIZER_CAPABILITIES),
      p_funnel: proposta,
      p_agenda: agenda,
    });
    if (error)
      return {
        ok: false as const,
        error:
          ERROR_COPY[error.message] ??
          "Não foi possível preparar o agente. Seus dados foram preservados; tente novamente.",
      };
    const result = z
      .object({
        agent_id: z.string().uuid(),
        version_id: z.string().uuid(),
        preserved: z.boolean(),
      })
      .parse(data);
    await audit({
      action: "onboarding.ai_configured",
      actorUserId: ctx.userId,
      organizationId: ctx.orgId,
      resourceType: "ai_agent",
      resourceId: result.agent_id,
      metadata: {
        segment,
        template_version: TEMPLATE_VERSION,
        prepared: true,
        preserved: result.preserved,
      },
    });
    revalidatePath("/onboarding", "layout");
    return { ok: true as const, ...result, agenda_ready: !!agenda };
  } catch (error) {
    return {
      ok: false as const,
      error:
        ERROR_COPY[error instanceof Error ? error.message : ""] ??
        "Não foi possível preparar o agente agora. Tente novamente.",
    };
  }
}

export async function activateBusinessAgent(raw: unknown) {
  const ctx = await requireOnboardingCtx();
  const input = z
    .object({
      agent_id: z.string().uuid(),
      version_id: z.string().uuid(),
      captcha_token: z.string().max(2048),
      consent: z.literal(true),
    })
    .safeParse(raw);
  if (!input.success)
    return { ok: false as const, error: "Revise e confirme as capacidades do seu agente." };
  if (await authRateLimited("trial_activation", ctx.userId, { ip: 20, id: 5, windowSec: 3600 }))
    return { ok: false as const, error: "Muitas tentativas. Aguarde alguns minutos." };
  const ip = trustedIp(await headers());
  if (!(await verifyTurnstile(input.data.captcha_token, "trial_activation", ip, true)))
    return {
      ok: false as const,
      error: "Conclua a verificação de segurança. Se ela não aparecer, avise o suporte.",
    };
  try {
    await managedSettings(ctx.orgId, "agent_test");
    const admin = createAdminClient();
    const { data: version } = await admin
      .from("ai_agent_versions")
      .select("channel_session_id")
      .eq("organization_id", ctx.orgId)
      .eq("agent_id", input.data.agent_id)
      .eq("id", input.data.version_id)
      .single();
    if (!version) return { ok: false as const, error: "Agente não encontrado nesta empresa." };
    const channel = (await listSelectableChannels(admin, ctx.orgId)).find(
      (item) => item.id === version.channel_session_id,
    );
    if (!channel?.phone_number || channel.status !== "WORKING")
      return { ok: false as const, error: ERROR_COPY.whatsapp_verification_required };
    const { error } = await admin.rpc("fn_activate_business_agent", {
      p_org: ctx.orgId,
      p_user: ctx.userId,
      p_agent: input.data.agent_id,
      p_version: input.data.version_id,
      p_owner_hash: trialHash("owner", ctx.email),
      p_phone_hash: trialHash("phone", channel.phone_number.replace(/\D/g, "")),
      p_device_hash: await deviceIdentity(),
      p_ip_hash: ip ? trialHash("ip", ip) : null,
    });
    if (error)
      return {
        ok: false as const,
        error:
          error.code === "23505"
            ? "Já houve um teste com este titular ou WhatsApp. Você pode contratar um plano ou pedir revisão ao suporte."
            : (ERROR_COPY[error.message] ??
              "Não foi possível ativar. Confira a conexão e tente novamente."),
      };
    await audit({
      action: "onboarding.ai_configured",
      actorUserId: ctx.userId,
      organizationId: ctx.orgId,
      resourceType: "ai_agent",
      resourceId: input.data.agent_id,
      metadata: { activated: true, commercial_meter: CREDIT_METER },
    });
    revalidatePath("/app/inicio");
    const { data: { user } } = await (await createClient()).auth.getUser();
    const hint = selectedPlanHint(user?.user_metadata?.commercial_plan_hint);
    return { ok: true as const, redirect_to: hint ? `/app/settings/billing?plan=${hint}` : "/app/inicio" };
  } catch {
    return { ok: false as const, error: "A ativação não foi concluída. Tente novamente." };
  }
}
