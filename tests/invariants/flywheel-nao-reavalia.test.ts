import { afterAll, beforeAll, expect, it, vi } from "vitest";
import pg from "pg";

const { runModelCall } = vi.hoisted(() => ({ runModelCall: vi.fn(async () => ({
  provider: "openai", model: "modelo-ficticio", result: { text: '{"verdict":"yes"}' },
})) }));
vi.mock("@/lib/agent-engine/edge/llm/run-model-call", () => ({ runModelCall }));

import { runFlywheelOnce } from "@/lib/agent-engine/flywheel/live";

if (!process.env.TEST_DB_CONTAINER) throw new Error("Rode via pnpm test:db; nunca contra produção.");
// Uma vaga prova que o lock e as queries usam a mesma conexão, sem deadlock.
const pool = new pg.Pool({ connectionString: `postgresql://postgres:postgres@127.0.0.1:${process.env.TEST_DB_PORT ?? 54329}/postgres`, max: 1 });
const ORG = "f17e0000-0000-4000-8000-000000000030";
let jobId: string;
const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

beforeAll(async () => {
  await pool.query(`insert into organizations (id,slug,legal_name,display_name)
    values ($1,'flywheel-dedup-regressao','Teste','Teste')`, [ORG]);
  const { rows: contacts } = await pool.query(`insert into contacts (organization_id,display_name,source)
    values ($1,'Contato fictício','whatsapp') returning id`, [ORG]);
  const { rows: jobs } = await pool.query(`insert into job_queue (organization_id,contact_id,kind,status)
    values ($1,$2,'inbound_turn','done') returning id`, [ORG, contacts[0].id]);
  jobId = jobs[0].id;
  await pool.query(`insert into llm_calls (organization_id,contact_id,job_id,purpose,provider,model)
    values ($1,$2,$3,'agent_turn','openai','modelo-ficticio')`, [ORG, contacts[0].id, jobId]);
});

afterAll(async () => {
  await pool.query('delete from organizations where id=$1', [ORG]);
  await pool.end();
});

it("duas rodadas: um veredito e apenas uma chamada; nova rodada não paga avaliação duplicada", async () => {
  const first = await runFlywheelOnce(pool, {} as never, { limit: 1, log });
  const second = await runFlywheelOnce(pool, {} as never, { limit: 1, log });
  expect(first.judged).toBe(1);
  expect(second.judged).toBe(0);
  expect(runModelCall).toHaveBeenCalledOnce();
  const { rows } = await pool.query('select trace_id from flywheel_judge_verdicts where organization_id=$1', [ORG]);
  expect(rows).toEqual([{ trace_id: jobId }]);
});
