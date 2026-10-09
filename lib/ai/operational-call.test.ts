import { beforeEach, expect, it, vi } from "vitest";
import { recordOperationalCall } from "./operational-call";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  price: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "llm_calls") return { insert: mocks.insert };
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        maybeSingle: mocks.price,
      };
      return query;
    },
  }),
}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));
beforeEach(() => {
  mocks.insert.mockReset().mockResolvedValue({ error: null });
  mocks.price.mockReset().mockResolvedValue({
    data: {
      input_price_per_million_cents: 100,
      output_price_per_million_cents: 500,
      cache_read_price_per_million_cents: 0,
      cache_write_price_per_million_cents: 0,
      pricing_verified_at: "2026-10-08T00:00:00Z",
      pricing_source: "https://example.test/tarifa-ficticia",
    },
  });
});

it("preserva a origem legada e a tarifa de uma chamada concluída antes da migração", async () => {
  await recordOperationalCall({
    organization_id: "org-ficticia",
    billing_mode: "legacy",
    purpose: "embedding_indexar",
    provider: "openai",
    model: "modelo-ficticio",
    input_tokens: 1000,
    output_tokens: 100,
    latency_ms: 30,
  });
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
    cost_cents: expect.closeTo(0.15, 10),
    pricing_snapshot: expect.objectContaining({ mode: "legacy", rates: expect.any(Object) }),
  }));
});

it("inclui no recibo a origem da transcrição sem perder a tarifa por minuto", async () => {
  await recordOperationalCall({
    organization_id: "org-ficticia",
    billing_mode: "platform",
    purpose: "transcricao_de_audio",
    provider: "openai",
    model: "whisper-1",
    duration_seconds: 90,
    duration_rate: 10,
    duration_source: "https://example.test/tarifa-ficticia",
    latency_ms: 30,
  });
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
    cost_cents: 15,
    pricing_snapshot: expect.objectContaining({ mode: "platform", seconds: 90, rate: 10 }),
  }));
});

it("não atribui uma origem ausente nem transforma uma tarifa desconhecida em zero", async () => {
  mocks.price.mockResolvedValue({ data: null });
  await recordOperationalCall({
    organization_id: "org-ficticia",
    purpose: "visao_de_imagem",
    provider: "openai",
    model: "modelo-ficticio",
    latency_ms: 30,
  });
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
    cost_cents: null,
    pricing_snapshot: { mode: "unknown" },
  }));
});
