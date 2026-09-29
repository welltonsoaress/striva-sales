import { describe, expect, it } from "vitest";

import { criarPreviaDeReconciliacao } from "./reconciliation-preview";

const stages = [
  { id: "s1", name: "Novo" },
  { id: "s2", name: "Agendado" },
];
const eventStageIds = { appointment_pending: "s1", appointment_confirmed: "s2" };

function lead(id: string, contact_id: string, stage_id = "s1") {
  return { id, title: `Negócio ${id}`, contact_id, stage_id };
}

function appointment(id: string, contact_id: string, status = "confirmed") {
  return { id, title: `Compromisso ${id}`, contact_id, status, starts_at: "2026-09-28T12:00:00.000Z" };
}

describe("criarPreviaDeReconciliacao", () => {
  it("sugere etapa por destino configurado sem executar movimentação", () => {
    const result = criarPreviaDeReconciliacao({
      leads: [lead("l1", "c1")],
      appointments: [appointment("a1", "c1")],
      stages,
      eventStageIds,
    });

    expect(result.proposals).toEqual([expect.objectContaining({ lead_id: "l1", suggested_stage_id: "s2" })]);
    expect(result.ambiguous).toEqual([]);
  });

  it("não sugere quando há mais de um negócio aberto ou compromisso vigente", () => {
    const multipleLeads = criarPreviaDeReconciliacao({
      leads: [lead("l1", "c1"), lead("l2", "c1")],
      appointments: [appointment("a1", "c1")],
      stages,
      eventStageIds,
    });
    const multipleAppointments = criarPreviaDeReconciliacao({
      leads: [lead("l1", "c1")],
      appointments: [appointment("a1", "c1"), appointment("a2", "c1", "pending")],
      stages,
      eventStageIds,
    });

    expect(multipleLeads.proposals).toEqual([]);
    expect(multipleLeads.ambiguous[0]?.reason).toBe("multiple_open_leads");
    expect(multipleAppointments.proposals).toEqual([]);
    expect(multipleAppointments.ambiguous[0]?.reason).toBe("multiple_active_appointments");
  });

  it("ignora eventos sem destino, estados não suportados e etapas desconhecidas", () => {
    const result = criarPreviaDeReconciliacao({
      leads: [lead("l1", "c1")],
      appointments: [appointment("a1", "c1", "cancelled"), appointment("a2", "c2")],
      stages,
      eventStageIds: { appointment_pending: null, appointment_confirmed: "apagada" },
    });

    expect(result).toEqual({ proposals: [], ambiguous: [] });
  });
});


it("não ignora outro compromisso só porque seu status está sem destino", () => {
  const result = criarPreviaDeReconciliacao({ leads: [lead("l", "c")], appointments: [appointment("a", "c"), appointment("b", "c", "pending")], stages, eventStageIds: { appointment_pending: null, appointment_confirmed: "s2" } });
  expect(result.proposals).toEqual([]);
  expect(result.ambiguous[0]?.reason).toBe("multiple_active_appointments");
});
