import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

const mocks = vi.hoisted(() => ({ accept: vi.fn(), toast: vi.fn() }));
vi.mock("@/app/actions/onboarding/acceptWelcome", () => ({ acceptWelcome: mocks.accept }));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));

import { WelcomeForm } from "@/app/onboarding/welcome/_form";

describe("revisão das informações do negócio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mantém descrição e fuso salvos ao revisar o segmento", async () => {
    mocks.accept.mockResolvedValue({ ok: false, error: "db_error" });
    render(
      <WelcomeForm
        defaultOrgName="Clínica de exemplo"
        suggestedSegment="clinica"
        initialDescription="Atendemos de segunda a sexta, mediante confirmação."
        initialTimezone="America/Fortaleza"
      />,
    );
    expect(screen.getByLabelText("Conte como sua empresa atende")).toHaveValue(
      "Atendemos de segunda a sexta, mediante confirmação.",
    );
    expect(screen.getByRole("combobox", { name: "Onde você atende" })).toHaveTextContent(
      "Horário salvo da empresa",
    );
    fireEvent.change(screen.getByLabelText("Tipo de negócio"), { target: { value: "consultoria" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledOnce());
    const submitted = mocks.accept.mock.calls[0]?.[0] as FormData;
    expect(submitted.get("timezone")).toBe("America/Fortaleza");
    expect(submitted.get("business_description")).toBe(
      "Atendemos de segunda a sexta, mediante confirmação.",
    );
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith("Falha: db_error"));
    expect(screen.getByLabelText("Tipo de negócio")).toHaveValue("consultoria");
  });

  it("preserva a edição quando a conexão falha e permite tentar novamente", async () => {
    mocks.accept.mockRejectedValueOnce(new Error("network"));
    mocks.accept.mockResolvedValueOnce({ ok: false, error: "db_error" });
    render(<WelcomeForm defaultOrgName="Empresa de exemplo" />);
    fireEvent.change(screen.getByLabelText("Conte como sua empresa atende"), {
      target: { value: "Enviamos o orçamento depois de confirmar as medidas." },
    });
    fireEvent.change(screen.getByLabelText("Tipo de negócio"), { target: { value: "marcenaria" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      "Não foi possível salvar. Seus ajustes continuam aqui para tentar novamente.",
    ));
    expect(screen.getByLabelText("Tipo de negócio")).toHaveValue("marcenaria");
    expect(screen.getByLabelText("Conte como sua empresa atende")).toHaveValue(
      "Enviamos o orçamento depois de confirmar as medidas.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(2));
    expect((mocks.accept.mock.calls[1]?.[0] as FormData).get("business_segment")).toBe("marcenaria");
  });
});
