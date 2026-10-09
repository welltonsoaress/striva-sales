"use client";
import { useT, useIdioma } from "@/lib/i18n/IdiomaProvider";
import { tagDeIdioma } from "@/lib/i18n/datas";
import { tenantOperationAllowed } from "@/lib/billing/operation-access";
import { CREDITS_PER_MESSAGE, usableCredits } from "@/lib/billing/credits";

import Link from "next/link";
type Account = {
  mode: string;
  state: string;
  monthly_remaining: number;
  monthly_allowance: number;
  extra_remaining: number;
  access_until: string | null;
  period_end: string | null;
};
export function ResponseBalance({
  account,
  checkedAt,
}: {
  account: Account | null;
  checkedAt: number;
}) {
  const t = useT();
  const locale = tagDeIdioma(useIdioma());

  if (!account || account.mode !== "platform") return null;
  const remaining = usableCredits(account);
  const exhausted = remaining < CREDITS_PER_MESSAGE;
  const live =
    ["trial", "active"].includes(account.state) && tenantOperationAllowed(account, checkedAt);
  const title =
    account.state === "pending"
      ? t("Seu agente está quase pronto")
      : !live
        ? t("Seu atendimento com IA está pausado")
        : exhausted
          ? t(remaining === 0 ? "Seus créditos acabaram" : "Créditos insuficientes para continuar")
          : `${remaining.toLocaleString(locale)} ${t("créditos disponíveis")}`;
  return (
    <section
      className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 ${live && !exhausted ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
      aria-label={t("Créditos disponíveis")}
    >
      <div className="min-w-0 space-y-2">
        <h2 className="font-semibold">{title}</h2>
        {live && (
          <p className="text-sm text-muted-foreground">
            {account.monthly_remaining.toLocaleString(locale)} {t("da franquia ·")}
            {account.extra_remaining.toLocaleString(locale)}{" "}
            {t("extras · cada mensagem completa usa 10 créditos.")}
          </p>
        )}
        {live && account.period_end && (
          <p className="text-xs text-muted-foreground">
            {account.state === "trial" ? t("Teste até") : t("A franquia renova em")}{" "}
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
              new Date(account.period_end),
            )}{" "}
            {t("(UTC)")}
            {account.state === "trial"
              ? t(" ou até os 1.000 créditos terminarem.")
              : t(". A franquia mensal não acumula.")}
          </p>
        )}
        {!live && account.state !== "pending" && (
          <p className="text-sm text-muted-foreground">
            {t("Consulta, exportação, suporte e contratação continuam acessíveis.")}
          </p>
        )}
        {live && exhausted && (
          <p className="text-sm text-muted-foreground">
            {t(
              account.state === "trial"
                ? "Contrate um plano para continuar com IA. Seu time pode atender manualmente durante o teste."
                : "Seu time pode continuar atendendo manualmente. A compra de créditos extras está indisponível no momento.",
            )}
          </p>
        )}
        {account.state === "pending" && (
          <p className="text-sm text-muted-foreground">
            {t("Revise o agente e ative seu teste de 7 dias ou 1.000 créditos.")}
          </p>
        )}
      </div>
      <Link
        href={
          account.state === "pending"
            ? "/onboarding/setup-ai"
            : live && exhausted && account.state === "active"
              ? "/app/settings/billing#creditos-extras"
              : "/app/settings/billing"
        }
        className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        {account.state === "pending"
          ? t("Preparar meu agente")
          : live && exhausted && account.state === "active"
            ? t("Ver créditos extras")
            : t("Ver meu plano")}
      </Link>
    </section>
  );
}
