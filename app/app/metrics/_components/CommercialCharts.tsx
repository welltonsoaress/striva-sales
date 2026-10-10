"use client";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import type { AttendantMetrics } from "@/hooks/metrics/useAttendantMetrics";
import { useT } from "@/hooks/i18n/useT";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";

export function CommercialCharts({ metrics }: { metrics: AttendantMetrics }) {
  const t = useT();
  const locale = useTagDeIdioma();
  const { user } = useAuth();
  const open = metrics.funnel.reduce((n, s) => n + s.count, 0);
  const won = metrics.attendants.reduce((n, a) => n + a.won, 0);
  const lost = metrics.attendants.reduce((n, a) => n + a.lost, 0);
  const conversations = metrics.attendants.reduce((n, a) => n + a.conversations_handled, 0);
  const rate = won + lost ? Math.round((100 * won) / (won + lost)) : null;
  const stage = [...metrics.funnel].sort((a, b) => b.count - a.count)[0];
  const byPerson = metrics.attendants.map((a) => ({
    name: a.name ?? a.email ?? t("Atendente"),
    won: a.won,
    lost: a.lost,
  }));
  const timezone = user?.timezone ?? "UTC";
  const date = (s: string) => new Date(s).toLocaleDateString(locale, { timeZone: timezone });
  const panel = "rounded-xl border bg-card p-5 sm:p-6";
  return (
    <section className="space-y-6" aria-label={t("Inteligência comercial")}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{t("Inteligência comercial")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {date(metrics.window.from)} — {date(metrics.window.to)} · {timezone}
          </p>
        </div>
        <Link href="/app/kanban" className="text-sm text-primary underline underline-offset-4">
          {t("Acompanhar negócios")}
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-5 border-y py-6 lg:grid-cols-4">
        {[
          [t("Negócios em aberto"), open, t("Posição atual no funil")],
          [t("Negócios ganhos"), won, t("No período selecionado")],
          [
            t("Taxa de ganho"),
            rate === null ? "—" : `${rate}%`,
            `${won} ${t(won === 1 ? "ganho de" : "ganhos de")} ${won + lost} ${t(won + lost === 1 ? "encerrado" : "encerrados")}`,
          ],
          [t("Conversas atendidas"), conversations, t("Soma das participações dos atendentes")],
        ].map(([label, value, hint]) => (
          <div key={String(label)}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-2">
              <p className="text-3xl font-semibold tabular-nums">{value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className={panel}>
          <h3 className="font-semibold">{t("Distribuição dos negócios em aberto")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Retrato atual por etapa. Não representa conversão entre etapas.")}
          </p>
          {open ? (
            <div className="mt-5 h-72" aria-label={t("Gráfico de negócios por etapa")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.funnel}
                  layout="vertical"
                  margin={{ right: 24, left: 4 }}
                  accessibilityLayer
                >
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" domain={[0, "dataMax"]} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage_name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar
                    dataKey="count"
                    name={t("Negócios")}
                    fill="var(--primary)"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={28}
                    isAnimationActive={false}
                  >
                    <LabelList dataKey="count" position="right" fill="var(--foreground)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-14 text-sm text-muted-foreground">
              {t("Os negócios abertos aparecerão aqui conforme entrarem no funil.")}
            </p>
          )}
          {stage?.count ? (
            <p className="mt-4 border-t pt-4 text-sm">
              <strong>{stage.stage_name}</strong> {t("concentra")} {stage.count}{" "}
              {t(stage.count === 1 ? "negócio" : "negócios")} (
              {Math.round((100 * stage.count) / open)}%).{" "}
              {t("Revise os próximos passos dessa etapa no CRM.")}
            </p>
          ) : null}
        </div>
        <div className={panel}>
          <h3 className="font-semibold">{t("Resultados por atendente")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Negócios ganhos e perdidos no período. Veja tempos de resposta na tabela abaixo.")}
          </p>
          {won + lost ? (
            <div className="mt-5 h-72" aria-label={t("Gráfico de resultados por atendente")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byPerson} margin={{ left: -24, right: 12 }} accessibilityLayer>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, "dataMax"]} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="won"
                    name={t("Ganhos")}
                    fill="var(--primary)"
                    stackId="results"
                    maxBarSize={44}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="lost"
                    name={t("Perdidos")}
                    fill="var(--muted-foreground)"
                    stackId="results"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-14 text-sm text-muted-foreground">
              {t("Ainda não há negócios encerrados neste período.")}
            </p>
          )}
          <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
            {t(
              "Use os resultados com o volume atendido e o tempo de resposta para orientar o acompanhamento da equipe.",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
