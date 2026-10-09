"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { commercialPlanSchema } from "@/lib/billing/plans";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { processHotmartPurchase } from "@/lib/billing/process-hotmart";
import type { HotmartPurchase, HotmartCancellation } from "@/lib/billing/hotmart";
import { processHotmartCancellation } from "@/lib/billing/process-hotmart-cancellation";

/** Publicar condições comerciais é separado de habilitar uma cobrança. */
export async function publishCommercialPlan(
  planId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const denied = await requireSupportWrite();
  if (denied) return { ok: false, error: "Encerre o acompanhamento antes de editar as ofertas." };
  const { user, platformAdmin } = await requirePlatformAdmin();
  if (platformAdmin.scope !== "full")
    return { ok: false, error: "Seu acesso permite somente leitura." };
  if (!z.string().uuid().safeParse(planId).success) return { ok: false, error: "Plano inválido." };
  const db = createAdminClient();
  const current = await db.from("commercial_plans").select("*").eq("id", planId).maybeSingle();
  const parsed = commercialPlanSchema.safeParse(current.data);
  if (current.error || !parsed.success)
    return { ok: false, error: "Não foi possível consultar o plano." };
  const plan = parsed.data;
  if (
    !plan.billing_interval ||
    plan.price_cents === null ||
    [plan.limits.users, plan.limits.whatsapp_numbers, plan.limits.ai_credits].some(
      (value) => value === null,
    )
  )
    return {
      ok: false,
      error: "Defina preço, periodicidade e todos os limites antes de disponibilizar a oferta.",
    };
  const saved = await db
    .from("commercial_plans")
    .update({
      publication_state: "published",
      hotmart_offer: plan.hotmart_offer ? { ...plan.hotmart_offer, enabled: false } : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("updated_at", current.data!.updated_at)
    .select("id")
    .maybeSingle();
  if (saved.error || !saved.data)
    return { ok: false, error: "O plano mudou. Recarregue e confira as condições novamente." };
  await audit({
    action: "commercial_plan.updated",
    actorUserId: user.id,
    organizationId: null,
    resourceType: "commercial_plan",
    resourceId: planId,
    metadata: { catalog_published: true, hotmart_enabled: false },
  });
  for (const path of ["/", "/planos", "/admin/plans", "/app/settings/billing"])
    revalidatePath(path);
  return { ok: true };
}

export async function activateHotmartOffer(planId: string) {
  const denied = await requireSupportWrite();
  if (denied) return { ok: false, error: "Encerre o acompanhamento antes de editar as ofertas." };
  const { user, platformAdmin } = await requirePlatformAdmin();
  if (platformAdmin.scope !== "full")
    return { ok: false, error: "Seu acesso permite somente leitura." };
  if (!z.string().uuid().safeParse(planId).success) return { ok: false, error: "Plano inválido." };
  if (env.HOTMART_CHECKOUT_ENABLED !== "true")
    return { ok: false, error: "Pagamentos aguardam a homologação completa da integração." };
  if (!env.HOTMART_HOTTOK)
    return {
      ok: false,
      error: "Configure o segredo de recepção Hotmart antes de ativar pagamentos.",
    };
  const db = createAdminClient();
  const current = await db.from("commercial_plans").select("*").eq("id", planId).maybeSingle();
  const parsed = commercialPlanSchema.safeParse(current.data);
  if (current.error || !parsed.success || !parsed.data.hotmart_offer)
    return { ok: false, error: "Cadastre primeiro o produto, a oferta e o link de pagamento." };
  const plan = parsed.data;
  if (
    !plan.billing_interval ||
    plan.price_cents === null ||
    [plan.limits.users, plan.limits.whatsapp_numbers, plan.limits.ai_credits].some(
      (value) => value === null,
    )
  )
    return {
      ok: false,
      error: "Defina preço, periodicidade e todos os limites antes de disponibilizar a oferta.",
    };
  const saved = await db
    .from("commercial_plans")
    .update({
      publication_state: "published",
      hotmart_offer: { ...plan.hotmart_offer!, enabled: true },
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("updated_at", current.data!.updated_at)
    .select("id")
    .maybeSingle();
  if (saved.error || !saved.data)
    return { ok: false, error: "O plano mudou. Recarregue e confira as condições novamente." };
  await audit({
    action: "commercial_plan.updated",
    actorUserId: user.id,
    organizationId: null,
    resourceType: "commercial_plan",
    resourceId: planId,
    metadata: { hotmart_enabled: true },
  });
  revalidatePath("/admin/plans");
  revalidatePath("/app/settings/billing");
  return { ok: true };
}

export async function reprocessHotmartEvent(eventId: string) {
  const denied = await requireSupportWrite();
  if (denied) return { ok: false, error: "Encerre o acompanhamento para continuar." };
  const { user, platformAdmin } = await requirePlatformAdmin();
  if (platformAdmin.scope !== "full")
    return { ok: false, error: "Seu acesso permite somente leitura." };
  if (!z.string().min(1).max(100).safeParse(eventId).success)
    return { ok: false, error: "Evento inválido." };
  const event = await createAdminClient()
    .from("billing_webhook_events")
    .select("normalized, state, event")
    .eq("event_id", eventId)
    .maybeSingle();
  if (event.error || !event.data || !["unmatched", "failed"].includes(event.data.state))
    return { ok: false, error: "Este evento não tem vínculo pendente." };
  try {
    const result =
      event.data.event === "SUBSCRIPTION_CANCELLATION"
        ? await processHotmartCancellation(
            getRequestPool(),
            event.data.normalized as unknown as HotmartCancellation,
          )
        : await processHotmartPurchase(
            getRequestPool(),
            event.data.normalized as unknown as HotmartPurchase,
          );
    await audit({
      action: "billing.event_reprocessed",
      actorUserId: user.id,
      organizationId: result.organizationId,
      resourceType: "hotmart_event",
      resourceId: null,
      metadata: { event_id: eventId, state: result.state },
    });
    revalidatePath("/admin/plans");
    revalidatePath("/app/settings/billing");
    return result.state === "unmatched"
      ? {
          ok: false,
          error:
            event.data.event === "SUBSCRIPTION_CANCELLATION"
              ? "A assinatura ainda não foi vinculada à empresa por uma compra aprovada. Confira o código na Hotmart."
              : "O vínculo ainda não foi encontrado. Confira a referência e a oferta na Hotmart.",
        }
      : { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível conferir o evento. Tente novamente." };
  }
}
