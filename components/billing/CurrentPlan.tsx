import type { Database } from "@/lib/database.types";
import type { CommercialPlan } from "@/lib/billing/plans";
import { commercialStateLabel } from "@/lib/billing/state-label";
import { currentCreditUnits } from "@/lib/billing/credits";

type Account = Database["public"]["Tables"]["organization_ai_accounts"]["Row"];

/** O plano e os limites vêm da conta, inclusive no teste sem contrato de pagamento. */
export function CurrentPlan({
  account,
  plan,
  users,
  channels,
  t,
  locale,
  timezone,
}: {
  account: Account | null;
  plan: CommercialPlan | undefined;
  users: number | null;
  channels: number | null;
  t: (text: string) => string;
  locale: string;
  timezone: string;
}) {
  const count = (n: number) => new Intl.NumberFormat(locale).format(n);
  const managed = account?.mode === "platform";
  const title =
    plan?.name ??
    t(
      account?.state === "trial"
        ? "Teste gratuito"
        : account?.state === "pending"
          ? "Ativação pendente"
          : "Plano ainda não vinculado",
    );
  const limits = [
    { name: "Usuários", used: users, limit: account?.user_limit ?? null },
    { name: "Números de WhatsApp", used: channels, limit: account?.channel_limit ?? null },
    ...(managed && account
      ? [
          {
            name: "Créditos da franquia mensal",
            used: Math.max(
              0,
              currentCreditUnits(
                account.monthly_allowance - account.monthly_remaining,
                account.credit_meter,
              ),
            ),
            limit: currentCreditUnits(account.monthly_allowance, account.credit_meter),
          },
        ]
      : []),
    ...(!managed && plan?.limits?.ai_credits != null
      ? [{ name: "Créditos mensais previstos no plano", used: null, limit: plan.limits.ai_credits }]
      : []),
  ];
  return (
    <section
      className="overflow-hidden rounded-xl border bg-card"
      aria-labelledby="current-plan-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-5 border-b p-6 sm:p-8">
        <div className="space-y-2">
          <h2 id="current-plan-title" className="text-sm font-medium text-muted-foreground">
            {t("Seu plano atual")}
          </h2>
          <p className="text-2xl font-semibold tracking-tight">{title}</p>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {plan?.description ??
              t(
                managed
                  ? "Atendimento com IA incluída e acompanhamento do uso da sua conta."
                  : "A equipe pode vincular sua conta a um plano. Os limites abaixo refletem a configuração atual.",
              )}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
          {t(account ? commercialStateLabel(account.state, account.access_until) : "Indisponível")}
        </span>
      </div>
      <dl className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
        {limits.map((item) => (
          <div key={item.name} className="min-w-0 space-y-3">
            <dt className="text-sm text-muted-foreground">{t(item.name)}</dt>
            <dd className="text-xl font-semibold tabular-nums">
              {item.used === null ? "—" : count(item.used)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                / {item.limit === null ? t("A definir") : count(item.limit)}
              </span>
            </dd>
            {item.limit !== null && item.limit > 0 && item.used !== null && (
              <div
                role="progressbar"
                aria-label={t(item.name)}
                aria-valuemin={0}
                aria-valuemax={item.limit}
                aria-valuenow={Math.min(item.limit, item.used)}
                aria-valuetext={`${count(item.used)} / ${count(item.limit)}`}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, (item.used / item.limit) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </dl>
      {!managed && plan && (
        <p className="border-t px-6 py-4 text-sm text-muted-foreground sm:px-8">
          {t(
            "O plano está vinculado. A equipe concluirá a ativação da IA incluída; o atendimento atual continua disponível. O consumo da franquia será exibido após essa ativação.",
          )}
        </p>
      )}
      {account?.access_until && (
        <p className="border-t px-6 py-4 text-sm text-muted-foreground sm:px-8">
          {t(account.state === "trial" ? "Teste até" : "Acesso até")}{" "}
          {new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: timezone }).format(
            new Date(account.access_until),
          )}
          . {account.state === "trial" && t("O teste termina quando o prazo ou a franquia acabar.")}
        </p>
      )}
    </section>
  );
}
