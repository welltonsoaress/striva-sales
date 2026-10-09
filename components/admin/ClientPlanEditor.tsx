"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setClientPlan } from "@/app/actions/admin/managedAi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import { randomId } from "@/lib/random-id";

export function ClientPlanEditor({
  orgId,
  currentPlan,
  plans,
  readOnly,
}: {
  orgId: string;
  currentPlan: string | null;
  plans: { id: string; name: string }[];
  readOnly: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const request = useRef<{ signature: string; reference: string } | null>(null);
  if (readOnly) return null;
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer text-sm font-medium">
        {t("Alterar plano manualmente")}
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">
        {t(
          "Esta concessão registra o plano e o período autorizado, sem registrar um pagamento. Em uma troca durante o mesmo ciclo, os créditos já usados continuam descontados.",
        )}
      </p>
      {plans.length ? (
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          action={(f) =>
            start(async () => {
              setMessage("");
              const until = new Date(String(f.get("access_until")));
              if (!Number.isFinite(until.getTime())) {
                setMessage(t("Informe uma data válida."));
                return;
              }
              const data = {
                organization_id: orgId,
                plan_id: String(f.get("plan_id")),
                access_until: until.toISOString(),
                reason: String(f.get("reason")),
              };
              const signature = JSON.stringify(data);
              if (request.current?.signature !== signature)
                request.current = { signature, reference: randomId() };
              try {
                const result = await setClientPlan({
                  ...data,
                  reference: request.current.reference,
                });
                setMessage(result.ok ? t("Plano atualizado.") : result.error);
                if (result.ok) {
                  request.current = null;
                  router.refresh();
                }
              } catch {
                setMessage(
                  t(
                    "Não foi possível concluir. Tente novamente para consultar ou concluir a mesma alteração.",
                  ),
                );
              }
            })
          }
        >
          <label className="text-sm">
            {t("Plano")}
            <select
              name="plan_id"
              defaultValue={currentPlan ?? ""}
              required
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
            >
              <option value="" disabled>
                {t("Selecione o plano")}
              </option>
              {plans.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t("Acesso até (seu horário local)")}
            <Input type="datetime-local" name="access_until" required />
          </label>
          <label className="text-sm sm:col-span-2">
            {t("Motivo da concessão ou alteração")}
            <Input name="reason" minLength={10} maxLength={1000} required />
          </label>
          <Button type="submit" disabled={pending} className="justify-self-start">
            {t("Aplicar plano")}
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-sm">
          {t("Publique um plano com limites definidos para conceder acesso.")}{" "}
          <Link href="/admin/plans" className="underline">
            {t("Configurar planos")}
          </Link>
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </details>
  );
}
