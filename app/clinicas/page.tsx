import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { DEFAULT_APP_NAME } from "@/lib/branding";
import { loadPublicCommercialPlans } from "@/lib/billing/catalog";
import { ClinicLanding } from "@/components/marketing/ClinicLanding";
import styles from "@/components/marketing/landing.module.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-commercial" });
// Catálogo editável no admin; não congelar preços na geração do build.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: `${DEFAULT_APP_NAME} para clínicas — do primeiro contato ao agendamento` },
  description:
    "Organize o atendimento da clínica no WhatsApp, registre oportunidades e consulte a agenda com sua equipe no controle. Teste por 7 dias ou 1.000 créditos.",
  alternates: { canonical: "/clinicas" },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${DEFAULT_APP_NAME} para clínicas`,
    description: "O lead chegou. Seu atendimento continua, com WhatsApp, CRM e agenda conectados.",
    locale: "pt_BR",
    type: "website",
  },
};
export default async function ClinicsPage() {
  const pricing = await loadPublicCommercialPlans();
  return (
    <div className={`${manrope.variable} ${styles.landing}`}>
      <ClinicLanding name={DEFAULT_APP_NAME} pricing={pricing} />
    </div>
  );
}
