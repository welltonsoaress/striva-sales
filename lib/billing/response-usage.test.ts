import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./managed-ai-server", () => ({ commercialAccountSnapshot: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { commercialAccountSnapshot } from "./managed-ai-server";
import { loadBillingCreditSnapshot, usageMonthUtc } from "./response-usage";

beforeEach(() => vi.resetAllMocks());

it("o mês UTC não depende do fuso do navegador nem inclui o mês seguinte", () => {
  expect(usageMonthUtc(new Date("2026-10-31T22:00:00-03:00"))).toEqual({
    start: "2026-11-01T00:00:00.000Z",
    end: "2026-12-01T00:00:00.000Z",
  });
  expect(usageMonthUtc(new Date("2026-12-31T23:59:59Z"))).toEqual({
    start: "2026-12-01T00:00:00.000Z",
    end: "2027-01-01T00:00:00.000Z",
  });
});

it("na virada do ciclo, saldo renovado e consumo pertencem ao período novo", async () => {
  let renewed = false;
  const current = {
    mode: "platform",
    organization_id: "empresa-a",
    monthly_remaining: 3000,
    period_start: "2026-11-08T12:00:00Z",
    period_end: "2026-12-08T12:00:00Z",
  };
  vi.mocked(commercialAccountSnapshot).mockImplementation(async () => {
    await Promise.resolve();
    renewed = true;
    return { account: current, checked_at: Date.parse(current.period_start) } as Awaited<
      ReturnType<typeof commercialAccountSnapshot>
    >;
  });
  const recent = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  const account = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({
      data: renewed
        ? current
        : {
            ...current,
            period_start: "2026-10-08T12:00:00Z",
            period_end: current.period_start,
          },
      error: null,
    })),
  };
  const rpc = vi.fn(async (_name: string, args: { p_start: string }) => ({
    data: { credits: args.p_start === current.period_start ? 0 : 900, messages: 0 },
    error: null,
  }));
  vi.mocked(createClient).mockResolvedValue({
    from: (table: string) => (table === "organization_ai_accounts" ? account : recent),
    rpc,
  } as unknown as Awaited<ReturnType<typeof createClient>>);

  const result = await loadBillingCreditSnapshot("empresa-a");
  expect(result.account.monthly_remaining).toBe(3000);
  expect(result.usage).toMatchObject({ available: true, total: 0, meter: "credit_v3" });
  expect(rpc).toHaveBeenCalledWith("fn_ai_credit_usage", {
    p_org: "empresa-a",
    p_start: current.period_start,
    p_end: current.period_end,
  });
  expect(recent.eq).toHaveBeenCalledWith("organization_id", "empresa-a");
});

it("falha ao renovar não apresenta consumo antigo como se fosse atual", async () => {
  vi.mocked(commercialAccountSnapshot).mockRejectedValue(new Error("ai_account_unavailable"));
  await expect(loadBillingCreditSnapshot("empresa-a")).rejects.toThrow("ai_account_unavailable");
  expect(createClient).not.toHaveBeenCalled();
});
