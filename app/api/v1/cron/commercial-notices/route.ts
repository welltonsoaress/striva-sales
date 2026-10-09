import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { ok, fail } from "@/lib/api/wrappers";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { runCommercialNotices } from "@/lib/billing/commercial-notices";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const valid = [env.INTERNAL_CRON_SECRET, env.INTERNAL_SECRET].filter(Boolean).some(secret => {
    const a = Buffer.from(provided), b = Buffer.from(secret!);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  if (!valid) return fail("forbidden", "Credencial do agendamento inválida.", 403);
  try {
    const result = await runCommercialNotices(getRequestPool());
    if (result.queued || result.sent || result.failed) await audit({ action: "billing.notices_processed", resourceType: "commercial_notice", metadata: result });
    return ok(result);
  } catch { return fail("unavailable", "Não foi possível processar os avisos comerciais.", 503); }
}
