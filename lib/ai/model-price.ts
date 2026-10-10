import type { TokenUsage } from "@/lib/agent-engine/edge/llm/pricing";

export interface ModelPrice {
  input: number | null;
  output: number | null;
  cache_read: number | null;
  cache_write: number | null;
  verified_at?: string | null;
  source?: string | null;
  long_context?: unknown;
}

/** Não atribui tarifa de input ao cache: tarifa ausente é custo desconhecido. */
export function pricedUsage(price: ModelPrice | null, usage: TokenUsage): number | null {
  if (!price) return null;
  if (
    [usage.inputTokens, usage.outputTokens, usage.cacheReadTokens, usage.cacheWriteTokens].some(
      (tokens) => !Number.isFinite(tokens) || tokens < 0,
    )
  )
    return null;
  let inputMultiplier = 1,
    outputMultiplier = 1;
  if (price.long_context) {
    const policy = price.long_context as Record<string, unknown>;
    if (
      typeof policy.threshold !== "number" ||
      typeof policy.input_multiplier !== "number" ||
      typeof policy.output_multiplier !== "number" ||
      ![policy.threshold, policy.input_multiplier, policy.output_multiplier].every(
        (v) => Number.isFinite(v) && v > 0,
      )
    )
      return null;
    if (usage.inputTokens > policy.threshold) {
      inputMultiplier = policy.input_multiplier;
      outputMultiplier = policy.output_multiplier;
    }
  }
  const parts = [
    [
      Math.max(0, usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens),
      price.input,
      inputMultiplier,
    ],
    [usage.outputTokens, price.output, outputMultiplier],
    [usage.cacheReadTokens, price.cache_read, inputMultiplier],
    [usage.cacheWriteTokens, price.cache_write, inputMultiplier],
  ] as const;
  let cents = 0;
  for (const [tokens, rate, multiplier] of parts) {
    if (!Number.isFinite(tokens) || tokens < 0) return null;
    if (!tokens) continue;
    if (rate === null || !Number.isFinite(rate) || rate < 0) return null;
    cents += (tokens * rate * multiplier) / 1_000_000;
  }
  return cents;
}
