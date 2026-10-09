import { afterAll, beforeAll, expect, it } from "vitest";
import pg from "pg";
import { commitHumanCaseReply } from "@/lib/agent-engine/agent/human-case-reply";
import { openCase } from "@/lib/agent-engine/agent/human-cases";
import { sql } from "./gov-helpers";
const pool = new pg.Pool({
  connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT ?? 54329}/postgres`,
  max: 3,
});
const org = "0244cccc-0000-4000-8000-000000000001",
  contact = "0244cccc-0000-4000-8000-000000000002";
const session = "0244cccc-0000-4000-8000-000000000003",
  conv = "0244cccc-0000-4000-8000-000000000004",
  actor = "0244cccc-0000-4000-8000-000000000005";
let caseId = "",
  version = "";
beforeAll(async () => {
  sql(`insert into auth.users(id,email) values ('${actor}','case-reply@invariant.test');
    insert into organizations(id,slug,display_name,legal_name) values ('${org}','case-reply-qa','Case QA','Case QA');
    insert into contacts(id,organization_id,name,phone_number) values ('${contact}','${org}','Contato QA','+5511900000244');
    insert into channel_sessions(id,organization_id,waha_session_name,status,webhook_secret_encrypted) values ('${session}','${org}','case-reply-qa','WORKING','\\x00'::bytea);
    insert into conversations(id,organization_id,contact_id,channel_session_id,status,is_group) values ('${conv}','${org}','${contact}','${session}','ai_handling',false);`);
  const opened = await openCase(
    pool,
    { tenantId: org, conversationId: conv },
    { title: "Condição comercial", summary: "Precisa de orientação", blocker: "Aprovação humana" },
  );
  if (!opened.ok) throw new Error("case_fixture_failed");
  caseId = opened.caseId;
  version = sql(`select updated_at::text from agent_cases where id='${caseId}'`);
});
afterAll(async () => {
  await pool.end();
});
it("outra organização ou versão diferente não enfileiram nada", async () => {
  const input = {
    organizationId: org,
    caseId,
    actorUserId: actor,
    contactId: contact,
    action: "resolved" as const,
    body: "Orientação QA",
    expectedUpdatedAt: version,
  };
  expect(
    await commitHumanCaseReply(pool, {
      ...input,
      organizationId: "0244cccc-0000-4000-8000-000000000099",
    }),
  ).toBe(false);
  expect(
    await commitHumanCaseReply(pool, { ...input, expectedUpdatedAt: "2020-01-01T00:00:00Z" }),
  ).toBe(false);
  expect(
    sql(`select count(*) from job_queue where organization_id='${org}' and kind='case_reply_turn'`),
  ).toBe("0");
});
it("confirmações concorrentes preservam uma orientação e uma próxima vez da IA", async () => {
  const input = {
    organizationId: org,
    caseId,
    actorUserId: actor,
    contactId: contact,
    action: "resolved" as const,
    body: "Condição aprovada pelo gestor",
    expectedUpdatedAt: version,
  };
  const results = await Promise.all([
    commitHumanCaseReply(pool, input),
    commitHumanCaseReply(pool, input),
  ]);
  expect(results.sort()).toEqual([false, true]);
  expect(sql(`select status from agent_cases where id='${caseId}'`)).toBe("resolved");
  expect(
    sql(
      `select count(*) from agent_case_events where case_id='${caseId}' and kind='human_replied'`,
    ),
  ).toBe("1");
  expect(
    sql(`select count(*) from job_queue where organization_id='${org}' and kind='case_reply_turn'`),
  ).toBe("1");
  expect(
    sql(
      `select payload->>'body' from job_queue where organization_id='${org}' and kind='case_reply_turn'`,
    ),
  ).toBe(input.body);
});
