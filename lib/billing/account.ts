import { createClient } from "@/lib/supabase/server";

export async function loadBillingAccount(organizationId: string) {
  const db = await createClient();
  const [contracts, payments] = await Promise.all([
    db
      .from("billing_contracts")
      .select(
        "id, checkout_id, subscription_status, next_charge_at, last_event_at, cancelled_at, access_until",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("billing_payments")
      .select("id, transaction_code, amount_cents, currency, status, last_event_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  // Consultar todo o histórico atingia o limite de linhas da API e perdia o
  // vínculo dos contratos recentes de empresas com muitos checkouts antigos.
  const checkoutIds = [...new Set((contracts.data ?? []).map((row) => row.checkout_id))];
  const checkouts = checkoutIds.length
    ? await db
        .from("billing_checkouts")
        .select("id, plan_id")
        .eq("organization_id", organizationId)
        .in("id", checkoutIds)
    : { data: [], error: null };
  const planIds = new Map((checkouts.data ?? []).map((row) => [row.id, row.plan_id]));
  return {
    available: !contracts.error && !payments.error && !checkouts.error,
    contracts: (contracts.data ?? []).map((row) => ({
      ...row,
      plan_id: planIds.get(row.checkout_id) ?? null,
    })),
    payments: payments.data ?? [],
  };
}
