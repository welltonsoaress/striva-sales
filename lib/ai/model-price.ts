import type { TokenUsage } from "@/lib/agent-engine/edge/llm/pricing";

export interface ModelPrice {
  input: number | null;
  output: number | null;
  cache_read: number | null;
  cache_write: number | null;
  verified_at?: string | null;
  source?: string | null;
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
  const parts = [
    [Math.max(0, usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens), price.input],
    [usage.outputTokens, price.output],
    [usage.cacheReadTokens, price.cache_read],
    [usage.cacheWriteTokens, price.cache_write],
  ] as const;
  let cents = 0;
  for (const [tokens, rate] of parts) {
    if (!Number.isFinite(tokens) || tokens < 0) return null;
    if (!tokens) continue;
    if (rate === null || !Number.isFinite(rate) || rate < 0) return null;
    cents += (tokens * rate) / 1_000_000;
  }
  return cents;
}
