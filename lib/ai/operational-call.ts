import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { pricedUsage, type ModelPrice } from "./model-price";

/** Mídia, embeddings e caminhos antigos usam o mesmo extrato do motor. */
export async function recordOperationalCall(input: {
  organization_id: string;
  /** Origem resolvida no servidor antes da chamada. Ausência não prova quem pagou. */
  billing_mode?: "platform" | "legacy";
  purpose: string;
  provider: string;
  model: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  latency_ms: number;
  failed?: boolean;
  duration_seconds?: number;
  duration_rate?: number | null;
  duration_source?: string | null;
}) {
  const db = createAdminClient();
  const { data } = await db
    .from("ai_models")
    .select(
      "input_price_per_million_cents,output_price_per_million_cents,cache_read_price_per_million_cents,cache_write_price_per_million_cents,pricing_verified_at,pricing_source,long_context_pricing",
    )
    .eq("provider", input.provider)
    .eq("model_id", input.model)
    .is("deprecated_at", null)
    .maybeSingle();
  const price: ModelPrice | null = data
    ? {
        input: data.input_price_per_million_cents,
        output: data.output_price_per_million_cents,
        cache_read: data.cache_read_price_per_million_cents,
        cache_write: data.cache_write_price_per_million_cents,
        verified_at: data.pricing_verified_at,
        source: data.pricing_source,
        long_context: data.long_context_pricing,
      }
    : null;
  const duration = input.duration_seconds;
  const cost = input.failed
    ? null
    : duration !== undefined
      ? input.duration_rate === null || input.duration_rate === undefined
        ? null
        : (duration / 60) * input.duration_rate
      : input.input_tokens === undefined
        ? null
        : pricedUsage(price, {
            inputTokens: input.input_tokens,
            outputTokens: input.output_tokens ?? 0,
            cacheReadTokens: input.cache_read_tokens ?? 0,
            cacheWriteTokens: input.cache_write_tokens ?? 0,
          });
  const { error } = await db.from("llm_calls").insert({
    organization_id: input.organization_id,
    purpose: input.purpose,
    provider: input.provider,
    model: input.model,
    input_tokens: input.input_tokens ?? null,
    output_tokens: input.output_tokens ?? null,
    latency_ms: input.latency_ms,
    cost_cents: cost,
    status: input.failed ? "erro" : "ok",
    error_code: input.failed ? "operational_call_failed" : null,
    pricing_snapshot:
      duration !== undefined
        ? {
            mode: input.billing_mode ?? "unknown",
            unit: "usd_cents_per_minute",
            rate: input.duration_rate ?? null,
            seconds: duration,
            source: input.duration_source ?? null,
          }
        : price
          ? {
              mode: input.billing_mode ?? "unknown",
              unit: "usd_cents_per_million_tokens",
              rates: { ...price },
            }
          : { mode: input.billing_mode ?? "unknown" },
  });
  if (error)
    logger.error("[ai] falha ao registrar custo operacional", {
      organization_id: input.organization_id,
      purpose: input.purpose,
      error_code: error.code,
    });
}
