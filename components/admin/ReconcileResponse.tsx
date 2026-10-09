"use client";
import { useT } from "@/lib/i18n/IdiomaProvider";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reconcileAiResponse } from "@/app/actions/admin/managedAi";
export function ReconcileResponse({ org, response }: { org: string; response: string }) {
  const t = useT();

  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-3"
      action={(f) =>
        start(async () => {
          try {
            const r = await reconcileAiResponse({
              organization_id: org,
              response_id: response,
              reason: String(f.get("reason")),
            });
            setMessage(r.ok ? r.message : r.error);
          } catch {
            setMessage("Não foi possível conferir agora. Tente novamente.");
          }
        })
      }
    >
      <label className="block flex-1 text-sm">
        {t("Motivo da conferência")}
        <input
          name="reason"
          required
          minLength={10}
          maxLength={1000}
          className="mt-1 block w-full rounded-lg border bg-background px-3 py-2"
        />
      </label>
      <Button type="submit" disabled={pending} variant="outline">
        {pending ? t("Conferindo…") : t("Conferir recibos")}
      </Button>
      {message && (
        <p role="status" className="w-full text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
