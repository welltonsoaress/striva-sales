import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionPaywallRequired } from "@/lib/billing/journey";
import { ok, fail } from "@/lib/api/wrappers";

export async function GET() {
  const auth = await requireRole("viewer");
  if (!auth.ok) return auth.response;
  const { data, error } = await createAdminClient().from("organization_ai_accounts")
    .select("mode,state,access_until,monthly_remaining,extra_remaining,credit_meter").eq("organization_id", auth.org.orgId).maybeSingle();
  if (error) return fail("unavailable", "Não foi possível verificar o período de acesso.", 503);
  return ok({ paywall_required: !auth.user.is_platform_admin && !auth.user.support && subscriptionPaywallRequired(data) }, { headers: { "Cache-Control": "no-store" } });
}
