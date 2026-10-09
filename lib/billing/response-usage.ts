import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { currentCreditUnits } from "./credits";
const usageSchema = z.object({
  credits: z.number().int().nonnegative(),
  messages: z.number().int().nonnegative(),
});

/** Renova antes de ler o consumo, para não misturar dois ciclos na mesma tela. */
export async function loadBillingCreditSnapshot(organizationId: string) {
  const { commercialAccountSnapshot } = await import("./managed-ai-server");
  const snapshot = await commercialAccountSnapshot(organizationId);
  const usage = await loadResponseUsage(organizationId, new Date(snapshot.checked_at));
  return { ...snapshot, usage };
}

/** A janela financeira é explícita em UTC, independente do fuso do usuário. */
export function usageMonthUtc(now: Date) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
  };
}

export async function loadResponseUsage(organizationId: string, now = new Date()) {
  const db = await createClient();
  const { data: account, error: accountError } = await db
    .from("organization_ai_accounts")
    .select("mode,period_start,period_end")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (accountError) return { available: false, total: 0, recent: [], meter: "credit_v3" as const };
  if (account?.mode === "platform" && (!account.period_start || !account.period_end))
    return { available: true, total: 0, recent: [], meter: "credit_v3" as const };
  if (account?.mode === "platform" && account.period_start && account.period_end) {
    const [total, recent] = await Promise.all([
      db.rpc("fn_ai_credit_usage", {
        p_org: organizationId,
        p_start: account.period_start,
        p_end: account.period_end,
      }),
      db
        .from("ai_credit_ledger")
        .select("id,created_at,units,credit_meter")
        .eq("organization_id", organizationId)
        .eq("kind", "debit")
        .gte("created_at", account.period_start)
        .lt("created_at", account.period_end)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const parsed = usageSchema.safeParse(total.data);
    return {
      available: !total.error && !recent.error && parsed.success,
      total: parsed.success ? parsed.data.credits : 0,
      messages: parsed.success ? parsed.data.messages : 0,
      recent: (recent.data ?? []).map((r) => ({
        id: r.id,
        accepted_at: r.created_at,
        units: currentCreditUnits(-r.units, r.credit_meter),
      })),
      meter: "credit_v3" as const,
    };
  }
  const range = usageMonthUtc(now);
  const [total, recent] = await Promise.all([
    db
      .from("ai_response_usage")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("accepted_at", range.start)
      .lt("accepted_at", range.end),
    db
      .from("ai_response_usage")
      .select("id, accepted_at, units")
      .eq("organization_id", organizationId)
      .gte("accepted_at", range.start)
      .lt("accepted_at", range.end)
      .order("accepted_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(20),
  ]);
  return {
    available: !total.error && !recent.error,
    total: total.count ?? 0,
    recent: recent.data ?? [],
    meter: "message_v1" as const,
  };
}
