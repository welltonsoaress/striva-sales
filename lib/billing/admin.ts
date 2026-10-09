import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { z } from "zod";

const metrics = z.object({
  companies: z.number(),
  trial: z.number(),
  active: z.number(),
  expired: z.number(),
  suspended: z.number(),
  legacy: z.number(),
  responses: z.number(),
  credits: z.number(),
  received_brl_cents: z.number(),
  known_cost_usd_cents: z.number().nullable(),
  measured_calls: z.number(),
  total_calls: z.number(),
  unknown_cost_calls: z.number(),
  uncertain_responses: z.number(),
  webhook_pending: z.number(),
  empty_balance: z.number(),
  offline_channels: z.number(),
  failed_jobs: z.number(),
});
export async function saasOverview() {
  await requirePlatformAdmin();
  const { data, error } = await createAdminClient().rpc("fn_admin_saas_overview");
  const parsed = metrics.safeParse(data);
  return !error && parsed.success ? parsed.data : null;
}
export async function loadAdminCommercialPlans() {
  await requirePlatformAdmin();
  const { commercialPlanSchema } = await import("./plans");
  const { data, error } = await createAdminClient()
    .from("commercial_plans")
    .select("*")
    .order("position");
  const parsed = commercialPlanSchema.array().safeParse(data);
  return !error && parsed.success
    ? { available: true as const, plans: parsed.data }
    : { available: false as const, plans: [] };
}
