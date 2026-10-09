import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import {
  recordSupportRequest,
  recordSupportAnswer,
  recordSupportOperatorAction,
} from "@/lib/help/support-store";
import { countAs, GOV_ADMIN, GOV_AGENT_A, GOV_ORG, seedGov, sql } from "./gov-helpers";

const otherOrg = "eeeeeeee-0000-4000-8000-000000000001";
const otherUser = "eeeeeeee-0000-4000-8000-000000000003";
const otherThread = "eeeeeeee-0000-4000-8000-000000000004";
const thread = "eeeeeeee-0000-4000-8000-000000000002";
const pool = new pg.Pool({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT ?? 54329}/postgres`,
  max: 3,
});
afterAll(async () => {
  await pool.end();
});
beforeAll(() => {
  seedGov();
  sql(`insert into public.organizations(id, slug, display_name, legal_name) values ('${otherOrg}', 'support-other', 'Outra QA', 'Outra QA');
    insert into auth.users(id, email) values ('${otherUser}', 'support-other@invariant.test');
    insert into public.user_organizations(organization_id, user_id, role, accepted_at) values ('${otherOrg}', '${otherUser}', 'admin', now());
    insert into public.platform_support_threads(id, organization_id, created_by) values ('${otherThread}', '${otherOrg}', '${otherUser}');
    insert into public.platform_support_messages(organization_id, thread_id, client_message_id, author_kind, body) values ('${otherOrg}', '${otherThread}', gen_random_uuid(), 'user', 'Pergunta da outra organização');
    insert into public.platform_support_threads(id, organization_id, created_by) values ('${thread}', '${GOV_ORG}', '${GOV_ADMIN}');
    insert into public.platform_support_messages(organization_id, thread_id, client_message_id, author_kind, body) values ('${GOV_ORG}', '${thread}', gen_random_uuid(), 'user', 'Pergunta sintética QA');`);
});
it("os dois usuários leem o próprio histórico e nenhuma linha da outra organização", () => {
  for (const [user, ownOrg, foreignOrg] of [
    [GOV_ADMIN, GOV_ORG, otherOrg],
    [otherUser, otherOrg, GOV_ORG],
  ]) {
    for (const table of ["platform_support_threads", "platform_support_messages"]) {
      expect(
        countAs(user!, `select count(*) from public.${table} where organization_id='${ownOrg}';`),
      ).toBe(1);
      expect(
        countAs(
          user!,
          `select count(*) from public.${table} where organization_id='${foreignOrg}';`,
        ),
      ).toBe(0);
    }
  }
});
it("o histórico é pessoal mesmo entre colegas da mesma organização", () => {
  expect(countAs(GOV_ADMIN, "select count(*) from public.platform_support_messages;")).toBe(1);
  expect(countAs(GOV_AGENT_A, "select count(*) from public.platform_support_messages;")).toBe(0);
  expect(countAs(GOV_AGENT_A, "select count(*) from public.platform_support_threads;")).toBe(0);
});
it("a FK composta impede misturar chamado e organização", () => {
  expect(() =>
    sql(
      `insert into public.platform_support_messages(organization_id, thread_id, client_message_id, author_kind, body) values ('${otherOrg}', '${thread}', gen_random_uuid(), 'human', 'Mensagem cruzada');`,
    ),
  ).toThrow();
});
it("o navegador não pode forjar mensagens humanas nem editar o catálogo", () => {
  expect(
    sql(
      "select has_table_privilege('authenticated', 'public.platform_support_messages', 'INSERT');",
    ),
  ).toBe("f");
  expect(
    sql("select has_table_privilege('authenticated', 'public.commercial_plans', 'UPDATE');"),
  ).toBe("f");
  expect(
    sql("select has_table_privilege('anon', 'public.platform_support_messages', 'SELECT');"),
  ).toBe("f");
});
it("a oferta Pro está publicada com pagamento desligado e a foto permanece privada", () => {
  expect(
    sql(
      "select price_cents || ':' || publication_state || ':' || (hotmart_offer->>'enabled') from public.commercial_plans where slug='pro';",
    ),
  ).toBe("178200:published:false");
  expect(sql("select public from storage.buckets where id='profile-avatars';")).toBe("f");
});

it("pedido humano concorrente é registrado uma vez e a repetição do encerramento é segura", async () => {
  const input = {
    organizationId: GOV_ORG,
    userId: GOV_ADMIN,
    threadId: randomUUID(),
    messageId: randomUUID(),
    action: "handoff" as const,
    body: "Atendimento humano",
  };
  const results = await Promise.all([
    recordSupportRequest(pool, input),
    recordSupportRequest(pool, input),
  ]);
  expect(results.map((r) => r.duplicate).sort()).toEqual([false, true]);
  expect(sql(`select status from platform_support_threads where id='${input.threadId}'`)).toBe(
    "waiting_human",
  );
  expect(
    sql(`select count(*) from platform_support_messages where thread_id='${input.threadId}'`),
  ).toBe("1");
  const close = { ...input, action: "close" as const, messageId: randomUUID(), body: "Encerrar" };
  await recordSupportRequest(pool, close);
  expect(await recordSupportRequest(pool, close)).toMatchObject({
    duplicate: true,
    status: "closed",
  });
});

it("falha de gravação não assume o chamado nem deixa uma criação incompleta", async () => {
  const threadId = randomUUID();
  const input = {
    organizationId: GOV_ORG,
    userId: GOV_ADMIN,
    threadId,
    messageId: randomUUID(),
    action: "send" as const,
    body: "x".repeat(4001),
  };
  await expect(recordSupportRequest(pool, input)).rejects.toThrow();
  expect(sql(`select count(*) from platform_support_threads where id='${threadId}'`)).toBe("0");
  await recordSupportRequest(pool, { ...input, body: "Dúvida" });
  await expect(
    recordSupportOperatorAction(pool, {
      threadId,
      userId: GOV_ADMIN,
      action: "reply",
      body: "x".repeat(4001),
    }),
  ).rejects.toThrow();
  expect(
    sql(
      `select status||':'||(assigned_to is null)::text from platform_support_threads where id='${threadId}'`,
    ),
  ).toBe("open:true");
});

it("IA atrasada não responde após assumir ou encerrar, e outro operador não toma o chamado", async () => {
  const threadId = randomUUID();
  await recordSupportRequest(pool, {
    organizationId: GOV_ORG,
    userId: GOV_ADMIN,
    threadId,
    messageId: randomUUID(),
    action: "send",
    body: "Dúvida",
  });
  await recordSupportOperatorAction(pool, { threadId, userId: GOV_ADMIN, action: "claim" });
  await expect(
    recordSupportOperatorAction(pool, { threadId, userId: otherUser, action: "claim" }),
  ).rejects.toMatchObject({ code: "conflict" });
  const answer = {
    organizationId: GOV_ORG,
    userId: GOV_ADMIN,
    threadId,
    body: "Resposta atrasada",
    source: "manual" as const,
    needsHuman: true,
  };
  expect(await recordSupportAnswer(pool, answer)).toBe("human_active");
  await recordSupportOperatorAction(pool, { threadId, userId: GOV_ADMIN, action: "close" });
  expect(await recordSupportAnswer(pool, answer)).toBe("closed");
  expect(
    sql(
      `select count(*) from platform_support_messages where thread_id='${threadId}' and author_kind='assistant'`,
    ),
  ).toBe("0");
});

it("escrita do suporte mantém isolamento por organização e autor", async () => {
  for (const [organizationId, userId] of [
    [otherOrg, otherUser],
    [GOV_ORG, GOV_AGENT_A],
  ]) {
    await expect(
      recordSupportRequest(pool, {
        organizationId: organizationId!,
        userId: userId!,
        threadId: thread,
        messageId: randomUUID(),
        action: "close",
        body: "Encerrar",
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  }
  expect(sql(`select status from platform_support_threads where id='${thread}'`)).toBe("open");
});
