import Link from "next/link";
import { PaymentReturn } from "./_client";
import { createClient } from "@/lib/supabase/server";
import { normalizarIdioma } from "@/lib/i18n/idiomas";
import { traduzir } from "@/lib/i18n/dicionario";

export const metadata = { title: "Confirmação de pagamento" };
/** Documento no nosso domínio inicia o segundo salto e preserva cookies SameSite=Strict. */
export default async function PaymentReturnPage() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const idioma = normalizarIdioma(user?.user_metadata.locale);
  const t = (text: string) => traduzir(text, idioma);
  return <main className="mx-auto max-w-xl space-y-4 px-6 py-16">
    <h1 className="text-2xl font-semibold">{t("Vamos conferir seu pagamento")}</h1>
    <p>{t("A liberação depende da confirmação recebida pelo servidor. Este retorno não concede acesso sozinho.")}</p>
    <PaymentReturn idioma={idioma} />
    <Link href="/app/settings/billing?payment=return" className="text-primary underline">{t("Continuar para o faturamento")}</Link>
  </main>;
}
