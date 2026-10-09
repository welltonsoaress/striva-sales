import { requireAuth } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { tagDeIdioma } from "@/lib/i18n/datas";
import Link from "next/link";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { usageMonthUtc } from "@/lib/billing/response-usage";

export const dynamic = "force-dynamic";
export const metadata = { title: "Consumo e custo de IA" };
const rowSchema = z.object({
  organization_id: z.string().uuid(),
  display_name: z.string(),
  purpose: z.string(),
  provider: z.string(),
  model: z.string(),
  calls: z.number(),
  failures: z.number(),
  unknown_cost_calls: z.number(),
  known_cost_usd_cents: z.number().nullable(),
  input_tokens: z.number().nullable(),
  output_tokens: z.number().nullable(),
});
export default async function AiUsagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const idioma = (await requireAuth()).idioma;
  const t = (text: string) => traduzir(text, idioma);
  const locale = tagDeIdioma(idioma);
  const money = (v: number | null) =>
    v === null
      ? "Não medido"
      : new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 4,
          maximumFractionDigits: 4,
        }).format(v / 100);

  await requirePlatformAdmin();
  const query = await searchParams;
  const month = usageMonthUtc(new Date());
  const day = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s);
  const start = day.safeParse(query.start).success ? `${query.start}T00:00:00Z` : month.start;
  const end = day.safeParse(query.end).success
    ? new Date(Date.parse(`${query.end}T00:00:00Z`) + 86400000).toISOString()
    : month.end;
  const page = z.coerce.number().int().min(1).max(100000).catch(1).parse(query.page);
  const { data, error } = await createAdminClient().rpc("fn_admin_ai_usage", {
    p_start: start,
    p_end: end,
    p_offset: (page - 1) * 50,
    p_limit: 50,
  });
  const parsed = z.object({ total: z.number(), rows: z.array(rowSchema) }).safeParse(data);
  const params = new URLSearchParams({
    start: start.slice(0, 10),
    end: new Date(Date.parse(end) - 86400000).toISOString().slice(0, 10),
  });
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <Link href="/admin/ai" className="text-sm text-primary hover:underline">
          {t("← Configuração da IA")}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">{t("Consumo e custo de IA")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t(
            "Chamadas operacionais por empresa, finalidade e modelo. Valores em USD; chamadas sem medição ficam explícitas. O consumo de créditos está na ficha da empresa.",
          )}
        </p>
      </header>
      <form className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          {t("De (UTC)")}
          <input
            name="start"
            type="date"
            defaultValue={start.slice(0, 10)}
            className="mt-1 block rounded-lg border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          {t("Até (UTC)")}
          <input
            name="end"
            type="date"
            defaultValue={params.get("end")!}
            className="mt-1 block rounded-lg border bg-background px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground"
        >
          {t("Consultar")}
        </button>
      </form>
      {error || !parsed.success ? (
        <p role="alert">{t("Não foi possível carregar o consumo. Tente novamente.")}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {parsed.data.total} {t("combinações encontradas · página")}
            {page} {t(". Custo conhecido é parcial quando houver chamadas sem medição.")}
          </p>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  {[
                    t("Empresa"),
                    t("Finalidade / modelo"),
                    t("Chamadas"),
                    t("Falhas"),
                    t("Sem medição"),
                    t("Custo conhecido"),
                  ].map((label) => (
                    <th key={label} className="p-3 font-medium whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.data.rows.map((r) => (
                  <tr
                    className="border-t"
                    key={[r.organization_id, r.purpose, r.provider, r.model].join(":")}
                  >
                    <td className="p-3">
                      <Link
                        className="text-primary hover:underline"
                        href={`/admin/tenants/${r.organization_id}`}
                      >
                        {r.display_name}
                      </Link>
                    </td>
                    <td className="p-3">
                      <p>{r.purpose}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.provider} / {r.model}
                      </p>
                    </td>
                    <td className="p-3 tabular-nums">{r.calls}</td>
                    <td className="p-3 tabular-nums">{r.failures}</td>
                    <td
                      className={`p-3 tabular-nums ${r.unknown_cost_calls ? "text-amber-700 dark:text-amber-300" : ""}`}
                    >
                      {r.unknown_cost_calls}
                    </td>
                    <td className="p-3 whitespace-nowrap tabular-nums">
                      {money(r.known_cost_usd_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!parsed.data.rows.length && (
              <p className="p-6 text-sm text-muted-foreground">
                {t("Nenhuma chamada registrada nesse período.")}
              </p>
            )}
          </div>
          <nav aria-label={t("Páginas do consumo")} className="flex gap-4 text-sm text-primary">
            {page > 1 && <Link href={`?${params}&page=${page - 1}`}>{t("Anterior")}</Link>}
            {page * 50 < parsed.data.total && (
              <Link href={`?${params}&page=${page + 1}`}>{t("Próxima")}</Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
