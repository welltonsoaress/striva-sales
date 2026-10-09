import { createAdminClient } from "@/lib/supabase/admin";
import { llmEdgeConfigFromEnv } from "@/lib/agent-engine/edge/llm/credentials";
import {
  assertCommercialAccess,
  assertPricedModel,
  CommercialAiError,
  platformKey,
  type ManagedSettings,
} from "./managed-ai";
import type { ModelPrice } from "@/lib/ai/model-price";
import { env } from "@/lib/env";
import { currentExecutionJob } from "@/lib/atendimento/fronteira-server";

export async function managedSettings(
  org: string,
  purpose: string,
): Promise<(ManagedSettings & { api_key: string }) | null> {
  const admin = createAdminClient();
  const { data: account, error } = await admin
    .from("organization_ai_accounts")
    .select("mode,state,access_until")
    .eq("organization_id", org)
    .maybeSingle();
  if (error) throw new CommercialAiError("ai_account_unavailable");
  if (!account) throw new CommercialAiError("ai_account_unavailable");
  if (account.mode === "legacy") return null;
  const execution = currentExecutionJob();
  const { error: accessError } = await admin.rpc("fn_ai_check_access", {
    p_org: org,
    p_purpose: purpose,
    p_job: execution?.organization_id === org ? execution.id : null,
  });
  if (accessError) throw new CommercialAiError(accessError.message);
  assertCommercialAccess(account, purpose);
  const { data: settings, error: settingsError } = await admin
    .from("platform_ai_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (settingsError || !settings.enabled || !settings.provider || !settings.model)
    throw new CommercialAiError("ai_platform_unavailable");
  const purposes = settings.purpose_models as ManagedSettings["purpose_models"];
  const selected = purposes?.[purpose];
  if (selected && !selected.enabled) throw new CommercialAiError("ai_purpose_unavailable");
  const embedding = purpose === "embedding_indexar" || purpose === "embedding_consultar";
  const transcription = purpose === "transcricao_de_audio";
  const model =
    selected?.model ??
    (embedding
      ? "text-embedding-3-small"
      : transcription
        ? "whisper-1"
        : purpose === "operator_turn"
          ? (settings.operator_model ?? settings.model)
          : settings.model);
  const provider =
    selected?.provider ?? (embedding || transcription ? "openai" : settings.provider);
  if (embedding && (provider !== "openai" || model !== "text-embedding-3-small"))
    throw new CommercialAiError("ai_embedding_contract_mismatch");
  if (
    transcription &&
    (provider !== "openai" ||
      model !== "whisper-1" ||
      settings.transcription_price_per_minute_cents === null ||
      !settings.transcription_pricing_source)
  )
    throw new CommercialAiError("ai_transcription_price_missing");
  if (transcription)
    return {
      ...settings,
      purpose_models: purposes,
      provider,
      model,
      api_key: platformKey(provider, llmEdgeConfigFromEnv(env)),
    };
  const { data: price } = await admin
    .from("ai_models")
    .select(
      "input_price_per_million_cents,output_price_per_million_cents,cache_read_price_per_million_cents,cache_write_price_per_million_cents,pricing_verified_at,pricing_source",
    )
    .eq("provider", provider)
    .eq("model_id", model)
    .is("deprecated_at", null)
    .maybeSingle();
  assertPricedModel(
    price
      ? ({
          input: price.input_price_per_million_cents,
          output: price.output_price_per_million_cents,
          cache_read: price.cache_read_price_per_million_cents,
          cache_write: price.cache_write_price_per_million_cents,
          verified_at: price.pricing_verified_at,
          source: price.pricing_source,
        } satisfies ModelPrice)
      : null,
  );
  return {
    ...settings,
    purpose_models: purposes,
    provider,
    model,
    api_key: platformKey(provider, llmEdgeConfigFromEnv(env)),
  };
}

/** Atendimento humano, exportação, suporte e contratação não passam por esta barreira. */
export async function assertManagedFeature(org: string, purpose: string): Promise<boolean> {
  return (await managedSettings(org, purpose)) !== null;
}

export async function commercialAccount(org: string) {
  const admin = createAdminClient();
  const { error: renewError } = await admin.rpc("fn_ai_renew", { p_org: org });
  if (renewError) throw new CommercialAiError("ai_account_unavailable");
  const { data, error } = await admin
    .from("organization_ai_accounts")
    .select("*")
    .eq("organization_id", org)
    .maybeSingle();
  if (error) throw new CommercialAiError("ai_account_unavailable");
  if (!data) throw new CommercialAiError("ai_account_unavailable");
  return data;
}

/** Saldo e referência de tempo pertencem à mesma leitura dinâmica do servidor. */
export async function commercialAccountSnapshot(org: string) {
  const account = await commercialAccount(org);
  return { account, checked_at: Date.now() };
}
