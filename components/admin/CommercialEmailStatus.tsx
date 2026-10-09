import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEmailConfigured } from "@/lib/email/resend";
import { env } from "@/lib/env";
import Link from "next/link";
import { traduzir } from "@/lib/i18n/dicionario";
import { normalizarIdioma } from "@/lib/i18n/idiomas";

export async function CommercialEmailStatus() {
  const { user } = await requirePlatformAdmin();
  const t = (text: string) => traduzir(text, normalizarIdioma(user.user_metadata.locale));
  const { data, error } = await createAdminClient().from("commercial_notices")
    .select("id,organization_id,kind,attempts,error_code,delivered_at,cancelled_at")
    .is("delivered_at", null).is("cancelled_at", null).order("created_at").limit(30);
  return <section className="space-y-3 rounded-xl border p-5">
    <h2 className="text-xl font-semibold">{t("Avisos comerciais por e-mail")}</h2>
    <p className="text-sm text-muted-foreground">{t("Antecedência:")} {env.COMMERCIAL_TRIAL_NOTICE_HOURS} {t("horas no teste e")} {env.COMMERCIAL_RENEWAL_NOTICE_DAYS} {t("dias no contrato. A cadência é configurada pela operação da plataforma.")}</p>
    <p role="status" className="text-sm">{t(isEmailConfigured() ? "Chave e remetente configurados. A entrega depende da verificação do domínio no Resend." : "Envio indisponível: configure a chave do Resend e um remetente de domínio verificado. Os avisos internos continuam disponíveis.")}</p>
    {error ? <p role="alert" className="text-sm">{t("A fila não pôde ser consultada. Confira a aplicação da migration 0253.")}</p> :
      data?.length ? <ul className="space-y-2 text-sm">{data.map(notice => <li key={notice.id} className="flex flex-wrap justify-between gap-2 border-t pt-2">
        <Link className="text-primary underline" href={`/admin/tenants/${notice.organization_id}`}>{t("Empresa")} · {t(notice.kind === "trial_ending" ? "Fim do teste" : notice.kind === "payment_failed" ? "Pagamento" : "Renovação")}</Link>
        <span>{notice.attempts} {t("tentativas")} · {notice.error_code ?? t("Aguardando envio")}</span>
      </li>)}</ul> : <p className="text-sm text-muted-foreground">{t("Nenhum aviso pendente.")}</p>}
  </section>;
}
