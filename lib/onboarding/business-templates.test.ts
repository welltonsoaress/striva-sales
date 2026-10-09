import { expect, it } from "vitest";
import { BUSINESS_SEGMENTS, BUSINESS_TEMPLATES, businessPrompts } from "./business-templates";
it.each(BUSINESS_SEGMENTS)(
  "%s adapta identidade e mantém limites sem carregar regras da Advance",
  (segment) => {
    const t = BUSINESS_TEMPLATES[segment],
      prompts = businessPrompts(segment, "Empresa Sintética");
    expect(prompts.conversation).toContain(t.identity);
    expect(prompts.organizer).toContain(t.label);
    expect(prompts.conversation).toContain("uma pergunta por vez");
    expect(prompts.conversation).toContain("Não ofereça horários");
    expect(prompts.conversation + " " + prompts.organizer).not.toMatch(
      /Advance|Luana|odontol|desconto de|R\$|\d+%/i,
    );
    expect(prompts.organizer).toContain("Não envie mensagens ao cliente");
    expect(t.scenarios.length).toBeGreaterThanOrEqual(2);
  },
);
it("agenda só permite reserva quando sua dependência foi confirmada", () => {
  expect(businessPrompts("barbearia", "QA", true).conversation).toContain(
    "ofereça somente horários válidos",
  );
});
it("clínica limita coleta e organização ao atendimento comercial e à agenda", () => {
  const prompt = businessPrompts("clinica", "Clínica fictícia");
  expect(prompt.conversation).toContain("Não solicite sintomas");
  expect(prompt.organizer).toContain("Nunca copie sintomas");
  expect(prompt.organizer).toContain("sem repetir informação sensível");
});
