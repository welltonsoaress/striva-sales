import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { processHotmartPurchase } from "../../lib/billing/process-hotmart";
import type { HotmartPurchase } from "../../lib/billing/hotmart";
const pool = new pg.Pool({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT}/postgres`,
  max: 12,
});
beforeAll(async () => {
  await pool.query(
    "update platform_ai_settings set enabled=true,provider='openai',model='synthetic',requests_per_minute=1000",
  );
});
afterAll(() => pool.end());
async function company(monthly = 10, extra = 0) {
  const org = randomUUID(),
    user = randomUUID();
  await pool.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [
    user,
    `${user}@credits.test`,
  ]);
  await pool.query(
    "insert into organizations(id,slug,display_name,legal_name,signup_origin) values($1,$2,'Empresa fictícia','Empresa fictícia','self_service')",
    [org, `credit-${org}`],
  );
  await pool.query(
    "insert into user_organizations(organization_id,user_id,role,accepted_at) values($1,$2,'admin',now())",
    [org, user],
  );
  await pool.query(
    "update organization_ai_accounts set state='active',anchor_at=now(),access_until=now()+interval '1 year',period_start=now(),period_end=now()+interval '1 month',monthly_allowance=$2,monthly_remaining=$2,extra_remaining=$3 where organization_id=$1",
    [org, monthly, extra],
  );
  return { org, user };
}
async function balance(org: string) {
  return (
    await pool.query(
      "select monthly_remaining,extra_remaining,extra_debt,monthly_allowance,credit_meter from organization_ai_accounts where organization_id=$1",
      [org],
    )
  ).rows[0];
}
async function reserve(org: string, ref = randomUUID()) {
  return (await pool.query("select fn_ai_reserve($1,$2) id", [org, ref])).rows[0].id as string;
}
async function settle(org: string, id: string, release = false) {
  return (await pool.query("select fn_ai_settle($1,$2,$3) state", [org, id, release])).rows[0]
    .state;
}
it("dez reservas concorrentes com dez créditos autorizam uma única mensagem", async () => {
  const { org } = await company(),
    ref = randomUUID();
  const results = await Promise.allSettled(
    Array.from({ length: 10 }, (_, i) => reserve(org, `${ref}-${i}`)),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const chosen = (results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<string>)
    .value;
  const row = (
    await pool.query(
      "select reference,units from ai_response_reservations where organization_id=$1 and id=$2",
      [org, chosen],
    )
  ).rows[0];
  expect(row.units).toBe(10);
  expect(await reserve(org, row.reference)).toBe(chosen);
  expect((await balance(org)).monthly_remaining).toBe(0);
});
it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])(
  "saldo de %i créditos não inicia chamadas nem cria reserva",
  async (monthly) => {
    const { org } = await company(monthly);
    await expect(reserve(org)).rejects.toThrow("ai_credits_exhausted");
    for (const purpose of [
      "agent_turn",
      "operator_turn",
      "followup_turn",
      "agent_test",
      "embedding_consultar",
      "transcricao_de_audio",
    ])
      await expect(
        pool.query("select fn_ai_check_access($1,$2,null)", [org, purpose]),
      ).rejects.toThrow("ai_credits_exhausted");
    expect((await balance(org)).monthly_remaining).toBe(monthly);
    expect(
      Number(
        (
          await pool.query(
            "select count(*) from ai_response_reservations where organization_id=$1",
            [org],
          )
        ).rows[0].count,
      ),
    ).toBe(0);
  },
);
it("seis créditos mensais mais quatro extras financiam três partes e debitam dez uma vez", async () => {
  const { org } = await company(6, 4),
    id = await reserve(org);
  const funding = (
    await pool.query(
      "select source,monthly_units,extra_units from ai_response_reservations where id=$1",
      [id],
    )
  ).rows[0];
  expect(funding).toEqual({ source: "mixed", monthly_units: 6, extra_units: 4 });
  await pool.query(
    "update ai_response_reservations set expected_parts=3,sealed_at=now() where organization_id=$1 and id=$2",
    [org, id],
  );
  await pool.query(
    "insert into ai_response_parts(organization_id,response_id,part) values($1,$2,1),($1,$2,2)",
    [org, id],
  );
  expect(await settle(org, id)).toBe("uncertain");
  await pool.query(
    "insert into ai_response_parts(organization_id,response_id,part) values($1,$2,3) on conflict do nothing",
    [org, id],
  );
  expect(await settle(org, id)).toBe("committed");
  expect(await settle(org, id)).toBe("committed");
  const ledger = (
    await pool.query(
      "select units,credit_meter from ai_credit_ledger where organization_id=$1 and kind='debit'",
      [org],
    )
  ).rows;
  expect(ledger).toEqual([{ units: -10, credit_meter: "credit_v3" }]);
  const usage = (
    await pool.query(
      "select fn_ai_credit_usage($1,now()-interval '1 day',now()+interval '1 day') usage",
      [org],
    )
  ).rows[0].usage;
  expect(usage).toEqual({ credits: 10, messages: 1 });
});
it("falha devolve cada parcela; créditos de ciclo encerrado não acumulam", async () => {
  const { org } = await company(6, 4),
    id = await reserve(org);
  expect(await settle(org, id, true)).toBe("released");
  expect(await balance(org)).toMatchObject({ monthly_remaining: 6, extra_remaining: 4 });
  const next = await reserve(org);
  await pool.query(
    "update organization_ai_accounts set period_start=now()+interval '1 day',extra_debt=3 where organization_id=$1",
    [org],
  );
  expect(await settle(org, next, true)).toBe("released");
  expect(await balance(org)).toMatchObject({
    monthly_remaining: 0,
    extra_remaining: 1,
    extra_debt: 0,
  });
});
it("saldo recomposto resolve o aviso, sem assumir conversas humanas", async () => {
  const { org } = await company(9);
  expect(
    Number(
      (
        await pool.query(
          "select count(*) from agent_inbox_items where organization_id=$1 and kind='commercial_ai_paused' and status='open'",
          [org],
        )
      ).rows[0].count,
    ),
  ).toBe(1);
  await pool.query(
    "update organization_ai_accounts set extra_remaining=1 where organization_id=$1",
    [org],
  );
  expect(
    Number(
      (
        await pool.query(
          "select count(*) from agent_inbox_items where organization_id=$1 and kind='commercial_ai_paused' and status='open'",
          [org],
        )
      ).rows[0].count,
    ),
  ).toBe(0);
  await expect(reserve(org)).resolves.toBeTypeOf("string");
});
it("pendência antiga aberta recebe o texto em créditos sem criar outro aviso", async () => {
  const { org } = await company(9);
  const prior = await pool.query(
    "update agent_inbox_items set body='Confira Respostas disponíveis.' where organization_id=$1 and kind='commercial_ai_paused' and status='open' returning id",
    [org],
  );
  await pool.query("select fn_ai_commercial_notice($1,'ai_credits_exhausted')", [org]);
  const current = await pool.query(
    "select id,body from agent_inbox_items where organization_id=$1 and kind='commercial_ai_paused' and status='open'",
    [org],
  );
  expect(current.rows).toHaveLength(1);
  expect(current.rows[0].id).toBe(prior.rows[0].id);
  expect(current.rows[0].body).toContain("Seus créditos acabaram. A franquia renova em");
  expect(current.rows[0].body).not.toMatch(/Respostas disponíveis|ai_credits_exhausted/);
});
it("atualização preserva capacidade anterior, reservas em curso e recibos; reaplicar não multiplica", async () => {
  const { org } = await company(7, 3),
    id = randomUUID();
  await pool.query(
    "update organization_ai_accounts set credit_meter='response_v2',monthly_allowance=1000,extra_debt=1 where organization_id=$1",
    [org],
  );
  await pool.query(
    "insert into ai_response_reservations(id,organization_id,reference,source,period_start,credit_meter,units,monthly_units,extra_units) select $2,$1,'old-inflight','monthly',period_start,'response_v2',1,1,0 from organization_ai_accounts where organization_id=$1",
    [org, id],
  );
  await pool.query(
    "insert into ai_credit_ledger(organization_id,reference,kind,units,credit_meter) values($1,'old-receipt','debit',-1,'response_v2')",
    [org],
  );
  const migration = readFileSync(
    "supabase/migrations/20261007225042_0251_creditos_comerciais.sql",
    "utf8",
  );
  await pool.query(migration);
  expect(await balance(org)).toMatchObject({
    monthly_remaining: 70,
    monthly_allowance: 10000,
    extra_remaining: 30,
    extra_debt: 10,
    credit_meter: "credit_v3",
  });
  expect(
    (
      await pool.query(
        "select units,monthly_units,credit_meter from ai_response_reservations where id=$1",
        [id],
      )
    ).rows[0],
  ).toEqual({ units: 10, monthly_units: 10, credit_meter: "credit_v3" });
  expect(
    (
      await pool.query(
        "select units,credit_meter from ai_credit_ledger where organization_id=$1 and reference='old-receipt'",
        [org],
      )
    ).rows[0],
  ).toEqual({ units: -1, credit_meter: "response_v2" });
  await pool.query(migration);
  expect(await balance(org)).toMatchObject({
    monthly_remaining: 70,
    monthly_allowance: 10000,
    extra_remaining: 30,
    extra_debt: 10,
  });
  expect(await settle(org, id, true)).toBe("released");
  expect((await balance(org)).monthly_remaining).toBe(80);
});
it("RLS impede leitura do consumo alheio, liquidação cruzada e publicação por usuário comum", async () => {
  const a = await company(),
    b = await company(),
    id = await reserve(a.org);
  await expect(settle(b.org, id, true)).rejects.toThrow("ai_reservation_not_found");
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: b.user }),
    ]);
    expect(
      (
        await client.query(
          "select fn_ai_credit_usage($1,now()-interval '1 day',now()+interval '1 day') usage",
          [a.org],
        )
      ).rows[0].usage,
    ).toEqual({ credits: 0, messages: 0 });
    await expect(
      client.query(
        "select fn_admin_publish_credit_pack(gen_random_uuid(),$1,'Tentativa fictícia')",
        [b.user],
      ),
    ).rejects.toThrow("permission denied");
  } finally {
    await client.query("rollback");
    client.release();
  }
  const grants = (
    await pool.query(
      "select has_function_privilege('anon','fn_ai_credit_usage(uuid,timestamptz,timestamptz)','execute') allowed",
    )
  ).rows[0];
  expect(grants.allowed).toBe(false);
});
it("o pacote definido nasce uma vez, em rascunho e sem oferta de venda", async () => {
  const packs = (
    await pool.query(
      "select units,price_cents,publication_state,hotmart_offer from ai_credit_packs where slug='extra-1000'",
    )
  ).rows;
  expect(packs).toEqual([
    { units: 1000, price_cents: "4999", publication_state: "draft", hotmart_offer: null },
  ]);
  const { user } = await company();
  const id = (await pool.query("select id from ai_credit_packs where slug='extra-1000'")).rows[0]
    .id;
  await expect(
    pool.query("select fn_admin_publish_credit_pack($1,$2,'Oferta ainda ausente')", [id, user]),
  ).rejects.toThrow("platform_admin_required");
  await pool.query(
    "insert into platform_admins(user_id,granted_by,scope,reason) values($1,$1,'full','Operador fictício de teste')",
    [user],
  );
  await expect(
    pool.query("select fn_admin_publish_credit_pack($1,$2,'Oferta ainda ausente')", [id, user]),
  ).rejects.toThrow("credit_pack_offer_missing");
});

async function paidCompany(meter = "credit_v3", interval = "semester") {
  const c = await company(0),
    reference = randomUUID().replaceAll("-", "").slice(0, 24),
    product = randomUUID();
  await pool.query(
    "update organization_ai_accounts set state='pending',anchor_at=null where organization_id=$1",
    [c.org],
  );
  await pool.query(
    "insert into billing_checkouts(organization_id,created_by,reference,plan_id,product_ucode,offer_code,price_cents,limits_snapshot,billing_interval,credit_meter) select $1,$2,$3,id,$4,'qa-plan',1000,'{\"ai_credits\":120,\"users\":2,\"whatsapp_numbers\":1}', $5,$6 from commercial_plans where slug='pro'",
    [c.org, c.user, reference, product, interval, meter],
  );
  const event: HotmartPurchase = {
    event_id: randomUUID(),
    event: "PURCHASE_APPROVED",
    occurred_at: new Date().toISOString(),
    product_ucode: product,
    offer_code: "qa-plan",
    transaction: randomUUID(),
    amount_cents: 1000,
    currency: "BRL",
    status: "APPROVED",
    reference,
    subscriber_code: randomUUID(),
    subscription_status: "ACTIVE",
    next_charge_at: null,
  };
  expect(await processHotmartPurchase(pool, event)).toMatchObject({ state: "applied" });
  return { ...c, event };
}

it.each(["semester", "year"])(
  "%s mantém renovação mensal e o snapshot anterior conserva dez vezes a unidade",
  async (interval) => {
    for (const meter of ["response_v2", "credit_v3"]) {
      const c = await paidCompany(meter, interval),
        allowance = meter === "response_v2" ? 1200 : 120;
      expect(await balance(c.org)).toMatchObject({
        monthly_allowance: allowance,
        monthly_remaining: allowance,
      });
      expect(
        (
          await pool.query("select credit_meter from billing_contracts where organization_id=$1", [
            c.org,
          ])
        ).rows[0].credit_meter,
      ).toBe(meter);
      const period = (
        await pool.query(
          "select period_end=fn_ai_anniversary(anchor_at,1) monthly,access_until=fn_ai_anniversary(anchor_at,$2) full_period from organization_ai_accounts where organization_id=$1",
          [c.org, interval === "year" ? 12 : 6],
        )
      ).rows[0];
      expect(period).toEqual({ monthly: true, full_period: true });
      await pool.query(
        "update organization_ai_accounts set anchor_at=now()-interval '2 months',period_start=now()-interval '2 months',period_end=now()-interval '1 month',monthly_remaining=3,extra_remaining=21 where organization_id=$1",
        [c.org],
      );
      await pool.query("select fn_ai_renew($1)", [c.org]);
      await pool.query("select fn_ai_renew($1)", [c.org]);
      expect(await balance(c.org)).toMatchObject({
        monthly_remaining: allowance,
        extra_remaining: 21,
      });
      expect(
        Number(
          (
            await pool.query(
              "select count(*) from ai_credit_ledger where organization_id=$1 and kind='renewal'",
              [c.org],
            )
          ).rows[0].count,
        ),
      ).toBe(1);
    }
  },
);

it.each(["REFUNDED", "CHARGEBACK"] as const)(
  "pacote confirmado uma vez; %s retira extras e aprovação posterior não devolve",
  async (status) => {
    const c = await paidCompany(),
      reference = randomUUID().replaceAll("-", "").slice(0, 24),
      product = randomUUID();
    const pack = (await pool.query("select id from ai_credit_packs where slug='extra-1000'"))
      .rows[0].id;
    await pool.query(
      "insert into billing_checkouts(organization_id,created_by,reference,credit_pack_id,credit_units,product_ucode,offer_code,price_cents,credit_meter) values($1,$2,$3,$4,1000,$5,'qa-extra',4999,'credit_v3')",
      [c.org, c.user, reference, pack, product],
    );
    const event: HotmartPurchase = {
      ...c.event,
      event_id: randomUUID(),
      transaction: randomUUID(),
      product_ucode: product,
      offer_code: "qa-extra",
      reference,
      amount_cents: 4999,
      subscriber_code: null,
      subscription_status: null,
    };
    const results = await Promise.all([
      processHotmartPurchase(pool, event),
      processHotmartPurchase(pool, event),
    ]);
    expect(results.map((r) => r.state).sort()).toEqual(["applied", "duplicate"]);
    expect((await balance(c.org)).extra_remaining).toBe(1000);
    // Consumo e entrega reais são medidos pelo ledger, sem simular um pagamento visual.
    await pool.query(
      "update organization_ai_accounts set monthly_remaining=0 where organization_id=$1",
      [c.org],
    );
    const id = await reserve(c.org);
    await pool.query(
      "update ai_response_reservations set expected_parts=1,sealed_at=now() where id=$1",
      [id],
    );
    await pool.query(
      "insert into ai_response_parts(organization_id,response_id,part) values($1,$2,1)",
      [c.org, id],
    );
    await settle(c.org, id);
    expect((await balance(c.org)).extra_remaining).toBe(990);
    const reversed = {
      ...event,
      event_id: randomUUID(),
      status,
      event:
        status === "REFUNDED" ? ("PURCHASE_REFUNDED" as const) : ("PURCHASE_CHARGEBACK" as const),
    };
    await processHotmartPurchase(pool, reversed);
    await processHotmartPurchase(pool, reversed);
    expect(await balance(c.org)).toMatchObject({ extra_remaining: 0, extra_debt: 10 });
    await processHotmartPurchase(pool, {
      ...event,
      event_id: randomUUID(),
      occurred_at: new Date(Date.now() + 10000).toISOString(),
    });
    expect(await balance(c.org)).toMatchObject({ extra_remaining: 0, extra_debt: 10 });
    expect(
      Number(
        (
          await pool.query(
            "select count(*) from ai_credit_ledger where organization_id=$1 and kind='refund'",
            [c.org],
          )
        ).rows[0].count,
      ),
    ).toBe(1);
  },
);

it("publicação de oferta homologada é auditada, idempotente e reservada ao administrador completo", async () => {
  const { user } = await company();
  await pool.query(
    "insert into platform_admins(user_id,granted_by,scope,reason) values($1,$1,'support_readonly','Operador fictício de teste')",
    [user],
  );
  const id = (
    await pool.query(
      "insert into ai_credit_packs(name,units,price_cents,hotmart_offer) values('Pacote QA',1000,4999,$1) returning id",
      [
        JSON.stringify({
          product_ucode: randomUUID(),
          offer_code: "qa",
          checkout_url: "https://pay.hotmart.com/QA?off=qa",
          enabled: false,
        }),
      ],
    )
  ).rows[0].id;
  await expect(
    pool.query("select fn_admin_publish_credit_pack($1,$2,'Preço homologado em QA')", [id, user]),
  ).rejects.toThrow("platform_admin_required");
  await pool.query("update platform_admins set scope='full' where user_id=$1", [user]);
  await pool.query("select fn_admin_publish_credit_pack($1,$2,'Preço homologado em QA')", [
    id,
    user,
  ]);
  await pool.query("select fn_admin_publish_credit_pack($1,$2,'Preço homologado em QA')", [
    id,
    user,
  ]);
  expect(
    (
      await pool.query(
        "select publication_state,hotmart_offer->>'enabled' enabled from ai_credit_packs where id=$1",
        [id],
      )
    ).rows[0],
  ).toEqual({ publication_state: "published", enabled: "true" });
  expect(
    Number(
      (
        await pool.query(
          "select count(*) from api_audit_log where resource_id=$1 and action='platform_admin.credit_pack_published'",
          [id],
        )
      ).rows[0].count,
    ),
  ).toBe(1);
});
