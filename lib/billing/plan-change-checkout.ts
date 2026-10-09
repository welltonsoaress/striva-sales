import type { Pool } from "pg";
import { randomBytes, randomUUID } from "node:crypto";
import { commercialPlanSchema, formatPlanPrice } from "./plans";
import { CREDIT_METER } from "./credits";
import { SupportWriteError } from "@/lib/help/support-store";

/** Só a plataforma oferece a troca; o pagamento continua conferido pelo webhook. */
export async function preparePlanChangeCheckout(pool: Pool, threadId: string, actorId: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const thread = (await client.query<{ organization_id: string; created_by: string; assigned_to: string | null; status: string }>(
      "select organization_id,created_by,assigned_to,status from platform_support_threads where id=$1 for update", [threadId])).rows[0];
    if (!thread) throw new SupportWriteError("not_found", "Solicitação não encontrada.");
    if (thread.assigned_to !== actorId || thread.status !== "human_active")
      throw new SupportWriteError("conflict", "Assuma o chamado antes de confirmar as condições.");
    const request = (await client.query<{ metadata: { plan_id: string; intent: string } }>(
      "select metadata from api_audit_log where organization_id=$1 and resource_id=$2 and action='billing.change_requested' order by created_at desc limit 1", [thread.organization_id, threadId])).rows[0];
    if (!request?.metadata.plan_id || request.metadata.intent !== "change")
      throw new SupportWriteError("conflict", "Este chamado não contém uma solicitação de troca de plano.");
    const rawPlan = (await client.query("select * from commercial_plans where id=$1", [request.metadata.plan_id])).rows[0];
    if (rawPlan) rawPlan.price_cents = rawPlan.price_cents === null ? null : Number(rawPlan.price_cents);
    const parsed = commercialPlanSchema.safeParse(rawPlan);
    if (!parsed.success || parsed.data.publication_state !== "published" || !parsed.data.hotmart_offer?.enabled ||
      parsed.data.price_cents === null || !["semester", "year"].includes(parsed.data.billing_interval ?? "") ||
      parsed.data.limits.ai_credits === null || parsed.data.limits.users === null || parsed.data.limits.whatsapp_numbers === null)
      throw new SupportWriteError("conflict", "A oferta precisa estar homologada e liberada antes de enviar uma proposta.");
    const plan = parsed.data, offer = plan.hotmart_offer!;
    const existing = (await client.query<{ id: string; reference: string; plan_id: string; price_cents: string; offer_code: string }>("select id,reference,plan_id,price_cents,offer_code from billing_checkouts where organization_id=$1 and change_request_id=$2", [thread.organization_id, threadId])).rows[0];
    if (existing) {
      if (existing.plan_id !== plan.id || Number(existing.price_cents) !== plan.price_cents || existing.offer_code !== offer.offer_code)
        throw new SupportWriteError("conflict", "As condições da oferta mudaram. Revise e abra uma nova solicitação antes de cobrar.");
      await client.query("commit"); return { checkout_url: `/app/settings/billing?proposal=${existing.id}`, duplicate: true, organization_id: thread.organization_id };
    }
    const recurring = await client.query("select 1 from billing_contracts where organization_id=$1 and subscriber_code is not null and cancelled_at is null limit 1", [thread.organization_id]);
    if (recurring.rows.length) throw new SupportWriteError("conflict", "Confirme primeiro o cancelamento da recorrência anterior no processador e aguarde o webhook. O período já pago permanece preservado.");
    const reference = randomBytes(12).toString("hex");
    const checkoutId = randomUUID();
    await client.query(`insert into billing_checkouts(organization_id,created_by,reference,plan_id,product_ucode,offer_code,price_cents,currency,billing_interval,limits_snapshot,credit_meter,change_request_id,id)
      values($1,$2,$3,$4,$5,$6,$7,'BRL',$8,$9,$10,$11,$12)`, [thread.organization_id,thread.created_by,reference,plan.id,offer.product_ucode,offer.offer_code,plan.price_cents,plan.billing_interval,plan.limits,CREDIT_METER,threadId,checkoutId]);
    const url = `/app/settings/billing?proposal=${checkoutId}`;
    const body = `Condições da troca: ${plan.name}, ${plan.billing_interval === "year" ? "1 ano" : "6 meses"}. Total do novo período: ${formatPlanPrice(plan, "pt-BR")}. Não há rateio automático. Confira as condições antes de pagar. A troca será efetivada após a confirmação do pagamento.\n${url}`;
    await client.query(`insert into platform_support_messages(organization_id,thread_id,client_message_id,author_kind,author_user_id,body)
      values($1,$2,$3,'human',$4,$5)`, [thread.organization_id,threadId,randomUUID(),actorId,body]);
    await client.query("commit");
    return { checkout_url: url, duplicate: false, organization_id: thread.organization_id };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
}
