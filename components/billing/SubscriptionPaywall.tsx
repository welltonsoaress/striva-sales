import Link from "next/link";
import { loadCommercialPlans } from "@/lib/billing/catalog";
import { planPricing } from "@/lib/billing/pricing";
import { formatPlanPrice } from "@/lib/billing/plans";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";
import { env } from "@/lib/env";
import { CheckoutButton } from "./CheckoutButton";
import { PaymentStatus } from "./PaymentStatus";

/** Sem fechar/Escape. A liberação depende do servidor, nunca da seleção visual do plano. */
export async function SubscriptionPaywall({ idioma, canBuy }: { idioma: Idioma; canBuy: boolean }) {
  const t = (text: string) => traduzir(text, idioma);
  const catalog = await loadCommercialPlans();
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-5 py-10 md:px-8" data-testid="subscription-paywall">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t("Escolha um plano para continuar")}</h1>
        <p className="text-muted-foreground">{t("Seu período de acesso terminou. Seus dados estão preservados. O atendimento será liberado após a confirmação do pagamento.")}</p>
      </header>
      {canBuy && <PaymentStatus />}
      {!canBuy && <p role="status">{t("Peça ao administrador da sua empresa para contratar um plano.")}</p>}
      {!catalog.available && <p role="alert">{t("Os planos não puderam ser carregados. Tente atualizar ou fale com o suporte.")}</p>}
      <div className="grid gap-5 md:grid-cols-3">
        {catalog.plans.filter(p => p.billing_interval === "semester").map(plan => (
          <article key={plan.id} className={`space-y-4 rounded-xl border p-6 ${plan.recommended ? "border-primary bg-primary/5" : "bg-card"}`}>
            <h2 className="text-xl font-semibold">{plan.name}{plan.recommended && <span className="ml-3 text-sm text-primary">{t("Recomendado")}</span>}</h2>
            <p className="text-sm text-muted-foreground">{t(plan.description)}</p>
            <p>{t("Equivalente a")} <strong className="text-2xl">{formatPlanPrice({ ...plan, price_cents: planPricing(plan).equivalent_monthly_cents }, idioma)}</strong>{t("/mês")}</p>
            <p className="text-sm">{t("Contratando 6 meses")}<br /><strong>{t("Total do período:")} {formatPlanPrice(plan, idioma)}</strong></p>
            <p className="text-sm">{plan.limits.ai_credits?.toLocaleString(idioma)} {t("créditos por mês")} · {plan.limits.users} {t("usuários")} · {plan.limits.whatsapp_numbers} WhatsApp</p>
            {canBuy && env.HOTMART_CHECKOUT_ENABLED === "true" && env.HOTMART_HOTTOK && plan.checkout_available
              ? <CheckoutButton planId={plan.id} />
              : <p className="text-sm text-muted-foreground">{t("Contratação indisponível no momento. A equipe está concluindo a liberação das ofertas.")}</p>}
          </article>
        ))}
      </div>
      <nav className="flex flex-wrap gap-5 text-sm" aria-label={t("Ajuda e acesso aos seus dados")}>
        <Link href="/app/settings/billing?period=year" className="text-primary underline">{t("Ver planos anuais e pagamentos")}</Link>
        <Link href="/app/ajuda" className="underline">{t("Abrir ajuda")}</Link>
        <Link href="/app/lgpd/requests" className="underline">{t("Privacidade e exportação")}</Link>
        <Link href="/login" className="underline">{t("Trocar de conta")}</Link>
      </nav>
    </main>
  );
}
