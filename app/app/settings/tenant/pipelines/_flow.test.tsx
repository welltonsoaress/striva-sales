import { beforeEach, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { FlowConfigSection } from "./_flow";
import { useCriarEtapa } from "@/hooks/pipelines/useStages";
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock("@/components/pipelines/PipelineAgentSetup", () => ({ PipelineAgentSetup: () => null }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const stage = (id: string, name: string) => ({ id, name, is_won: false, is_lost: false, agent_stage_hint: null });
const data = () => ({
  stages: [stage("s1", "Entrada")],
  stage_guidance: { s1: { purpose: "Recebeu contato" } },
  event_stage_ids: { appointment_pending: null, appointment_confirmed: null, human_handoff: null },
  reconciliation_preview: { available: true, truncated: false, ambiguous: [], proposals: [{ lead_id: "l1", lead_title: "Teste", current_stage_name: "Entrada", suggested_stage_name: "Agenda", appointment_title: "Reserva", appointment_status: "confirmed", appointment_starts_at: "2026-09-28T12:00:00Z" }] },
});
beforeEach(() => vi.clearAllMocks());

it("atualiza etapas após edição pela tela irmã, preserva rascunho e abre o quadro certo", async () => {
  let current = data();
  vi.mocked(apiClient.get).mockImplementation(async () => ({ data: current }) as never);
  vi.mocked(apiClient.post).mockImplementation(async () => {
    current = { ...current, stages: [...current.stages, stage("s2", "Proposta")] };
    return {} as never;
  });
  function Sibling() { const mutation = useCriarEtapa("p1"); return <button onClick={() => mutation.mutate("Proposta")}>Adicionar coluna</button>; }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FlowConfigSection pipelineId="p1" /><Sibling /></QueryClientProvider>);
  const user = userEvent.setup();
  const purpose = await screen.findByLabelText("Entrada");
  await user.clear(purpose);
  await user.type(purpose, "Texto ainda não salvo");
  await user.click(screen.getByText("Adicionar coluna"));
  expect(await screen.findByLabelText("Proposta")).toBeVisible();
  expect(screen.getByLabelText("Entrada")).toHaveValue("Texto ainda não salvo");
  expect(screen.getByRole("link", { name: "Revisar no quadro" })).toHaveAttribute("href", "/app/pipelines/p1?lead=l1");
  client.clear();
});

it("recarrega a prévia depois de salvar destinos", async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: data() });
  vi.mocked(apiClient.put).mockResolvedValue({ data: { ...data(), reconciliation_preview: undefined } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><FlowConfigSection pipelineId="p1" /></QueryClientProvider>);
  await screen.findByLabelText("Entrada");
  await act(async () => { screen.getByRole("button", { name: "Salvar regras do funil" }).click(); });
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("link", { name: "Revisar no quadro" })).toBeVisible();
  client.clear();
});
