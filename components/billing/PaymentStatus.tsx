"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/hooks/i18n/useT";
import Link from "next/link";

export function PaymentStatus() {
  const t = useT();
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("payment")) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 120_000;
    async function check() {
      try {
        const response = await fetch("/api/v1/billing/payment-status", { cache: "no-store" });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok) { setStatus("unavailable"); return; }
        const state = result.data?.status ?? "pending";
        setStatus(state);
        if (state === "confirmed") { router.refresh(); return; }
        if (state === "pending" && Date.now() < deadline) timer = setTimeout(check, 4000);
        else if (state === "pending") setStatus("waiting");
      } catch { if (!cancelled) setStatus("unavailable"); }
    }
    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [router, retry]);
  if (!status) return null;
  return <section role="status" className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-5">
    <h2 className="font-semibold">{t(status === "confirmed" ? "Pagamento confirmado" : "Acompanhando seu pagamento")}</h2>
    <p className="text-sm">{t(status === "confirmed"
      ? "Seu plano está ativo. Você já pode continuar usando o sistema."
      : status === "reversed" ? "O pagamento foi revertido. Confira o faturamento ou fale com o suporte."
      : status === "unavailable" ? "Não foi possível conferir agora. Seu pagamento não será cobrado novamente por esta consulta."
      : "Aguardamos a confirmação do pagamento. Pagamentos por boleto podem levar mais tempo. Não é necessário comprar o plano novamente.")}</p>
    {status === "confirmed" ? <Link href="/app/inicio" className="text-primary underline">{t("Continuar para o sistema")}</Link>
      : <button type="button" onClick={() => setRetry(value => value + 1)} className="text-primary underline">{t("Conferir novamente")}</button>}
    {status !== "confirmed" && <Link href="/app/ajuda" className="ml-5 underline">{t("Abrir ajuda")}</Link>}
  </section>;
}
