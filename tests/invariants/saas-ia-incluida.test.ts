import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { countAs, sql, writeCountAs } from "./gov-helpers";
import { processHotmartPurchase } from "@/lib/billing/process-hotmart";
import type { HotmartPurchase } from "@/lib/billing/hotmart";
import {
  BUSINESS_SEGMENTS,
  BUSINESS_TEMPLATES,
  businessPrompts,
} from "@/lib/onboarding/business-templates";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";

const pool = new pg.Pool({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT}/postgres`,
  max: 12,
});
type Company = {
  org: string;
  user: string;
  channel: string;
  contact: string;
  conversation: string;
  hash: string;
};
let A: Company, B: Company;
async function company(managed = true): Promise<Company> {
  const c = {
    org: randomUUID(),
    user: randomUUID(),
    channel: randomUUID(),
    contact: randomUUID(),
    conversation: randomUUID(),
    hash: randomUUID().replaceAll("-", "").repeat(2),
  };
  await pool.query(`insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())`, [
    c.user,
    `${c.user}@invariant.test`,
  ]);
  await pool.query(
    `insert into organizations(id,slug,display_name,legal_name,signup_origin) values($1,$2,'Empresa fictícia','Empresa fictícia',$3)`,
    [c.org, `qa-${c.org}`, managed ? "self_service" : null],
  );
  await pool.query(
    `insert into user_organizations(organization_id,user_id,role,accepted_at) values($1,$2,'admin',now());`,
    [c.org, c.user],
  );
  await pool.query(
    `insert into channel_sessions(id,organization_id,waha_session_name,webhook_secret_encrypted,status,phone_number,verified_at,verification_phone_hash) values($1,$2,$3,'\\x00'::bytea,'WORKING',$4,now(),$5)`,
    [c.channel, c.org, `qa-${c.channel}`, `5599${Math.floor(Math.random() * 1e8)}`, c.hash],
  );
  await pool.query(
    `insert into contacts(id,organization_id,display_name) values($1,$2,'Contato fictício')`,
    [c.contact, c.org],
  );
  await pool.query(
    `insert into conversations(id,organization_id,contact_id,channel_session_id) values($1,$2,$3,$4)`,
    [c.conversation, c.org, c.contact, c.channel],
  );
  return c;
}
async function active(c: Company, units = 20) {
  await pool.query(
    `update organization_ai_accounts set state='active',anchor_at=now(),access_until=now()+interval '1 year',period_start=now(),period_end=now()+interval '1 month',monthly_allowance=$2,monthly_remaining=$2 where organization_id=$1`,
    [c.org, units],
  );
}
async function reserve(c: Company, reference: string) {
  return (await pool.query<{ id: string }>("select fn_ai_reserve($1,$2) id", [c.org, reference]))
    .rows[0]!.id;
}
async function countForUser(user: string, statement: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: user }),
    ]);
    return Number((await client.query(statement)).rows[0].count);
  } finally {
    await client.query("rollback");
    client.release();
  }
}
async function part(c: Company, id: string, index: number, status = "sent") {
  await pool.query(
    `insert into messages(organization_id,conversation_id,contact_id,channel_session_id,direction,type,body,status,ai_credit_eligible,ai_response_id,ai_response_part) values($1,$2,$3,$4,'outbound','text','Mensagem fictícia',$5,true,$6,$7)`,
    [c.org, c.conversation, c.contact, c.channel, status, id, index],
  );
}
beforeAll(async () => {
  await pool.query(
    `update platform_ai_settings set enabled=true,provider='openai',model='gpt-5.6-luna',requests_per_minute=1000`,
  );
  A = await company();
  B = await company();
  await active(A, 100);
  await active(B, 100);
});
afterAll(async () => {
  await pool.end();
});

it("todos os segmentos preparam uma única versão retomável, com organizador separado e sem dados da Advance", async () => {
  for (const segment of BUSINESS_SEGMENTS) {
    const c = await company();
    const template = BUSINESS_TEMPLATES[segment];
    const prompts = businessPrompts(segment, "Negócio fictício");
    const funnel = PACOTES.find(
      (p) => p.id === (template.funnel === "ecommerce" ? "loja" : template.funnel),
    )!;
    const args = [
      c.org,
      c.user,
      segment,
      1,
      prompts.conversation,
      prompts.organizer,
      ["crm_get_org_memory", "crm_search_knowledge"],
      ["crm_get_org_memory"],
      funnel.proposta,
      null,
    ];
    const first = (
      await pool.query(
        "select fn_prepare_business_agent($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result",
        args,
      )
    ).rows[0].result;
    const second = (
      await pool.query(
        "select fn_prepare_business_agent($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result",
        args,
      )
    ).rows[0].result;
    expect(second.version_id).toBe(first.version_id);
    expect(second.preserved).toBe(true);
    const proof = (
      await pool.query(
        `select
      (select count(*)::integer from ai_agent_versions where organization_id=$1) versions,
      v.operator_enabled,v.system_prompt||v.operator_prompt prompt,
      a.monthly_remaining,g.is_active
      from ai_agent_versions v join ai_agents g on g.id=v.agent_id and g.organization_id=v.organization_id
      join organization_ai_accounts a on a.organization_id=v.organization_id
      where v.organization_id=$1 and v.id=$2`,
        [c.org, first.version_id],
      )
    ).rows[0];
    expect(proof.versions).toBe(1);
    expect(proof.operator_enabled).toBe(true);
    expect(proof.prompt).not.toMatch(/Luana|Advance|paciente|odontol/i);
    expect(proof.monthly_remaining).toBe(0);
    expect(proof.is_active).toBe(false);
  }
});
it("agenda opcional persiste disponibilidade real e nova escolha cria rascunho sem sobrescrever publicação", async () => {
  const c = await company();
  const funnel = PACOTES.find((p) => p.id === "clinica")!;
  const agenda = {
    name: "Atendimento fictício",
    duration_minutes: 30,
    days: [1],
    start: "09:00",
    end: "11:00",
    schedule: {
      timezone: "America/Fortaleza",
      windows: [{ dow: 1, start: "09:00", end: "11:00" }],
    },
  };
  const prompts = businessPrompts("barbearia", "Negócio fictício", true);
  const args = [
    c.org,
    c.user,
    "barbearia",
    1,
    prompts.conversation,
    prompts.organizer,
    ["crm_get_org_memory"],
    ["crm_get_org_memory"],
    funnel.proposta,
    agenda,
  ];
  const first = (
    await pool.query(
      "select fn_prepare_business_agent($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result",
      args,
    )
  ).rows[0].result;
  expect(
    sql(
      `select duration_minutes from calendar_event_types where organization_id='${c.org}' and slug='onboarding-atendimento'`,
    ),
  ).toBe("30");
  expect(
    sql(
      `select schedule->>'timezone' from attendant_availability where organization_id='${c.org}' and user_id='${c.user}'`,
    ),
  ).toBe("America/Fortaleza");
  const changed = [...args];
  changed[9] = { ...agenda, duration_minutes: 45 };
  const second = (
    await pool.query(
      "select fn_prepare_business_agent($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result",
      changed,
    )
  ).rows[0].result;
  expect(second.version_id).not.toBe(first.version_id);
  await pool.query("select fn_activate_business_agent($1,$2,$3,$4,$5,$6,$7,$8)", [
    c.org,
    c.user,
    first.agent_id,
    second.version_id,
    c.hash,
    c.hash,
    null,
    null,
  ]);
  expect(sql(`select published_version_id from ai_agents where id='${first.agent_id}'`)).toBe(
    second.version_id,
  );
  const third = (
    await pool.query(
      "select fn_prepare_business_agent($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) result",
      args,
    )
  ).rows[0].result;
  expect(third.version_id).toBe(second.version_id);
  expect(third.preserved).toBe(true);
  expect(
    sql(
      `select duration_minutes from calendar_event_types where organization_id='${c.org}' and slug='onboarding-atendimento'`,
    ),
  ).toBe("45");
});
it("limpeza retém prova de teste, minimiza sinais e mede consumo sem transformar custo desconhecido em zero", async () => {
  const c = await company();
  await trial(c);
  await pool.query(
    `update ai_trial_claims set created_at=now()-interval '100 days' where organization_id=$1`,
    [c.org],
  );
  await pool.query("select fn_ai_trial_retention(1825,90,1000)");
  expect(
    sql(
      `select (device_hash is null and ip_hash is null)::text from ai_trial_claims where organization_id='${c.org}'`,
    ),
  ).toBe("true");
  expect(sql(`select count(*) from ai_trial_claims where organization_id='${c.org}'`)).toBe("1");
  await pool.query(
    `insert into llm_calls(organization_id,purpose,provider,model,status) values($1,'agent_test','openai','qa-model','ok')`,
    [c.org],
  );
  const report = (
    await pool.query(
      `select fn_admin_ai_usage(now()-interval '1 day',now()+interval '1 second',0,200) result`,
    )
  ).rows[0].result;
  const row = report.rows.find((r: { organization_id: string }) => r.organization_id === c.org);
  expect(row.unknown_cost_calls).toBe(1);
  expect(row.known_cost_usd_cents).toBeNull();
});

it("reservas concorrentes não gastam o mesmo crédito e replay conserva a identidade", async () => {
  const c = await company();
  await active(c, 10);
  const out = await Promise.allSettled(
    Array.from({ length: 10 }, (_, i) => reserve(c, `concorrencia-${i}`)),
  );
  expect(out.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(
    sql(`select monthly_remaining from organization_ai_accounts where organization_id='${c.org}'`),
  ).toBe("0");
  const id = (out.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<string>).value;
  const reference = sql(`select reference from ai_response_reservations where id='${id}'`);
  expect(await reserve(c, reference)).toBe(id);
});
it("uma resposta em três partes é debitada uma vez após a última aceitação", async () => {
  const c = await company();
  await active(c, 50);
  const id = await reserve(c, "split");
  await pool.query(
    `update ai_response_reservations set expected_parts=3,sealed_at=now() where organization_id=$1 and id=$2`,
    [c.org, id],
  );
  await part(c, id, 1);
  await part(c, id, 2);
  expect(
    sql(`select count(*) from ai_credit_ledger where organization_id='${c.org}' and kind='debit'`),
  ).toBe("0");
  await part(c, id, 3);
  await part(c, id, 3, "delivered");
  expect(
    sql(`select count(*) from ai_credit_ledger where organization_id='${c.org}' and kind='debit'`),
  ).toBe("1");
  expect(sql(`select state from ai_response_reservations where id='${id}'`)).toBe("committed");
  expect(sql(`select count(*) from ai_response_usage where organization_id='${c.org}'`)).toBe("0");
});
it("falha definitiva libera reserva; envio incerto exige reconciliação", async () => {
  const c = await company();
  await active(c, 50);
  const id = await reserve(c, "incerta");
  await pool.query(
    `update ai_response_reservations set expected_parts=2,sealed_at=now() where id=$1`,
    [id],
  );
  await part(c, id, 1);
  await part(c, id, 2, "sending");
  expect(
    (await pool.query("select fn_ai_settle($1,$2,true) state", [c.org, id])).rows[0].state,
  ).toBe("uncertain");
  await pool.query(
    `update messages set status='failed' where organization_id=$1 and ai_response_id=$2 and ai_response_part=2`,
    [c.org, id],
  );
  expect(
    (await pool.query("select fn_ai_settle($1,$2,true) state", [c.org, id])).rows[0].state,
  ).toBe("released");
  expect(
    sql(`select monthly_remaining from organization_ai_accounts where organization_id='${c.org}'`),
  ).toBe("50");
  await expect(reserve(c, "incerta")).rejects.toThrow("ai_reservation_released");
});
it("mensagem e memória não podem apontar para recursos de outra empresa", async () => {
  const id = await reserve(A, "isolamento");
  await part(A, id, 1);
  await expect(part(B, id, 1)).rejects.toThrow();
  const v = sql(`select fn_onboarding_memory('${A.org}','${A.user}','Informação fictícia')`);
  expect(sql(`select fn_onboarding_memory('${A.org}','${A.user}','Informação fictícia')`)).toBe(v);
  expect(() =>
    sql(
      `insert into org_memory_pointers(organization_id,version_id) values('${B.org}','${v}') on conflict(organization_id) do update set version_id=excluded.version_id`,
    ),
  ).toThrow();
});
it("RLS isola contas, reservas, recibos e extratos nos dois sentidos", async () => {
  for (const c of [A, B]) {
    const id = await reserve(c, "rls");
    await pool.query(
      "update ai_response_reservations set expected_parts=1,sealed_at=now() where id=$1",
      [id],
    );
    await part(c, id, 1);
  }
  for (const table of [
    "organization_ai_accounts",
    "ai_credit_ledger",
    "ai_response_reservations",
    "ai_response_parts",
  ]) {
    for (const [owner, neighbor] of [
      [A, B],
      [B, A],
    ]) {
      expect(
        await countForUser(
          owner!.user,
          `select count(*) from ${table} where organization_id='${owner!.org}'`,
        ),
      ).toBeGreaterThan(0);
      expect(
        await countForUser(
          owner!.user,
          `select count(*) from ${table} where organization_id='${neighbor!.org}'`,
        ),
      ).toBe(0);
    }
    for (const op of ["INSERT", "UPDATE", "DELETE"])
      expect(
        (await pool.query(`select has_table_privilege('authenticated','${table}','${op}')`)).rows[0]
          .has_table_privilege,
      ).toBe(false);
  }
  for (const c of [A, B])
    for (const table of [
      "ai_trial_claims",
      "ai_paid_access",
      "ai_trial_exceptions",
      "ai_operational_buckets",
    ]) {
      await expect(
        countForUser(c.user, `select count(*) from ${table} where organization_id='${c.org}'`),
      ).rejects.toThrow();
      for (const op of ["SELECT", "INSERT", "UPDATE", "DELETE"])
        expect(
          (await pool.query(`select has_table_privilege('authenticated','${table}','${op}')`))
            .rows[0].has_table_privilege,
        ).toBe(false);
    }
});
it("RPCs financeiras e antifraude nunca ficam executáveis por anon ou authenticated", () => {
  const exposed =
    sql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and
    ((p.proname like 'fn_ai_%' and p.proname <> 'fn_ai_credit_usage') or p.proname in('fn_onboarding_memory','fn_provision_self_service','fn_prepare_business_agent','fn_activate_business_agent','fn_admin_ai_account','fn_admin_saas_overview','fn_admin_publish_credit_pack'))
    and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))`);
  expect(exposed).toBe("0");
  // A consulta de consumo é invoker: pode ler apenas o ledger permitido por RLS.
  expect(
    sql(
      "select prosecdef from pg_proc where oid='public.fn_ai_credit_usage(uuid,timestamptz,timestamptz)'::regprocedure",
    ),
  ).toBe("f");
  expect(
    sql(
      "select has_function_privilege('anon','public.fn_ai_credit_usage(uuid,timestamptz,timestamptz)','EXECUTE')",
    ),
  ).toBe("f");
});
it("browser não pode forjar controle do WhatsApp ou transferir o canal", () => {
  expect(() =>
    writeCountAs(
      A.user,
      `update channel_sessions set status='STOPPED',verified_at=now(),verification_phone_hash='${"f".repeat(64)}' where id='${A.channel}'`,
    ),
  ).toThrow();
  expect(sql(`select status from channel_sessions where id='${A.channel}'`)).toBe("WORKING");
});
async function trial(
  c: Company,
  owner = c.hash,
  phone = c.hash,
  ip = "a".repeat(64),
  device = "b".repeat(64),
) {
  return pool.query("select fn_ai_start_trial($1,$2,$3,$4,$5,$6)", [
    c.org,
    c.user,
    owner,
    phone,
    device,
    ip,
  ]);
}
it("teste é atômico, depende de e-mail e WhatsApp verificados, IP compartilhado é permitido", async () => {
  const c = await company();
  await pool.query("update auth.users set email_confirmed_at=null where id=$1", [c.user]);
  await expect(trial(c)).rejects.toThrow("ai_trial_identity_unverified");
  await pool.query("update auth.users set email_confirmed_at=now() where id=$1", [c.user]);
  await pool.query("update channel_sessions set verified_at=null where id=$1", [c.channel]);
  await expect(trial(c)).rejects.toThrow("whatsapp_verification_required");
  await pool.query("update channel_sessions set verified_at=now() where id=$1", [c.channel]);
  await Promise.all([trial(c), trial(c)]);
  expect(
    sql(`select monthly_remaining from organization_ai_accounts where organization_id='${c.org}'`),
  ).toBe("1000");
  expect(
    sql(`select count(*) from ai_credit_ledger where organization_id='${c.org}' and kind='trial'`),
  ).toBe("1");
  const other = await company();
  await trial(other);
  expect(
    sql(`select state from organization_ai_accounts where organization_id='${other.org}'`),
  ).toBe("trial");
  const duplicate = await company();
  await expect(trial(duplicate, c.hash)).rejects.toThrow();
  await pool.query("update channel_sessions set verification_phone_hash=$2 where id=$1", [
    duplicate.channel,
    c.hash,
  ]);
  await expect(
    trial(duplicate, duplicate.hash, c.hash, "c".repeat(64), "d".repeat(64)),
  ).rejects.toThrow();
  expect(
    sql(`select state from organization_ai_accounts where organization_id='${duplicate.org}'`),
  ).toBe("pending");
});
it("meses menores conservam a âncora original e renovação não acumula franquia", async () => {
  expect(sql(`select fn_ai_anniversary('2028-01-31T10:42:00Z',1)`)).toBe("2028-02-29 10:42:00+00");
  expect(sql(`select fn_ai_anniversary('2028-01-31T10:42:00Z',2)`)).toBe("2028-03-31 10:42:00+00");
  const c = await company();
  await active(c, 1000);
  await pool.query(
    `update organization_ai_accounts set anchor_at=now()-interval '2 months',period_start=now()-interval '2 months',period_end=now()-interval '1 month',monthly_remaining=15,extra_remaining=17 where organization_id=$1`,
    [c.org],
  );
  await Promise.all(Array.from({ length: 5 }, () => pool.query("select fn_ai_renew($1)", [c.org])));
  expect(
    sql(
      `select monthly_remaining||':'||extra_remaining from organization_ai_accounts where organization_id='${c.org}'`,
    ),
  ).toBe("1000:17");
  expect(
    sql(
      `select count(*) from ai_credit_ledger where organization_id='${c.org}' and kind='renewal'`,
    ),
  ).toBe("1");
});
it("limites de convites e WhatsApps são serializados no banco", async () => {
  const c = await company();
  await active(c);
  // Owner e WhatsApp inicial ocupam uma de duas vagas: duas requisições
  // concorrentes disputam a última vaga, inclusive com convite ainda pendente.
  await pool.query(
    `update organization_ai_accounts set user_limit=2,channel_limit=2 where organization_id=$1`,
    [c.org],
  );
  const users = [randomUUID(), randomUUID()];
  for (const id of users)
    await pool.query(`insert into auth.users(id,email) values($1,$2)`, [
      id,
      `${id}@invariant.test`,
    ]);
  const out = await Promise.allSettled(
    users.map((id) =>
      pool.query(
        `insert into user_organizations(organization_id,user_id,role) values($1,$2,'viewer')`,
        [c.org, id],
      ),
    ),
  );
  expect(out.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rejectedUsers = out.filter((r) => r.status === "rejected");
  expect(rejectedUsers).toHaveLength(1);
  expect(String(rejectedUsers[0]!.reason)).toContain("commercial_user_limit");
  expect(
    (
      await pool.query(
        `select count(*)::integer count from user_organizations where organization_id=$1`,
        [c.org],
      )
    ).rows[0].count,
  ).toBe(2);

  const channels = await Promise.allSettled(
    [randomUUID(), randomUUID()].map((name) =>
      pool.query(
        `insert into channel_sessions(organization_id,waha_session_name,webhook_secret_encrypted) values($1,$2,'\\x00'::bytea)`,
        [c.org, name],
      ),
    ),
  );
  expect(channels.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rejectedChannels = channels.filter((r) => r.status === "rejected");
  expect(rejectedChannels).toHaveLength(1);
  expect(String(rejectedChannels[0]!.reason)).toContain("commercial_channel_limit");
  expect(
    (
      await pool.query(
        `select count(*)::integer count from channel_sessions where organization_id=$1 and archived_at is null`,
        [c.org],
      )
    ).rows[0].count,
  ).toBe(2);
});
it("saldo esgotado permite humano; período encerrado impede nova operação e mantém leitura", async () => {
  const c = await company();
  await active(c, 0);
  expect(
    writeCountAs(
      c.user,
      `insert into contacts(organization_id,display_name) values('${c.org}','Humano fictício')`,
    ),
  ).toBe(1);
  const settingsCommand = `set role authenticated;
    select set_config('request.jwt.claims','${JSON.stringify({ sub: c.user, aal: "aal1" })}',false);
    select public.fn_agenda_settings('${c.org}','{"confirmation_delay_minutes":30,"unknown_protection_minutes":60}'::jsonb);`;
  expect(() => sql(settingsCommand)).not.toThrow();
  await pool.query(
    `update organization_ai_accounts set state='expired',access_until=now()-interval '1 second' where organization_id=$1`,
    [c.org],
  );
  expect(() =>
    writeCountAs(
      c.user,
      `insert into contacts(organization_id,display_name) values('${c.org}','Sem acesso')`,
    ),
  ).toThrow();
  expect(
    countAs(c.user, `select count(*) from contacts where organization_id='${c.org}'`),
  ).toBeGreaterThan(0);
  // SECURITY DEFINER mantém o ROLE original: uma RPC não contorna a expiração.
  expect(() => sql(settingsCommand)).toThrow("commercial_read_only");
  expect(
    writeCountAs(
      c.user,
      `update organizations set display_name='Operação após vencimento' where id='${c.org}'`,
    ),
  ).toBe(0);
});
it("cadastro do site aparece automaticamente na conta de plataforma sem afetar uma organização legada", async () => {
  const u = randomUUID();
  await pool.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [
    u,
    `${u}@invariant.test`,
  ]);
  const ids = await Promise.all([
    pool.query("select fn_provision_self_service($1,$2,$3) id", [u, "Empresa fictícia", `qa-${u}`]),
    pool.query("select fn_provision_self_service($1,$2,$3) id", [u, "Empresa fictícia", `qa-${u}`]),
  ]);
  expect(ids[0].rows[0].id).toBe(ids[1].rows[0].id);
  expect(sql(`select signup_origin from organizations where id='${ids[0].rows[0].id}'`)).toBe(
    "self_service",
  );
  expect(
    sql(`select mode from organization_ai_accounts where organization_id='${ids[0].rows[0].id}'`),
  ).toBe("platform");
  const legacy = await company(false);
  expect(
    sql(`select mode from organization_ai_accounts where organization_id='${legacy.org}'`),
  ).toBe("legacy");
  expect(await reserve(legacy, "nao-debita")).toBeNull();
});
it("somente as RPCs restritas conferem Auth; service_role não precisa ler a tabela inteira", async () => {
  const c = await company();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("revoke select on auth.users from service_role");
    await client.query("set local role service_role");
    await client.query("select fn_ai_start_trial($1,$2,$3,$4,$5,$6)", [
      c.org,
      c.user,
      c.hash,
      c.hash,
      null,
      null,
    ]);
    const proof = await client.query(
      "select state,monthly_remaining from organization_ai_accounts where organization_id=$1",
      [c.org],
    );
    expect(proof.rows[0]).toEqual({ state: "trial", monthly_remaining: 1000 });
    const org = await client.query("select fn_provision_self_service($1,$2,$3) id", [
      c.user,
      "Empresa fictícia",
      `qa-${c.user}`,
    ]);
    expect(org.rows[0].id).toBe(c.org);
    await expect(client.query("select id from auth.users limit 1")).rejects.toThrow(
      "permission denied",
    );
  } finally {
    await client.query("rollback");
    client.release();
  }
});
it("Hotmart confirma um único saldo, estorno vence empate e uma aprovação atrasada não restaura acesso", async () => {
  const c = await company();
  const reference = randomUUID().replaceAll("-", "").slice(0, 24);
  const product = randomUUID();
  await pool.query(
    `insert into billing_checkouts(organization_id,created_by,reference,plan_id,product_ucode,offer_code,price_cents,limits_snapshot) select $1,$2,$3,id,$4,'qa',1000,limits from commercial_plans where slug='pro'`,
    [c.org, c.user, reference, product],
  );
  const e: HotmartPurchase = {
    event_id: randomUUID(),
    event: "PURCHASE_APPROVED",
    occurred_at: new Date().toISOString(),
    product_ucode: product,
    offer_code: "qa",
    transaction: randomUUID(),
    amount_cents: 1000,
    currency: "BRL",
    status: "APPROVED",
    reference,
    subscriber_code: randomUUID(),
    subscription_status: "ACTIVE",
    next_charge_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  };
  await Promise.all([processHotmartPurchase(pool, e), processHotmartPurchase(pool, e)]);
  expect(
    sql(`select monthly_remaining from organization_ai_accounts where organization_id='${c.org}'`),
  ).toBe("3000");
  expect(
    sql(
      `select count(*) from ai_credit_ledger where organization_id='${c.org}' and kind='subscription'`,
    ),
  ).toBe("1");
  await processHotmartPurchase(pool, {
    ...e,
    event_id: randomUUID(),
    event: "PURCHASE_REFUNDED",
    status: "REFUNDED",
  });
  expect(sql(`select state from organization_ai_accounts where organization_id='${c.org}'`)).toBe(
    "expired",
  );
  await processHotmartPurchase(pool, {
    ...e,
    event_id: randomUUID(),
    occurred_at: new Date(Date.now() + 10000).toISOString(),
  });
  expect(sql(`select status from billing_payments where transaction_code='${e.transaction}'`)).toBe(
    "REFUNDED",
  );
  expect(sql(`select state from organization_ai_accounts where organization_id='${c.org}'`)).toBe(
    "expired",
  );
});

it("Storage permite configuração e trabalho humano sem saldo, mas nega gravação no período encerrado", async () => {
  const c = await company();
  const allowed = () =>
    countForUser(
      c.user,
      `select case when public.fn_support_storage_write_allowed('${c.org}/qa.png') then 1 else 0 end as count`,
    );
  expect(await allowed()).toBe(1);
  await active(c, 0);
  expect(await allowed()).toBe(1);
  // A RPC auxiliar também deve esconder o período de outra empresa.
  expect(
    await countForUser(
      A.user,
      `select case when public.fn_support_storage_write_allowed('${c.org}/qa.png') then 1 else 0 end as count`,
    ),
  ).toBe(0);
  await active(B, 0);
  expect(
    await countForUser(
      B.user,
      `select case when public.fn_support_storage_write_allowed('${B.org}/qa.png') then 1 else 0 end as count`,
    ),
  ).toBe(1);
  expect(
    await countForUser(
      c.user,
      `select case when public.fn_support_storage_write_allowed('${B.org}/qa.png') then 1 else 0 end as count`,
    ),
  ).toBe(0);
  await pool.query(
    "update organization_ai_accounts set state='expired',access_until=now()-interval '1 second' where organization_id=$1",
    [c.org],
  );
  expect(await allowed()).toBe(0);
  await pool.query(
    "update organization_ai_accounts set state='active',access_until=null where organization_id=$1",
    [c.org],
  );
  expect(await allowed()).toBe(0);
  const legacy = await company(false);
  expect(
    await countForUser(
      legacy.user,
      `select case when public.fn_support_storage_write_allowed('${legacy.org}/qa.png') then 1 else 0 end as count`,
    ),
  ).toBe(1);
});
