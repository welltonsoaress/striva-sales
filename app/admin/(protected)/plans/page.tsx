import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { loadAdminCommercialPlans } from "@/lib/billing/admin";
import { PlansEditor } from "./_client";
import { HotmartReceipts } from "./_hotmart";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planos comerciais" };

export default async function PlansPage() {
  const { platformAdmin } = await requirePlatformAdmin();
  const catalog = await loadAdminCommercialPlans();
  const receipts = await createAdminClient()
    .from("billing_webhook_events")
    .select("event_id, event, state, reason, received_at")
    .order("received_at", { ascending: false })
    .limit(30);
  return (
    <>
      <PlansEditor catalog={catalog} readOnly={platformAdmin.scope !== "full"} />
      <div className="mx-auto max-w-4xl px-6">
        <HotmartReceipts
          configured={!!env.HOTMART_HOTTOK}
          checkoutEnabled={env.HOTMART_CHECKOUT_ENABLED === "true"}
          available={!receipts.error}
          events={receipts.data ?? []}
          readOnly={platformAdmin.scope !== "full"}
        />
      </div>
    </>
  );
}
