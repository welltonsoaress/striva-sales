import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));

import { NovoFunilWizard } from "./NovoFunilWizard";

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

function montar(onCreate = vi.fn()) {
  const user = userEvent.setup();
  render(<NovoFunilWizard open onOpenChange={vi.fn()} onCreate={onCreate} />);
  return { user, onCreate };
}

beforeEach(() => vi.clearAllMocks());

describe("NovoFunilWizard", () => {
  it("permite revisar destino de agendamento antes de criar e avisa se uma reserva encerra como ganho", async () => {
    const { user, onCreate } = montar();
    await user.click(screen.getByRole("button", { name: /Clínica, consultório ou salão/ }));
    await user.clear(screen.getByLabelText("Nome do funil"));
    await user.type(screen.getByLabelText("Nome do funil"), "Clínica da cidade");

    expect(screen.getByText(/Este destino encerra o lead como ganho/)).toBeVisible();
    await user.click(screen.getByLabelText("Agendamento confirmado"));
    const options = await screen.findByRole("listbox");
    await user.click(within(options).getByRole("option", { name: /Escolhendo horário/ }));
    await user.click(screen.getByTestId("confirmar-novo-funil"));

    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      name: "Clínica da cidade",
      template_id: "clinica",
      event_stage_keys: { appointment_pending: "escolhendo_horario", appointment_confirmed: "escolhendo_horario", human_handoff: null },
      stages: expect.arrayContaining([expect.objectContaining({ name: "Consulta marcada", passo: "won" })]),
    }));
  });

  it("mantém a opção básica compatível com criação legada", async () => {
    const { user, onCreate } = montar();
    await user.click(screen.getByRole("button", { name: /Básico personalizável/ }));
    await user.type(screen.getByLabelText("Nome do funil"), "Comercial simples");
    await user.click(screen.getByTestId("confirmar-novo-funil"));
    expect(onCreate).toHaveBeenCalledWith({ name: "Comercial simples" });
  });
});


it("apresenta a recusa da API dentro do diálogo", () => {
  render(<NovoFunilWizard open onOpenChange={vi.fn()} onCreate={vi.fn()} error="Já existe um funil com este nome." />);
  expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Já existe um funil com este nome.");
});
