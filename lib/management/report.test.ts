import { describe, expect, it, vi } from "vitest";

import { formatManagementSummary, formatManagementWeeklyComparison, managementSnapshot, managementWeeklyPeriods, type ManagementSnapshot } from "./report";

vi.mock("@/lib/leads/radar-de-risco", () => ({ carregaRadarDeRisco: vi.fn(async () => ({
  counts: { critico: 0, em_risco: 0 }, total_sem_proximo_passo: 0,
})) }));

function database(count: number | null = 1) {
  const queries: Array<{ table: string; filters: Array<[string, string, unknown]> }> = [];
  const admin = { from(table: string) {
    const query = { table, filters: [] as Array<[string, string, unknown]> };
    queries.push(query);
    const b = {
      select: () => b,
      eq: (field: string, value: unknown) => { query.filters.push(['eq', field, value]); return b; },
      in: (field: string, value: unknown) => { query.filters.push(['in', field, value]); return b; },
      gte: (field: string, value: unknown) => { query.filters.push(['gte', field, value]); return b; },
      lt: (field: string, value: unknown) => { query.filters.push(['lt', field, value]); return b; },
      maybeSingle: async () => ({ data: { display_name: 'Empresa fictícia', timezone: 'America/Fortaleza' }, error: null }),
      then: (resolve: (r: { count: number | null; error: null }) => unknown) => Promise.resolve({ count, error: null }).then(resolve),
    };
    return b;
  } };
  return { admin: admin as never, queries };
}

const activity = { new_leads: 0, won: 0, lost: 0, confirmed_appointments: 0,
  inbound_messages: 0, sent_messages: 0, stage_movements: 0, ai_calls: 0, ai_errors: 0, followup_replies: 0 };
const backlog: ManagementSnapshot = { organization_name: "Clínica de teste", timezone: "America/Fortaleza",
  period_start: "2026-09-24T03:00:00Z", period_end: "2026-09-24T12:00:00Z", agenda_period_end: "2026-09-25T03:00:00Z", measured_at: "2026-09-24T12:00:00Z",
  new_leads: 0, open_leads: 8, open_inbox_alerts: 2, confirmed_appointments_today: 3, overdue_tasks: 1, activity,
  radar: { critical: 2, at_risk: 1, without_next_step: 4, coverage: "até 500 negócios e 500 demandas" }, next_step: "/app/radar" };

describe("comparativo semanal da gestão", () => {
  it("consultas mantêm a organização, janela parcial e vocabulário real de erro da IA", async () => {
    const { admin, queries } = database();
    const snapshot = await managementSnapshot(admin, 'org-a', new Date('2026-09-30T12:00:00Z'));
    expect(snapshot.period_start).toBe('2026-09-30T03:00:00.000Z');
    expect(snapshot.period_end).toBe('2026-09-30T12:00:00.000Z');
    expect(snapshot.agenda_period_end).toBe('2026-10-01T03:00:00.000Z');
    for (const query of queries.filter((q) => q.table !== 'organizations')) {
      expect(query.filters).toContainEqual(['eq', 'organization_id', 'org-a']);
    }
    expect(queries.find((q) => q.table === 'llm_calls' && q.filters.some((f) => f[1] === 'status'))?.filters)
      .toContainEqual(['eq', 'status', 'erro']);
    expect(snapshot.activity.ai_errors).toBe(1);
  });

  it("contagem indisponível não vira relatório com zeros inventados", async () => {
    await expect(managementSnapshot(database(null).admin, 'org-a')).rejects.toThrow('metrics_unavailable');
  });

  it("usa 14 dias locais completos mesmo na mudança de horário de verão", () => {
    const periods = managementWeeklyPeriods(new Date("2026-03-10T18:00:00Z"), "America/New_York");
    expect(periods.end.toISOString()).toBe("2026-03-10T04:00:00.000Z");
    expect(periods.currentStart.toISOString()).toBe("2026-03-03T05:00:00.000Z");
    expect(periods.previousStart.toISOString()).toBe("2026-02-24T05:00:00.000Z");
  });

  it("declara a cobertura e a diferença sem inventar indicadores clínicos", () => {
    const text = formatManagementWeeklyComparison({
      organization_name: "Clínica de teste", timezone: "America/Fortaleza",
      measured_at: "2026-09-24T18:00:00Z",
      backlog,
      current: { ...activity, start: "2026-09-17T03:00:00Z", end: "2026-09-24T03:00:00Z",
        new_leads: 5, confirmed_appointments: 2 },
      previous: { ...activity, start: "2026-09-10T03:00:00Z", end: "2026-09-17T03:00:00Z",
        new_leads: 3, confirmed_appointments: 4 },
    });
    expect(text).toContain("Oportunidades criadas: 5 • anterior 3 • +2 (+67%)");
    expect(text).toContain("Agenda confirmada: 2 • anterior 4 • -2 (-50%)");
    expect(text).toContain("Não mede aqui atendimentos realizados, faltas ou faturamento");
    expect(text).toContain("sem negócios encerrados");
    expect(text).toContain("sem base percentual");
    expect(text).toContain("Plano para a próxima semana");
    expect(text).toContain("houve entrada sem movimentação registrada");
    expect(text.length).toBeLessThanOrEqual(3000);
  });

  it("semanal completo preserva metodologia dentro do limite da entrega mesmo com contagens altas", () => {
    const large = Object.fromEntries(Object.keys(activity).map((key) => [key, 1234567])) as typeof activity;
    const text = formatManagementWeeklyComparison({ organization_name: 'Empresa fictícia '.repeat(10),
      timezone: backlog.timezone, measured_at: backlog.measured_at, backlog: { ...backlog, activity: large },
      current: { ...large, start: '2026-09-17T03:00:00Z', end: '2026-09-24T03:00:00Z' },
      previous: { ...activity, start: '2026-09-10T03:00:00Z', end: '2026-09-17T03:00:00Z' } });
    expect(text.length).toBeLessThanOrEqual(3000);
    expect(text).toContain('Compare mais períodos');
  });

  it("relatório diário identifica o dia parcial e leva o risco a uma ação", () => {
    const text = formatManagementSummary(backlog);
    expect(text).toContain("parcial até 09:00");
    expect(text).toContain("Abra o Radar e priorize os negócios críticos");
    expect(text).toContain("Agendamentos confirmados para hoje: 3");
    expect(text.length).toBeLessThanOrEqual(3000);
  });
});
