"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/hooks/i18n/useT";
import type { AdminUserDetail, AdminUserMembership } from "@/hooks/useAdminUser";

export function UserAccessEditor({
  user,
  memberships,
}: {
  user: AdminUserDetail;
  memberships: AdminUserMembership[];
}) {
  const t = useT();
  const router = useRouter();
  const cache = useQueryClient();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = (data: unknown) =>
    start(async () => {
      setMessage("");
      try {
        await apiClient.patch(`/api/v1/admin/users/${user.id}`, data);
        setMessage(t("Alteração registrada."));
        await cache.invalidateQueries({ queryKey: ["admin"] });
      } catch {
        setMessage(
          t(
            "Não foi possível salvar. Preserve um administrador ativo em cada empresa e confira seu acesso.",
          ),
        );
      }
    });
  return (
    <section className="space-y-5 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">{t("Editar usuário")}</h2>
      <form
        className="flex flex-wrap items-end gap-3"
        action={(f) => save({ full_name: String(f.get("full_name")) })}
      >
        <label className="min-w-52 flex-1 text-sm">
          {t("Nome")}
          <Input
            name="full_name"
            minLength={2}
            maxLength={120}
            defaultValue={user.full_name ?? ""}
            required
          />
        </label>
        <Button disabled={pending}>{t("Salvar nome")}</Button>
      </form>
      <div className="divide-y">
        {memberships
          .filter((m) => !m.revoked_at)
          .map((m) => (
            <form
              key={m.organization_id}
              action={(f) =>
                save({ organization_id: m.organization_id, role: String(f.get("role")) })
              }
              className="flex flex-wrap items-end gap-3 py-3"
            >
              <label className="min-w-52 flex-1 text-sm">
                {m.tenant_name ?? t("Empresa")}
                <select
                  name="role"
                  defaultValue={m.role}
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3"
                >
                  <option value="admin">{t("Administrador")}</option>
                  <option value="manager">{t("Gestor")}</option>
                  <option value="agent">{t("Atendente")}</option>
                  <option value="viewer">{t("Leitura")}</option>
                </select>
              </label>
              <Button variant="outline" disabled={pending}>
                {t("Salvar acesso")}
              </Button>
              <Button asChild variant="ghost">
                <a href={`/admin/tenants/${m.organization_id}`}>{t("Alterar plano da empresa")}</a>
              </Button>
            </form>
          ))}
      </div>
      {confirmDelete ? (
        <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
          <p className="text-sm">
            {t(
              "Excluir este usuário remove o acesso a todas as empresas. O histórico de atendimento permanece registrado. Confirme a exclusão.",
            )}
          </p>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setMessage("");
                  try {
                    await apiClient.delete(`/api/v1/admin/users/${user.id}`);
                    await cache.invalidateQueries({ queryKey: ["admin"] });
                    router.push("/admin/users");
                  } catch {
                    setMessage(
                      t(
                        "Não foi possível excluir. A própria conta, administradores da plataforma e o último administrador de uma empresa são protegidos.",
                      ),
                    );
                  }
                })
              }
            >
              {t("Confirmar exclusão")}
            </Button>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t("Cancelar")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          {t("Excluir usuário")}
        </Button>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
