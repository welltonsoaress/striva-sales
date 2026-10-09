"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { updateCommercialPlan } from "@/app/actions/admin/updateCommercialPlan";
import type { CommercialPlan } from "@/lib/billing/plans";
import { ActivateHotmart } from "./_hotmart";
import { publishCommercialPlan } from "@/app/actions/admin/hotmart";

function PlanForm({ plan, readOnly }: { plan: CommercialPlan; readOnly: boolean }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <form
        className="space-y-5 border-b py-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (readOnly || pending) return;
          // A action do formulário resetaria os campos mesmo quando o servidor
          // retorna um erro. Preserve a edição para a pessoa corrigir e reenviar.
          const form = new FormData(event.currentTarget);
          const number = (key: string) =>
            String(form.get(key) ?? "").trim() === "" ? null : Number(form.get(key));
          startTransition(async () => {
            try {
              const result = await updateCommercialPlan({
                id: plan.id,
                name: form.get("name"),
                description: form.get("description"),
                price_cents: number("price") === null ? null : Math.round(number("price")! * 100),
                billing_interval: form.get("billing_interval") || null,
                recommended: form.get("recommended") === "on",
                hotmart_offer: String(form.get("checkout_url") ?? "").trim()
                  ? {
                      product_ucode: form.get("product_ucode"),
                      offer_code: form.get("offer_code"),
                      checkout_url: form.get("checkout_url"),
                      enabled: false,
                    }
                  : null,
                limits: {
                  users: number("users"),
                  whatsapp_numbers: number("whatsapp_numbers"),
                  ai_credits: number("ai_credits"),
                },
              });
              if (result.ok) toast.success(t("Plano salvo em rascunho."));
              else toast.error(t(result.error));
            } catch {
              toast.error(
                t("Não foi possível salvar. Seus ajustes continuam aqui para tentar novamente."),
              );
            }
          });
        }}
      >
        <fieldset disabled={readOnly || pending} className="space-y-5">
          <h2 className="text-lg font-semibold">{plan.name}</h2>
          <p className="text-sm text-muted-foreground">
            {t(
              plan.billing_interval === "semester"
                ? "Semestral"
                : plan.billing_interval === "year"
                  ? "Anual"
                  : plan.billing_interval === "month"
                    ? "Mensal"
                    : "A definir",
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm">
              {t("Nome do plano")}
              <Input name="name" defaultValue={plan.name} required maxLength={80} />
            </label>
            <label className="block space-y-2 text-sm">
              {t("Preço em reais")}
              <Input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={plan.price_cents === null ? "" : plan.price_cents / 100}
                placeholder={t("A definir")}
              />
            </label>
          </div>
          <label className="block space-y-2 text-sm">
            {t("Descrição")}
            <Input name="description" defaultValue={plan.description} maxLength={500} />
          </label>
          <label className="block space-y-2 text-sm">
            {t("Periodicidade")}
            <select
              name="billing_interval"
              defaultValue={plan.billing_interval ?? ""}
              className="block h-10 w-full rounded-md border bg-background px-3"
            >
              <option value="">{t("A definir")}</option>
              <option value="month">{t("Mensal")}</option>
              <option value="semester">{t("Semestral")}</option>
              <option value="year">{t("Anual")}</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                { key: "users", label: t("Usuários") },
                { key: "whatsapp_numbers", label: t("Números de WhatsApp") },
                { key: "ai_credits", label: t("Créditos por mês") },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="block space-y-2 text-sm">
                {label}
                <Input
                  name={key}
                  type="number"
                  min={key === "ai_credits" ? 0 : 1}
                  step="1"
                  defaultValue={plan.limits[key] ?? ""}
                  placeholder={t("A definir")}
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t(
              "Cada mensagem completa confirmada consome 10 créditos, mesmo dividida em vários envios.",
            )}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="recommended" defaultChecked={plan.recommended} />
            {t("Plano recomendado")}
          </label>
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="font-medium">{t("Pagamento pela Hotmart")}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t(
                "Cadastre o produto, a oferta e o link de pagamento. O rascunho mantém o checkout desligado até a homologação.",
              )}
            </p>
            <label className="block space-y-2 text-sm">
              {t("Código do produto na Hotmart (ucode)")}
              <Input
                name="product_ucode"
                defaultValue={plan.hotmart_offer?.product_ucode ?? ""}
                maxLength={36}
                placeholder="00000000-0000-4000-8000-000000000000"
              />
            </label>
            <label className="block space-y-2 text-sm">
              {t("Código da oferta na Hotmart")}
              <Input
                name="offer_code"
                defaultValue={plan.hotmart_offer?.offer_code ?? ""}
                maxLength={100}
              />
            </label>
            <label className="block space-y-2 text-sm">
              {t("Link de pagamento da Hotmart")}
              <Input
                name="checkout_url"
                type="url"
                defaultValue={plan.hotmart_offer?.checkout_url ?? ""}
                maxLength={1000}
                placeholder="https://pay.hotmart.com/…"
              />
            </label>
          </div>
          <Button disabled={pending || readOnly}>
            {pending ? t("Salvando…") : t("Salvar rascunho")}
          </Button>
        </fieldset>
      </form>
      <div className="space-y-2 pb-5">
        <Button
          variant="outline"
          disabled={readOnly || pending || plan.publication_state === "published"}
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await publishCommercialPlan(plan.id);
                if (result.ok)
                  toast.success(t("Condições publicadas. O pagamento continua desligado."));
                else toast.error(t(result.error));
              } catch {
                toast.error(
                  t("Não foi possível salvar. Seus ajustes continuam aqui para tentar novamente."),
                );
              }
            })
          }
        >
          {t("Publicar condições sem ativar pagamento")}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t(
            "Mostra os valores na página de planos. A cobrança só é ativada pelo botão separado de pagamento.",
          )}
        </p>
      </div>
      {plan.hotmart_offer && (
        <div className="space-y-2 pb-6">
          <p className="text-xs text-muted-foreground">
            {t(
              "A ativação confirma que a oferta e os eventos foram testados na Hotmart. Salvar outro rascunho desliga o pagamento desta oferta.",
            )}
          </p>
          <ActivateHotmart
            planId={plan.id}
            disabled={readOnly || pending || plan.hotmart_offer.enabled}
          />
        </div>
      )}
    </div>
  );
}

export function PlansEditor({
  catalog,
  readOnly,
}: {
  catalog: { available: boolean; plans: CommercialPlan[] };
  readOnly: boolean;
}) {
  const t = useT();
  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">{t("Planos comerciais")}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t(
          "Prepare nomes, valores e limites da oferta. Estes rascunhos não ativam pagamentos nem alteram o acesso das organizações.",
        )}
      </p>
      {!catalog.available ? (
        <p role="alert" className="mt-6">
          {t(
            "Não foi possível carregar o catálogo. Confira se a atualização do banco foi aplicada.",
          )}
        </p>
      ) : (
        catalog.plans.map((plan) => (
          <PlanForm
            key={`${plan.id}:${plan.price_cents}:${plan.name}`}
            plan={plan}
            readOnly={readOnly}
          />
        ))
      )}
    </div>
  );
}
