import { requireAuth } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { tagDeIdioma } from "@/lib/i18n/datas";
import Link from "next/link";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReconcileResponse } from "@/components/admin/ReconcileResponse";
export const dynamic = "force-dynamic";
export const metadata = { title: "Entregas de IA para conferir" };
export default async function AiHealthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const idioma = (await requireAuth()).idioma;
  const t = (text: string) => traduzir(text, idioma);
  const locale = tagDeIdioma(idioma);

  const { platformAdmin } = await requirePlatformAdmin();
  const query = await searchParams;
  const page = z.coerce.number().int().min(1).max(100000).catch(1).parse(query.page);
  const { data, error, count } = await createAdminClient()
    .from("ai_response_reservations")
    .select("id,organization_id,reference,expected_parts,created_at,organizations(display_name)", {
      count: "exact",
    })
    .eq("state", "uncertain")
    .order("created_at")
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <Link href="/admin/ai" className="text-sm text-primary hover:underline">
          {t("← IA da plataforma")}
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">{t("Entregas que precisam de conferência")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t(
            "O crédito fica reservado enquanto houver entrega incerta. A conferência usa os recibos e os estados registrados pelo canal; ela não declara uma mensagem entregue manualmente.",
          )}
        </p>
      </header>
      {error ? (
        <p role="alert">{t("Não foi possível carregar a fila.")}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {count} {t("respostas aguardam conferência.")}
          </p>
          {!data?.length && (
            <p className="rounded-xl border p-6">{t("Nenhuma entrega incerta nesta página.")}</p>
          )}
          {data?.map((r) => (
            <section key={r.id} className="rounded-xl border border-amber-500/30 bg-card p-5">
              <Link
                href={`/admin/tenants/${r.organization_id}`}
                className="font-semibold text-primary hover:underline"
              >
                {(Array.isArray(r.organizations) ? r.organizations[0] : r.organizations)
                  ?.display_name ?? "Empresa"}
              </Link>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("Resposta")}
                {r.id} · {r.expected_parts ?? t("Quantidade ainda não definida")} {t("partes ·")}
                {new Date(r.created_at).toLocaleString(locale, { timeZone: "UTC" })}
                {"UTC"}
              </p>
              {platformAdmin.scope === "full" && (
                <ReconcileResponse org={r.organization_id} response={r.id} />
              )}
            </section>
          ))}
          <nav className="flex gap-4 text-sm text-primary" aria-label={t("Páginas de entregas")}>
            {page > 1 && <Link href={`?page=${page - 1}`}>{t("Anterior")}</Link>}
            {page * 25 < (count ?? 0) && <Link href={`?page=${page + 1}`}>{t("Próxima")}</Link>}
          </nav>
        </>
      )}
    </div>
  );
}
