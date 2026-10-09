import { afterAll, beforeAll, expect, it } from "vitest";
import pg from "pg";
import { countAs, sql } from "./gov-helpers";
import { processHotmartPurchase } from "@/lib/billing/process-hotmart";
import { processHotmartCancellation } from "@/lib/billing/process-hotmart-cancellation";
import type { HotmartPurchase } from "@/lib/billing/hotmart";

const pool = new pg.Pool({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT ?? 54329}/postgres`,
  max: 3,
});
const A = "0244aaaa-0000-4000-8000-000000000001",
  B = "0244bbbb-0000-4000-8000-000000000001";
const USER_A = "0244aaaa-1111-4000-8000-000000000001",
  USER_B = "0244bbbb-1111-4000-8000-000000000001";
const VIEWER = "0244aaaa-1111-4000-8000-000000000002";
const PRODUCT = "0244aaaa-2222-4000-8000-000000000001";
const event: HotmartPurchase = {
  event_id: "event-approval",
  event: "PURCHASE_APPROVED",
  occurred_at: "2026-10-05T10:00:00Z",
  product_ucode: PRODUCT,
  offer_code: "pro-qa",
  transaction: "HP-QA-A",
  amount_cents: 29700,
  currency: "BRL",
  status: "APPROVED",
  reference: "a".repeat(24),
  subscriber_code: "SUB-QA-A",
  subscription_status: "ACTIVE",
  next_charge_at: "2026-11-05T10:00:00Z",
};
beforeAll(() => {
  sql(`insert into auth.users(id,email) values ('${USER_A}','billing-a@invariant.test'),('${USER_B}','billing-b@invariant.test'),('${VIEWER}','billing-viewer@invariant.test');
    insert into organizations(id,slug,display_name,legal_name) values ('${A}','billing-a','Billing A','Billing A'),('${B}','billing-b','Billing B','Billing B');
    insert into user_organizations(organization_id,user_id,role,accepted_at) values ('${A}','${USER_A}','admin',now()),('${B}','${USER_B}','admin',now()),('${A}','${VIEWER}','viewer',now());
    insert into billing_checkouts(organization_id,created_by,reference,plan_id,product_ucode,offer_code,price_cents)
      select '${A}','${USER_A}','${"a".repeat(24)}',id,'${PRODUCT}','pro-qa',29700 from commercial_plans where slug='pro';
    insert into billing_checkouts(organization_id,created_by,reference,plan_id,product_ucode,offer_code,price_cents)
      select '${B}','${USER_B}','${"b".repeat(24)}',id,'${PRODUCT}','pro-qa',29700 from commercial_plans where slug='pro';`);
});
afterAll(async () => {
  await pool.end();
});

it("a compra sem referência não encontra uma empresa por e-mail ou por produto", async () => {
  expect(
    await processHotmartPurchase(pool, {
      ...event,
      event_id: "event-no-reference",
      reference: null,
    }),
  ).toMatchObject({ state: "unmatched" });
  expect(sql("select count(*) from billing_contracts")).toBe("0");
});
it("valor ou oferta divergentes ficam visíveis ao operador, sem contrato", async () => {
  for (const change of [
    { event_id: "event-value", amount_cents: 100 },
    { event_id: "event-offer", offer_code: "other" },
  ])
    expect(await processHotmartPurchase(pool, { ...event, ...change })).toMatchObject({
      state: "unmatched",
    });
  expect(sql("select count(*) from billing_contracts")).toBe("0");
});
it("duas entregas concorrentes registram um só contrato e um pagamento", async () => {
  const results = await Promise.all([
    processHotmartPurchase(pool, event),
    processHotmartPurchase(pool, event),
  ]);
  expect(results.map((r) => r.state).sort()).toEqual(["applied", "duplicate"]);
  expect(sql("select count(*) from billing_contracts")).toBe("1");
  expect(sql("select count(*) from billing_payments")).toBe("1");
});
it("renovação usa assinatura previamente vinculada e não depende do SCK", async () => {
  expect(
    await processHotmartPurchase(pool, {
      ...event,
      event_id: "event-renewal",
      transaction: "HP-QA-A-2",
      reference: null,
      occurred_at: "2026-11-05T10:00:00Z",
      next_charge_at: "2026-12-05T10:00:00Z",
    }),
  ).toMatchObject({ state: "applied", organizationId: A });
  expect(sql("select count(*) from billing_contracts")).toBe("1");
  expect(sql("select count(*) from billing_payments")).toBe("2");
});
it("evento atrasado não regride pagamento já registrado", async () => {
  expect(
    await processHotmartPurchase(pool, {
      ...event,
      event_id: "event-old",
      event: "PURCHASE_DELAYED",
      status: "DELAYED",
      subscription_status: "DELAYED",
      occurred_at: "2026-10-04T10:00:00Z",
    }),
  ).toMatchObject({ state: "obsolete" });
  expect(sql("select status from billing_payments where transaction_code='HP-QA-A'")).toBe(
    "APPROVED",
  );
  expect(sql("select subscription_status from billing_contracts")).toBe("ACTIVE");
});
it("referência já consumida não vincula uma segunda assinatura", async () => {
  expect(
    await processHotmartPurchase(pool, {
      ...event,
      event_id: "event-reuse",
      subscriber_code: "SUB-OTHER",
      transaction: "HP-OTHER",
    }),
  ).toMatchObject({ state: "unmatched" });
  expect(sql("select count(*) from billing_contracts")).toBe("1");
});
it("a mesma transação não cria um segundo contrato com outro código de assinatura", async () => {
  expect(
    await processHotmartPurchase(pool, {
      ...event,
      event_id: "event-alias",
      subscriber_code: "SUB-ALIAS",
    }),
  ).toMatchObject({ state: "unmatched" });
  expect(sql("select count(*) from billing_contracts")).toBe("1");
  expect(sql("select reason from billing_webhook_events where event_id='event-alias'")).toBe(
    "transaction_already_bound",
  );
});
it("admin lê o próprio financeiro, vizinho e colega sem permissão não leem", async () => {
  await processHotmartPurchase(pool, {
    ...event,
    event_id: "event-b",
    reference: "b".repeat(24),
    subscriber_code: "SUB-QA-B",
    transaction: "HP-QA-B",
  });
  for (const table of ["billing_checkouts", "billing_contracts", "billing_payments"]) {
    expect(
      countAs(USER_A, `select count(*) from ${table} where organization_id='${A}'`),
    ).toBeGreaterThan(0);
    expect(
      countAs(USER_B, `select count(*) from ${table} where organization_id='${B}'`),
    ).toBeGreaterThan(0);
    expect(countAs(USER_A, `select count(*) from ${table} where organization_id='${B}'`)).toBe(0);
    expect(countAs(USER_B, `select count(*) from ${table} where organization_id='${A}'`)).toBe(0);
    expect(countAs(VIEWER, `select count(*) from ${table}`)).toBe(0);
    expect(sql(`select has_table_privilege('authenticated','public.${table}','INSERT')`)).toBe("f");
  }
  expect(
    sql("select has_table_privilege('authenticated','public.billing_webhook_events','SELECT')"),
  ).toBe("f");
});
it("a FK composta impede colocar um pagamento no contrato de outra empresa", () => {
  expect(() =>
    sql(`insert into billing_payments(organization_id,contract_id,transaction_code,amount_cents,currency,status,last_event_at)
    select '${B}',id,'cross-tenant',100,'BRL','APPROVED',now() from billing_contracts where organization_id='${A}'`),
  ).toThrow();
});

it("transação de outra assinatura não altera o contrato antes de rejeitar o pagamento", async () => {
  const before = sql(`select to_jsonb(c) from billing_contracts c where organization_id='${B}'`);
  expect(
    await processHotmartPurchase(pool, {
      ...event,
      event_id: "event-wrong-contract",
      subscriber_code: "SUB-QA-B",
      reference: "b".repeat(24),
      occurred_at: "2026-11-08T10:00:00Z",
      subscription_status: "INACTIVE",
      status: "REFUNDED",
      event: "PURCHASE_REFUNDED",
    }),
  ).toMatchObject({ state: "unmatched" });
  expect(sql(`select to_jsonb(c) from billing_contracts c where organization_id='${B}'`)).toBe(
    before,
  );
  expect(sql("select status from billing_payments where transaction_code='HP-QA-A'")).toBe(
    "APPROVED",
  );
});

it("cancelamento preserva pagamentos, não mostra próxima cobrança e deduplica", async () => {
  const cancellation = {
    event_id: "event-cancel",
    event: "SUBSCRIPTION_CANCELLATION" as const,
    occurred_at: "2026-11-10T10:00:00Z",
    subscriber_code: "SUB-QA-A",
    cancelled_at: "2026-11-10T09:59:00Z",
    access_until: "2026-12-05T10:00:00Z",
  };
  const before = sql(
    "select jsonb_agg(to_jsonb(p) order by transaction_code) from billing_payments p",
  );
  const results = await Promise.all([
    processHotmartCancellation(pool, cancellation),
    processHotmartCancellation(pool, cancellation),
  ]);
  expect(results.map((r) => r.state).sort()).toEqual(["applied", "duplicate"]);
  expect(
    sql(
      "select subscription_status||':'||(next_charge_at is null)::text from billing_contracts where subscriber_code='SUB-QA-A'",
    ),
  ).toBe("INACTIVE:true");
  expect(
    sql("select jsonb_agg(to_jsonb(p) order by transaction_code) from billing_payments p"),
  ).toBe(before);
  expect(
    await processHotmartCancellation(pool, {
      ...cancellation,
      event_id: "old-cancel",
      occurred_at: "2026-11-09T10:00:00Z",
    }),
  ).toMatchObject({ state: "obsolete" });
  await expect(
    processHotmartCancellation(pool, { ...cancellation, subscriber_code: "SUB-QA-B" }),
  ).rejects.toThrow("billing_event_identity_changed");
  expect(
    await processHotmartCancellation(pool, {
      ...cancellation,
      event_id: "unmatched-cancel",
      subscriber_code: "UNBOUND",
    }),
  ).toMatchObject({ state: "unmatched", organizationId: null });
});

it("nova ativação confirmada limpa cancelamento; evento antigo não reativa assinatura", async () => {
  await processHotmartPurchase(pool, {
    ...event,
    event_id: "old-reactivation",
    transaction: "HP-QA-A",
    occurred_at: "2026-11-09T10:00:00Z",
  });
  expect(
    sql("select subscription_status from billing_contracts where subscriber_code='SUB-QA-A'"),
  ).toBe("INACTIVE");
  await processHotmartPurchase(pool, {
    ...event,
    event_id: "reactivation",
    transaction: "HP-QA-A-3",
    reference: null,
    occurred_at: "2026-12-05T10:00:00Z",
  });
  expect(
    sql(
      "select subscription_status||':'||(cancelled_at is null and access_until is null)::text from billing_contracts where subscriber_code='SUB-QA-A'",
    ),
  ).toBe("ACTIVE:true");
});

it("cancelamento recebido antes da compra fica pendente e pode ser reprocessado depois do vínculo", async () => {
  const cancellation = {
    event_id: "early-cancel",
    event: "SUBSCRIPTION_CANCELLATION" as const,
    occurred_at: "2026-11-10T10:00:00Z",
    subscriber_code: "SUB-LATE-BINDING",
    cancelled_at: "2026-11-10T09:59:00Z",
    access_until: "2026-12-05T10:00:00Z",
  };
  expect(await processHotmartCancellation(pool, cancellation)).toMatchObject({
    state: "unmatched",
  });
  sql(`insert into billing_checkouts(organization_id,created_by,reference,plan_id,product_ucode,offer_code,price_cents)
    select '${A}','${USER_A}','${"c".repeat(24)}',id,'${PRODUCT}','pro-qa',29700 from commercial_plans where slug='pro';`);
  expect(
    await processHotmartPurchase(pool, {
      ...event,
      event_id: "late-binding",
      reference: "c".repeat(24),
      transaction: "HP-LATE-BINDING",
      subscriber_code: "SUB-LATE-BINDING",
    }),
  ).toMatchObject({ state: "applied" });
  expect(await processHotmartCancellation(pool, cancellation)).toMatchObject({
    state: "applied",
    organizationId: A,
  });
  expect(
    sql(
      "select subscription_status from billing_contracts where subscriber_code='SUB-LATE-BINDING'",
    ),
  ).toBe("INACTIVE");
  expect(sql("select status from billing_payments where transaction_code='HP-LATE-BINDING'")).toBe(
    "APPROVED",
  );
});
