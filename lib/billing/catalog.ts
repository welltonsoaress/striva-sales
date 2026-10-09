import { createClient } from "@/lib/supabase/server";

import { commercialPlanSchema } from "./plans";

export async function loadCommercialPlans() {
  const db = await createClient();

  const { data, error } = await db.from("commercial_plans").select("id,slug,name,description,price_cents,currency,billing_interval,recommended,limits,position,publication_state,checkout_available").order("position");

  if (error) return { available: false as const, plans: [] };

  const parsed = commercialPlanSchema.array().safeParse(data);

  return parsed.success
    ? { available: true as const, plans: parsed.data }
    : { available: false as const, plans: [] };
}

/** Catálogo comercial público: leitura no servidor, sem expor credenciais. */

export async function loadPublicCommercialPlans() {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");

    const result = await createAdminClient()
      .from("commercial_plans")
      .select("id,slug,name,description,price_cents,currency,billing_interval,recommended,limits,position,publication_state,checkout_available")
      .eq("publication_state", "published")
      .order("position");

    const parsed = commercialPlanSchema.array().safeParse(result.data);

    return !result.error && parsed.success
      ? { available: true as const, plans: parsed.data }
      : { available: false as const, plans: [] };
  } catch {
    return { available: false as const, plans: [] };
  }
}
