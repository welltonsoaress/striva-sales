"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { activateHotmartOffer, reprocessHotmartEvent } from "@/app/actions/admin/hotmart";

export function ActivateHotmart({ planId, disabled }: { planId: string; disabled: boolean }) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          try {
            const result = await activateHotmartOffer(planId);
            if (result.ok) toast.success(t("Pagamento disponibilizado."));
            else toast.error(t(result.error!));
          } catch {
            toast.error(t("Não foi possível salvar. Tente novamente."));
          }
        })
      }
    >
      {pending ? t("Salvando…") : t("Homologação concluída: ativar pagamento")}
    </Button>
  );
}

export function HotmartReceipts({
  configured,
  checkoutEnabled,
  available,
  events,
  readOnly,
}: {
  configured: boolean;
  checkoutEnabled: boolean;
  available: boolean;
  events: {
    event_id: string;
    event: string;
    state: string;
    reason: string | null;
    received_at: string;
  }[];
  readOnly: boolean;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  return (
    <section className="my-8 space-y-4 rounded-lg border p-5">
      <h2 className="text-lg font-semibold">{t("Recepção da Hotmart")}</h2>
      <p className="text-sm">
        {configured
          ? t("Segredo de recepção configurado.")
          : t("Recepção desligada: configure HOTMART_HOTTOK na instalação.")}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {!checkoutEnabled && t("Cobrança desligada: a integração aguarda homologação completa.")}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t(
          "Endereço do webhook: /api/v1/webhooks/hotmart. Use a versão 2.0.0. Confira uma compra de teste e seus eventos antes de ativar uma oferta.",
        )}
      </p>
      {!available ? (
        <p role="alert">{t("Não foi possível carregar os eventos de pagamento.")}</p>
      ) : !events.length ? (
        <p className="text-sm text-muted-foreground">{t("Nenhum evento recebido ainda.")}</p>
      ) : (
        <ul className="divide-y">
          {events.map((event) => (
            <li key={event.event_id} className="space-y-2 py-3 text-sm">
              <p className="font-medium break-all">{event.event}</p>
              <p className="text-xs text-muted-foreground">
                {t(
                  (
                    {
                      applied: event.event === "SUBSCRIPTION_CANCELLATION" ? "Assinatura atualizada" : "Pagamento registrado",
                      unmatched: "Vínculo pendente",
                      obsolete: "Evento anterior ao estado registrado",
                      unsupported: "Evento requer homologação",
                      received: "Em processamento",
                      failed: "Falha no processamento",
                    } as Record<string, string>
                  )[event.state] ?? "Em processamento",
                )}
              </p>
              <p className="text-xs">{event.received_at}</p>
              {["unmatched", "unsupported"].includes(event.state) && (
                <p className="text-xs">
                  {t(
                    event.event === "SUBSCRIPTION_CANCELLATION"
                      ? "Confira o código da assinatura na Hotmart. O cancelamento só pode ser aplicado depois que a compra vincular a assinatura à empresa."
                      : "Confira a referência da compra, o produto e a oferta na Hotmart. Eventos sem vínculo não alteram organizações.",
                  )}
                </p>
              )}
              {["unmatched", "failed"].includes(event.state) && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={readOnly || pending}
                  onClick={() =>
                    start(async () => {
                      try {
                        const result = await reprocessHotmartEvent(event.event_id);
                        if (result.ok) toast.success(t("Evento conferido."));
                        else toast.error(t(result.error!));
                      } catch {
                        toast.error(t("Não foi possível conferir o evento. Tente novamente."));
                      }
                    })
                  }
                >
                  {t(event.state === "failed" ? "Reprocessar evento" : "Conferir vínculo novamente")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
