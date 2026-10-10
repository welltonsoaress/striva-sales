"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { assertPricedModel } from "@/lib/billing/managed-ai";
import { platformKeyServer } from "@/lib/billing/platform-credentials";
import { encryptKey } from "@/lib/crypto/aes_gcm";
import { validateProviderKey } from "@/lib/ai/provider-validators";
import { mfaEmDivida } from "@/lib/auth/server";
import { llmEdgeConfigFromEnv } from "@/lib/agent-engine/edge/llm/credentials";
import { env } from "@/lib/env";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { runModelCall } from "@/lib/agent-engine/edge/llm/run-model-call";
import { hotmartOfferSchema } from "@/lib/billing/hotmart";

async function guard() {
  if (await requireSupportWrite())
    throw new Error("Encerre o acompanhamento para alterar a plataforma.");
  const ctx = await requirePlatformAdmin();
  if (ctx.platformAdmin.scope !== "full") throw new Error("Seu acesso permite somente leitura.");
  if (await mfaEmDivida()) throw new Error("Confirme a verificação em duas etapas.");
  return ctx;
}
const purposeSchema = z.record(
  z.string().min(1).max(80),
  z.object({
    provider: z.enum(["openai", "anthropic", "openrouter"]),
    model: z.string().min(1).max(120),
    enabled: z.boolean(),
  }),
);
const settingsSchema = z.object({
  enabled: z.boolean(),
  apply_to_all: z.boolean().default(false),
  api_key: z.string().trim().max(500).optional(),
  provider: z.enum(["openai", "anthropic", "openrouter"]),
  model: z.string().trim().min(1).max(120),
  operator_model: z.string().trim().max(120).nullable(),
  max_output_tokens: z.number().int().min(128).max(16000),
  max_steps: z.number().int().min(1).max(25),
  monthly_cost_limit_cents: z.number().nonnegative(),
  requests_per_minute: z.number().int().min(1).max(1000).default(60),
  purpose_models: purposeSchema.default({}),
  transcription_price_per_minute_cents: z.number().nonnegative().nullable().default(null),
  transcription_pricing_source: z.url().nullable().default(null),
  reason: z.string().trim().min(10).max(1000),
});
export async function saveManagedAi(raw: unknown) {
  const { user } = await guard();
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Confira modelo, limites e motivo." };
  const { reason, api_key, ...settings } = parsed.data;
  const admin = createAdminClient();
  try {
    if (api_key) {
      const validation = await validateProviderKey(settings.provider, api_key);
      if (!validation.ok)
        return {
          ok: false as const,
          error: "A chave não foi aceita pelo provedor. Confira a chave e tente novamente.",
        };
      if (validation.models.length && !validation.models.includes(settings.model))
        return {
          ok: false as const,
          error: "O modelo selecionado não está disponível para esta chave.",
        };
    }
    if (settings.enabled) {
      if (!api_key) await platformKeyServer(settings.provider, llmEdgeConfigFromEnv(env));
      for (const model of new Set([settings.model, settings.operator_model].filter(Boolean))) {
        const { data } = await admin
          .from("ai_models")
          .select(
            "supports_tools,input_price_per_million_cents,output_price_per_million_cents,cache_read_price_per_million_cents,cache_write_price_per_million_cents,pricing_verified_at,pricing_source",
          )
          .eq("provider", settings.provider)
          .eq("model_id", model!)
          .is("deprecated_at", null)
          .maybeSingle();
        if (!data?.supports_tools)
          return {
            ok: false as const,
            error: "O modelo deve estar disponível no catálogo e aceitar ferramentas.",
          };
        assertPricedModel({
          input: data.input_price_per_million_cents,
          output: data.output_price_per_million_cents,
          cache_read: data.cache_read_price_per_million_cents,
          cache_write: data.cache_write_price_per_million_cents,
          verified_at: data.pricing_verified_at,
          source: data.pricing_source,
        });
      }
      for (const [purpose, selection] of Object.entries(settings.purpose_models)) {
        if (!selection.enabled) continue;
        if (!(api_key && selection.provider === settings.provider))
          await platformKeyServer(selection.provider, llmEdgeConfigFromEnv(env));
        if (purpose === "transcricao_de_audio") {
          if (
            selection.provider !== "openai" ||
            selection.model !== "whisper-1" ||
            settings.transcription_price_per_minute_cents === null ||
            !settings.transcription_pricing_source
          )
            return {
              ok: false as const,
              error:
                "A transcrição usa whisper-1 e exige uma tarifa por minuto com fonte validada.",
            };
          continue;
        }
        if (
          purpose.startsWith("embedding_") &&
          (selection.provider !== "openai" || selection.model !== "text-embedding-3-small")
        )
          return {
            ok: false as const,
            error: "A busca e os documentos usam o mesmo modelo de embedding com 1536 dimensões.",
          };
        const { data } = await admin
          .from("ai_models")
          .select(
            "supports_tools,input_price_per_million_cents,output_price_per_million_cents,cache_read_price_per_million_cents,cache_write_price_per_million_cents,pricing_verified_at,pricing_source",
          )
          .eq("provider", selection.provider)
          .eq("model_id", selection.model)
          .is("deprecated_at", null)
          .maybeSingle();
        if (
          !data ||
          (["agent_turn", "operator_turn", "followup_turn", "agent_test"].includes(purpose) &&
            !data.supports_tools)
        )
          return { ok: false as const, error: `Confira o modelo da finalidade ${purpose}.` };
        assertPricedModel({
          input: data.input_price_per_million_cents,
          output: data.output_price_per_million_cents,
          cache_read: data.cache_read_price_per_million_cents,
          cache_write: data.cache_write_price_per_million_cents,
          verified_at: data.pricing_verified_at,
          source: data.pricing_source,
        });
      }
    }
    // A conexão e a chave entram juntas. Uma falha não deixa o modelo novo usando a chave anterior.
    const client = await getRequestPool().connect();
    try {
      await client.query("begin");
      if (api_key) {
        const secret = encryptKey(api_key);
        await client.query(
          `insert into platform_ai_credentials(provider,ciphertext,iv,tag,last4)
          values($1,$2,$3,$4,$5) on conflict(provider) do update set ciphertext=excluded.ciphertext,iv=excluded.iv,tag=excluded.tag,last4=excluded.last4,updated_at=now()`,
          [settings.provider, secret.ciphertext, secret.iv, secret.tag, secret.last4],
        );
      }
      await client.query(
        `update platform_ai_settings set enabled=$1,apply_to_all=$2,provider=$3,model=$4,operator_model=$5,
        max_output_tokens=$6,max_steps=$7,monthly_cost_limit_cents=$8,requests_per_minute=$9,purpose_models=$10,
        transcription_price_per_minute_cents=$11,transcription_pricing_source=$12,updated_at=now() where id=true`,
        [
          settings.enabled,
          settings.apply_to_all,
          settings.provider,
          settings.model,
          settings.operator_model,
          settings.max_output_tokens,
          settings.max_steps,
          settings.monthly_cost_limit_cents,
          settings.requests_per_minute,
          settings.purpose_models,
          settings.transcription_price_per_minute_cents,
          settings.transcription_pricing_source,
        ],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
    await audit({
      action: "platform_admin.managed_ai_configured",
      actorUserId: user.id,
      actingAsPlatformAdmin: true,
      bypassedRls: true,
      resourceType: "platform_ai_settings",
      metadata: { ...settings, reason, credential_changed: !!api_key },
    });
    revalidatePath("/admin/ai");
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error:
        "A chave da plataforma e as tarifas precisam estar configuradas antes de habilitar a IA.",
    };
  }
}
export async function changeAiAccount(raw: unknown) {
  const { user } = await guard();
  const parsed = z
    .object({
      organization_id: z.string().uuid(),
      action: z.enum(["migrate", "adjust", "trial_exception", "suspend", "reactivate"]),
      reason: z.string().trim().min(10).max(1000),
      units: z.number().int().min(-1000000).max(1000000).default(0),
      reference: z.string().uuid(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Informe um motivo e uma ação válida." };
  const d = parsed.data;
  if (d.action === "migrate") {
    const { data: settings } = await createAdminClient()
      .from("platform_ai_settings")
      .select("enabled,provider,model")
      .eq("id", true)
      .single();
    try {
      if (!settings?.enabled || !settings.provider) throw new Error("unavailable");
      await platformKeyServer(settings.provider, llmEdgeConfigFromEnv(env));
    } catch {
      return {
        ok: false as const,
        error: "Conclua a conexão da IA no admin antes de migrar esta empresa.",
      };
    }
  }
  const { error } = await createAdminClient().rpc("fn_admin_ai_account", {
    p_org: d.organization_id,
    p_actor: user.id,
    p_action: d.action,
    p_reason: d.reason,
    p_units: d.units,
    p_reference: d.reference,
  });
  if (error)
    return {
      ok: false as const,
      error: "A alteração não foi aplicada. Confira o saldo e o período contratado.",
    };
  revalidatePath(`/admin/tenants/${d.organization_id}`);
  revalidatePath("/admin/dashboard");
  return { ok: true as const };
}
export async function setClientPlan(raw: unknown) {
  const { user } = await guard();
  const parsed = z
    .object({
      organization_id: z.uuid(),
      plan_id: z.uuid(),
      access_until: z.iso.datetime({ offset: true }),
      reason: z.string().trim().min(10).max(1000),
      reference: z.uuid(),
    })
    .safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: "Informe plano, período de acesso e motivo." };
  const db = createAdminClient();
  const { data: settings } = await db
    .from("platform_ai_settings")
    .select("enabled,provider")
    .eq("id", true)
    .single();
  try {
    if (!settings?.enabled || !settings.provider) throw new Error("unavailable");
    await platformKeyServer(settings.provider, llmEdgeConfigFromEnv(env));
  } catch {
    return {
      ok: false as const,
      error: "Configure a IA da plataforma antes de conceder um plano com IA incluída.",
    };
  }
  const { error } = await db.rpc("fn_admin_set_commercial_plan", {
    p_org: parsed.data.organization_id,
    p_actor: user.id,
    p_plan: parsed.data.plan_id,
    p_until: parsed.data.access_until,
    p_reason: parsed.data.reason,
    p_reference: parsed.data.reference,
  });
  if (error)
    return {
      ok: false as const,
      error:
        "Não foi possível aplicar. Use um plano publicado com limites definidos, um período futuro e aguarde chamadas de IA pendentes.",
    };
  revalidatePath(`/admin/tenants/${parsed.data.organization_id}`);
  revalidatePath("/app/settings/billing");
  return { ok: true as const };
}
export async function testManagedAi(orgId: string) {
  await guard();
  if (!z.string().uuid().safeParse(orgId).success)
    return { ok: false as const, error: "Selecione uma empresa de teste." };
  try {
    const result = await runModelCall(getRequestPool(), llmEdgeConfigFromEnv(env), {
      tenantId: orgId,
      purpose: "connection_test",
      messages: [{ role: "user", content: "Responda apenas: conexão confirmada." }],
      maxSteps: 1,
    });
    return { ok: true as const, model: result.model, cost_cents: result.costCents };
  } catch {
    return {
      ok: false as const,
      error: "O teste falhou. Confira a chave, o modelo e o acesso da empresa.",
    };
  }
}

export async function saveModelTariff(raw: unknown) {
  const { user } = await guard();
  const parsed = z
    .object({
      provider: z.string().min(1),
      model: z.string().min(1),
      input: z.number().nonnegative(),
      output: z.number().nonnegative(),
      cache_read: z.number().nonnegative().nullable(),
      cache_write: z.number().nonnegative().nullable(),
      source: z.url(),
      reason: z.string().trim().min(10).max(1000),
    })
    .safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: "Informe as tarifas e a fonte oficial." };
  const d = parsed.data;
  const { data, error } = await createAdminClient()
    .from("ai_models")
    .update({
      input_price_per_million_cents: d.input,
      output_price_per_million_cents: d.output,
      cache_read_price_per_million_cents: d.cache_read,
      cache_write_price_per_million_cents: d.cache_write,
      pricing_verified_at: new Date().toISOString(),
      pricing_source: d.source,
    })
    .eq("provider", d.provider)
    .eq("model_id", d.model)
    .select("model_id")
    .single();
  if (error || !data) return { ok: false as const, error: "Modelo não encontrado no catálogo." };
  await audit({
    action: "platform_admin.managed_ai_configured",
    actorUserId: user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    resourceType: "ai_model",
    metadata: d,
  });
  revalidatePath("/admin/ai");
  return { ok: true as const };
}
export async function saveCreditPack(raw: unknown) {
  const { user } = await guard();
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(2).max(80),
      units: z.number().int().positive(),
      price_cents: z.number().int().positive().nullable(),
      hotmart_offer: hotmartOfferSchema.nullable().default(null),
      reason: z.string().trim().min(10).max(1000),
    })
    .safeParse(raw);
  if (!parsed.success)
    return {
      ok: false as const,
      error: "Informe nome, quantidade e motivo. O preço pode ficar pendente.",
    };
  const { reason, id, ...d } = parsed.data;
  if (d.hotmart_offer) d.hotmart_offer.enabled = false;
  const db = createAdminClient();
  const result = id
    ? await db
        .from("ai_credit_packs")
        .update({ ...d, publication_state: "draft" })
        .eq("id", id)
        .select("id")
        .single()
    : await db
        .from("ai_credit_packs")
        .insert({ ...d, publication_state: "draft" })
        .select("id")
        .single();
  if (result.error || !result.data)
    return { ok: false as const, error: "Não foi possível salvar o pacote." };
  await audit({
    action: "platform_admin.managed_ai_configured",
    actorUserId: user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    resourceType: "ai_credit_pack",
    resourceId: result.data.id,
    metadata: { ...d, reason, publication_state: "draft" },
  });
  revalidatePath("/admin/ai");
  return { ok: true as const };
}
/** Publicação explícita após conferir e homologar a oferta no painel de pagamentos. */
export async function publishCreditPack(raw: unknown) {
  const { user } = await guard();
  const parsed = z
    .object({ id: z.string().uuid(), reason: z.string().trim().min(10).max(1000) })
    .safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: "Informe o pacote e o motivo da publicação." };
  const db = createAdminClient(),
    { data, error } = await db
      .from("ai_credit_packs")
      .select("price_cents,hotmart_offer")
      .eq("id", parsed.data.id)
      .maybeSingle();
  if (error || !data?.price_cents || !hotmartOfferSchema.safeParse(data.hotmart_offer).success)
    return { ok: false as const, error: "Cadastre o preço e uma oferta válida antes de publicar." };
  const result = await db.rpc("fn_admin_publish_credit_pack", {
    p_id: parsed.data.id,
    p_actor: user.id,
    p_reason: parsed.data.reason,
  });
  if (result.error)
    return {
      ok: false as const,
      error: "A publicação não foi aplicada. Confira a configuração da oferta.",
    };
  revalidatePath("/admin/ai");
  revalidatePath("/app/settings/billing");
  return { ok: true as const };
}
export async function reconcileAiResponse(raw: unknown) {
  const { user } = await guard();
  const p = z
    .object({
      organization_id: z.string().uuid(),
      response_id: z.string().uuid(),
      reason: z.string().trim().min(10).max(1000),
    })
    .safeParse(raw);
  if (!p.success)
    return { ok: false as const, error: "Informe a empresa, resposta e motivo da conferência." };
  const { data, error } = await createAdminClient().rpc("fn_admin_ai_reconcile", {
    p_org: p.data.organization_id,
    p_actor: user.id,
    p_response: p.data.response_id,
    p_reason: p.data.reason,
  });
  if (error)
    return {
      ok: false as const,
      error: "A conferência exige um processamento encerrado. Nenhum saldo foi liberado.",
    };
  revalidatePath("/admin/ai/health");
  revalidatePath(`/admin/tenants/${p.data.organization_id}`);
  return {
    ok: true as const,
    message:
      data === "uncertain"
        ? "A entrega continua incerta. Verifique o canal; o crédito permanece reservado."
        : data === "committed"
          ? "Resposta confirmada. O débito foi registrado uma vez."
          : "Falha definitiva confirmada. A reserva foi liberada.",
  };
}
