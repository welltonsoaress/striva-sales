import { describe, expect, it } from "vitest";
import { selectedPlanHint, planHintFromDestination, subscriptionPaywallRequired } from "./journey";

describe("preferências e liberação comercial", () => {
  const id = "00000000-0000-4000-8000-000000000001";
  it("preserva apenas uma preferência válida e interna de plano", () => {
    expect(planHintFromDestination(`/app/settings/billing?plan=${id}`)).toBe(id);
    expect(planHintFromDestination(`https://example.com/app/settings/billing?plan=${id}`)).toBeUndefined();
    expect(selectedPlanHint("admin")).toBeUndefined();
  });
  it("bloqueia teste vencido ou sem créditos e preserva legado e teste não iniciado", () => {
    const current = { mode: "platform", state: "trial", access_until: "2026-10-10T00:00:00Z", monthly_remaining: 1000 };
    const now = Date.parse("2026-10-09T00:00:00Z");
    expect(subscriptionPaywallRequired(current, now)).toBe(false);
    expect(subscriptionPaywallRequired({ ...current, monthly_remaining: 9 }, now)).toBe(true);
    expect(subscriptionPaywallRequired(current, Date.parse(current.access_until))).toBe(true);
    expect(subscriptionPaywallRequired({ ...current, mode: "legacy" }, Date.parse(current.access_until))).toBe(false);
    expect(subscriptionPaywallRequired({ ...current, state: "pending", monthly_remaining: 0 }, now)).toBe(false);
  });
});
