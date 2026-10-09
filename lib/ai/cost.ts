/**
 * Cost computation for AI invocations.
 *
 * Looks up `ai_pricing` (rarely changing global table) and converts token
 * usage to cost in fractional cents (without integer rounding or
 * treating missing prices as free usage).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

interface PricingRow {
  model: string;
  prompt_cents_per_million_tokens: string | number | null;
  completion_cents_per_million_tokens: string | number | null;
  embedding_cents_per_million_tokens: string | number | null;
}

let _pricingCache: Map<string, PricingRow> | null = null;
let _pricingFetchedAt = 0;
const PRICING_TTL_MS = 5 * 60 * 1000; // 5 minutes — enough for hot reload + cheap if missed.

async function loadPricing(): Promise<Map<string, PricingRow>> {
  const now = Date.now();
  if (_pricingCache && now - _pricingFetchedAt < PRICING_TTL_MS) {
    return _pricingCache;
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ai_pricing")
    .select(
      "model, prompt_cents_per_million_tokens, completion_cents_per_million_tokens, embedding_cents_per_million_tokens",
    )
    .is("superseded_at", null);

  if (error) {
    // Surface but don't crash — cost stays unknown and the row remains auditable.
    return _pricingCache ?? new Map();
  }

  const map = new Map<string, PricingRow>();
  for (const row of (data ?? []) as PricingRow[]) {
    map.set(row.model, row);
  }
  _pricingCache = map;
  _pricingFetchedAt = now;
  return map;
}

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.NaN;
}

export interface ComputeCostInput {
  provider?: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  /** For embedding-only models, treat tokens as embedding tokens. */
  embeddingTokens?: number;
}

export interface ComputedCost {
  cost_cents: number | null;
  pricing_snapshot: Json | null;
}

/**
 * Preço do catálogo (`ai_models`), a tabela que o cron `sync-model-catalog`
 * mantém e a ÚNICA onde chega preço de modelo da OpenRouter.
 *
 * `ai_pricing` é uma lista curta e escrita à mão, com os ids SEM prefixo de
 * provider. Os workers consultam com prefixo (`anthropic/claude-…`,
 * `meta-llama/llama-3.3-70b-instruct`), então o `get` exato errava sempre e o
 * custo ia 0 para `bot_respond` e para todo modelo OpenRouter — a tela de Uso
 * e a de Execuções mostrando R$ 0,00 com o dinheiro saindo, que é literalmente
 * o sintoma citado pela 0130 como motivo da unificação.
 */
async function precoDoCatalogo(
  modelo: string,
  provider?: string,
): Promise<{
  prompt: number | null;
  completion: number | null;
  provider: string;
  source: string | null;
} | null> {
  const admin = createAdminClient();
  // Duas formas do mesmo id: como veio, e sem o prefixo de provider. O catálogo
  // guarda `model_id` como o provedor o nomeia — com prefixo na OpenRouter, sem
  // ele na Anthropic/OpenAI.
  const semPrefixo = modelo.includes("/") ? modelo.slice(modelo.indexOf("/") + 1) : modelo;
  let query = admin
    .from("ai_models")
    .select(
      "provider, model_id, input_price_per_million_cents, output_price_per_million_cents,pricing_source",
    )
    .in("model_id", [modelo, semPrefixo])
    .is("deprecated_at", null)
    .limit(3);
  if (provider) query = query.eq("provider", provider);
  const { data, error } = await query;
  if (error) return null;

  const linhas = (data ?? []) as Array<{
    model_id: string;
    provider: string;
    pricing_source: string | null;
    input_price_per_million_cents: number | null;
    output_price_per_million_cents: number | null;
  }>;
  // Preferir a correspondência EXATA: `llama-3.3-70b-instruct` pode existir em
  // mais de um provedor com preços diferentes, e o id completo é quem desempata.
  const exact = linhas.filter((l) => l.model_id === modelo);
  const candidates = exact.length ? exact : linhas;
  // Mesmo nome em provedores diferentes não autoriza escolher uma tarifa ao acaso.
  if (candidates.length !== 1) return null;
  const linha = candidates[0];
  if (!linha) return null;
  return {
    prompt: linha.input_price_per_million_cents,
    completion: linha.output_price_per_million_cents,
    provider: linha.provider,
    source: linha.pricing_source,
  };
}

/**
 * Returns fractional cost in cents; null when pricing is unknown.
 */
export async function computeCost(input: ComputeCostInput): Promise<number | null> {
  return (await computeCostDetails(input)).cost_cents;
}

/** A tarifa e o custo saem da mesma leitura, sem uma segunda consulta ao catálogo. */
export async function computeCostDetails(input: ComputeCostInput): Promise<ComputedCost> {
  const usage = [input.promptTokens, input.completionTokens, input.embeddingTokens];
  // Ausência de uso não prova gratuidade. Valores inválidos não podem compensar
  // outro componente e produzir um custo aparentemente válido.
  if (
    usage.every((tokens) => tokens === undefined) ||
    usage.some((tokens) => tokens !== undefined && (!Number.isFinite(tokens) || tokens < 0))
  )
    return { cost_cents: null, pricing_snapshot: null };
  const pricing = await loadPricing();
  // A tabela antiga não identifica o provedor. Uma escolha explícita só usa
  // o catálogo que identifica a tarifa pela dupla provedor/modelo.
  const row = input.provider ? undefined : pricing.get(input.model);
  if (!row) {
    // `ai_pricing` não conhece: tenta o catálogo, que é onde o cron grava e
    // onde a OpenRouter chega. Embedding não passa por aqui — o catálogo não
    // guarda preço de embedding —, e nesse caso o desfecho é o mesmo de antes.
    const doCatalogo = await precoDoCatalogo(input.model, input.provider);
    if (!doCatalogo) return { cost_cents: null, pricing_snapshot: null };
    const snapshot = {
      unit: "usd_cents_per_million_tokens",
      table: "ai_models",
      provider: doCatalogo.provider,
      model: input.model,
      source: doCatalogo.source,
      input: doCatalogo.prompt,
      output: doCatalogo.completion,
    };
    const unknown =
      [doCatalogo.prompt, doCatalogo.completion].some(
        (rate) => rate !== null && (!Number.isFinite(rate) || rate < 0),
      ) ||
      ((input.promptTokens ?? 0) > 0 && doCatalogo.prompt === null) ||
      ((input.completionTokens ?? 0) > 0 && doCatalogo.completion === null) ||
      (input.embeddingTokens ?? 0) > 0;
    if (unknown) return { cost_cents: null, pricing_snapshot: snapshot };
    const cents =
      ((input.promptTokens ?? 0) * (doCatalogo.prompt ?? 0)) / 1_000_000 +
      ((input.completionTokens ?? 0) * (doCatalogo.completion ?? 0)) / 1_000_000;
    return {
      cost_cents: Number.isFinite(cents) && cents >= 0 ? cents : null,
      pricing_snapshot: snapshot,
    };
  }

  const promptRate = toNumber(row.prompt_cents_per_million_tokens);
  const completionRate = toNumber(row.completion_cents_per_million_tokens);
  const embeddingRate = toNumber(row.embedding_cents_per_million_tokens);

  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;
  const embeddingTokens = input.embeddingTokens ?? 0;
  const snapshot = {
    unit: "usd_cents_per_million_tokens",
    table: "ai_pricing",
    model: input.model,
    input: row.prompt_cents_per_million_tokens,
    output: row.completion_cents_per_million_tokens,
    embedding: row.embedding_cents_per_million_tokens,
  };

  const cents =
    (promptTokens * promptRate) / 1_000_000 +
    (completionTokens * completionRate) / 1_000_000 +
    (embeddingTokens * embeddingRate) / 1_000_000;

  if (
    [promptRate, completionRate, embeddingRate].some(
      (rate) => !Number.isFinite(rate) || rate < 0,
    ) ||
    (promptTokens && row.prompt_cents_per_million_tokens == null) ||
    (completionTokens && row.completion_cents_per_million_tokens == null) ||
    (embeddingTokens && row.embedding_cents_per_million_tokens == null)
  )
    return { cost_cents: null, pricing_snapshot: snapshot };
  return {
    cost_cents: Number.isFinite(cents) && cents >= 0 ? cents : null,
    pricing_snapshot: snapshot,
  };
}

/** Test-only: drop the in-memory pricing cache. */
export function _resetPricingCacheForTests(): void {
  _pricingCache = null;
  _pricingFetchedAt = 0;
}
