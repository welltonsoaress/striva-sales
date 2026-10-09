import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { sameRequestOrigin } from "@/lib/api/request-origin";
import { env } from "@/lib/env";
import { ok, fail } from "@/lib/api/wrappers";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { preparePlanChangeCheckout } from "@/lib/billing/plan-change-checkout";
import { SupportWriteError } from "@/lib/help/support-store";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const denied = await requireSupportWrite(undefined, { commercialExempt: true });
  if (denied) return denied;
  if (!sameRequestOrigin(request, env.NEXT_PUBLIC_APP_URL)) return fail("forbidden", "Origem inválida.", 403);
  const { user, platformAdmin } = await requirePlatformAdmin();
  if (platformAdmin.scope !== "full") return fail("forbidden", "Acesso somente leitura.", 403);
  const input = z.object({ thread_id: z.string().uuid(), conditions_confirmed: z.literal(true) }).strict().safeParse(await request.json().catch(() => null));
  if (!input.success) return fail("validation_failed", "Confirme as condições antes de enviar a proposta.", 422);
  if (env.HOTMART_CHECKOUT_ENABLED !== "true" || !env.HOTMART_HOTTOK) return fail("unavailable", "As ofertas ainda aguardam homologação.", 503);
  try {
    const result = await preparePlanChangeCheckout(getRequestPool(), input.data.thread_id, user.id);
    if (!result.duplicate) await audit({ action: "billing.change_quote_created", actorUserId: user.id, organizationId: result.organization_id,
      resourceType: "support_thread", resourceId: input.data.thread_id,
    });
    return ok({ checkout_url: result.checkout_url, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof SupportWriteError) return fail(error.code, error.message, error.code === "conflict" ? 409 : 404);
    return fail("unavailable", "Não foi possível preparar a proposta.", 503);
  }
}
