import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { CHECKOUT_COOKIE } from "@/lib/billing/journey";

export const dynamic = "force-dynamic";
export async function GET() {
  const auth = await requireRole("admin");
  if (!auth.ok) return auth.response;
  if (auth.user.support) return fail("forbidden", "Encerre o acompanhamento para consultar o pagamento.", 403);
  const reference = (await cookies()).get(CHECKOUT_COOKIE)?.value;
  if (!reference || !/^[a-f0-9]{24}$/.test(reference)) return ok({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
  const db = createAdminClient();
  const { data: checkout, error } = await db.from("billing_checkouts").select("id,transaction_code")
    .eq("organization_id", auth.org.orgId).eq("reference", reference).maybeSingle();
  if (error) return fail("unavailable", "Não foi possível conferir o pagamento.", 503);
  if (!checkout?.transaction_code) return ok({ status: "pending" }, { headers: { "Cache-Control": "no-store" } });
  const { data: payment, error: paymentError } = await db.from("billing_payments").select("status")
    .eq("organization_id", auth.org.orgId).eq("transaction_code", checkout.transaction_code).maybeSingle();
  if (paymentError) return fail("unavailable", "Não foi possível conferir o pagamento.", 503);
  const { data: account, error: accountError } = await db.from("organization_ai_accounts").select("mode,state,access_until")
    .eq("organization_id", auth.org.orgId).maybeSingle();
  if (accountError) return fail("unavailable", "Não foi possível conferir a ativação.", 503);
  const confirmed = ["APPROVED", "COMPLETE"].includes(payment?.status ?? "") &&
    (account?.mode === "legacy" || (account?.state === "active" && !!account.access_until && Date.parse(account.access_until) > Date.now()));
  const response = ok({ status: confirmed ? "confirmed" : ["REFUNDED", "CHARGEBACK", "CANCELLED", "EXPIRED"].includes(payment?.status ?? "") ? "reversed" : "pending" });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
