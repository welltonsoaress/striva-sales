"use client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { KPICards } from "@/components/admin/dashboard/KPICards";
import { AlertsBanner } from "@/components/admin/dashboard/AlertsBanner";
import { useAdminDashboardKPIs } from "@/hooks/useAdminDashboardKPIs";
import { useAlertsRealtime } from "@/hooks/useAlertsRealtime";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";

function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 pt-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AlertsSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function DashboardClient() {
  const t = useT();
  const { data, isLoading, isError, refetch, isFetching } = useAdminDashboardKPIs();
  useAlertsRealtime();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Saúde da operação")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Conversas, conexões e solicitações. Atualização a cada 30 segundos.")}
        </p>
      </div>

      {isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <p className="text-sm">{t("Não foi possível atualizar a saúde da operação.")}</p>
          <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
            {t("Tentar novamente")}
          </Button>
        </div>
      )}
      {isLoading ? (
        <>
          <KPISkeleton />
          <AlertsSkeleton />
        </>
      ) : data ? (
        <>
          <KPICards kpis={data} />
          <AlertsBanner alerts={data.alerts} />
        </>
      ) : null}
    </div>
  );
}
