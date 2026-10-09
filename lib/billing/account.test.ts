import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { loadBillingAccount } from "./account";

beforeEach(() => vi.resetAllMocks());

it("resolve o plano recente sem varrer os primeiros mil checkouts antigos", async () => {
  const checkouts = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    // Sem filtro, a API entrega somente a primeira página do histórico.
    then: (resolve: (value: unknown) => unknown) =>
      resolve({
        data: Array.from({ length: 1000 }, (_, i) => ({ id: `antigo-${i}`, plan_id: "basico" })),
        error: null,
      }),
    in: vi.fn().mockResolvedValue({
      data: [{ id: "checkout-recente", plan_id: "pro" }],
      error: null,
    }),
  };
  const query = (data: unknown[]) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error: null }),
  });
  const contracts = query([{ id: "contrato", checkout_id: "checkout-recente" }]);
  const payments = query([]);
  vi.mocked(createClient).mockResolvedValue({
    from: (table: string) =>
      table === "billing_contracts"
        ? contracts
        : table === "billing_payments"
          ? payments
          : checkouts,
  } as unknown as Awaited<ReturnType<typeof createClient>>);

  const result = await loadBillingAccount("empresa-a");
  expect(result.available).toBe(true);
  expect(result.contracts[0]?.plan_id).toBe("pro");
  expect(checkouts.eq).toHaveBeenCalledWith("organization_id", "empresa-a");
  expect(checkouts.in).toHaveBeenCalledWith("id", ["checkout-recente"]);
});
