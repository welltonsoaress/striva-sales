"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useT } from "@/hooks/i18n/useT";

import { acceptWelcome } from "@/app/actions/onboarding/acceptWelcome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_SEGMENTS, BUSINESS_TEMPLATES, type BusinessSegment } from "@/lib/onboarding/business-templates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Cidade, não identificador de fuso. A lista mostrava "America/Bahia" e
 * "America/Fortaleza" e esperava que a pessoa soubesse em qual delas mora — o
 * identificador é do sistema, o que ela reconhece é a cidade.
 */
const FUSOS: { id: string; cidade: string }[] = [
  { id: "America/Sao_Paulo", cidade: "São Paulo, Rio, Brasília, Sul e Sudeste" },
  { id: "America/Recife", cidade: "Recife, Salvador, Fortaleza e Nordeste" },
  { id: "America/Belem", cidade: "Belém e Pará" },
  { id: "America/Manaus", cidade: "Manaus e Amazonas" },
  { id: "America/Cuiaba", cidade: "Cuiabá e Mato Grosso" },
  { id: "America/Rio_Branco", cidade: "Rio Branco e Acre" },
  { id: "America/Argentina/Buenos_Aires", cidade: "Buenos Aires" },
  { id: "Europe/Lisbon", cidade: "Lisboa" },
  { id: "Europe/Madrid", cidade: "Madri" },
  { id: "America/New_York", cidade: "Nova York" },
  { id: "America/Los_Angeles", cidade: "Los Angeles" },
  { id: "UTC", cidade: "Outro (horário universal)" },
];

export function WelcomeForm({
  defaultOrgName,
  suggestedSegment,
  initialDescription = "",
  initialTimezone = "America/Sao_Paulo",
}: {
  defaultOrgName: string;
  suggestedSegment?: BusinessSegment;
  initialDescription?: string;
  initialTimezone?: string;
}) {
  const t = useT();
  const [displayName, setDisplayName] = useState(defaultOrgName);
  const [oQueFaz, setOQueFaz] = useState(initialDescription);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [accepted, setAccepted] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5 rounded-lg border bg-background p-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        if (!accepted) {
          toast.error(t("Aceite os termos para continuar."));
          return;
        }
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const res = await acceptWelcome(formData);
            if (res && !res.ok) toast.error(`Falha: ${res.error}`);
          } catch {
            toast.error(t("Não foi possível salvar. Seus ajustes continuam aqui para tentar novamente."));
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="display_name">{t("Como se chama o seu negócio?")}</Label>
        <Input
          id="display_name"
          name="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          minLength={2}
          maxLength={120}
          required
        />
        <p className="text-xs text-muted-foreground">
          {t(
            "É o nome que aparece para o seu time e nos relatórios. Pode ser clínica, loja, escritório — o que for seu.",
          )}
        </p>
      </div>

      {/*
        A pergunta que faltava no produto inteiro. Sem ela, o funcionário nasce
        se apresentando como atendente de uma "loja online" — era o que os três
        modelos de prompt diziam — e o quadro de clientes nasce com as colunas
        de e-commerce que o gatilho semeia. Os dois defeitos têm a mesma origem:
        uma instalação que nunca pergunta em que ramo entrou.
      */}
      <div className="space-y-2">
        <Label htmlFor="business_segment">{t("Tipo de negócio")}</Label>
        <select
          id="business_segment"
          name="business_segment"
          defaultValue={suggestedSegment??"generico"}
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
        >
          {BUSINESS_SEGMENTS.map((id) => (
            <option key={id} value={id}>
              {t(BUSINESS_TEMPLATES[id].label)}
            </option>
          ))}
        </select>
        <Label htmlFor="o_que_faz">{t("Conte como sua empresa atende")}</Label>
        <textarea
          id="o_que_faz"
          name="business_description"
          value={oQueFaz}
          onChange={(e) => setOQueFaz(e.target.value)}
          maxLength={20000}
          rows={5}
          className="w-full resize-y rounded-lg border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
          placeholder={t(
            "Conte seus serviços, horários e o que o agente precisa saber. Você pode completar depois.",
          )}
        />
        <p className="text-xs text-muted-foreground">
          {t(
            "Seu agente já vem preparado para o segmento. Estas informações complementam o atendimento.",
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">{t("Onde você atende")}</Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {!FUSOS.some((fuso) => fuso.id === timezone) && (
              <SelectItem value={timezone}>{t("Horário salvo da empresa")}</SelectItem>
            )}
            {FUSOS.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {t(f.cidade)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="timezone" value={timezone} />
        <p className="text-xs text-muted-foreground">
          {t("Decide o horário em que seu funcionário pode falar com clientes.")}
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1"
          required
        />
        <span>
          {t("Li e aceito os")}{" "}
          <a className="underline" href="/legal/terms" target="_blank" rel="noreferrer">
            {t("Termos de Uso")}
          </a>{" "}
          {t("e a")}{" "}
          <a className="underline" href="/legal/privacy" target="_blank" rel="noreferrer">
            {t("Política de Privacidade")}
          </a>
          .
        </span>
      </label>

      <div className="flex sm:justify-end">
        <Button type="submit" disabled={pending || !accepted} className="w-full sm:w-auto">
          {pending ? t("Salvando...") : t("Continuar")}
        </Button>
      </div>
    </form>
  );
}
