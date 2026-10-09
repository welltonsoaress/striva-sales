"use client";
import { useEffect } from "react";
import { traduzir } from "@/lib/i18n/dicionario";
import type { Idioma } from "@/lib/i18n/idiomas";
export function PaymentReturn({ idioma }: { idioma: Idioma }) {
  const t = (text: string) => traduzir(text, idioma);
  useEffect(() => { window.location.replace("/app/settings/billing?payment=return"); }, []);
  return <p role="status">{t("Abrindo seu faturamento…")}</p>;
}
