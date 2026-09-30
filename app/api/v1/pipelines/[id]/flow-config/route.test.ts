import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { audit } from "@/lib/audit";
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/impersonate/support", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/impersonate/support")>(),
  requireSupportWrite: vi.fn(async () => null),
}));

import { ORG_ID, PIPE, authOk, etapa, funilRow, makeDb } from "@/tests/helpers/stages-db-double";

const S1 = "55555555-5555-4555-8555-555555555551";
const S2 = "55555555-5555-4555-8555-555555555552";
const OTHER = "66666666-6666-4666-8666-666666666666";
const CTX = { params: Promise.resolve({ id: PIPE }) };

function reqPut(body: unknown) {
  return new NextRequest(`http://localhost/api/v1/pipelines/${PIPE}/flow-config`, {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    stage_guidance: { [S1]: { purpose: "Primeira conversa" }, [S2]: { purpose: "Proposta aceita" } },
    event_stage_ids: { appointment_pending: S1, appointment_confirmed: S2, human_handoff: null },
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("/api/v1/pipelines/[id]/flow-config", () => {
  it("mostra destinos legados como ids e mantém nulo explícito como movimentação manual", async () => {
    authOk();
    makeDb({
      pipelines: [{ ...funilRow({ id: PIPE, name: "Comercial" }), settings: { flow: { event_stage_ids: { appointment_pending: null } } } }] as never,
      stages: [
        etapa({ id: S1, name: "Solicitado", slug: "agendamento-solicitado", pipeline_id: PIPE }),
        etapa({ id: S2, name: "Confirmado", slug: "agendado", pipeline_id: PIPE }),
        etapa({ id: OTHER, name: "Handoff", slug: "chamar-humano", pipeline_id: PIPE }),
      ],
    });
    const { GET } = await import("./route");
    const res = await GET(new NextRequest(`http://localhost/api/v1/pipelines/${PIPE}/flow-config`), CTX);
    const result = (await res.json()) as { data: { event_stage_ids: Record<string, string | null> } };
    expect(result.data.event_stage_ids).toEqual({ appointment_pending: null, appointment_confirmed: S2, human_handoff: OTHER });
  });

  it("apresenta oportunidades antigas para revisão sem movimentá-las", async () => {
    authOk();
    const pipeline = {
      ...funilRow({ id: PIPE, name: "Comercial" }),
      settings: { flow: { event_stage_ids: { appointment_pending: null, appointment_confirmed: S2, human_handoff: null } } },
    };
    const db = makeDb({
      pipelines: [pipeline] as never,
      stages: [
        etapa({ id: S1, name: "Novo", pipeline_id: PIPE }),
        etapa({ id: S2, name: "Consulta marcada", pipeline_id: PIPE }),
      ],
      leads: [{ id: "lead-old", title: "Oportunidade antiga", contact_id: "contact-1", stage_id: S1, pipeline_id: PIPE, organization_id: ORG_ID, status: "open" }] as never,
      calendarAppointments: [{ id: "appointment-1", title: "Consulta", contact_id: "contact-1", status: "confirmed", starts_at: "2026-09-28T12:00:00.000Z", organization_id: ORG_ID }],
    });
    const { GET } = await import("./route");
    const res = await GET(new NextRequest(`http://localhost/api/v1/pipelines/${PIPE}/flow-config`), CTX);
    const result = (await res.json()) as { data: { reconciliation_preview: { proposals: Array<{ lead_id: string; suggested_stage_id: string }>; ambiguous: unknown[] } } };

    expect(result.data.reconciliation_preview.proposals).toEqual([
      expect.objectContaining({ lead_id: "lead-old", suggested_stage_id: S2 }),
    ]);
    expect(result.data.reconciliation_preview.ambiguous).toEqual([]);
    expect(db.escritas).toEqual([]);
  });

  it("salva descrições e destinos por ids ativos, preservando outras configurações", async () => {
    authOk();
    const pipeline = { ...funilRow({ id: PIPE, name: "Comercial" }), settings: { custom_fields: [{ key: "origem" }], flow: { template_id: "servicos", outro: true } } };
    const db = makeDb({
      pipelines: [pipeline] as never,
      stages: [
        etapa({ id: S1, name: "Contato", agent_stage_hint: "new", pipeline_id: PIPE }),
        etapa({ id: S2, name: "Ganho", is_won: true, agent_stage_hint: "won", pipeline_id: PIPE }),
      ],
    });
    const { PUT } = await import("./route");
    const res = await PUT(reqPut(body()), CTX);

    expect(res.status).toBe(200);
    const atual = db.tabelas.crm_pipelines.find((row) => row.id === PIPE)!;
    expect(atual.settings).toMatchObject({
      custom_fields: [{ key: "origem" }],
      flow: {
        template_id: "servicos",
        outro: true,
        stage_guidance: { [S1]: { purpose: "Primeira conversa" }, [S2]: { purpose: "Proposta aceita" } },
        event_stage_ids: { appointment_pending: S1, appointment_confirmed: S2, human_handoff: null },
      },
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "pipeline.config_updated", organizationId: ORG_ID }));
  });

  it("recusa destinos de outro funil ou organização", async () => {
    authOk();
    makeDb({
      pipelines: [funilRow({ id: PIPE, name: "Comercial" })],
      stages: [
        etapa({ id: S1, name: "Contato", pipeline_id: PIPE }),
        etapa({ id: S2, name: "Proposta", pipeline_id: PIPE }),
        etapa({ id: OTHER, name: "Outra empresa", organization_id: "77777777-7777-4777-8777-777777777777", pipeline_id: "88888888-8888-4888-8888-888888888888" }),
      ],
    });
    const { PUT } = await import("./route");
    const res = await PUT(reqPut(body({ event_stage_ids: { appointment_pending: OTHER, appointment_confirmed: null, human_handoff: null } })), CTX);
    expect(res.status).toBe(422);
    expect(audit).not.toHaveBeenCalled();
  });

  it("exige orientação para todas as etapas ativas", async () => {
    authOk();
    makeDb({
      pipelines: [funilRow({ id: PIPE, name: "Comercial" })],
      stages: [etapa({ id: S1, name: "Contato", pipeline_id: PIPE }), etapa({ id: S2, name: "Proposta", pipeline_id: PIPE })],
    });
    const { PUT } = await import("./route");
    const res = await PUT(reqPut({
      stage_guidance: { [S1]: { purpose: "Primeira conversa" } },
      event_stage_ids: { appointment_pending: null, appointment_confirmed: null, human_handoff: null },
    }), CTX);
    expect(res.status).toBe(422);
  });
});


it("considera negócios abertos em outros funis da mesma organização", async () => {
  authOk();
  const db = makeDb({
    pipelines: [{ ...funilRow({ id: PIPE, name: "Vendas" }), settings: { flow: { event_stage_ids: { appointment_confirmed: S2 } } } }] as never,
    stages: [etapa({ id: S1, name: "Novo" }), etapa({ id: S2, name: "Confirmado" })],
    leads: [
      { id: "a", title: "Negócio A", contact_id: "c", stage_id: S1, pipeline_id: PIPE, organization_id: ORG_ID, status: "open" },
      { id: "b", title: "Negócio B", contact_id: "c", stage_id: OTHER, pipeline_id: OTHER, organization_id: ORG_ID, status: "open" },
    ] as never,
    calendarAppointments: [{ id: "ag", title: "Reserva", contact_id: "c", status: "confirmed", starts_at: "2026-09-28T12:00:00Z", organization_id: ORG_ID }],
  });
  const { GET } = await import("./route");
  const res = await GET(new NextRequest(`http://localhost/api/v1/pipelines/${PIPE}/flow-config`), CTX);
  const { data } = await res.json();
  expect(data.reconciliation_preview.proposals).toEqual([]);
  expect(data.reconciliation_preview.ambiguous).toEqual([expect.objectContaining({ reason: "multiple_open_leads" })]);
  expect(db.escritas).toEqual([]);
});


it.each(["leads", "appointments"])("não sugere movimento com consulta truncada de %s", async (kind) => {
  authOk();
  const candidate = { id: "a", title: "A", contact_id: "c", stage_id: S1, pipeline_id: PIPE, organization_id: ORG_ID, status: "open" };
  const appointment = { id: "ag", title: "Reserva", contact_id: "c", status: "confirmed", starts_at: "2026-09-28T12:00:00Z", organization_id: ORG_ID };
  makeDb({
    pipelines: [{ ...funilRow({ id: PIPE, name: "Vendas" }), settings: { flow: { event_stage_ids: { appointment_confirmed: S2 } } } }] as never,
    stages: [etapa({ id: S1, name: "Novo" }), etapa({ id: S2, name: "Confirmado" })],
    leads: (kind === "leads" ? Array.from({ length: 1001 }, (_, i) => ({ ...candidate, id: `lead-${i}` })) : [candidate]) as never,
    calendarAppointments: kind === "appointments" ? Array.from({ length: 1001 }, (_, i) => ({ ...appointment, id: `ag-${i}` })) : [appointment],
  });
  const { GET } = await import("./route");
  const res = await GET(new NextRequest(`http://localhost/api/v1/pipelines/${PIPE}/flow-config`), CTX);
  const { data } = await res.json();
  expect(data.reconciliation_preview).toMatchObject({ available: true, truncated: true, proposals: [], ambiguous: [] });
});
