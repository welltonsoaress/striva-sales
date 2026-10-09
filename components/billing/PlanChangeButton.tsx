"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/IdiomaProvider";
import { randomId } from "@/lib/random-id";

export function PlanChangeButton({ planId, intent = "change" }: { planId?: string; intent?: "change" | "cancel" | "renew" }) {
  const t = useT();
  const requestId = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  if (sent) return <p role="status" className="text-sm">{t("Solicitação enviada. A equipe da plataforma confirmará as condições antes de alterar seu plano.")} <Link href="/app/ajuda" className="text-primary underline">{t("Acompanhar no suporte")}</Link></p>;
  return <Button variant="outline" disabled={busy} onClick={async () => {
    setBusy(true);
    requestId.current ??= randomId();
    try {
      await apiClient.post("/api/v1/billing/change-request", { request_id: requestId.current, plan_id: planId, intent });
      setSent(true);
    } catch (error) { showApiError(error); } finally { setBusy(false); }
  }}>{t(busy ? "Enviando…" : intent === "cancel" ? "Solicitar cancelamento" : intent === "renew" ? "Solicitar renovação" : "Solicitar troca de plano")}</Button>;
}
