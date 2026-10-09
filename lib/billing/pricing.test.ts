import { expect, it } from "vitest";
import { planPricing } from "./pricing";
it("R$297 é equivalente mensal de um contrato de R$1.782 por seis meses", () => {
  expect(planPricing({ price_cents: 178200, billing_interval: "semester" })).toEqual({
    months: 6,
    total_cents: 178200,
    equivalent_monthly_cents: 29700,
  });
  expect(planPricing({ price_cents: 284400, billing_interval: "year" })).toEqual({
    months: 12,
    total_cents: 284400,
    equivalent_monthly_cents: 23700,
  });
});
