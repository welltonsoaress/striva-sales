import { dayStartInTz } from "@/lib/agent-engine/pacing/engine";
import { tagDeIdioma } from "@/lib/i18n/datas";
import { IDIOMA_PADRAO } from "@/lib/i18n/idiomas";
import { carregaRadarDeRisco } from "@/lib/leads/radar-de-risco";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/** Contagens exatas, sem carregar conversas ou dados pessoais. Datas [início, fim). */
async function periodMetrics(admin: Admin, organizationId: string, start: Date, end: Date) {
  const from = start.toISOString(); const until = end.toISOString();
  const leads = () => admin.from("crm_leads").select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  const messages = () => admin.from("messages").select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId).gte("created_at", from).lt("created_at", until);
  const calls = () => admin.from("llm_calls").select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId).gte("created_at", from).lt("created_at", until);
  const results = await Promise.all([
    leads().gte("created_at", from).lt("created_at", until),
    leads().eq("status", "won").gte("closed_at", from).lt("closed_at", until),
    leads().eq("status", "lost").gte("closed_at", from).lt("closed_at", until),
    admin.from("calendar_appointments").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "confirmed")
      .gte("starts_at", from).lt("starts_at", until),
    messages().eq("direction", "inbound"),
    messages().eq("direction", "outbound").in("status", ["sent", "delivered", "read"]),
    admin.from("crm_lead_activities").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("type", "stage_changed")
      .gte("created_at", from).lt("created_at", until),
    calls(), calls().eq("status", "erro"),
    admin.from("followup_enrollments").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("outcome", "replied")
      .gte("completed_at", from).lt("completed_at", until),
  ]);
  if (results.some((result) => result.error || result.count === null))
    throw new Error("management_period_metrics_unavailable");
  const [newLeads, won, lost, appointments, inbound, outbound, movements, aiCalls, aiErrors, followupReplies] =
    results.map((result) => result.count!) as [number, number, number, number, number, number, number, number, number, number];
  return { new_leads: newLeads, won, lost, confirmed_appointments: appointments,
    inbound_messages: inbound, sent_messages: outbound, stage_movements: movements,
    ai_calls: aiCalls, ai_errors: aiErrors, followup_replies: followupReplies };
}

/** Régua explícita: dia local da empresa, eventos novos pelo created_at. */
export async function managementSnapshot(admin: Admin, organizationId: string, now = new Date()) {
  const org = await admin.from("organizations").select("display_name, timezone")
    .eq("id", organizationId).maybeSingle();
  if (org.error || !org.data) throw new Error("management_organization_unavailable");
  const timezone = org.data.timezone;
  const start = dayStartInTz(now, timezone);
  const next = dayStartInTz(new Date(start.getTime() + 36 * 3_600_000), timezone);
  const [activity, openLeads, inbox, overdue, radar] = await Promise.all([
    periodMetrics(admin, organizationId, start, now),
    admin.from("crm_leads").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "open"),
    admin.from("agent_inbox_items").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).eq("status", "open"),
    admin.from("crm_tasks").select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId).in("status", ["pending", "in_progress"])
      .lt("due_date", now.toISOString()),
    carregaRadarDeRisco(admin, { organizationId, limit: 5, now, humanRole: "manager" }),
  ]);
  if ([openLeads, inbox, overdue].some((result) => result.error || result.count === null))
    throw new Error("management_metrics_unavailable");
  // A agenda é do dia inteiro; a atividade do dia é parcial até a medição.
  const appointments = await admin.from("calendar_appointments").select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId).eq("status", "confirmed")
    .gte("starts_at", start.toISOString()).lt("starts_at", next.toISOString());
  if (appointments.error || appointments.count === null) throw new Error("management_metrics_unavailable");
  return {
    organization_name: org.data.display_name,
    timezone,
    period_start: start.toISOString(), period_end: now.toISOString(),
    agenda_period_end: next.toISOString(),
    measured_at: now.toISOString(),
    new_leads: activity.new_leads,
    activity,
    overdue_tasks: overdue.count!,
    open_leads: openLeads.count!,
    open_inbox_alerts: inbox.count!,
    confirmed_appointments_today: appointments.count,
    radar: {
      critical: radar.counts.critico,
      at_risk: radar.counts.em_risco,
      without_next_step: radar.total_sem_proximo_passo,
      coverage: "varredura limitada a até 500 negócios abertos e 500 demandas sem próximo passo",
    },
    next_step: "/app/radar",
  };
}

export type ManagementSnapshot = Awaited<ReturnType<typeof managementSnapshot>>;

/** Dois blocos de sete dias locais completos, sem confundir o dia parcial com um dia inteiro. */
export function managementWeeklyPeriods(now: Date, timezone: string) {
  const end = dayStartInTz(now, timezone);
  const previousDay = (start: Date) => dayStartInTz(new Date(start.getTime() - 12 * 3_600_000), timezone);
  let currentStart = end;
  for (let day = 0; day < 7; day++) currentStart = previousDay(currentStart);
  let previousStart = currentStart;
  for (let day = 0; day < 7; day++) previousStart = previousDay(previousStart);
  return { previousStart, currentStart, end };
}

/** Números que já existem no CRM; nenhuma métrica clínica é inferida. */
export async function managementWeeklyComparison(admin: Admin, organizationId: string, now = new Date()) {
  const org = await admin.from("organizations").select("display_name, timezone")
    .eq("id", organizationId).maybeSingle();
  if (org.error || !org.data) throw new Error("management_organization_unavailable");
  const { previousStart, currentStart, end } = managementWeeklyPeriods(now, org.data.timezone);
  const interval = (start: Date, finish: Date) => ({ start: start.toISOString(), end: finish.toISOString() });
  const [current, previous, backlog] = await Promise.all([
    periodMetrics(admin, organizationId, currentStart, end),
    periodMetrics(admin, organizationId, previousStart, currentStart),
    managementSnapshot(admin, organizationId, now),
  ]);
  return {
    organization_name: org.data.display_name, timezone: org.data.timezone,
    measured_at: now.toISOString(),
    current: { ...interval(currentStart, end), ...current },
    previous: { ...interval(previousStart, currentStart), ...previous },
    backlog,
  };
}

export function formatManagementWeeklyComparison(report: Awaited<ReturnType<typeof managementWeeklyComparison>>): string {
  const interval = (start: string, end: string) => {
    const fmt = new Intl.DateTimeFormat(tagDeIdioma(IDIOMA_PADRAO), { timeZone: report.timezone, day: "2-digit", month: "2-digit" });
    // end é exclusivo: o último dia incluído começou antes dele.
    return `${fmt.format(new Date(start))} a ${fmt.format(new Date(Date.parse(end) - 12 * 3_600_000))}`;
  };
  const current = report.current; const previous = report.previous;
  const closed = current.won + current.lost;
  const rate = closed ? `${Math.round(current.won / closed * 100)}% (${current.won}/${closed})` : "sem negócios encerrados";
  const comparison = (value: number, before: number) => {
    const delta = value - before;
    return `${value} • anterior ${before} • ${delta >= 0 ? "+" : ""}${delta}` +
      (before ? ` (${delta >= 0 ? "+" : ""}${Math.round(delta / before * 100)}%)` : " (sem base percentual)");
  };
  const trend = current.new_leads > previous.new_leads ? "A entrada de oportunidades cresceu."
    : current.new_leads < previous.new_leads ? "A entrada de oportunidades caiu; revise a captação."
    : "A entrada de oportunidades ficou estável.";
  const resultsReading = current.won > previous.won ? "Mais negócios foram ganhos em relação à semana anterior."
    : current.won < previous.won ? "Os ganhos diminuíram em relação à semana anterior; acompanhe a evolução do funil."
    : "O número de negócios ganhos ficou estável.";
  const b = report.backlog;
  const recommendations = managementPriorities(b);
  if (current.lost > current.won && closed > 0) recommendations.splice(1, 0, "Revise os motivos dos negócios perdidos antes de alterar a abordagem de vendas.");
  if (current.new_leads > 0 && current.stage_movements === 0) recommendations.splice(1, 0, "Confira as etapas e as execuções do Operador: houve entrada sem movimentação registrada.");
  if (current.ai_errors > 0) recommendations.splice(1, 0, "Revise as falhas da semana em Execuções de IA e confirme se os bloqueios já foram resolvidos.");
  if (current.new_leads < previous.new_leads) recommendations.splice(1, 0, "Compare as fontes de captação e escolha uma ação para recuperar a entrada de oportunidades.");
  return [
    "*📊 RELATÓRIO SEMANAL*", safeLabel(report.organization_name),
    `${interval(current.start, current.end)} • ${report.timezone}`,
    `Comparação: ${interval(previous.start, previous.end)} • dias completos`, "",
    "*Visão geral*", `${trend} ${resultsReading}`, "",
    "*Funil e resultados*",
    `• Oportunidades criadas: ${comparison(current.new_leads, previous.new_leads)}`,
    `• Ganhos: ${comparison(current.won, previous.won)}`,
    `• Perdidos: ${comparison(current.lost, previous.lost)}`,
    `• Ganhos entre encerrados: ${rate}`,
    `• Movimentações de etapa: ${comparison(current.stage_movements, previous.stage_movements)}`, "",
    "*Atendimento e acompanhamento*",
    `• Mensagens recebidas: ${comparison(current.inbound_messages, previous.inbound_messages)}`,
    `• Mensagens enviadas: ${comparison(current.sent_messages, previous.sent_messages)}`,
    `• Agenda confirmada: ${comparison(current.confirmed_appointments, previous.confirmed_appointments)}`,
    `• Fluxos encerrados com resposta: ${comparison(current.followup_replies, previous.followup_replies)}`,
    `• Chamadas de IA: ${current.ai_calls} • com erro: ${current.ai_errors} (antes ${previous.ai_errors})`, "",
    "*Pontos de atenção agora*",
    `• ${b.open_leads} negócios abertos • ${b.overdue_tasks} tarefas vencidas`,
    `• Radar: ${b.radar.critical} críticos, ${b.radar.at_risk} em risco; ${b.radar.without_next_step} demandas sem próximo passo`,
    `• Central: ${b.open_inbox_alerts} avisos abertos`, "",
    "*Plano para a próxima semana*",
    ...recommendations.slice(0, 4).map((text, i) => `${i + 1}. ${text}`), "",
    "*Como ler estes números*",
    "Ganhos/perdidos: estado atual e encerramento no período; taxa sobre encerrados, não sobre entradas. Agenda: horários ainda confirmados, não atendimentos realizados. Mensagens: registros no período; saídas com envio confirmado no sistema. Follow-up: fluxos encerrados com resposta, não vendas atribuídas.",
    `Pendências são o retrato atual. Radar: ${b.radar.coverage}.`,
    "Não mede aqui atendimentos realizados, faltas ou faturamento. Compare mais períodos antes de concluir uma tendência.",
  ].join("\n");
}

export function formatManagementSummary(snapshot: ManagementSnapshot): string {
  const day = new Intl.DateTimeFormat(tagDeIdioma(IDIOMA_PADRAO), { timeZone: snapshot.timezone, dateStyle: "short" })
    .format(new Date(snapshot.period_start));
  const hour = new Intl.DateTimeFormat(tagDeIdioma(IDIOMA_PADRAO), { timeZone: snapshot.timezone, hour: "2-digit", minute: "2-digit" })
    .format(new Date(snapshot.measured_at));
  const a = snapshot.activity;
  const entries = snapshot.new_leads === 0 ? "Nenhuma nova oportunidade registrada até agora."
    : snapshot.new_leads === 1 ? "Uma nova oportunidade chegou hoje."
    : `${snapshot.new_leads} oportunidades chegaram hoje.`;
  const open = snapshot.open_leads === 0 ? "Nenhum negócio aberto neste momento."
    : snapshot.open_leads === 1 ? "Há um negócio aberto para acompanhar."
    : `Há ${snapshot.open_leads} negócios abertos para acompanhar.`;
  return [
    "*📋 RELATÓRIO DIÁRIO*", safeLabel(snapshot.organization_name),
    `${day} • ${snapshot.timezone} • parcial até ${hour}`, "",
    "*Visão geral*",
    `${entries} ${open}`, "",
    "*Movimento de hoje*",
    `• Ganhos: ${a.won} • perdas: ${a.lost} • mudanças de etapa: ${a.stage_movements}`,
    `• Mensagens recebidas: ${a.inbound_messages} • enviadas: ${a.sent_messages}`,
    `• Agendamentos confirmados para hoje: ${snapshot.confirmed_appointments_today}`,
    `• Fluxos encerrados com resposta: ${a.followup_replies}`,
    `• IA: ${a.ai_calls} chamadas • ${a.ai_errors} com erro`, "",
    "*Onde sua atenção faz diferença*",
    `• Radar: ${snapshot.radar.critical} críticos • ${snapshot.radar.at_risk} em risco`,
    `• ${snapshot.radar.without_next_step} demandas sem próximo passo`,
    `• ${snapshot.overdue_tasks} tarefas vencidas • ${snapshot.open_inbox_alerts} avisos na Central`, "",
    "*Prioridades do dia*",
    ...managementPriorities(snapshot).slice(0, 3).map((text, i) => `${i + 1}. ${text}`), "",
    "*Régua da leitura*",
    `Atividade de hoje até ${hour}; agenda do dia inteiro ainda confirmada. Ganhos/perdidos por encerramento e estado atual. Pendências no instante da medição.`,
    `Radar: ${snapshot.radar.coverage}. Mensagens não equivalem a clientes; resposta a follow-up não comprova venda. Não mede faturamento ou presença em consulta.`,
  ].join("\n");
}

function safeLabel(value: string): string {
  return value.replace(/[\r\n*_~`]/g, " ").slice(0, 100).trim();
}

function managementPriorities(snapshot: ManagementSnapshot): string[] {
  const priorities: string[] = [];
  if (snapshot.radar.critical > 0) priorities.push("Abra o Radar e priorize os negócios críticos: defina responsável e retorno.");
  if (snapshot.radar.without_next_step > 0) priorities.push("Defina um próximo passo e prazo para cada demanda sem continuidade no Radar.");
  if (snapshot.overdue_tasks > 0) priorities.push("Revise as tarefas vencidas com a equipe e atualize os prazos ou conclua o que já foi feito.");
  if (snapshot.open_inbox_alerts > 0 || snapshot.activity.ai_errors > 0) priorities.push("Confira a Central e as Execuções de IA; resolva os bloqueios antes de ajustar o agente.");
  if (priorities.length === 0) priorities.push("Confira a agenda e acompanhe os negócios abertos; mantenha responsável e próximo passo definidos.");
  return priorities;
}
