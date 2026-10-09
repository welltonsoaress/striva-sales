import Link from "next/link";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/server";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { traduzir } from "@/lib/i18n/dicionario";
import { tagDeIdioma } from "@/lib/i18n/datas";
import { commercialStateLabel, CREDIT_KIND_LABELS } from "@/lib/billing/state-label";
import { billingStatusLabel } from "@/lib/billing/hotmart";
import { AiAccountActions } from "./AiAccountActions";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { currentCreditUnits } from "@/lib/billing/credits";

export async function CompanyAiAccount({ orgId }: { orgId: string }) {
  const { platformAdmin } = await requirePlatformAdmin();
  const idioma = (await requireAuth()).idioma;
  const t = (text: string) => traduzir(text, idioma);
  const locale = tagDeIdioma(idioma);
  const date = (value: string) => new Date(value).toLocaleString(locale, { timeZone: "UTC" });
  if (!z.string().uuid().safeParse(orgId).success) return null;
  const db = createAdminClient();
  const renewed = await db.rpc("fn_ai_renew", { p_org: orgId });
  const [account, ledger, channels, payments, history] = await Promise.all([
    db.from("organization_ai_accounts").select("*").eq("organization_id", orgId).maybeSingle(),
    db
      .from("ai_credit_ledger")
      .select("id,kind,units,credit_meter,created_at,reason")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20),
    listSelectableChannels(db, orgId).then(
      (data) => ({ data, error: false }),
      () => ({ data: null, error: true }),
    ),
    db
      .from("billing_payments")
      .select("id,transaction_code,status,amount_cents,currency")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("api_audit_log")
      .select("id,metadata,created_at")
      .eq("organization_id", orgId)
      .eq("action", "platform_admin.ai_account_changed")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (renewed.error || account.error || !account.data)
    return <p role="alert">{t("Conta de IA indisponível. Recarregue para consultar.")}</p>;
  const a = account.data;
  return (
    <section className="mt-6 space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-xl font-semibold">{t("Acesso, IA e créditos")}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <p className="rounded-lg bg-primary/5 p-3 text-sm">
          {a.mode === "platform" ? t("IA incluída") : t("IA legada")} ·{" "}
          {t(commercialStateLabel(a.state, a.access_until))}
        </p>
        <p className="rounded-lg bg-emerald-500/5 p-3 text-sm">
          {t("Franquia:")} {a.monthly_remaining} / {a.monthly_allowance}
          <br />
          {t("Extras:")} {a.extra_remaining}
        </p>
        <p className="rounded-lg bg-sky-500/5 p-3 text-sm">
          {t("Usuários:")} {a.user_limit} {t("· WhatsApps:")} {a.channel_limit}
          <br />
          {a.access_until ? (
            <>
              {t("Acesso até")} {date(a.access_until)} UTC
            </>
          ) : (
            t("Ainda sem período comercial")
          )}
        </p>
      </div>
      {channels.error ? (
        <p role="alert">{t("Não foi possível consultar os WhatsApps.")}</p>
      ) : (
        <div className="flex flex-wrap gap-3 text-sm">
          {channels.data?.map((c) => (
            <span
              key={c.id}
              className={`rounded-lg border px-3 py-2 ${c.status === "WORKING" ? "border-emerald-500/30" : "border-amber-500/40"}`}
            >
              {c.display_name ?? "WhatsApp"} ·{" "}
              {c.status === "WORKING" ? t("Conectado") : t("Precisa conectar")}
            </span>
          ))}
        </div>
      )}
      <AiAccountActions orgId={orgId} mode={a.mode} readOnly={platformAdmin.scope !== "full"} />
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          {t("Últimos movimentos de saldo")}
        </summary>
        {ledger.error ? (
          <p role="alert">{t("Extrato indisponível.")}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {ledger.data?.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
                <span>
                  {t(CREDIT_KIND_LABELS[r.kind] ?? "Movimento de saldo")} ·{" "}
                  {currentCreditUnits(r.units, r.credit_meter)} {t("créditos")}
                  {r.credit_meter === "response_v2" && (
                    <small className="ml-2">
                      {t("Equivalência do registro anterior; recibo original preservado.")}
                    </small>
                  )}
                  {r.reason && <span className="ml-2 text-muted-foreground">{r.reason}</span>}
                </span>
                <time>{date(r.created_at)} UTC</time>
              </li>
            ))}
          </ul>
        )}
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          {t("Pagamentos desta empresa")}
        </summary>
        {payments.error ? (
          <p role="alert">{t("Não foi possível carregar os pagamentos.")}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {payments.data?.map((p) => (
              <li key={p.id}>
                {p.transaction_code} · {t(billingStatusLabel(p.status))} ·{" "}
                {new Intl.NumberFormat(locale, { style: "currency", currency: p.currency }).format(
                  p.amount_cents / 100,
                )}
              </li>
            ))}
          </ul>
        )}
        <Link
          className="mt-3 inline-block text-sm text-primary underline"
          href={`/admin/finance?company=${orgId}`}
        >
          {t("Pagamentos desta empresa")}
        </Link>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          {t("Histórico administrativo")}
        </summary>
        {history.error ? (
          <p role="alert">{t("Histórico indisponível.")}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {history.data?.map((r) => {
              const meta = z
                .object({
                  reason: z.string().optional(),
                  units: z.number().optional(),
                  credit_meter: z.string().optional(),
                })
                .safeParse(r.metadata);
              return (
                <li key={r.id} className="border-b py-2">
                  <time>{date(r.created_at)} UTC</time>
                  {meta.success && (
                    <p>
                      {meta.data.reason}
                      {meta.data.units !== undefined && (
                        <>
                          {" "}
                          · {meta.data.units}{" "}
                          {t(
                            meta.data.credit_meter === "credit_v3"
                              ? "créditos"
                              : "unidades no registro original",
                          )}
                        </>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </details>
    </section>
  );
}
