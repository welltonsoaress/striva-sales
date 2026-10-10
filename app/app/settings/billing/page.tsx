import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { PaymentStatus } from "@/components/billing/PaymentStatus";
import { PlanChangeButton } from "@/components/billing/PlanChangeButton";
import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { loadCommercialPlans } from "@/lib/billing/catalog";
import { formatPlanPrice } from "@/lib/billing/plans";
import { getBudgetStatus } from "@/lib/ai/budget/check";
import { traduzir } from "@/lib/i18n/dicionario";
import { Button } from "@/components/ui/button";
import { Receipt } from "@/lib/ui/icons";
import Link from "next/link";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { loadBillingAccount } from "@/lib/billing/account";
import { billingStatusLabel } from "@/lib/billing/hotmart";
import { env } from "@/lib/env";
import { loadBillingCreditSnapshot } from "@/lib/billing/response-usage";
import { RefreshUsage } from "@/components/billing/RefreshUsage";
import { ResponseBalance } from "@/components/billing/ResponseBalance";
import { CreditPacks } from "@/components/billing/CreditPacks";
import { planPricing } from "@/lib/billing/pricing";
import { CurrentPlan } from "@/components/billing/CurrentPlan";
import { countActiveMessagingChannels } from "@/lib/channels/selectable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Faturamento" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; period?: string; payment?: string; proposal?: string }>;
}) {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org || org.role !== "admin" || user.support?.access_mode === "support_readonly")
    redirect("/403");
  const t = (text: string) => traduzir(text, user.idioma);
  const [catalog, budget, account, creditSnapshot] = await Promise.all([
    loadCommercialPlans(),
    getBudgetStatus(org.orgId),
    loadBillingAccount(org.orgId),
    loadBillingCreditSnapshot(org.orgId),
  ]);
  const query = await searchParams;
  const proposalId = z.string().uuid().safeParse(query.proposal);
  const { data: proposal } = proposalId.success
    ? await createAdminClient()
        .from("billing_checkouts")
        .select("id,plan_id,price_cents,billing_interval,transaction_code")
        .eq("organization_id", org.orgId)
        .eq("id", proposalId.data)
        .not("change_request_id", "is", null)
        .maybeSingle()
    : { data: null };

  const { account: commercial, checked_at, usage } = creditSnapshot;
  const db = createAdminClient();
  const [members, numbers] = await Promise.all([
    db
      .from("user_organizations")
      .select("user_id", { count: "exact", head: true })
      .eq("organization_id", org.orgId)
      .is("revoked_at", null)
      .not("accepted_at", "is", null),
    countActiveMessagingChannels(db, org.orgId),
  ]);
  const currentPlan = catalog.plans.find((plan) => plan.id === commercial?.plan_id);
  const paidActive =
    commercial?.mode === "platform" &&
    commercial.state === "active" &&
    !!commercial.access_until &&
    Date.parse(commercial.access_until) > checked_at;
  const selected = catalog.plans.find((plan) => plan.id === query.plan);
  const period =
    selected?.billing_interval === "year" || (!selected && query.period === "year")
      ? "year"
      : "semester";
  const offers = catalog.plans.filter((plan) => plan.billing_interval === period);
  const usd = (cents: number) =>
    new Intl.NumberFormat(user.idioma, { style: "currency", currency: "USD" }).format(cents / 100);
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-5 py-8 md:px-8">
      <header className="space-y-3">
        <Receipt size={28} className="text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">{t("Meu plano")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Planos, consumo e condições da sua contratação.")}
        </p>
      </header>
      {query.payment && <PaymentStatus />}
      <CurrentPlan
        account={commercial}
        plan={currentPlan}
        users={members.error ? null : members.count}
        channels={numbers.error ? null : numbers.count}
        t={t}
        locale={user.idioma}
        timezone={user.timezone ?? "UTC"}
      />
      {proposal && !proposal.transaction_code && (
        <section className="space-y-3 rounded-xl border border-primary p-5">
          <h2 className="text-lg font-semibold">{t("Proposta de troca de plano")}</h2>
          <p>
            {catalog.plans.find((p) => p.id === proposal.plan_id)?.name} ·{" "}
            {t(proposal.billing_interval === "year" ? "1 ano" : "6 meses")}
          </p>
          <p>
            <strong>
              {t("Total do período:")}{" "}
              {new Intl.NumberFormat(user.idioma, { style: "currency", currency: "BRL" }).format(
                Number(proposal.price_cents) / 100,
              )}
            </strong>
          </p>
          <p className="text-sm text-muted-foreground">
            {t(
              "Confira as condições acertadas com a equipe da plataforma antes de pagar. Seu plano só muda após a confirmação do pagamento.",
            )}
          </p>
          {env.HOTMART_CHECKOUT_ENABLED === "true" &&
          env.HOTMART_HOTTOK &&
          catalog.plans.some((plan) => plan.id === proposal.plan_id && plan.checkout_available) ? (
            <CheckoutButton proposalId={proposal.id} label={t("Aceitar proposta e pagar")} />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              {t(
                "Contratação indisponível no momento. A equipe está concluindo a liberação das ofertas.",
              )}
            </p>
          )}
        </section>
      )}
      <ResponseBalance account={commercial} checkedAt={checked_at} />
      <section className="space-y-3 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">{t("Sua contratação")}</h2>
        {!account.available && (
          <p role="alert" className="text-sm">
            {t("Não foi possível carregar seu histórico de pagamentos.")}
          </p>
        )}
        {account.contracts.map((contract) => (
          <div key={contract.id} className="space-y-2 border-b py-3 text-sm">
            <p className="font-medium">
              {catalog.plans.find((plan) => plan.id === contract.plan_id)?.name ??
                t("Plano contratado")}
            </p>
            <p>
              {t(
                contract.cancelled_at
                  ? "Assinatura cancelada"
                  : contract.subscription_status
                    ? billingStatusLabel(contract.subscription_status)
                    : "Compra vinculada à sua empresa",
              )}
            </p>
            {contract.cancelled_at && (
              <p>
                {t("Cancelamento registrado em")}{" "}
                {new Intl.DateTimeFormat(user.idioma, {
                  dateStyle: "medium",
                  timeZone: user.timezone ?? "UTC",
                }).format(new Date(contract.cancelled_at))}
              </p>
            )}
            {contract.cancelled_at && contract.access_until && (
              <p className="text-muted-foreground">
                {t("Fim do período contratado:")}{" "}
                {new Intl.DateTimeFormat(user.idioma, {
                  dateStyle: "medium",
                  timeZone: user.timezone ?? "UTC",
                }).format(new Date(contract.access_until))}
              </p>
            )}
            {contract.next_charge_at && contract.subscription_status === "ACTIVE" && (
              <p>
                {t("Próxima cobrança:")}{" "}
                {new Intl.DateTimeFormat(user.idioma, {
                  dateStyle: "medium",
                  timeZone: user.timezone ?? "UTC",
                }).format(new Date(contract.next_charge_at))}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("Atualizado em")}{" "}
              {new Intl.DateTimeFormat(user.idioma, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: user.timezone ?? "UTC",
              }).format(new Date(contract.last_event_at))}
            </p>
          </div>
        ))}
        {paidActive && (
          <div className="space-y-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {t(
                "A equipe da plataforma confirma o valor da troca antes de efetivá-la. Sua solicitação não gera uma nova cobrança.",
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <PlanChangeButton intent="renew" />
              <PlanChangeButton intent="cancel" />
            </div>
          </div>
        )}
        {!account.contracts.length && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t(
              "As ofertas estão em preparação. Os valores abaixo são referências para revisão; confirme as condições com a equipe antes de contratar.",
            )}
          </p>
        )}
        <Button asChild variant="outline">
          <Link href="/app/ajuda#faturamento">{t("Entender planos e faturamento")}</Link>
        </Button>
      </section>
      <section aria-labelledby="plans-title">
        <h2 id="plans-title" className="mb-4 text-lg font-semibold">
          {t("Conheça os planos")}
        </h2>
        <nav aria-label={t("Período de contratação")} className="mb-5 flex flex-wrap gap-3">
          <Button asChild variant={period !== "year" ? "default" : "outline"}>
            <Link href="?period=semester">{t("6 meses")}</Link>
          </Button>
          <Button asChild variant={period === "year" ? "default" : "outline"}>
            <Link href="?period=year">{t("1 ano")}</Link>
          </Button>
        </nav>
        {!catalog.available ? (
          <p role="alert" className="text-sm text-muted-foreground">
            {t(
              "O catálogo não está disponível. A equipe da plataforma pode conferir a atualização do banco.",
            )}
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {offers.map((plan) => (
              <article
                key={plan.id}
                id={`offer-${plan.id}`}
                className={
                  "flex flex-col gap-4 rounded-lg border bg-card p-6 " +
                  (plan.recommended ? "border-primary" : "") +
                  (plan.id === selected?.id ? " ring-2 ring-primary ring-offset-2" : "")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {plan.recommended && (
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      {t("Recomendado")}
                    </span>
                  )}
                </div>
                <p className="min-h-12 text-sm leading-relaxed text-muted-foreground">
                  {t(plan.description)}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  <span className="mb-1 block text-xs font-normal text-muted-foreground">
                    {t("Equivalente a")}
                  </span>
                  {formatPlanPrice(
                    { ...plan, price_cents: planPricing(plan).equivalent_monthly_cents },
                    user.idioma,
                  ) ?? t("A definir")}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {t("/mês")}
                  </span>
                </p>
                <p className="text-sm">
                  {t(
                    plan.billing_interval === "year" ? "Contratando 1 ano" : "Contratando 6 meses",
                  )}
                  <br />
                  <strong>
                    {t("Total do período:")} {formatPlanPrice(plan, user.idioma) ?? t("A definir")}
                  </strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    plan.publication_state === "published" && plan.checkout_available
                      ? "Contratação disponível"
                      : "Oferta em preparação",
                  )}
                  {plan.billing_interval === null ? " · " + t("Periodicidade a definir") : ""}
                </p>
                <dl className="mt-2 space-y-3 text-sm">
                  {[
                    { label: t("Usuários"), value: plan.limits.users },
                    { label: t("Números de WhatsApp"), value: plan.limits.whatsapp_numbers },
                    { label: t("Créditos por mês"), value: plan.limits.ai_credits },
                  ].map((limit) => (
                    <div key={limit.label} className="flex items-center justify-between gap-3">
                      <dt>{limit.label}</dt>
                      <dd className="text-muted-foreground">{limit.value ?? t("A definir")}</dd>
                    </div>
                  ))}
                </dl>
                {paidActive ? (
                  <div className="mt-auto border-t pt-4">
                    <PlanChangeButton planId={plan.id} />
                  </div>
                ) : env.HOTMART_HOTTOK &&
                  env.HOTMART_CHECKOUT_ENABLED === "true" &&
                  plan.publication_state === "published" &&
                  plan.checkout_available ? (
                  <div className="mt-auto border-t pt-4">
                    <CheckoutButton planId={plan.id} />
                  </div>
                ) : (
                  <p className="mt-auto border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                    {t(
                      "A contratação será disponibilizada depois da confirmação das condições e dos meios de pagamento.",
                    )}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      {account.payments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t("Histórico de pagamentos")}</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="p-3">{t("Pagamento")}</th>
                  <th className="p-3">{t("Valor")}</th>
                  <th className="p-3">{t("Situação")}</th>
                </tr>
              </thead>
              <tbody>
                {account.payments.map((payment) => (
                  <tr key={payment.id} className="border-b last:border-0">
                    <td className="p-3">{payment.transaction_code}</td>
                    <td className="p-3 tabular-nums">
                      {new Intl.NumberFormat(user.idioma, {
                        style: "currency",
                        currency: payment.currency,
                      }).format(payment.amount_cents / 100)}
                    </td>
                    <td className="p-3">{t(billingStatusLabel(payment.status))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "Últimos 20 pagamentos recebidos. Consulte o suporte para documentos e gestão da assinatura.",
            )}
          </p>
        </section>
      )}
      <section className="grid gap-6 border-t pt-8 md:grid-cols-2">
        <div className="space-y-4 md:col-span-2" aria-labelledby="ai-responses-title">
          <h2 id="ai-responses-title" className="text-lg font-semibold">
            {t(
              usage.meter === "message_v1"
                ? "Histórico anterior de envios"
                : "Créditos consumidos neste ciclo",
            )}
          </h2>
          {usage.available ? (
            <>
              <p className="text-3xl font-semibold tabular-nums" data-testid="ai-response-total">
                {new Intl.NumberFormat(user.idioma).format(usage.total)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  usage.meter !== "message_v1"
                    ? "Cada mensagem completa confirmada consome 10 créditos, mesmo dividida em vários envios."
                    : "Histórico legado deste mês (UTC): cada mensagem de IA aceita pelo canal foi registrada como uma unidade.",
                )}
              </p>
              {usage.recent.length > 0 && (
                <details className="rounded-lg border p-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    {t("Ver últimos 20 registros deste mês")}
                  </summary>
                  <ul className="mt-3 space-y-2 text-sm">
                    {usage.recent.map((row) => (
                      <li
                        key={row.id}
                        className="flex justify-between gap-4 border-b py-2 last:border-0"
                      >
                        <time dateTime={row.accepted_at}>
                          {new Intl.DateTimeFormat(user.idioma, {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: user.timezone ?? "UTC",
                          }).format(new Date(row.accepted_at))}
                        </time>
                        <span>
                          {row.units}{" "}
                          {t(
                            usage.meter === "message_v1"
                              ? row.units === 1
                                ? "envio anterior"
                                : "envios anteriores"
                              : "créditos",
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          ) : (
            <p role="alert" className="text-sm">
              {t("Não foi possível carregar os registros de consumo.")}
            </p>
          )}
          <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
            {t(
              usage.meter !== "message_v1"
                ? "A franquia mensal não acumula. Créditos extras permanecem disponíveis enquanto houver assinatura ativa. Registros antigos por mensagem foram preservados sem recalcular consumo."
                : "O histórico antigo mantém sua régua por mensagem. Envios anteriores ao início da medição não foram recalculados.",
            )}
          </p>
          <RefreshUsage label={t("Atualizar consumo")} />
        </div>
        {commercial?.mode !== "platform" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">{t("Uso da inteligência artificial")}</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt>{t("Custo de IA medido neste mês (USD)")}</dt>
                <dd className="font-medium tabular-nums">
                  {usd(budget.current_month_consumed_cents)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t("Limite operacional de IA (USD)")}</dt>
                <dd className="font-medium tabular-nums">
                  {budget.monthly_limit_cents === 0
                    ? t("Sem limite configurado")
                    : usd(budget.monthly_limit_cents)}
                </dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t(
                "Esta medida acompanha o custo operacional registrado. Ela não representa uma fatura nem um saldo de créditos contratado.",
              )}
            </p>
            {budget.gasto_incompleto && (
              <p role="alert" className="text-sm text-muted-foreground">
                {t("Parte do consumo não tem custo registrado. O valor exibido é parcial.")}
              </p>
            )}
            {user.is_platform_admin && !user.support && (
              <Button asChild variant="outline">
                <Link href="/app/ai/usage">{t("Ver detalhes do uso")}</Link>
              </Button>
            )}
          </div>
        )}
        <CreditPacks account={commercial} idioma={user.idioma} />
      </section>
    </div>
  );
}
