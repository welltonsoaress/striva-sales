import { expect, it, vi } from "vitest";
import type pg from "pg";
import {
  assertCommercialAccess,
  assertPricedModel,
  CommercialAiError,
  managedSettingsPg,
  platformKey,
} from "./managed-ai";
it("preserva organizações legadas e recusa acesso vencido", () => {
  expect(() =>
    assertCommercialAccess({ mode: "legacy", state: "expired", access_until: null }, "agent_turn"),
  ).not.toThrow();
  expect(() =>
    assertCommercialAccess(
      { mode: "platform", state: "trial", access_until: "2000-01-01" },
      "agent_turn",
    ),
  ).toThrow(CommercialAiError);
  expect(() =>
    assertCommercialAccess(
      { mode: "platform", state: "pending", access_until: null },
      "agent_test",
    ),
  ).not.toThrow();
  expect(() =>
    assertCommercialAccess(
      { mode: "platform", state: "pending", access_until: null },
      "operator_turn",
    ),
  ).toThrow(CommercialAiError);
});
it("tarifa não validada ou chave ausente impedem novas chamadas gerenciadas", () => {
  expect(() =>
    assertPricedModel({ input: 1, output: 1, cache_read: null, cache_write: null }),
  ).toThrow("ai_model_price_missing");
  expect(() => platformKey("openai", {})).toThrow("ai_platform_credential_missing");
});
it("erro comercial no banco não cai no provedor legado", async () => {
  const query = vi
    .fn()
    .mockResolvedValueOnce({
      rows: [{ mode: "platform", state: "active", access_until: "2100-01-01" }],
    })
    .mockRejectedValueOnce(new Error("ai_credits_exhausted"));
  await expect(
    managedSettingsPg({ query } as unknown as pg.Pool, "qa-org", "agent_turn"),
  ).rejects.toMatchObject({
    name: "commercial_ai_blocked",
    code: "ai_credits_exhausted",
    terminal: true,
  });
  expect(query).toHaveBeenCalledTimes(2);
});
it("ausência da conta comercial não permite escolher o caminho legado", async () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  await expect(
    managedSettingsPg({ query } as unknown as pg.Pool, "qa-org", "agent_turn"),
  ).rejects.toMatchObject({ code: "ai_account_unavailable" });
  expect(query).toHaveBeenCalledTimes(1);
});
