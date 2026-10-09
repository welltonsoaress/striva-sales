import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { countAs, sql } from "./gov-helpers";
import { processHotmartPurchase } from "@/lib/billing/process-hotmart";
import { CREDIT_METER } from "@/lib/billing/credits";

vi.mock("@/lib/email/resend", () => ({ isEmailConfigured: () => false, sendEmail: vi.fn() }));
vi.mock("@/lib/branding/saida", () => ({ marcaDaSaida: vi.fn() }));
import { runCommercialNotices } from "@/lib/billing/commercial-notices";
import { preparePlanChangeCheckout } from "@/lib/billing/plan-change-checkout";

const pool = new pg.Pool({ connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT}/postgres` });
afterAll(() => pool.end());
const a = randomUUID(), b = randomUUID(), ua = randomUUID(), ub = randomUUID(), credential = randomUUID();
beforeAll(async () => {
  await pool.query("insert into auth.users(id,email,email_confirmed_at) values($1,'a@journey.test',now()),($2,'b@journey.test',now())", [ua, ub]);
  await pool.query("insert into organizations(id,slug,display_name,legal_name,signup_origin) values($1::uuid,$1::text,'Empresa A fictícia','Empresa A fictícia','self_service'),($2::uuid,$2::text,'Empresa B fictícia','Empresa B fictícia','self_service')", [a, b]);
  await pool.query("insert into user_organizations(organization_id,user_id,role,accepted_at) values($1,$2,'admin',now()),($3,$4,'admin',now())", [a, ua, b, ub]);
  await pool.query("insert into ai_provider_credentials(id,organization_id,provider,label,api_key_encrypted,api_key_iv,api_key_tag,api_key_last4) values($1,$2,'openai','Fictícia','\\x01','\\x01','\\x01','0000')", [credential, a]);
});

it("novos vínculos recebem navegação simples sem reescrever o legado", async () => {
  expect((await pool.query("select interface_settings from user_organizations where organization_id=$1", [a])).rows[0].interface_settings).toEqual({ preset: "simplificada" });
});

it("admin de tenant não troca nem remove credencial por API direta do banco", async () => {
  expect(() => sql(`set role authenticated; select set_config('request.jwt.claims','{"sub":"${ua}"}',false); update ai_provider_credentials set label='Adulterada' where id='${credential}';`)).toThrow(/permission denied/);
  expect(() => sql(`set role authenticated; select set_config('request.jwt.claims','{"sub":"${ua}"}',false); delete from ai_provider_credentials where id='${credential}';`)).toThrow(/permission denied/);
  const agent = randomUUID(), version = randomUUID(), channel = randomUUID();
  await pool.query("insert into channel_sessions(id,organization_id,display_name,waha_session_name,webhook_secret_encrypted,status) values($1,$2,'Canal fictício',$3,$4,'WORKING')", [channel,a,`qa-${agent}`,Buffer.from([1])]);
  await pool.query("insert into ai_agents(id,organization_id,name,model,system_prompt,kind) values($1,$2,'Agente fictício','openai/qa','Atendimento fictício','mcp_agent')", [agent,a]);
  await pool.query("insert into ai_agent_versions(id,organization_id,agent_id,version_number,system_prompt,provider,model,credential_id,channel_session_id) values($1,$2,$3,1,'Atendimento fictício','openai','qa',$4,$5)", [version,a,agent,credential,channel]);
  expect(() => sql(`set role authenticated; select set_config('request.jwt.claims','{"sub":"${ua}"}',false); update ai_agent_versions set credential_id=null where id='${version}';`)).toThrow(/ai_credentials_platform_only/);
  expect(() => sql(`set role authenticated; select set_config('request.jwt.claims','{"sub":"${ua}"}',false); update ai_agent_versions set system_prompt='Atendimento editado' where id='${version}';`)).not.toThrow();
});

it("avisos concorrentes são duráveis e isolados entre empresas, mesmo sem e-mail configurado", async () => {
  await pool.query("update organization_ai_accounts set state='trial',access_until=now()+interval '12 hours',monthly_remaining=1000 where organization_id in($1,$2)", [a,b]);
  const results = await Promise.all([runCommercialNotices(pool), runCommercialNotices(pool)]);
  expect(results.reduce((n,r) => n+r.queued,0)).toBe(2);
  expect((await pool.query("select count(*)::int as count from commercial_notices")).rows[0].count).toBe(2);
  expect(countAs(ua, `select count(*) from commercial_notices where organization_id='${a}'`)).toBe(1);
  expect(countAs(ua, `select count(*) from commercial_notices where organization_id='${b}'`)).toBe(0);
  expect(() => sql(`set role authenticated; select set_config('request.jwt.claims','{"sub":"${ua}"}',false); update commercial_notices set delivered_at=now() where organization_id='${a}';`)).toThrow(/permission denied/);
  expect((await runCommercialNotices(pool)).queued).toBe(0);
});

it("contratação encerra e resolve lembretes de teste já superados", async () => {
  await pool.query("update organization_ai_accounts set state='active',access_until=now()+interval '1 year' where organization_id=$1", [a]);
  await runCommercialNotices(pool);
  expect((await pool.query("select cancelled_at,error_code from commercial_notices where organization_id=$1", [a])).rows[0]).toMatchObject({ error_code: "superseded" });
  expect((await pool.query("select status from agent_inbox_items where organization_id=$1 and kind='commercial_reminder'", [a])).rows[0].status).toBe("resolved");
});

it("as seis ofertas concedem franquia e período próprios uma vez, com dados financeiros fictícios", async () => {
  const plans = (await pool.query("select * from commercial_plans where publication_state='published' and billing_interval in('semester','year') order by position")).rows;
  expect(plans).toHaveLength(6);
  for (const plan of plans) {
    const org = randomUUID(), reference = randomUUID().replaceAll("-","").slice(0,24);
    await pool.query("insert into organizations(id,slug,display_name,legal_name,signup_origin) values($1::uuid,$1::text,'Oferta fictícia','Oferta fictícia','self_service')", [org]);
    await pool.query(`insert into billing_checkouts(organization_id,created_by,reference,plan_id,product_ucode,offer_code,price_cents,currency,billing_interval,limits_snapshot,credit_meter)
      values($1,$2,$3,$4,$5,$6,$7,'BRL',$8,$9,$10)`, [org,ua,reference,plan.id,plan.hotmart_offer.product_ucode,plan.hotmart_offer.offer_code,plan.price_cents,plan.billing_interval,plan.limits,CREDIT_METER]);
    const event = { event_id: randomUUID(), event: "PURCHASE_APPROVED", occurred_at: new Date().toISOString(),
      product_ucode: plan.hotmart_offer.product_ucode, offer_code: plan.hotmart_offer.offer_code, transaction: randomUUID(),
      amount_cents: Number(plan.price_cents), currency: "BRL", status: "APPROVED", reference,
      subscriber_code: randomUUID(), subscription_status: "ACTIVE", next_charge_at: null };
    expect((await processHotmartPurchase(pool,event)).state).toBe("applied");
    expect((await processHotmartPurchase(pool,event)).state).toBe("duplicate");
    const account = (await pool.query("select * from organization_ai_accounts where organization_id=$1", [org])).rows[0];
    expect(account.plan_id).toBe(plan.id);
    expect(Number(account.monthly_allowance)).toBe(plan.limits.ai_credits);
    expect(Number(account.monthly_remaining)).toBe(plan.limits.ai_credits);
    const months = plan.billing_interval === "semester" ? 6 : 12;
    const paidUntil = new Date(event.occurred_at); paidUntil.setUTCMonth(paidUntil.getUTCMonth()+months);
    expect(new Date(account.access_until).getTime()).toBe(paidUntil.getTime());
  }
});

it("proposta de upgrade exige encerrar a recorrência anterior e não muda plano sem pagamento", async () => {
  const thread = randomUUID(), actor = randomUUID();
  await pool.query("insert into auth.users(id,email) values($1,'operator@journey.test')", [actor]);
  const plan = (await pool.query("select * from commercial_plans where slug='pro' limit 1")).rows[0];
  await pool.query("update commercial_plans set hotmart_offer=jsonb_set(hotmart_offer,'{enabled}','true') where id=$1", [plan.id]);
  await pool.query("insert into platform_support_threads(id,organization_id,created_by,status,assigned_to) values($1,$2,$3,'human_active',$4)", [thread,a,ua,actor]);
  await pool.query("insert into api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata) values($1,$2,'billing.change_requested','support_thread',$3,$4)", [a,ua,thread,{ intent: "change", plan_id: plan.id }]);
  const oldCheckout = randomUUID();
  await pool.query("insert into billing_checkouts(id,organization_id,created_by,reference,product_ucode,offer_code,price_cents,plan_id) values($1,$2,$3,$4,$5,'old-plan',1000,$6)", [oldCheckout,a,ua,randomUUID().replaceAll('-','').slice(0,24),plan.hotmart_offer.product_ucode,plan.id]);
  await pool.query("insert into billing_contracts(organization_id,checkout_id,external_key,subscriber_code,subscription_status,last_event_at) values($1,$2,$3,$3,'ACTIVE',now())", [a,oldCheckout,randomUUID()]);
  await expect(preparePlanChangeCheckout(pool,thread,actor)).rejects.toThrow("recorrência anterior");
  await pool.query("update billing_contracts set cancelled_at=now(),subscription_status='CANCELLED' where organization_id=$1 and checkout_id=$2", [a,oldCheckout]);
  const before = (await pool.query("select plan_id,monthly_remaining from organization_ai_accounts where organization_id=$1", [a])).rows[0];
  const proposals = await Promise.all([preparePlanChangeCheckout(pool,thread,actor),preparePlanChangeCheckout(pool,thread,actor)]);
  expect(proposals.filter(p => p.duplicate)).toHaveLength(1);
  expect(new Set(proposals.map(p => p.checkout_url)).size).toBe(1);
  expect(proposals[0].checkout_url).toMatch(/^\/app\/settings\/billing\?proposal=/);
  expect((await pool.query("select plan_id,monthly_remaining from organization_ai_accounts where organization_id=$1", [a])).rows[0]).toEqual(before);
  const checkout = (await pool.query("select * from billing_checkouts where organization_id=$1 and change_request_id=$2", [a,thread])).rows[0];
  expect((await processHotmartPurchase(pool, { event_id: randomUUID(), event: "PURCHASE_APPROVED", occurred_at: new Date().toISOString(),
    product_ucode: checkout.product_ucode, offer_code: checkout.offer_code, transaction: randomUUID(), amount_cents: Number(checkout.price_cents),
    currency: "BRL", status: "APPROVED", reference: checkout.reference, subscriber_code: randomUUID(), subscription_status: "ACTIVE", next_charge_at: null })).state).toBe("applied");
  expect((await pool.query("select plan_id from organization_ai_accounts where organization_id=$1", [a])).rows[0].plan_id).toBe(plan.id);
});
