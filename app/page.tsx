import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { DEFAULT_APP_NAME } from "@/lib/branding";
import { LandingPage } from "@/components/marketing/LandingPage";
import styles from "@/components/marketing/landing.module.css";
import { createClient } from "@/lib/supabase/server";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-commercial" });

// Identidade comercial; a marca da operação continua resolvida pelo layout.
export const metadata: Metadata = {
  title: { absolute: `${DEFAULT_APP_NAME} — mais vendas, menos oportunidades perdidas` },
  description:
    "Aproveite mais oportunidades com atendimento 24/7, follow-up automático, CRM e Google Agenda. Um funcionário comercial digital e sua operação organizada em uma plataforma.",
  robots: { index: true, follow: true },
  openGraph: {
    title: `${DEFAULT_APP_NAME} — mais vendas, menos oportunidades perdidas`,
    description:
      "Atendimento 24/7, CRM, Google Agenda e relatórios comerciais. Uma plataforma completa para clínicas, escritórios e empresas.",
    locale: "pt_BR",
    type: "website",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className={`${manrope.variable} ${styles.landing}`}>
      <LandingPage name={DEFAULT_APP_NAME} loginHref={user ? "/app" : "/login"} />
    </div>
  );
}
