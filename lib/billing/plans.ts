import { z } from "zod";
import { hotmartOfferSchema } from "./hotmart";

export const planLimitsSchema = z.object({
  users: z.number().int().positive().nullable().default(null),
  whatsapp_numbers: z.number().int().positive().nullable().default(null),
  ai_credits: z.number().int().nonnegative().nullable().default(null),
  ai_credits_period: z.literal("month").default("month"),
});
export const commercialPlanSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500),
  price_cents: z.number().int().nonnegative().nullable(),
  currency: z.literal("BRL"),
  billing_interval: z.enum(["month", "semester", "year"]).nullable(),
  recommended: z.boolean(),
  limits: planLimitsSchema,
  position: z.number().int(),
  publication_state: z.enum(["draft", "published"]),
  hotmart_offer: hotmartOfferSchema.nullable().default(null),
  checkout_available: z.boolean().nullable().optional().default(false),
});
export type CommercialPlan = z.infer<typeof commercialPlanSchema>;
export const planUpdateSchema = commercialPlanSchema.omit({
  slug: true,
  currency: true,
  position: true,
  publication_state: true,
  checkout_available: true,
});

export function formatPlanPrice(
  plan: Pick<CommercialPlan, "price_cents" | "billing_interval">,
  locale = "pt-BR",
) {
  if (plan.price_cents === null) return null;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
    plan.price_cents / 100,
  );
}
