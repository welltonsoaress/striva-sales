import { requireAuth } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ManagedAiEditor } from "./_client";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = { title: "IA da plataforma" };
export default async function PlatformAiPage() {
  const idioma = (await requireAuth()).idioma;
  const t = (text: string) => traduzir(text, idioma);

  const { platformAdmin } = await requirePlatformAdmin();
  const db = createAdminClient();
  const [settings, models, packs] = await Promise.all([
    db.from("platform_ai_settings").select("*").eq("id", true).single(),
    db
      .from("ai_models")
      .select(
        "provider,model_id,display_name,input_price_per_million_cents,output_price_per_million_cents,pricing_verified_at",
      )
      .is("deprecated_at", null)
      .order("provider")
      .order("model_id"),
    db
      .from("ai_credit_packs")
      .select("id,name,units,price_cents,publication_state,hotmart_offer")
      .order("created_at", { ascending: false }),
  ]);
  if (settings.error || models.error || packs.error)
    return (
      <p role="alert">
        {t("Não foi possível carregar a configuração da IA. Recarregue a página.")}
      </p>
    );
  return (
    <>
      <div className="mx-auto mb-5 flex max-w-6xl flex-wrap gap-4">
        <Link
          href="/admin/ai/usage"
          className="inline-flex rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
        >
          {t("Ver consumo, falhas e custos por empresa")}
        </Link>
        <Link
          href="/admin/ai/health"
          className="inline-flex rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200"
        >
          {t("Conferir entregas incertas")}
        </Link>
      </div>
      <ManagedAiEditor
        initial={settings.data}
        models={models.data ?? []}
        packs={packs.data ?? []}
        readOnly={platformAdmin.scope !== "full"}
      />
    </>
  );
}
