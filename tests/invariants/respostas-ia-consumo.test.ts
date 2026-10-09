import { beforeAll, expect, it } from "vitest";
import { countAs, sql, writeCountAs } from "./gov-helpers";

const A = "0245aaaa-0000-4000-8000-000000000001";
const B = "0245bbbb-0000-4000-8000-000000000001";
const USER_A = "0245aaaa-1111-4000-8000-000000000001";
const USER_B = "0245bbbb-1111-4000-8000-000000000001";
const VIEWER = "0245aaaa-1111-4000-8000-000000000002";
const entity = (org: string, group: string) => org.replace("0000-4000", `${group}-4000`);
const message = (n: number) => `0245aaaa-5555-4000-8000-${String(n).padStart(12, "0")}`;
function insert(n: number, eligible: boolean, status = "queued", direction = "outbound", org = A) {
  return `insert into messages(id,organization_id,conversation_id,contact_id,channel_session_id,type,direction,status,sent_via,ai_credit_eligible,body,metadata)
    values('${message(n)}','${org}','${entity(org, "4444")}','${entity(org, "3333")}','${entity(org, "2222")}','text','${direction}','${status}','ai',${eligible},'Conteúdo sintético privado','{"ai_generated":true}')`;
}
beforeAll(() => {
  sql(`insert into auth.users(id,email) values ('${USER_A}','usage-a@invariant.test'),('${USER_B}','usage-b@invariant.test'),('${VIEWER}','usage-viewer@invariant.test');
    insert into organizations(id,slug,display_name,legal_name) values ('${A}','usage-a','Usage A','Usage A'),('${B}','usage-b','Usage B','Usage B');
    insert into user_organizations(organization_id,user_id,role,accepted_at) values ('${A}','${USER_A}','admin',now()),('${B}','${USER_B}','admin',now()),('${A}','${VIEWER}','viewer',now());`);
  for (const [org, tag] of [
    [A, "a"],
    [B, "b"],
  ])
    sql(`
    insert into channel_sessions(id,organization_id,waha_session_name,webhook_secret_encrypted) values('${entity(org!, "2222")}','${org}','usage-${tag}','\\x00'::bytea);
    insert into contacts(id,organization_id,display_name) values('${entity(org!, "3333")}','${org}','Usage QA');
    insert into conversations(id,organization_id,contact_id,channel_session_id) values('${entity(org!, "4444")}','${org}','${entity(org!, "3333")}','${entity(org!, "2222")}');`);
});

it("fila, geração, falha, mensagem humana/fixa e inbound não geram consumo", () => {
  sql(
    `${insert(1, true)}; ${insert(2, true, "failed")}; ${insert(3, false, "sent")}; ${insert(4, true, "received", "inbound")};`,
  );
  expect(sql(`select count(*) from ai_response_usage where organization_id='${A}'`)).toBe("0");
});
it("aceitação gera um recibo e auditoria; ACKs/replays não duplicam", () => {
  sql(`set role service_role; update messages set status='sent' where id='${message(1)}';
    update messages set status='delivered' where id='${message(1)}';
    update messages set status='read' where id='${message(1)}';
    update messages set status='read' where id='${message(1)}';`);
  expect(sql(`select units from ai_response_usage where id='${message(1)}'`)).toBe("1");
  expect(
    sql(
      `select count(*) from api_audit_log where action='ai.response_counted' and resource_id='${message(1)}'`,
    ),
  ).toBe("1");
  expect(
    sql(
      `select metadata from api_audit_log where action='ai.response_counted' and resource_id='${message(1)}'`,
    ),
  ).toBe('{"units": 1}');
  sql(`update messages set status='sent' where id='${message(2)}';`);
  expect(sql(`select count(*) from ai_response_usage where organization_id='${A}'`)).toBe("2");
});
it("browser não pode declarar origem de IA nem gerar recibo forjando status", () => {
  expect(writeCountAs(USER_A, insert(5, true, "sent"))).toBe(1);
  expect(sql(`select ai_credit_eligible from messages where id='${message(5)}'`)).toBe("f");
  sql(`${insert(6, true)};`);
  expect(
    writeCountAs(
      USER_A,
      `update messages set ai_credit_eligible=false,status='sent' where id='${message(6)}'`,
    ),
  ).toBe(1);
  expect(sql(`select ai_credit_eligible from messages where id='${message(6)}'`)).toBe("t");
  expect(
    sql(`select count(*) from ai_response_usage where id in ('${message(5)}','${message(6)}')`),
  ).toBe("0");
  // O ACK legítimo pode reconhecer o envio após um crash, sem confiar no browser.
  sql(`set role service_role; update messages set status='delivered' where id='${message(6)}';`);
  expect(sql(`select count(*) from ai_response_usage where id='${message(6)}'`)).toBe("1");
});
it("recibo não some após exclusão/redação da mensagem e não guarda conteúdo", () => {
  sql(`delete from messages where id='${message(1)}';`);
  expect(sql(`select count(*) from ai_response_usage where id='${message(1)}'`)).toBe("1");
  expect(
    sql(
      `select string_agg(column_name,', ' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='ai_response_usage'`,
    ),
  ).toBe("id, organization_id, accepted_at, units, meter");
});
it("mesmo membro de dois tenants não transfere a origem de um envio de IA", () => {
  sql(
    `insert into user_organizations(organization_id,user_id,role,accepted_at) values('${B}','${USER_A}','admin',now()); ${insert(8, true)};`,
  );
  expect(() =>
    writeCountAs(
      USER_A,
      `update messages set organization_id='${B}',conversation_id='${entity(B, "4444")}',contact_id='${entity(B, "3333")}',channel_session_id='${entity(B, "2222")}' where id='${message(8)}'`,
    ),
  ).toThrow();
  expect(sql(`select organization_id from messages where id='${message(8)}'`)).toBe(A);
  sql(`delete from user_organizations where organization_id='${B}' and user_id='${USER_A}';`);
});
it("admins leem só o próprio consumo, viewer não lê e nenhuma escrita direta é permitida", () => {
  sql(`${insert(7, true, "sent", "outbound", B)};`);
  expect(
    countAs(USER_A, `select count(*) from ai_response_usage where organization_id='${A}'`),
  ).toBeGreaterThan(0);
  expect(
    countAs(USER_B, `select count(*) from ai_response_usage where organization_id='${B}'`),
  ).toBe(1);
  expect(
    countAs(USER_A, `select count(*) from ai_response_usage where organization_id='${B}'`),
  ).toBe(0);
  expect(
    countAs(USER_B, `select count(*) from ai_response_usage where organization_id='${A}'`),
  ).toBe(0);
  expect(countAs(VIEWER, "select count(*) from ai_response_usage")).toBe(0);
  for (const role of ["authenticated", "service_role"])
    for (const privilege of ["INSERT", "UPDATE", "DELETE"])
      expect(
        sql(`select has_table_privilege('${role}','public.ai_response_usage','${privilege}')`),
      ).toBe("f");
  for (const name of ["fn_registrar_resposta_ia", "fn_proteger_origem_credito_ia"])
    for (const role of ["anon", "authenticated", "service_role"])
      expect(sql(`select has_function_privilege('${role}','public.${name}()','EXECUTE')`)).toBe(
        "f",
      );
});
