import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PlansEditor } from "@/app/admin/(protected)/plans/_client";
import type { CommercialPlan } from "@/lib/billing/plans";

const mocks = vi.hoisted(() => ({ save: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock("@/app/actions/admin/updateCommercialPlan", () => ({ updateCommercialPlan: mocks.save }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (text: string) => text }));

const plan: CommercialPlan = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "pro",
  name: "Pro",
  description: "Referência para revisão",
  price_cents: 29700,
  currency: "BRL",
  billing_interval: null,
  recommended: true,
  limits: { users: null, whatsapp_numbers: null, ai_credits: null, ai_credits_period: "month" },
  position: 2,
  publication_state: "draft",
  hotmart_offer: null,
  checkout_available: false,
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("preserva valores após rejeição e permite reenviar a edição em centavos", async () => {
  mocks.save.mockResolvedValueOnce({ ok: false, error: "Não foi possível salvar o plano." });
  mocks.save.mockResolvedValueOnce({ ok: true });
  render(<PlansEditor catalog={{ available: true, plans: [plan] }} readOnly={false} />);
  const price = screen.getByLabelText("Preço em reais");
  const name = screen.getByLabelText("Nome do plano");
  fireEvent.change(price, { target: { value: "327.50" } });
  fireEvent.change(name, { target: { value: "Pro revisado" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(price).toHaveValue(327.5);
  expect(name).toHaveValue("Pro revisado");
  fireEvent.click(await screen.findByRole("button", { name: "Salvar rascunho" }));
  await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  expect(mocks.save).toHaveBeenLastCalledWith(
    expect.objectContaining({
      name: "Pro revisado",
      price_cents: 32750,
      billing_interval: null,
      limits: { users: null, whatsapp_numbers: null, ai_credits: null },
    }),
  );
});

it("falha de conexão mantém a edição e oferece nova tentativa", async () => {
  mocks.save.mockRejectedValueOnce(new Error("Conexão interrompida"));
  render(<PlansEditor catalog={{ available: true, plans: [plan] }} readOnly={false} />);
  const name = screen.getByLabelText("Nome do plano");
  fireEvent.change(name, { target: { value: "Oferta revisada" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("continuam aqui")),
  );
  expect(name).toHaveValue("Oferta revisada");
  expect(await screen.findByRole("button", { name: "Salvar rascunho" })).toBeEnabled();
});

it("acesso de leitura não permite alterar ou enviar o rascunho", () => {
  render(<PlansEditor catalog={{ available: true, plans: [plan] }} readOnly />);
  expect(screen.getByLabelText("Preço em reais")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Salvar rascunho" })).toBeDisabled();
  expect(mocks.save).not.toHaveBeenCalled();
});
