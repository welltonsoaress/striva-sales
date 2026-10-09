"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";

export function InviteUser({ tenants }: { tenants: { id: string; display_name: string }[] }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setOpen((v) => !v)}>{t("Adicionar usuário")}</Button>
        <Button asChild variant="outline">
          <Link href="/admin/tenants/new">{t("Cadastrar novo cliente")}</Link>
        </Button>
      </div>
      {open && (
        <form
          className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
          action={(f) =>
            start(async () => {
              setMessage("");
              setLink("");
              try {
                const r = await apiClient.post<{
                  data: { email_dispatched: boolean; accept_url: string };
                }>("/api/v1/admin/users", {
                  email: String(f.get("email")),
                  organization_id: String(f.get("organization_id")),
                  role: String(f.get("role")),
                });
                setMessage(
                  r.data.email_dispatched
                    ? t(
                        "Convite enviado. O usuário criará a senha e confirmará a conta pelo e-mail.",
                      )
                    : t(
                        "O e-mail não foi enviado. Copie o convite abaixo ou confira o envio de e-mails da instalação.",
                      ),
                );
                if (!r.data.email_dispatched) setLink(r.data.accept_url);
              } catch {
                setMessage(t("Não foi possível criar o convite. Confira os dados e seu acesso."));
              }
            })
          }
        >
          <h2 className="font-semibold sm:col-span-2">{t("Convidar usuário para uma empresa")}</h2>
          <label className="text-sm">
            {t("E-mail")}
            <Input name="email" type="email" required />
          </label>
          <label className="text-sm">
            {t("Empresa")}
            <select
              name="organization_id"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
              required
              defaultValue=""
            >
              <option value="" disabled>
                {t("Selecione a empresa")}
              </option>
              {tenants.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t("Papel de acesso")}
            <select
              name="role"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3"
              defaultValue="admin"
            >
              <option value="admin">{t("Administrador")}</option>
              <option value="manager">{t("Gestor")}</option>
              <option value="agent">{t("Atendente")}</option>
              <option value="viewer">{t("Leitura")}</option>
            </select>
          </label>
          <div className="self-end">
            <Button type="submit" disabled={pending}>
              {pending ? t("Enviando…") : t("Enviar convite")}
            </Button>
          </div>
          {message && (
            <p role="status" className="text-sm sm:col-span-2">
              {message}
            </p>
          )}
          {link && (
            <label className="text-sm sm:col-span-2">
              {t("Link do convite")}
              <Input readOnly value={link} onFocus={(e) => e.target.select()} />
            </label>
          )}
        </form>
      )}
    </div>
  );
}
