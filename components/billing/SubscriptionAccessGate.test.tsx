import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/app/contacts" }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: mock.get } }));
import { SubscriptionAccessGate } from "./SubscriptionAccessGate";
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);
function mount() { render(<SubscriptionAccessGate required paywall={<p>Contratação necessária</p>}><p>Operação liberada</p></SubscriptionAccessGate>); }
it("o envelope confirmado mantém o paywall após a consulta", async () => {
  mock.get.mockResolvedValue({ data: { paywall_required: true } });
  mount();
  await waitFor(() => expect(mock.get).toHaveBeenCalled());
  expect(screen.getByText("Contratação necessária")).toBeInTheDocument();
  expect(screen.queryByText("Operação liberada")).toBeNull();
});
it("confirmação de período válido libera a operação", async () => {
  mock.get.mockResolvedValue({ data: { paywall_required: false } });
  mount();
  await waitFor(() => expect(screen.getByText("Operação liberada")).toBeInTheDocument());
});
it("resposta incompleta não libera um bloqueio confirmado", async () => {
  mock.get.mockResolvedValue({});
  mount();
  await waitFor(() => expect(mock.get).toHaveBeenCalled());
  expect(screen.queryByText("Operação liberada")).toBeNull();
});
