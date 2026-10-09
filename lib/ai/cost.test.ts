import { beforeEach, expect, it, vi } from "vitest";
const { rows } = vi.hoisted(() => ({ rows: [] as Array<Record<string, unknown>> }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let provider: string | null = null;
      const query = {
        select: () => query,
        in: () => query,
        is: () => query,
        limit: () => query,
        eq: (_key: string, value: string) => {
          provider = value;
          return query;
        },
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve({
            error: null,
            data:
              table === "ai_pricing"
                ? []
                : rows.filter((r) => !provider || r.provider === provider),
          }).then(resolve),
      };
      return query;
    },
  }),
}));
import { _resetPricingCacheForTests, computeCostDetails } from "./cost";
beforeEach(() => {
  rows.length = 0;
  _resetPricingCacheForTests();
});
const price = {
  provider: "openai",
  model_id: "qa-model",
  input_price_per_million_cents: 500,
  output_price_per_million_cents: 1500,
  pricing_source: "https://example.invalid/fixture",
};
it("registra a mesma tarifa que calculou o custo fracionário", async () => {
  rows.push(price);
  const result = await computeCostDetails({
    provider: "openai",
    model: "qa-model",
    promptTokens: 20,
    completionTokens: 10,
  });
  expect(result.cost_cents).toBeCloseTo(0.025);
  expect(result.pricing_snapshot).toMatchObject({
    provider: "openai",
    input: 500,
    output: 1500,
    source: price.pricing_source,
  });
});
it("mesmo modelo em dois provedores não escolhe preço arbitrário", async () => {
  rows.push(price, { ...price, provider: "openrouter", input_price_per_million_cents: 900 });
  expect(
    (await computeCostDetails({ model: "qa-model", promptTokens: 1000 })).cost_cents,
  ).toBeNull();
  expect(
    (await computeCostDetails({ provider: "openai", model: "qa-model", promptTokens: 1000 }))
      .cost_cents,
  ).toBe(0.5);
});
it("tarifa parcial ausente permanece desconhecida quando houve uso", async () => {
  rows.push({ ...price, output_price_per_million_cents: null });
  expect(
    (
      await computeCostDetails({
        provider: "openai",
        model: "qa-model",
        promptTokens: 1000,
        completionTokens: 1,
      })
    ).cost_cents,
  ).toBeNull();
});
it("preço explicitamente gratuito difere de ausência de preço", async () => {
  rows.push({ ...price, input_price_per_million_cents: 0, output_price_per_million_cents: 0 });
  expect(
    (await computeCostDetails({ provider: "openai", model: "qa-model", promptTokens: 1000 }))
      .cost_cents,
  ).toBe(0);
  rows.length = 0;
  expect(
    (await computeCostDetails({ provider: "openai", model: "qa-model", promptTokens: 1000 }))
      .cost_cents,
  ).toBeNull();
});
it("uso ausente ou inválido nunca aparece como custo conhecido", async () => {
  rows.push(price);
  for (const usage of [
    {},
    { promptTokens: -1, completionTokens: 20 },
    { promptTokens: Number.NaN },
  ]) {
    expect(
      (await computeCostDetails({ provider: "openai", model: "qa-model", ...usage })).cost_cents,
    ).toBeNull();
  }
  rows[0] = { ...price, input_price_per_million_cents: -1 };
  expect(
    (
      await computeCostDetails({
        provider: "openai",
        model: "qa-model",
        promptTokens: 1,
        completionTokens: 20,
      })
    ).cost_cents,
  ).toBeNull();
});
