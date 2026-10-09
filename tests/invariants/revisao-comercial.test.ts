import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { withAutomationResponse } from "@/lib/billing/automation-response";
import type { ActionResultDetail } from "@/lib/automation/types";
import { processHotmartPurchase } from "@/lib/billing/process-hotmart";

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
const sent: ActionResultDetail = { type: "send_ai_message", status: "success" };
async function company() {
  const org = randomUUID(),
    user = randomUUID(),
    channel = randomUUID(),
    contact = randomUUID(),
    conversation = randomUUID();
  await pool.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [
    user,
    `${user}@review.test`,
  ]);
  await pool.query(
    "insert into organizations(id,slug,display_name,legal_name,signup_origin) values($1,$2,'Empresa fictícia','Empresa fictícia','self_service')",
    [org, `review-${org}`],
  );
  await pool.query(
    "insert into user_organizations(organization_id,user_id,role,accepted_at) values($1,$2,'admin',now())",
    [org, user],
  );
  await pool.query(
    "update organization_ai_accounts set state='active',anchor_at=now(),access_until=now()+interval '1 year',period_start=now(),period_end=now()+interval '1 month',monthly_allowance=10,monthly_remaining=10 where organization_id=$1",
    [org],
  );
  await pool.query(
    "insert into channel_sessions(id,organization_id,waha_session_name,webhook_secret_encrypted,status) values($1,$2,$3,'\\x00'::bytea,'WORKING')",
    [channel, org, `review-${channel}`],
  );
  await pool.query(
    "insert into contacts(id,organization_id,display_name) values($1,$2,'Contato fictício')",
    [contact, org],
  );
  await pool.query(
    "insert into conversations(id,organization_id,contact_id,channel_session_id) values($1,$2,$3,$4)",
    [conversation, org, contact, channel],
  );
  return { org, user, channel, contact, conversation };
}
type Company = Awaited<ReturnType<typeof company>>;
async function message(c: Company, response: string, status: string, error: string | null = null) {
  return (
    await pool.query(
      "insert into messages(organization_id,conversation_id,contact_id,channel_session_id,direction,type,body,status,error_code,ai_credit_eligible,ai_response_id,ai_response_part) values($1,$2,$3,$4,'outbound','text','Mensagem fictícia',$5,$6,true,$7,1) returning id",
      [c.org, c.conversation, c.contact, c.channel, status, error, response],
    )
  ).rows[0].id;
}
async function state(c: Company, id: string) {
  return (
    await pool.query(
      "select state,units from ai_response_reservations where organization_id=$1 and id=$2",
      [c.org, id],
    )
  ).rows[0];
}
function identity(c: Company) {
  return { organizationId: c.org, eventId: randomUUID(), ruleId: randomUUID(), actionIndex: 0 };
}

it("automação concorrente reserva antes do modelo e envia/debita uma única vez", async () => {
  const c = await company(),
    input = identity(c);
  let calls = 0,
    response = "";
  await Promise.all(
    Array.from({ length: 5 }, () =>
      withAutomationResponse(pool, input, async (id) => {
        calls++;
        response = id!;
        expect(
          (
            await pool.query(
              "select monthly_remaining from organization_ai_accounts where organization_id=$1",
              [c.org],
            )
          ).rows[0].monthly_remaining,
        ).toBe(0);
        await pool.query("select fn_ai_check_access($1,'automation_ai_message',$2)", [c.org, id]);
        await message(c, id!, "sent");
        return sent;
      }),
    ),
  );
  expect(calls).toBe(1);
  expect(await state(c, response)).toEqual({ state: "committed", units: 10 });
  expect(
    (
      await pool.query(
        "select units from ai_credit_ledger where organization_id=$1 and kind='debit'",
        [c.org],
      )
    ).rows,
  ).toEqual([{ units: -10 }]);
});
it("falha do modelo devolve a reserva e saldo insuficiente impede chamar o modelo", async () => {
  const c = await company();
  await expect(
    withAutomationResponse(pool, identity(c), async () => {
      throw new Error("provider_unavailable");
    }),
  ).rejects.toThrow("provider_unavailable");
  expect(
    (
      await pool.query(
        "select monthly_remaining from organization_ai_accounts where organization_id=$1",
        [c.org],
      )
    ).rows[0].monthly_remaining,
  ).toBe(10);
  await pool.query(
    "update organization_ai_accounts set monthly_remaining=9 where organization_id=$1",
    [c.org],
  );
  let calls = 0;
  await expect(
    withAutomationResponse(pool, identity(c), async () => {
      calls++;
      return sent;
    }),
  ).rejects.toThrow("ai_credits_exhausted");
  expect(calls).toBe(0);
});
it.each(["send_timeout", "delivery_unknown"])(
  "falha ambígua %s preserva créditos até o recibo do canal",
  async (error) => {
    const c = await company();
    let response = "",
      msg = "";
    await withAutomationResponse(pool, identity(c), async (id) => {
      response = id!;
      msg = await message(c, id!, "failed", error);
      return { type: "send_ai_message", status: "failed" };
    });
    expect((await state(c, response)).state).toBe("uncertain");
    expect(
      (
        await pool.query(
          "select monthly_remaining from organization_ai_accounts where organization_id=$1",
          [c.org],
        )
      ).rows[0].monthly_remaining,
    ).toBe(0);
    await pool.query(
      "update messages set status='sent',error_code=null where organization_id=$1 and id=$2",
      [c.org, msg],
    );
    expect(
      (await pool.query("select fn_ai_settle($1,$2,true) state", [c.org, response])).rows[0].state,
    ).toBe("committed");
  },
);
it("reserva de automação não autoriza outra empresa nem outra finalidade", async () => {
  const c = await company(),
    other = await company();
  await pool.query(
    "update organization_ai_accounts set monthly_remaining=0 where organization_id=$1",
    [other.org],
  );
  await withAutomationResponse(pool, identity(c), async (id) => {
    await expect(
      pool.query("select fn_ai_check_access($1,'automation_ai_message',$2)", [other.org, id]),
    ).rejects.toThrow("ai_credits_exhausted");
    await expect(
      pool.query("select fn_ai_check_access($1,'agent_test',$2)", [c.org, id]),
    ).rejects.toThrow("ai_credits_exhausted");
    return { type: "send_ai_message", status: "failed" };
  });
});
it("replay após perda do executor reconcilia intenção sem gerar ou enviar de novo", async () => {
  const c = await company(),
    input = identity(c);
  const ref = `automation:${input.eventId}:${input.ruleId}:0`;
  const response = (await pool.query("select fn_ai_reserve($1,$2) id", [c.org, ref])).rows[0].id;
  await pool.query(
    "update ai_response_reservations set expected_parts=1 where organization_id=$1 and id=$2",
    [c.org, response],
  );
  await message(c, response, "sent");
  let calls = 0;
  expect(
    (
      await withAutomationResponse(pool, input, async () => {
        calls++;
        return sent;
      })
    ).status,
  ).toBe("success");
  expect(calls).toBe(0);
  expect((await state(c, response)).state).toBe("committed");
});
it("reconciliação administrativa não libera reserva de uma automação ainda executando", async () => {
  const c = await company();
  await pool.query(
    "insert into platform_admins(user_id,granted_by,scope,reason) values($1,$1,'full','Operador fictício de revisão')",
    [c.user],
  );
  await withAutomationResponse(pool, identity(c), async (id) => {
    await expect(
      pool.query("select fn_admin_ai_reconcile($1,$2,$3,$4)", [
        c.org,
        c.user,
        id,
        "Conferência fictícia de concorrência",
      ]),
    ).rejects.toThrow("automation_still_running");
    await message(c, id!, "sent");
    return sent;
  });
});
it("instruções do organizador são editáveis no rascunho e imutáveis na publicação", async () => {
  const c = await company();
  const agent = (
    await pool.query(
      "insert into ai_agents(organization_id,name,model,system_prompt,kind) values($1,'Agente fictício','synthetic','Atendimento fictício','mcp_agent') returning id",
      [c.org],
    )
  ).rows[0].id;
  const version = (
    await pool.query(
      "insert into ai_agent_versions(organization_id,agent_id,version_number,system_prompt,provider,model,credential_id,channel_session_id,operator_prompt) values($1,$2,1,'Atendimento fictício','openai','synthetic',null,$3,'Organizador fictício') returning id",
      [c.org, agent, c.channel],
    )
  ).rows[0].id;
  await pool.query(
    "update ai_agent_versions set operator_prompt='Organizador ajustado' where organization_id=$1 and id=$2",
    [c.org, version],
  );
  await pool.query(
    "update ai_agent_versions set status='published' where organization_id=$1 and id=$2",
    [c.org, version],
  );
  await expect(
    pool.query(
      "update ai_agent_versions set operator_prompt='Outra instrução' where organization_id=$1 and id=$2",
      [c.org, version],
    ),
  ).rejects.toThrow("imutável");
});
it("renovação da empresa suspensa não inventa concessão de franquia no extrato", async () => {
  const c = await company(),
    product = randomUUID(),
    reference = randomUUID().replaceAll("-", "").slice(0, 24);
  await pool.query(
    "update organization_ai_accounts set state='suspended',monthly_remaining=3 where organization_id=$1",
    [c.org],
  );
  await pool.query(
    "insert into billing_checkouts(organization_id,created_by,reference,plan_id,product_ucode,offer_code,price_cents,limits_snapshot,billing_interval,credit_meter) select $1,$2,$3,id,$4,'review-plan',1000,'{\"ai_credits\":120,\"users\":2,\"whatsapp_numbers\":1}','semester','credit_v3' from commercial_plans where slug='pro'",
    [c.org, c.user, reference, product],
  );
  const transaction = randomUUID();
  expect(
    await processHotmartPurchase(pool, {
      event_id: randomUUID(),
      event: "PURCHASE_APPROVED",
      occurred_at: new Date().toISOString(),
      product_ucode: product,
      offer_code: "review-plan",
      transaction,
      amount_cents: 1000,
      currency: "BRL",
      status: "APPROVED",
      reference,
      subscriber_code: randomUUID(),
      subscription_status: "ACTIVE",
      next_charge_at: null,
    }),
  ).toMatchObject({ state: "applied" });
  expect(
    (
      await pool.query(
        "select state,monthly_remaining from organization_ai_accounts where organization_id=$1",
        [c.org],
      )
    ).rows[0],
  ).toEqual({ state: "suspended", monthly_remaining: 3 });
  expect(
    (
      await pool.query(
        "select units from ai_credit_ledger where organization_id=$1 and reference=$2",
        [c.org, `payment:${transaction}`],
      )
    ).rows[0].units,
  ).toBe(0);
});
it("migração não atribui chamadas legadas ao orçamento operacional da plataforma", async () => {
  const c = await company();
  await pool.query("update platform_ai_settings set monthly_cost_limit_cents=100 where id=true");
  try {
    await pool.query(
      "insert into llm_calls(organization_id,provider,model,cost_cents,pricing_snapshot) values($1,'openai','synthetic',200,'{\"mode\":\"legacy\"}')",
      [c.org],
    );
    await expect(
      pool.query("select fn_ai_check_access($1,'agent_test',null)", [c.org]),
    ).resolves.toBeDefined();
    await pool.query(
      "insert into llm_calls(organization_id,provider,model,cost_cents,pricing_snapshot) values($1,'openai','synthetic',101,'{\"mode\":\"platform\"}')",
      [c.org],
    );
    await expect(
      pool.query("select fn_ai_check_access($1,'agent_test',null)", [c.org]),
    ).rejects.toThrow("ai_platform_budget_exhausted");
  } finally {
    await pool.query("update platform_ai_settings set monthly_cost_limit_cents=0 where id=true");
  }
});
