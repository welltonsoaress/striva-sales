import { describe, expect, it } from "vitest";
import { deveAbrirPrimeirosPassos, progressoInicial } from "./progresso-inicial";

describe("primeiros passos da organização", () => {
  it("adiar ou pular não fabrica progresso", () => {
    expect(
      progressoInicial({
        dismissed_at: new Date().toISOString(),
        ai: { agent_id: "", prompt_template: "skipped", skipped: true },
        teste: { respondeu: false, skipped: true },
      }).percentual,
    ).toBe(0);
  });
  it("reconhece recursos configurados fora do assistente e oferece o teste seguinte", () => {
    const result = progressoInicial(
      {},
      { negocio: true, whatsapp: true, agente: true, funil: true },
    );
    expect(result.percentual).toBe(80);
    expect(result.proxima?.id).toBe("teste");
    expect(
      progressoInicial(
        { teste: { respondeu: true } },
        { negocio: true, whatsapp: true, agente: true, funil: true },
      ).percentual,
    ).toBe(100);
  });
  it("o convite e o acompanhamento de suporte não abrem a configuração da organização", () => {
    expect(deveAbrirPrimeirosPassos({ onboardedAt: null, role: "agent" })).toBe(false);
    expect(deveAbrirPrimeirosPassos({ onboardedAt: null, role: "admin", support: true })).toBe(
      false,
    );
    expect(deveAbrirPrimeirosPassos({ onboardedAt: null, role: "admin" })).toBe(true);
    expect(
      deveAbrirPrimeirosPassos({
        onboardedAt: null,
        role: "admin",
        dismissedAt: new Date().toISOString(),
      }),
    ).toBe(false);
  });
  it("a jornada gerenciada termina na ativação sem exigir etapas legadas", () => {
    const result = progressoInicial(
      {
        ai: {
          agent_id: "agente",
          prompt_template: "clinica",
          activated_at: "2026-10-08T12:00:00.000Z",
        },
      },
      { negocio: true, whatsapp: true, agente: true, funil: true },
      { managed: true },
    );
    expect(result.percentual).toBe(100);
    expect(result.total).toBe(3);
    expect(result.proxima).toBeNull();
    expect(result.etapas.some((etapa) => ["funil", "teste"].includes(etapa.id))).toBe(false);
  });
  it("rascunho ou publicação não substituem a autorização gerenciada", () => {
    const result = progressoInicial(
      { ai: { agent_id: "agente", prompt_template: "clinica" } },
      { negocio: true, whatsapp: true, agente: true, funil: true },
      { managed: true },
    );
    expect(result.percentual).toBe(67);
    expect(result.proxima?.href).toBe("/onboarding/setup-ai");
  });
});
