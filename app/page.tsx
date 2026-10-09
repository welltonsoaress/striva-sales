import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { DEFAULT_APP_NAME } from "@/lib/branding";
import { loadPublicCommercialPlans } from "@/lib/billing/catalog";
import { LandingPage } from "@/components/marketing/LandingPage";
import styles from "@/components/marketing/landing.module.css";
import { createClient } from "@/lib/supabase/server";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-commercial" });

// Identidade comercial; a marca da operação continua resolvida pelo layout.
export const metadata: Metadata = {
  title: { absolute: `${DEFAULT_APP_NAME} — o sistema comercial que executa o próximo passo` },
  description:
    "Atendimento no WhatsApp, CRM e agenda conectados, com IA incluída e sua equipe no controle. Teste por 7 dias ou 1.000 créditos após a ativação.",
  robots: { index: true, follow: true },
  openGraph: {
    title: `${DEFAULT_APP_NAME} — o sistema comercial que executa o próximo passo`,
    description:
      "WhatsApp, CRM e agenda conectados, com IA incluída e sua equipe no controle. Teste por 7 dias ou 1.000 créditos após a ativação.",
    locale: "pt_BR",
    type: "website",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    pricing,
  ] = await Promise.all([supabase.auth.getUser(), loadPublicCommercialPlans()]);
  return (
    <div className={`${manrope.variable} ${styles.landing}`}>
      <LandingPage name={DEFAULT_APP_NAME} loginHref={user ? "/app" : "/login"} pricing={pricing} />
    </div>
  );
}
