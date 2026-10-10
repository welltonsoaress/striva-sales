import { beforeEach, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  account: { mode: "legacy", state: "pending", access_until: null } as Record<string, unknown>,
  settings: {} as Record<string, unknown>,
  access: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: fixture.access,
    from: (table: string) => {
      const value = () =>
        table === "organization_ai_accounts"
          ? fixture.account
          : table === "platform_ai_settings"
            ? fixture.settings
            : {
                input_price_per_million_cents: 200,
                output_price_per_million_cents: 1000,
                cache_read_price_per_million_cents: 10,
                cache_write_price_per_million_cents: 250,
                pricing_verified_at: "2026-10-09T00:00:00Z",
                pricing_source: "https://developers.openai.com/api/docs/models/gpt-6.1-sol",
              };
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: async () => ({ data: value(), error: null }),
        single: async () => ({ data: value(), error: null }),
      };
      return chain;
    },
  }),
}));
vi.mock("./platform-credentials", () => ({
  platformKeyServer: vi.fn(async () => "fixture-platform-key"),
}));
vi.mock("@/lib/atendimento/fronteira-server", () => ({ currentExecutionJob: () => null }));

import { managedSettings } from "./managed-ai-server";
beforeEach(() => {
  fixture.account = { mode: "legacy", state: "pending", access_until: null };
  fixture.settings = {
    enabled: true,
    apply_to_all: false,
    provider: "openai",
    model: "gpt-6.1-sol",
    purpose_models: {},
  };
  fixture.access.mockReset().mockResolvedValue({ error: null });
});
it("conta legada preserva a conexão existente enquanto aplicar a todos está desligado", async () => {
  expect(await managedSettings("org-fixture", "agent_turn")).toBeNull();
  expect(fixture.access).not.toHaveBeenCalled();
});
it("aplicar a todos usa o modelo centralizado sem transformar o contrato legado", async () => {
  fixture.settings.apply_to_all = true;
  fixture.settings.purpose_models = {
    agent_turn: { enabled: true, provider: "anthropic", model: "override-fixture" },
  };
  expect(await managedSettings("org-fixture", "agent_turn")).toMatchObject({
    model: "gpt-6.1-sol",
    provider: "openai",
    commercially_managed: false,
  });
  expect(fixture.account.mode).toBe("legacy");
});
it("falha na autorização comercial impede a chamada gerenciada", async () => {
  fixture.settings.apply_to_all = true;
  fixture.access.mockResolvedValue({ error: { message: "ai_account_suspended" } });
  await expect(managedSettings("org-fixture", "agent_turn")).rejects.toMatchObject({
    code: "ai_account_suspended",
  });
});
