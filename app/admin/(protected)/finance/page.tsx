import { CommercialEmailStatus } from "@/components/admin/CommercialEmailStatus";
import { requireAuth } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { tagDeIdioma } from "@/lib/i18n/datas";
import Link from "next/link";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingStatusLabel } from "@/lib/billing/hotmart";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financeiro da plataforma" };
export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const idioma = (await requireAuth()).idioma;
  const t = (text: string) => traduzir(text, idioma);
  const locale = tagDeIdioma(idioma);

  await requirePlatformAdmin();
  const input = await searchParams;
  const page = z.coerce.number().int().min(1).max(100000).catch(1).parse(input.page);
  const org = z.string().uuid().optional().safeParse(input.company);
  const db = createAdminClient();
  let query = db
    .from("billing_payments")
    .select(
      "id,organization_id,transaction_code,amount_cents,currency,status,first_paid_at,last_event_at,paid_date_inferred,organizations(display_name)",
      { count: "exact" },
    )
    .order("last_event_at", { ascending: false })
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  if (org.success && org.data) query = query.eq("organization_id", org.data);
  const [payments, contracts, pending] = await Promise.all([
    query,
    db
      .from("billing_contracts")
      .select(
        "id,organization_id,subscription_status,next_charge_at,cancelled_at,access_until,organizations(display_name)",
        { count: "exact" },
      )
      .order("last_event_at", { ascending: false })
      .limit(20),
    db
      .from("billing_webhook_events")
      .select("event_id,event,occurred_at,state,reason", { count: "exact" })
      .in("state", ["unmatched", "failed"])
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);
  const money = (cents: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
          new Date(value),
        )
      : "Não informado";
  const company = (row: {
    organization_id: string;
    organizations: { display_name: string } | { display_name: string }[] | null;
  }) => (
    <Link
      className="text-primary underline underline-offset-4"
      href={`/admin/tenants/${row.organization_id}`}
    >
      {(Array.isArray(row.organizations) ? row.organizations[0] : row.organizations)
        ?.display_name ?? "Empresa"}
    </Link>
  );
  return (
    <div className="mx-auto max-w-7xl space-y-7 p-4 md:p-8">
      <CommercialEmailStatus />
      <header>
        <p className="text-sm text-primary">{t("Financeiro")}</p>
        <h1 className="mt-2 text-3xl font-semibold">{t("Pagamentos e períodos de acesso")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t(
            "Cancelamentos preservam o período pago. Estornos retiram apenas a concessão vinculada ao pagamento revertido. Datas em UTC.",
          )}
        </p>
        <Link
          className="mt-4 inline-block text-sm underline underline-offset-4"
          href="/admin/plans"
        >
          {t("Editar planos e ofertas")}
        </Link>
      </header>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-xl font-semibold">
          {t("Pagamentos ·")}
          {payments.count ?? "—"}
        </h2>
        {payments.error ? (
          <p role="alert">{t("Não foi possível carregar os pagamentos.")}</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    {[
                      t("Empresa"),
                      t("Transação"),
                      t("Situação"),
                      t("Valor"),
                      t("Primeira aprovação"),
                    ].map((label) => (
                      <th key={label} className="px-3 py-3 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.data?.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="px-3 py-4">{company(p)}</td>
                      <td className="px-3 py-4">{p.transaction_code}</td>
                      <td className="px-3 py-4">{billingStatusLabel(p.status)}</td>
                      <td className="px-3 py-4 tabular-nums">
                        {money(p.amount_cents, p.currency)}
                      </td>
                      <td className="px-3 py-4">
                        {date(p.first_paid_at)}
                        {p.paid_date_inferred && t(" · data histórica estimada")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!payments.data?.length && (
              <p className="py-4 text-sm text-muted-foreground">
                {t("Nenhum pagamento encontrado.")}
              </p>
            )}
            <nav aria-label={t("Páginas de pagamentos")} className="mt-4 flex gap-4 text-sm">
              {page > 1 && (
                <Link
                  href={`?page=${page - 1}${org.success && org.data ? `&company=${org.data}` : ""}`}
                >
                  {t("Anterior")}
                </Link>
              )}
              {page * 25 < (payments.count ?? 0) && (
                <Link
                  href={`?page=${page + 1}${org.success && org.data ? `&company=${org.data}` : ""}`}
                >
                  {t("Próxima")}
                </Link>
              )}
            </nav>
          </>
        )}
      </section>
      <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5">
        <h2 className="text-xl font-semibold">
          {t("Divergências Hotmart ·")}
          {pending.count ?? "—"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Últimos 20 eventos pendentes. Confira referência, oferta e valor na Hotmart antes de corrigir o vínculo. Nenhuma empresa é associada pelo e-mail do comprador.",
          )}
        </p>
        {pending.error ? (
          <p role="alert">{t("Não foi possível carregar as pendências.")}</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {pending.data?.map((event) => (
              <li
                key={event.event_id}
                className="flex flex-wrap justify-between gap-2 border-b pb-3"
              >
                <span>
                  {event.event} · {event.event_id}
                </span>
                <span>
                  {event.reason ?? event.state} · {date(event.occurred_at)}
                </span>
              </li>
            ))}
            {!pending.data?.length && <li>{t("Nenhuma divergência registrada.")}</li>}
          </ul>
        )}
      </section>
      <section className="rounded-xl border p-5">
        <h2 className="text-xl font-semibold">
          {t("Contratos ·")}
          {contracts.count ?? "—"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Últimos 20 contratos atualizados. Abra a empresa para consultar saldo e histórico completo.",
          )}
        </p>
        {contracts.error ? (
          <p role="alert">{t("Não foi possível carregar os contratos.")}</p>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {contracts.data?.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-3 border-b pb-3">
                {company(c)}
                <span>
                  {c.subscription_status ?? t("Situação não informada")} {t("· próxima cobrança:")}{" "}
                  {date(c.next_charge_at)}
                  {c.cancelled_at && ` · cancelada, acesso até ${date(c.access_until)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
