import { loadCreditPacks } from "@/lib/billing/credit-packs";
import { availableMessages } from "@/lib/billing/credits";
import { tenantOperationAllowed, type OperationAccount } from "@/lib/billing/operation-access";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";
import { tagDeIdioma } from "@/lib/i18n/datas";
import { CheckoutButton } from "./CheckoutButton";

export async function CreditPacks({
  account,
  idioma,
}: {
  account: OperationAccount | null;
  idioma: Idioma;
}) {
  const catalog = await loadCreditPacks(),
    t = (s: string) => traduzir(s, idioma),
    locale = tagDeIdioma(idioma);
  const eligible =
    account?.mode === "platform" && account.state === "active" && tenantOperationAllowed(account);
  return (
    <section id="creditos-extras" className="scroll-mt-8 space-y-4">
      <h2 className="text-lg font-semibold">{t("Créditos extras")}</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        {t(
          "Amplie seu saldo sem trocar de plano. Os créditos extras acumulam e podem ser usados durante uma assinatura ativa.",
        )}
      </p>
      {!catalog.available && (
        <p role="alert">
          {t("Não foi possível consultar os pacotes. Tente novamente em instantes.")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.packs.map((p) => (
          <article key={p.id} className="space-y-3 rounded-xl bg-primary/5 p-5">
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-2xl font-semibold tabular-nums">
              {p.price_cents === null
                ? t("Preço pendente")
                : new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(
                    p.price_cents / 100,
                  )}
            </p>
            <p className="text-sm">
              {p.units.toLocaleString(locale)} {t("créditos · até")}{" "}
              {availableMessages(p.units).toLocaleString(locale)} {t("mensagens completas")}
            </p>
            {p.checkout_available && eligible ? (
              <CheckoutButton creditPackId={p.id} label={t("Comprar créditos")} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(
                  !p.checkout_available
                    ? "A compra de créditos extras está indisponível no momento."
                    : "Contrate ou renove seu plano para comprar créditos extras.",
                )}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
