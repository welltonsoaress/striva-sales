import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { flowGraphSchema } from "@/lib/followup/graph-schema";
import { validateFlowForPublish } from "@/lib/followup/validate-publish";

const db = new pg.Pool({
  // Credenciais públicas do Postgres efêmero criado pelo runner; nunca lê a instalação.
  host: "127.0.0.1",
  port: Number(process.env.TEST_DB_PORT),
  user: "postgres",
  password: "postgres",
  database: "postgres",
});
const org = randomUUID(),
  other = randomUUID(),
  owner = randomUUID(),
  operator = randomUUID(),
  member = randomUUID(),
  plan = randomUUID();
beforeAll(async () => {
  for (const id of [owner, operator, member])
    await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [
      id,
      `${id}@invariant.test`,
    ]);
  for (const id of [org, other])
    await db.query(
      "insert into organizations(id,slug,display_name,legal_name) values($1,$2,'Empresa fictícia','Empresa fictícia')",
      [id, `qa-${id}`],
    );
  await db.query(
    "insert into user_organizations(organization_id,user_id,role,accepted_at) values($1,$2,'admin',now()),($1,$3,'agent',now())",
    [org, owner, member],
  );
  await db.query(
    "insert into platform_admins(user_id,granted_by,scope,mfa_required,reason) values($1,$1,'full',false,'Operador fictício')",
    [operator],
  );
  await db.query(
    "insert into commercial_plans(id,slug,name,description,publication_state,limits) values($1,$2,'Plano fictício','Concessão de teste','published',$3)",
    [
      plan,
      `qa-${plan}`,
      { users: 10, whatsapp_numbers: 3, ai_credits: 6000, ai_credits_period: "month" },
    ],
  );
});
afterAll(() => db.end());

async function asUser(user: string, query: string, args: unknown[] = []) {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: user }),
    ]);
    return await client.query(query, args);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

it("cada empresa recebe um rascunho publicável, isolado e sem duplicação", async () => {
  await db.query("select fn_seed_lead_recovery($1)", [org]);
  const { rows } = await db.query(
    "select draft_graph,status,trigger_config,handoff_policy from followup_flow_pointers where organization_id=$1 and name='Recuperação de leads'",
    [org],
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    status: "draft",
    trigger_config: { kind: "manual", cancel_on_reply: true },
    handoff_policy: "pause",
  });
  const graph = flowGraphSchema.parse(rows[0].draft_graph);
  expect(validateFlowForPublish(graph).ok).toBe(true);
  expect(
    graph.nodes.filter((n) => n.type === "ai_classify").map((n) => n.config.grace_timeout_ms),
  ).toEqual([3600000, 86400000, 172800000]);
  const ids = graph.nodes.flatMap((n) =>
    n.type === "action" && n.config.mode === "template" ? [n.config.template_id] : [],
  );
  expect(
    (
      await db.query(
        "select count(*)::int count from message_templates where organization_id=$1 and id=any($2::uuid[])",
        [org, ids],
      )
    ).rows[0].count,
  ).toBe(3);
  // O envio por template não resolve nomes do contato; o padrão não deve expor uma variável literal.
  expect(
    (
      await db.query(
        "select body from message_templates where organization_id=$1 and id=any($2::uuid[])",
        [org, ids],
      )
    ).rows.every((row) => !row.body.includes("{{")),
  ).toBe(true);
  expect(
    (
      await asUser(
        owner,
        "select count(*)::int count from followup_flow_pointers where organization_id=$1",
        [other],
      )
    ).rows[0].count,
  ).toBe(0);
});

it("usuário comum não lê a chave global nem os logs técnicos", async () => {
  await expect(asUser(owner, "select * from platform_ai_credentials")).rejects.toMatchObject({
    code: "42501",
  });
  await db.query(
    "insert into api_audit_log(organization_id,action,resource_type) values($1,'qa.synthetic','qa')",
    [org],
  );
  expect(
    (
      await asUser(
        owner,
        "select count(*)::int count from api_audit_log where organization_id=$1",
        [org],
      )
    ).rows[0].count,
  ).toBe(0);
  expect(
    (
      await asUser(
        operator,
        "select count(*)::int count from api_audit_log where organization_id=$1",
        [org],
      )
    ).rows[0].count,
  ).toBeGreaterThan(0);
  expect(
    (
      await db.query(
        "select has_function_privilege('anon','public.fn_seed_lead_recovery(uuid)','EXECUTE') allowed",
      )
    ).rows[0].allowed,
  ).toBe(false);
});

it("acesso direto do tenant não escolhe outro modelo ou organizador", async () => {
  await db.query(
    "update platform_ai_settings set enabled=true,apply_to_all=true,provider='openai',model='gpt-6.1-sol' where id=true",
  );
  const agent = randomUUID(),
    version = randomUUID();
  await db.query(
    "insert into ai_agents(id,organization_id,name,model,system_prompt,kind,created_by) values($1,$2,'Agente fictício','openai/gpt-6.1-sol','Atendimento fictício','mcp_agent',$3)",
    [agent, org, owner],
  );
  await db.query(
    "insert into ai_agent_versions(id,organization_id,agent_id,version_number,provider,model,system_prompt,status) values($1,$2,$3,1,'openai','gpt-6.1-sol','Atendimento fictício','draft')",
    [version, org, agent],
  );
  await expect(
    db.query(
      "update ai_agent_versions set status='published',published_at=now() where organization_id=$1 and id=$2",
      [org, version],
    ),
  ).rejects.toMatchObject({
    code: "23514",
    constraint: "ai_agent_versions_channel_required_when_published",
  });
  await expect(
    asUser(
      owner,
      "update ai_agent_versions set model='modelo-escolhido' where organization_id=$1 and id=$2",
      [org, version],
    ),
  ).rejects.toMatchObject({ code: "42501" });
  await expect(
    asUser(
      owner,
      "update ai_agent_versions set operator_model='outro-modelo' where organization_id=$1 and id=$2",
      [org, version],
    ),
  ).rejects.toMatchObject({ code: "42501" });
});

it("o último administrador e administradores da plataforma têm acesso protegido", async () => {
  await expect(
    db.query("select fn_admin_manage_user_access($1,$2,$3,'agent',false)", [operator, owner, org]),
  ).rejects.toThrow("last_admin");
  await expect(
    db.query("select fn_admin_manage_user_access($1,$2,null,null,true)", [operator, operator]),
  ).rejects.toThrow("protected_user");
  await expect(
    db.query("select fn_admin_manage_user_access($1,$2,$3,'viewer',false)", [owner, member, org]),
  ).rejects.toThrow("platform_admin_required");
  await db.query("select fn_admin_manage_user_access($1,$2,$3,'manager',false)", [
    operator,
    member,
    org,
  ]);
  expect(
    (
      await db.query(
        "select role from user_organizations where organization_id=$1 and user_id=$2",
        [org, member],
      )
    ).rows[0].role,
  ).toBe("manager");
});

it("plano manual preserva consumo e extras, converte a régua anterior e não duplica a concessão", async () => {
  await db.query(
    "update organization_ai_accounts set mode='platform',state='active',access_until=now()+interval '1 year',credit_meter='response_v2',monthly_allowance=300,monthly_remaining=250,extra_remaining=10,extra_debt=2,anchor_at=now(),period_start=now(),period_end=now()+interval '1 month' where organization_id=$1",
    [org],
  );
  const ref = randomUUID(),
    until = new Date(Date.now() + 365 * 86400000).toISOString();
  for (let i = 0; i < 2; i++)
    await db.query(
      "select fn_admin_set_commercial_plan($1,$2,$3,$4,'Concessão manual fictícia', $5)",
      [org, operator, plan, until, ref],
    );
  expect(
    (
      await db.query(
        "select plan_id,monthly_allowance,monthly_remaining,extra_remaining,extra_debt,credit_meter,user_limit,channel_limit from organization_ai_accounts where organization_id=$1",
        [org],
      )
    ).rows[0],
  ).toMatchObject({
    plan_id: plan,
    monthly_allowance: 6000,
    monthly_remaining: 5500,
    extra_remaining: 100,
    extra_debt: 20,
    credit_meter: "credit_v3",
    user_limit: 10,
    channel_limit: 3,
  });
  expect(
    (
      await db.query(
        "select count(*)::int count from ai_paid_access where organization_id=$1 and transaction_code=$2",
        [org, `manual:${ref}`],
      )
    ).rows[0].count,
  ).toBe(1);
  await expect(
    asUser(owner, "select fn_admin_set_commercial_plan($1,$2,$3,$4,'Tentativa sem acesso',$5)", [
      org,
      owner,
      plan,
      until,
      randomUUID(),
    ]),
  ).rejects.toMatchObject({ code: "42501" });
});
