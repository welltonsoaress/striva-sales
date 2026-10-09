import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { sameRequestOrigin } from "@/lib/api/request-origin";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";
import { getRequestPool } from "@/lib/agent-engine/db/request-pool";
import { recordSupportRequest, SupportWriteError } from "@/lib/help/support-store";
import { audit } from "@/lib/audit";

const inputSchema = z.object({ request_id: z.string().uuid(), plan_id: z.string().uuid().optional(),
  intent: z.enum(["change", "cancel", "renew"]) }).strict();

/** Um pedido humano; não inicia cobrança, não calcula rateio e não troca permissões. */
export async function POST(request: Request) {
  const denied = await requireSupportWrite(undefined, { commercialExempt: true });
  if (denied) return denied;
  if (!sameRequestOrigin(request, env.NEXT_PUBLIC_APP_URL)) return fail("forbidden", "Origem inválida.", 403);
  const auth = await requireRole("admin");
  if (!auth.ok) return auth.response;
  if (auth.user.support) return fail("forbidden", "Encerre o acompanhamento para fazer uma solicitação.", 403);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.intent === "change" && !parsed.data.plan_id))
    return fail("validation_failed", "Confira a solicitação.", 422);
  const limit = await checkRateLimit(`billing:change:${auth.org.orgId}:${auth.user.id}`, 6, 3600);
  if (!limit.allowed) return fail("rate_limited", "Aguarde antes de enviar outra solicitação.", 429);
  const db = createAdminClient();
  let target = "";
  if (parsed.data.plan_id) {
    const { data: plan, error } = await db.from("commercial_plans").select("id,name,billing_interval")
      .eq("id", parsed.data.plan_id).eq("publication_state", "published").maybeSingle();
    if (error) return fail("unavailable", "Não foi possível conferir o plano.", 503);
    if (!plan) return fail("not_found", "Plano não disponível.", 404);
    target = `${plan.name} (${plan.billing_interval === "year" ? "1 ano" : "6 meses"}), oferta ${plan.id}`;
  }
  const intent = { change: "Troca de plano", cancel: "Cancelamento", renew: "Renovação" }[parsed.data.intent];
  try {
    const result = await recordSupportRequest(getRequestPool(), {
      organizationId: auth.org.orgId, userId: auth.user.id, threadId: parsed.data.request_id,
      messageId: parsed.data.request_id, action: "handoff",
      body: `${intent}${target ? `: ${target}` : ""}. Solicito atendimento da equipe da plataforma para confirmar as condições antes de qualquer cobrança ou alteração.`,
    });
    if (!result.duplicate) await audit({ action: "billing.change_requested", actorUserId: auth.user.id,
      organizationId: auth.org.orgId, resourceType: "platform_support_thread", resourceId: parsed.data.request_id,
      metadata: { intent: parsed.data.intent, plan_id: parsed.data.plan_id ?? null } });
    return ok({ thread_id: parsed.data.request_id, status: result.status });
  } catch (error) {
    if (error instanceof SupportWriteError) return fail(error.code, error.message, error.code === "conflict" ? 409 : 404);
    return fail("unavailable", "Não foi possível enviar o pedido. Tente novamente.", 503);
  }
}
