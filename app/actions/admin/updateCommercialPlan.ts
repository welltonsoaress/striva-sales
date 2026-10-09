"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { planUpdateSchema } from "@/lib/billing/plans";
import { requireSupportWrite } from "@/lib/impersonate/support";

export async function updateCommercialPlan(raw: unknown) {
  const denied = await requireSupportWrite();
  if (denied)
    return { ok: false as const, error: "Encerre o acompanhamento antes de editar as ofertas." };
  const parsed = planUpdateSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false as const, error: "Confira o nome, o valor e os limites do plano." };
  const { user, platformAdmin } = await requirePlatformAdmin();
  if (platformAdmin.scope !== "full")
    return { ok: false as const, error: "Seu acesso permite somente leitura." };
  const { id, ...input } = parsed.data;
  // A edição prepara a oferta; publicação e checkout dependem da homologação
  // do provedor. Não liberar uma cobrança a partir de um preço de referência.
  const { data, error } = await createAdminClient()
    .from("commercial_plans")
    .update({
      ...input,
      hotmart_offer: input.hotmart_offer ? { ...input.hotmart_offer, enabled: false } : null,
      publication_state: "draft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { ok: false as const, error: "Não foi possível salvar o plano." };
  await audit({
    action: "commercial_plan.updated",
    actorUserId: user.id,
    organizationId: null,
    resourceType: "commercial_plan",
    resourceId: id,
  });
  revalidatePath("/");
  revalidatePath("/planos");
  revalidatePath("/admin/plans");
  revalidatePath("/app/settings/billing");
  return { ok: true as const };
}
