import { expect, it } from "vitest";
import { pricedUsage } from "./model-price";
it("custo desconhecido não é zero; cache sem tarifa permanece desconhecido", () => {
  const usage = { inputTokens: 1000, outputTokens: 100, cacheReadTokens: 0, cacheWriteTokens: 0 };
  expect(pricedUsage(null, usage)).toBeNull();
  expect(
    pricedUsage({ input: 100, output: 500, cache_read: null, cache_write: null }, usage),
  ).toBeCloseTo(0.15);
  expect(
    pricedUsage(
      { input: 100, output: 500, cache_read: null, cache_write: null },
      { ...usage, cacheReadTokens: 100 },
    ),
  ).toBeNull();
});
it("preço explicitamente gratuito é válido e não arredonda cada chamada para um centavo", () => {
  expect(
    pricedUsage(
      { input: 0, output: 0, cache_read: 0, cache_write: 0 },
      { inputTokens: 20, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
    ),
  ).toBe(0);
});
it("entrada negativa não é corrigida para um falso zero", () => {
  expect(
    pricedUsage(
      { input: 100, output: 100, cache_read: 0, cache_write: 0 },
      { inputTokens: -1, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    ),
  ).toBeNull();
});
