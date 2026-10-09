import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { configuracaoDoGoogle } from "@/lib/agenda/google/config";
import { Button } from "@/components/ui/button";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";

export async function GoogleCalendarOptional({ organizationId, userId, idioma, result }: {
  organizationId: string; userId: string; idioma: Idioma; result?: string;
}) {
  const t = (value: string) => traduzir(value, idioma);
  const [configuration, connections] = await Promise.all([
    configuracaoDoGoogle(),
    createAdminClient().from("calendar_connections").select("id,status")
      .eq("organization_id", organizationId).eq("user_id", userId).eq("provider", "google"),
  ]);
  const connected = connections.data?.some(connection => connection.status === "healthy");
  return <section className="space-y-3 rounded-xl border p-5" aria-labelledby="onboarding-google">
    <h2 id="onboarding-google" className="text-lg font-semibold">{t("Google Agenda (opcional)")}</h2>
    <p className="text-sm text-muted-foreground">{t("Conecte sua conta para sincronizar os compromissos. Você pode continuar sem conectar e fazer isso depois na Agenda.")}</p>
    {connected ? <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{t("Google Agenda conectado.")}</p>
      : configuration ? <Button asChild variant="outline"><Link href="/api/v1/agenda/google/connect?return_to=onboarding">{t("Conectar minha conta Google")}</Link></Button>
        : <p className="text-sm text-muted-foreground">{t("A conexão com o Google ainda está sendo preparada pela equipe da plataforma. Isso não impede sua ativação.")}</p>}
    {result && !connected && <p role="status" className="text-sm">{t(result === "conexao_cancelada" ? "Você cancelou a conexão. Pode continuar normalmente." : "A conexão não foi concluída. Tente novamente ou continue sem conectar.")}</p>}
    {connections.error && <p role="alert" className="text-sm">{t("Não foi possível consultar sua conexão. Você pode conferi-la depois na Agenda.")}</p>}
  </section>;
}
