"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";

type CheckoutProps = (
  { planId: string; creditPackId?: never; proposalId?: never } | { creditPackId: string; planId?: never; proposalId?: never } | { proposalId: string; planId?: never; creditPackId?: never }
) & { label?: string };
export function CheckoutButton({ planId, creditPackId, proposalId, label }: CheckoutProps) {
  const t = useT();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const response = await fetch("/api/v1/billing/checkout", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(
                proposalId ? { proposal_id: proposalId } : creditPackId ? { credit_pack_id: creditPackId } : { plan_id: planId },
              ),
            });
            const result = await response.json();
            if (!response.ok || !result.data?.checkout_url)
              throw new Error(result.error?.message ?? "Não foi possível preparar o pagamento.");
            const url = new URL(result.data.checkout_url);
            if (url.protocol !== "https:" || url.hostname !== "pay.hotmart.com")
              throw new Error("Link de pagamento inválido.");
            window.location.assign(url.toString());
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Não foi possível preparar o pagamento.",
            );
            setPending(false);
          }
        }}
      >
        {pending ? t("Preparando pagamento…") : t(label ?? "Contratar plano")}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      )}
    </div>
  );
}
