"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Buildings, Clock, WifiSlash, Scales, ChartBar } from "@/lib/ui/icons";
import type { DashboardKPIs } from "@/app/api/v1/admin/dashboard/kpis/route";
import type { ElementType } from "react";
import { useT } from "@/hooks/i18n/useT";

interface KPICardProps {
  label: string;
  value: number;
  subtitle: string;
  Icon: ElementType;
  accent?: boolean;
  danger?: boolean;
}

function KPICard({ label, value, subtitle, Icon, accent, danger }: KPICardProps) {
  const iconColor = danger ? "text-red-500" : accent ? "text-amber-500" : "text-muted-foreground";

  const valueColor = danger ? "text-red-600" : accent ? "text-amber-600" : "text-foreground";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className={`text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  );
}

interface KPICardsProps {
  kpis: DashboardKPIs;
}

export function KPICards({ kpis }: KPICardsProps) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      <KPICard
        label={t("Empresas em operação")}
        value={kpis.tenants_active}
        subtitle={t("organizações ativas")}
        Icon={Buildings}
      />
      <KPICard
        label={t("Sem resposta há mais de 10 min")}
        value={kpis.conv_pending_10min}
        subtitle={t("conversas sem resposta")}
        Icon={Clock}
        accent={kpis.conv_pending_10min > 0}
      />
      <KPICard
        label={t("Conexões com alerta")}
        value={kpis.waha_ban_alerts}
        subtitle={t("sessões com problema")}
        Icon={WifiSlash}
        accent={kpis.waha_ban_alerts > 0}
      />
      <KPICard
        label={t("LGPD precisa de atenção")}
        value={kpis.lgpd_at_risk}
        subtitle={t("requisições próximas do prazo")}
        Icon={Scales}
        danger={kpis.lgpd_at_risk > 0}
      />
      {/* "acumulado", e não "no mês": o número vem de
          `ai_budgets.current_month_consumed_cents`, um contador que o gatilho
          soma sem olhar a data e que nada zera — ele é o gasto desde a
          instalação. O rótulo antigo dizia "uso ≥80%" sobre um teto MENSAL, e a
          divergência cresce com o tempo. Ver o comentário do cálculo em
          `app/api/v1/admin/dashboard/kpis/route.ts`. */}
      <KPICard
        label={t("Limites da IA legada")}
        value={kpis.ai_budget_warnings}
        subtitle={t("empresas com gasto acumulado ≥80% do teto")}
        Icon={ChartBar}
        accent={kpis.ai_budget_warnings > 0}
      />
    </div>
  );
}
