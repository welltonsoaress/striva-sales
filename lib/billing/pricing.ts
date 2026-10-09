import type { CommercialPlan } from "./plans";

/** Uma única conta para marketing e faturamento; o total vem do catálogo. */
export function planPricing(plan: Pick<CommercialPlan, "price_cents" | "billing_interval">) {
  const months =
    plan.billing_interval === "year" ? 12 : plan.billing_interval === "semester" ? 6 : 1;
  return {
    months,
    total_cents: plan.price_cents,
    equivalent_monthly_cents:
      plan.price_cents === null ? null : Math.round(plan.price_cents / months),
  };
}

export function annualSaving(plan: CommercialPlan, plans: CommercialPlan[]) {
  if (plan.billing_interval !== "year" || plan.price_cents === null) return 0;
  const semester = plans.find((p) => p.name === plan.name && p.billing_interval === "semester");
  return semester?.price_cents == null
    ? 0
    : Math.max(0, semester.price_cents * 2 - plan.price_cents);
}
