"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "@/lib/ui/icons";
import type { CommercialPlan } from "@/lib/billing/plans";
import styles from "./landing.module.css";
import { annualSaving, planPricing } from "@/lib/billing/pricing";

const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export function PricingSection({
  plans,
  available,
}: {
  plans: CommercialPlan[];
  available: boolean;
}) {
  const [period, setPeriod] = useState<"semester" | "year">("semester");
  const offers = plans.filter((plan) => plan.billing_interval === period);
  return (
    <section
      id="planos"
      className={`${styles.section} ${styles.pricingSection}`}
      aria-labelledby="pricing-title"
    >
      <div className={styles.pricingIntro}>
        <h2 id="pricing-title">
          Mais organização.
          <br />
          Um plano para o seu próximo passo.
        </h2>
        <p>
          Escolha a capacidade da sua operação. Atendimento, oportunidades e agenda conectados, com
          sua equipe no controle.
        </p>
        <div className={styles.periodSwitch} role="group" aria-label="Período de contratação">
          <button
            type="button"
            aria-pressed={period === "semester"}
            onClick={() => setPeriod("semester")}
          >
            6 meses
          </button>
          <button type="button" aria-pressed={period === "year"} onClick={() => setPeriod("year")}>
            1 ano <span>Menor custo por mês</span>
          </button>
        </div>
      </div>
      {!available || !offers.length ? (
        <p role="status">
          Os planos estão sendo atualizados. Tente novamente em instantes ou fale com nossa equipe.
        </p>
      ) : (
        <div className={styles.pricingGrid}>
          {offers.map((plan) => {
            const { months, equivalent_monthly_cents } = planPricing(plan);
            const saving = annualSaving(plan, plans);
            return (
              <article
                key={plan.id}
                className={`${styles.pricingPlan} ${plan.recommended ? styles.pricingRecommended : ""}`}
              >
                <div className={styles.pricingPlanHeading}>
                  <h3>{plan.name}</h3>
                  {plan.recommended && <span className={styles.recommendedLabel}>Recomendado</span>}
                </div>
                <p className={styles.pricingDescription}>{plan.description}</p>
                <p className={styles.pricingEquivalent}>Equivalente a</p>
                <p className={styles.pricingAmount}>
                  {equivalent_monthly_cents === null
                    ? "Sob consulta"
                    : money(equivalent_monthly_cents)}
                  <span>/mês</span>
                </p>
                <p className={styles.pricingTotal}>
                  {plan.price_cents !== null && (
                    <>
                      Contratando {months === 12 ? "1 ano" : "6 meses"}
                      <br />
                      <strong>Total do período: {money(plan.price_cents)}</strong>
                    </>
                  )}
                  <br />
                  Cobrança pelo período contratado.
                </p>
                {saving > 0 && (
                  <p className={styles.pricingSaving}>
                    Economize {money(saving)} por ano em relação a dois semestres.
                  </p>
                )}
                <ul className={styles.pricingFeatures}>
                  <li>
                    <Check aria-hidden size={18} />
                    Até {plan.limits.users ?? "—"} usuários
                  </li>
                  <li>
                    <Check aria-hidden size={18} />
                    Até {plan.limits.whatsapp_numbers ?? "—"}{" "}
                    {plan.limits.whatsapp_numbers === 1
                      ? "número de WhatsApp"
                      : "números de WhatsApp"}
                  </li>
                  <li>
                    <Check aria-hidden size={18} />
                    {plan.limits.ai_credits?.toLocaleString("pt-BR") ?? "—"} créditos por mês
                  </li>
                  <li>
                    <Check aria-hidden size={18} />
                    CRM, acompanhamento e agenda
                  </li>
                  <li>
                    <Check aria-hidden size={18} />
                    Configuração guiada e suporte no sistema
                  </li>
                </ul>
                <Link
                  className={`${styles.button} ${!plan.recommended ? styles.pricingSecondary : ""}`}
                  href={`/app/settings/billing?plan=${plan.id}`}
                >
                  Escolher {plan.name}
                  <ArrowRight aria-hidden size={18} />
                </Link>
              </article>
            );
          })}
        </div>
      )}
      <p className={styles.pricingFootnote}>
        Cada mensagem completa do agente usa 10 créditos, mesmo dividida em vários envios. A
        franquia renova mensalmente. Confira o total e as condições no checkout antes de pagar.
        Consulte os pacotes extras e a disponibilidade de compra na sua conta.
      </p>
    </section>
  );
}
