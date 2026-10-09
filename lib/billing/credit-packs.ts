import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { hotmartOfferSchema } from "./hotmart";

const packSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  units: z.number().int().positive(),
  price_cents: z.number().int().positive().nullable(),
  currency: z.literal("BRL"),
  publication_state: z.enum(["draft", "published"]),
  hotmart_offer: hotmartOfferSchema.nullable(),
});

/** Projeção pública minimizada: nenhuma identificação administrativa da oferta sai. */
export async function loadCreditPacks() {
  try {
    const { data, error } = await createAdminClient()
      .from("ai_credit_packs")
      .select("id,name,units,price_cents,currency,publication_state,hotmart_offer")
      .or("publication_state.eq.published,slug.eq.extra-1000")
      .order("created_at");
    const parsed = packSchema.array().safeParse(data);
    if (error || !parsed.success) return { available: false as const, packs: [] };
    return {
      available: true as const,
      packs: parsed.data.map((p) => ({
        id: p.id,
        name: p.name,
        units: p.units,
        price_cents: p.price_cents,
        currency: p.currency,
        checkout_available: false,
      })),
    };
  } catch {
    return { available: false as const, packs: [] };
  }
}
