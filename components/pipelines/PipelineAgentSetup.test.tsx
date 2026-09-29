import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PipelineAgentSetup } from "./PipelineAgentSetup";
import { apiClient } from "@/lib/api/client";
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn() } }));
vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
beforeEach(() => vi.clearAllMocks());
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><PipelineAgentSetup pipelineId="p1" /></QueryClientProvider>);
  return client;
}
it("não promete permissão quando só existe um agente para outro funil e oferece associação", async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: "a1", name: "Atendimento", kind: "mcp_agent", is_active: true, paused_at: null, versao_publicada: { pipeline_ids: ["outro"] } }] });
  const client = mount();
  expect(await screen.findByText(/nenhum agente ativo tem permissão publicada/)).toBeVisible();
  await userEvent.setup().selectOptions(screen.getByLabelText("Selecionar agente"), "a1");
  expect(screen.getByRole("link", { name: "Associar e revisar publicação" })).toHaveAttribute("href", "/app/ai/agents/a1?pipeline=p1#funil-p1");
  client.clear();
});
it("mostra somente a permissão publicada de agentes ativos", async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: [
    { id: "a1", name: "Atendimento", kind: "mcp_agent", is_active: true, paused_at: null, versao_publicada: { pipeline_ids: ["p1"] } },
    { id: "a2", name: "Pausado", kind: "mcp_agent", is_active: true, paused_at: "2026-09-28", versao_publicada: { pipeline_ids: ["p1"] } },
  ] });
  const client = mount();
  expect(await screen.findByText("Permissão publicada: Atendimento")).toBeVisible();
  client.clear();
});
