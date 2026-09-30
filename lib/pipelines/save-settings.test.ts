import { beforeEach, expect, it, vi } from "vitest";
import { savePipelineSettings } from "./save-settings";
import { makeDb, funilRow, PIPE, ORG_ID, OUTRA_ORG } from "@/tests/helpers/stages-db-double";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

it("somente uma edição concorrente vence, sem misturar ou apagar settings", async () => {
  const db = makeDb({ pipelines: [{ ...funilRow({ id: PIPE, name: "Vendas" }), settings: { fields: [] } }] as never });
  const input = { organizationId: ORG_ID, pipelineId: PIPE, expectedUpdatedAt: "2026-09-28T00:00:00Z" };
  const results = await Promise.all([
    savePipelineSettings(db.client as never, { ...input, settings: { fields: [], flow: { template_id: "clinica" } } }),
    savePipelineSettings(db.client as never, { ...input, settings: { fields: ["novo"] } }),
  ]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(db.tabelas.crm_pipelines[0]?.settings).toEqual({ fields: [], flow: { template_id: "clinica" } });
});

it("recusa organização diferente e funil arquivado", async () => {
  const db = makeDb({ pipelines: [{ ...funilRow({ id: PIPE, name: "Vendas", is_archived: true }), settings: {} }] as never });
  for (const organizationId of [ORG_ID, OUTRA_ORG]) {
    expect(await savePipelineSettings(db.client as never, { organizationId, pipelineId: PIPE, expectedUpdatedAt: "2026-09-28T00:00:00Z", settings: { flow: {} } })).toBe(false);
  }
  expect(db.tabelas.crm_pipelines[0]?.settings).toEqual({});
});
