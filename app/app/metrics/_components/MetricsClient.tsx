"use client";

import { useT } from "@/hooks/i18n/useT";
import { useState } from "react";

import { useAttendantMetrics, type AttendantMetric } from "@/hooks/metrics/useAttendantMetrics";
import { AtritoPanel } from "./AtritoPanel";
import { CommercialCharts } from "./CommercialCharts";
import { Button } from "@/components/ui/button";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${m}min` : `${m}min ${rest}s`;
}

function attendantLabel(a: AttendantMetric, t: (texto: string) => string): string {
  return a.name ?? a.email ?? `${t("Atendente")} ${a.user_id.slice(0, 8)}`;
}

interface Props {
  canCompare: boolean;
  currentUserId: string;
}

export function MetricsClient({ canCompare, currentUserId }: Props) {
  const t = useT();
  const [owner, setOwner] = useState<string>(ALL);
  const selectedOwner = owner === ALL ? null : owner;
  const [days, setDays] = useState(30);
  const { data, isLoading, isError, refetch } = useAttendantMetrics(selectedOwner, days);
  // Opções do filtro: só manager+ (a rota /team é manager+). Agent nem vê o filtro.
  const team = useTeamMembers({ enabled: canCompare });

  if (isLoading) return <p className="text-sm text-muted-foreground">{t("Carregando…")}</p>;
  if (isError || !data)
    return (
      <div role="alert" className="space-y-3">
        <p className="text-sm text-destructive">{t("Erro ao carregar métricas.")}</p>
        <Button onClick={() => void refetch()}>{t("Tentar novamente")}</Button>
      </div>
    );

  const metrics = data.data;

  return (
    <div className="flex flex-col gap-6">
      <label className="flex items-center gap-3 text-sm">
        {t("Período")}
        <select
          aria-label={t("Período")}
          className="h-10 rounded-md border bg-background px-3"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[7, 30, 90].map((n) => (
            <option key={n} value={n}>
              {t("Últimos")} {n} {t("dias")}
            </option>
          ))}
        </select>
      </label>
      {canCompare ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{t("Atendente")}</span>
          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={t("Todos os atendentes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("Todos os atendentes")}</SelectItem>
              {(team.data?.data ?? [])
                .filter((m) => m.role !== "viewer")
                .map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.full_name ?? m.email ?? m.user_id.slice(0, 8)}
                    {m.user_id === currentUserId ? ` ${t("(você)")}` : ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {/* Acima do funil e da performance de propósito: é o número do sistema
          inteiro, ao qual as métricas de área se subordinam (doutrina §3.6).
          Não filtra por atendente — atrito é propriedade do sistema, e quebrá-lo
          por pessoa convida a otimização local que degrada o todo. */}
      <AtritoPanel podeEditarRegua={canCompare} />
      <CommercialCharts metrics={metrics} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {canCompare ? t("Performance por atendente") : t("Sua performance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.attendants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Sem atividade no período (ganhos/perdidos, conversas ou respostas).")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Atendente")}</TableHead>
                  <TableHead className="text-right">{t("Ganhos")}</TableHead>
                  <TableHead className="text-right">{t("Perdidos")}</TableHead>
                  <TableHead className="text-right">{t("Conversas")}</TableHead>
                  <TableHead className="text-right">{t("1ª resposta (média)")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.attendants.map((a) => (
                  <TableRow key={a.user_id}>
                    <TableCell className="font-medium">
                      {attendantLabel(a, t)}
                      {a.user_id === currentUserId ? (
                        <span className="text-muted-foreground"> {t("(você)")}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.won}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.lost}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {a.conversations_handled}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDuration(a.avg_first_response_seconds)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
