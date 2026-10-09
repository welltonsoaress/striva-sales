import { randomBytes } from "node:crypto";

import { z } from "zod";

import { requireRole } from "@/lib/auth/require-role";

import { requireSupportWrite } from "@/lib/impersonate/support";

import { sameRequestOrigin } from "@/lib/api/request-origin";

import { env } from "@/lib/env";

import { ok, fail } from "@/lib/api/wrappers";

import { createAdminClient } from "@/lib/supabase/admin";

import { commercialPlanSchema } from "@/lib/billing/plans";

import { hotmartPaymentLink } from "@/lib/billing/hotmart";

import { cookies } from "next/headers";

import { CHECKOUT_COOKIE } from "@/lib/billing/journey";

import { cookieSecure } from "@/lib/supabase/cookie-secure";

import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";

import { audit } from "@/lib/audit";

import { CREDIT_METER } from "@/lib/billing/credits";



export async function POST(request: Request) {

  const denied = await requireSupportWrite(undefined, { commercialExempt: true });

  if (denied) return denied;

  if (!sameRequestOrigin(request, env.NEXT_PUBLIC_APP_URL))

    return fail("forbidden", "Origem inválida.", 403);

  const auth = await requireRole("admin");

  if (!auth.ok) return auth.response;

  if (auth.user.support) return fail("forbidden", "Encerre o acompanhamento para contratar.", 403);

  if (!env.HOTMART_HOTTOK || env.HOTMART_CHECKOUT_ENABLED !== "true")

    return fail("unavailable", "Pagamento ainda não disponível.", 503);

  let raw: unknown;

  try {

    raw = await request.json();

  } catch {

    return fail("invalid_request", "Pedido inválido.", 400);

  }

  const parsed = z

    .union([

      z.object({ proposal_id: z.string().uuid() }).strict(),
      z.object({ plan_id: z.string().uuid() }).strict(),

      z.object({ credit_pack_id: z.string().uuid() }).strict(),

    ])

    .safeParse(raw);

  if (!parsed.success) return fail("validation_failed", "Plano inválido.", 422);

  const limit = await checkRateLimit(`billing:checkout:${auth.org.orgId}:${auth.user.id}`, 10, 60);

  if (!limit.allowed)

    return fail("rate_limited", "Aguarde um momento antes de tentar novamente.", 429);

  if ("credit_pack_id" in parsed.data)

    return fail("unavailable", "A compra de créditos extras está indisponível no momento.", 503);

  const db = createAdminClient();

  if ("proposal_id" in parsed.data) {
    const { data: proposal, error } = await db.from("billing_checkouts")
      .select("id,reference,plan_id,price_cents,offer_code,transaction_code,change_request_id")
      .eq("organization_id", auth.org.orgId).eq("id", parsed.data.proposal_id).not("change_request_id", "is", null).maybeSingle();
    if (error) return fail("unavailable", "Não foi possível conferir a proposta.", 503);
    if (!proposal?.plan_id || proposal.transaction_code) return fail("conflict", "Proposta indisponível ou já utilizada.", 409);
    const { data: recurring, error: recurringError } = await db.from("billing_contracts").select("id")
      .eq("organization_id", auth.org.orgId).not("subscriber_code", "is", null).is("cancelled_at", null).limit(1);
    if (recurringError) return fail("unavailable", "Não foi possível conferir a recorrência anterior.", 503);
    if (recurring?.length) return fail("conflict", "A recorrência anterior precisa ter o cancelamento confirmado antes de pagar a troca.", 409);
    const { data: rawPlan } = await db.from("commercial_plans").select("*").eq("id", proposal.plan_id).maybeSingle();
    const plan = commercialPlanSchema.safeParse(rawPlan);
    if (!plan.success || plan.data.publication_state !== "published" || !plan.data.hotmart_offer?.enabled || plan.data.price_cents !== proposal.price_cents || plan.data.hotmart_offer.offer_code !== proposal.offer_code)
      return fail("conflict", "As condições da oferta mudaram. Peça uma revisão à equipe da plataforma antes de pagar.", 409);
    (await cookies()).set(CHECKOUT_COOKIE, proposal.reference, { httpOnly: true, sameSite: "strict", secure: cookieSecure(), path: "/", maxAge: 7 * 86400 });
    return ok({ checkout_url: hotmartPaymentLink(plan.data.hotmart_offer, proposal.reference) });
  }
  const { data: account, error: accountError } = await db.from("organization_ai_accounts")

    .select("mode,state,access_until").eq("organization_id", auth.org.orgId).maybeSingle();

  if (accountError) return fail("unavailable", "Não foi possível consultar sua contratação.", 503);

  if (account?.mode === "platform" && account.state === "active" && account.access_until && Date.parse(account.access_until) > Date.now())

    return fail("conflict", "Você já tem um plano ativo. Solicite a troca em Faturamento para a equipe da plataforma confirmar o valor.", 409);

  const plan = await db

    .from("commercial_plans")

    .select("*")

    .eq("id", parsed.data.plan_id)

    .maybeSingle();

  const offer = commercialPlanSchema.safeParse(plan.data);

  if (plan.error) return fail("unavailable", "Não foi possível consultar o plano.", 503);

  if (

    !offer.success ||

    offer.data.publication_state !== "published" ||

    !offer.data.hotmart_offer?.enabled ||

    offer.data.price_cents === null ||

    !["semester", "year"].includes(offer.data.billing_interval ?? "") ||

    offer.data.limits.ai_credits === null ||

    offer.data.limits.users === null ||

    offer.data.limits.whatsapp_numbers === null

  )

    return fail("conflict", "Esta oferta ainda está em preparação.", 409);

  const reference = randomBytes(12).toString("hex");

  const { error } = await db.from("billing_checkouts").insert({

    organization_id: auth.org.orgId,

    created_by: auth.user.id,

    reference,

    plan_id: offer.data.id,

    limits_snapshot: offer.data.limits,

    credit_meter: CREDIT_METER,

    product_ucode: offer.data.hotmart_offer.product_ucode,

    offer_code: offer.data.hotmart_offer.offer_code,

    price_cents: offer.data.price_cents,

    billing_interval: offer.data.billing_interval,

    currency: "BRL",

  });

  if (error) return fail("unavailable", "Não foi possível preparar o pagamento.", 503);

  await audit({

    action: "billing.checkout_created",

    actorUserId: auth.user.id,

    organizationId: auth.org.orgId,

    resourceType: "commercial_plan",

    resourceId: offer.data.id,

  });

  (await cookies()).set(CHECKOUT_COOKIE, reference, {

    httpOnly: true, sameSite: "strict", secure: cookieSecure(), path: "/", maxAge: 7 * 86400,

  });

  return ok({ checkout_url: hotmartPaymentLink(offer.data.hotmart_offer, reference) });

}
