import { env } from "@/lib/env";
import { ok, fail } from "@/lib/api/wrappers";
import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { receiveHotmart } from "@/lib/billing/receive-hotmart";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  return receiveHotmart(request, {
    hottok: env.HOTMART_HOTTOK,
    pool: getRequestPool,
    rateLimit: async () => (await checkRateLimit("billing:hotmart:ingress", 300, 60)).allowed,
    ok,
    fail,
    audit: async (organizationId, eventId, cancellation) =>
      audit({
        action: cancellation ? "billing.subscription_updated" : "billing.payment_recorded",
        actorUserId: null,
        organizationId,
        resourceType: "hotmart_event",
        resourceId: null,
        metadata: { event_id: eventId },
      }),
    onFailure: () => logger.error("billing_hotmart_processing_failed"),
  });
}
