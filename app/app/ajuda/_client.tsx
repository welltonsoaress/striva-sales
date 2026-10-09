"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ArrowRight, MagnifyingGlass } from "@/lib/ui/icons";
import { useT } from "@/hooks/i18n/useT";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ManualClient({
  artigos,
}: {
  artigos: Array<{
    id: string;
    titulo: string;
    resumo: string;
    passos: string[];
    href: string;
    acao: string;
    podeAbrir: boolean;
    termos: string;
  }>;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visiveis = artigos.filter((artigo) =>
    normalizar(`${t(artigo.titulo)} ${t(artigo.resumo)} ${artigo.termos}`).includes(
      normalizar(busca),
    ),
  );
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-5 py-8 md:px-8">
      <header className="space-y-3">
        <BookOpen size={30} className="text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">{t("Ajuda e manual")}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t(
            "Encontre o próximo passo para configurar sua empresa, atender clientes e acompanhar sua operação.",
          )}
        </p>
      </header>
      <div className="relative">
        <MagnifyingGlass
          size={18}
          aria-hidden
          className="absolute top-3 left-3 text-muted-foreground"
        />
        <Input
          aria-label={t("Buscar no manual")}
          placeholder={t("Busque por WhatsApp, agente, agenda…")}
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          className="pl-10"
        />
      </div>
      <div>
        {visiveis.map((artigo) => (
          <details id={artigo.id} key={artigo.id} className="border-b py-5">
            <summary className="cursor-pointer text-base font-medium focus-visible:outline-2 focus-visible:outline-ring">
              {t(artigo.titulo)}
            </summary>
            <div className="mt-4 space-y-4 pl-4">
              <p className="text-sm text-muted-foreground">{t(artigo.resumo)}</p>
              <ol className="max-w-2xl list-decimal space-y-3 pl-5 text-sm leading-relaxed">
                {artigo.passos.map((passo) => (
                  <li key={passo}>{t(passo)}</li>
                ))}
              </ol>
              {artigo.podeAbrir ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={artigo.href}>
                    {t(artigo.acao)}
                    <ArrowRight size={15} />
                  </Link>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("Peça ajuda a quem administra sua empresa para esta configuração.")}
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
      {visiveis.length === 0 && (
        <p role="status" className="py-8 text-sm text-muted-foreground">
          {t("Não encontramos esse assunto. Tente uma palavra mais simples ou fale com o suporte.")}
        </p>
      )}
    </div>
  );
}
