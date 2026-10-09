import { requireAuth } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { tagDeIdioma } from "@/lib/i18n/datas";
import Link from "next/link";
import { saasOverview } from "@/lib/billing/admin";
export async function SaasOverview() {
  const idioma = (await requireAuth()).idioma;
  const t = (text: string) => traduzir(text, idioma);
  const locale = tagDeIdioma(idioma);

  const s = await saasOverview();
  if (!s)
    return (
      <p role="alert" className="rounded-xl border p-5">
        {t(
          "Não foi possível carregar a operação SaaS. Recarregue para consultar números atualizados.",
        )}
      </p>
    );
  const coverage = s.total_calls ? Math.round((s.measured_calls / s.total_calls) * 100) : null;
  const cards = [
    ["Empresas", s.companies, "/admin/tenants"],
    ["Em teste", s.trial, "/admin/tenants?commercial_state=trial"],
    ["Assinaturas ativas", s.active, "/admin/tenants?commercial_state=active"],
    ["Expiradas", s.expired, "/admin/tenants?commercial_state=expired"],
    ["Suspensas", s.suspended, "/admin/tenants?commercial_state=suspended"],
    ["Créditos consumidos", s.credits, "/admin/ai"],
  ] as const;
  return (
    <section className="mb-8 space-y-5">
      <header>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          {t("Empresas, atendimento e receita")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Mês corrente em UTC.")} {s.legacy} {t("empresas seguem com IA legada.")}
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value, href]) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <p className="text-xs text-muted-foreground">{t(label)}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">
              {value.toLocaleString(locale)}
            </p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5">
          <p className="text-sm font-medium">{t("Pagamentos confirmados")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
              s.received_brl_cents / 100,
            )}
          </p>
          <Link href="/admin/finance" className="mt-3 block text-sm underline underline-offset-4">
            {t("Ver financeiro e divergências (")}
            {s.webhook_pending})
          </Link>
        </div>
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-5">
          <p className="text-sm font-medium">{t("Custo conhecido da IA · USD")}</p>
          <p className="mt-2 text-2xl font-semibold">
            {s.known_cost_usd_cents === null
              ? t("Ainda sem medição")
              : new Intl.NumberFormat(locale, {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 4,
                }).format(s.known_cost_usd_cents / 100)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("Cobertura:")} {coverage === null ? t("sem chamadas") : `${coverage}% das chamadas`}.{" "}
            {s.unknown_cost_calls} {t("chamadas com custo desconhecido.")}
          </p>
          <Link href="/admin/ai" className="mt-3 block text-sm underline underline-offset-4">
            {t("Configurar e acompanhar a IA")}
          </Link>
        </div>
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <h3 className="font-semibold">{t("Precisa de atenção")}</h3>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/admin/tenants">
            {s.empty_balance} {t("empresas sem saldo")}
          </Link>
          <Link href="/admin/tenants">
            {s.offline_channels} {t("WhatsApps desconectados")}
          </Link>
          <Link href="/admin/incidents">
            {s.failed_jobs} {t("tarefas com falha definitiva")}
          </Link>
          <Link href="/admin/ai/health">
            {s.uncertain_responses} {t("respostas aguardando reconciliação")}
          </Link>
        </div>
      </div>
    </section>
  );
}
