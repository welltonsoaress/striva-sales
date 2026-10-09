"use client";
import { useT } from "@/lib/i18n/IdiomaProvider";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { changeAiAccount } from "@/app/actions/admin/managedAi";
import { randomId } from "@/lib/random-id";
export function AiAccountActions({
  orgId,
  mode,
  readOnly,
}: {
  orgId: string;
  mode: string;
  readOnly: boolean;
}) {
  const t = useT();

  const router = useRouter();
  const request = useRef<{ signature: string; reference: string } | null>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [action, setAction] = useState(mode === "legacy" ? "migrate" : "adjust");
  if (readOnly)
    return (
      <p className="text-sm text-muted-foreground">
        {t(
          "Acesso de suporte: consulta. Alterações comerciais exigem administrador da plataforma.",
        )}
      </p>
    );
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      action={(form) =>
        start(async () => {
          setMessage("");
          const data = {
            organization_id: orgId,
            action,
            reason: String(form.get("reason")),
            units: Number(form.get("units") ?? 0),
          };
          const signature = JSON.stringify(data);
          if (request.current?.signature !== signature)
            request.current = { signature, reference: randomId() };
          try {
            const result = await changeAiAccount({ ...data, reference: request.current.reference });
            if (result.ok) {
              request.current = null;
              setMessage("Alteração registrada.");
              router.refresh();
            } else setMessage(result.error);
          } catch {
            setMessage(
              "A conexão falhou. Tente novamente para consultar ou concluir a mesma alteração.",
            );
          }
        })
      }
    >
      <label className="block text-sm">
        {t("Ação")}
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
        >
          {mode === "legacy" ? (
            <option value="migrate">{t("Migrar individualmente para IA incluída")}</option>
          ) : (
            <>
              <option value="adjust">{t("Ajustar créditos extras")}</option>
              <option value="trial_exception">{t("Liberar exceção de teste")}</option>
              <option value="suspend">{t("Suspender IA")}</option>
              <option value="reactivate">{t("Reativar no período contratado")}</option>
            </>
          )}
        </select>
      </label>
      {action === "adjust" && (
        <label className="block text-sm">
          {t("Créditos (use negativo para retirar)")}
          <input
            name="units"
            type="number"
            required
            defaultValue={0}
            min={-1000000}
            max={1000000}
            className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
          />
        </label>
      )}
      <label className="block text-sm sm:col-span-2">
        {t("Motivo")}
        <input
          name="reason"
          required
          minLength={10}
          maxLength={1000}
          className="mt-1 h-10 w-full rounded-lg border bg-background px-3"
          placeholder={t("Explique por que esta alteração é necessária")}
        />
      </label>
      {action === "migrate" && (
        <p className="text-sm text-amber-700 sm:col-span-2 dark:text-amber-300">
          {t(
            "A migração passa a usar a IA da plataforma e exige ativação comercial. Confira o contrato antes de aplicar; agente e credenciais existentes são preservados.",
          )}
        </p>
      )}
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? t("Aplicando…") : t("Aplicar e registrar")}
      </Button>
      {message && (
        <p role="status" className="block text-sm sm:col-span-2">
          {message}
        </p>
      )}
    </form>
  );
}
