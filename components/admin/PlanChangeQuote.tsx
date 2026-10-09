"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/IdiomaProvider";

export function PlanChangeQuote({ threadId, onSent }: { threadId: string; onSent: () => void }) {
  const t = useT();
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  return <div className="space-y-3 rounded-lg border border-primary/30 p-4 text-sm">
    <p>{t("Confirme o preço da oferta com o cliente. Para uma troca, a recorrência anterior deve ter o cancelamento confirmado pelo servidor; o período pago é preservado.")}</p>
    <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />{t("Conferi as condições com o cliente. Não aplicar rateio ou cobrança adicional automática.")}</label>
    <Button variant="outline" disabled={!confirmed || busy} onClick={async () => {
      setBusy(true);
      try { await apiClient.post("/api/v1/admin/support/plan-change", { thread_id: threadId, conditions_confirmed: true }); onSent(); }
      catch (error) { showApiError(error); } finally { setBusy(false); }
    }}>{t(busy ? "Preparando…" : "Enviar proposta da troca")}</Button>
  </div>;
}
