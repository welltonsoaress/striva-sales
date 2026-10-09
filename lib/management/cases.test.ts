import { expect, it, vi } from "vitest";
import { managementPendingCases } from "./cases";
function fixture(count: number | null, error: unknown = null) {
  const filters: [string, unknown][] = [];
  const order = vi.fn();
  const q = {
    select: () => q,
    eq: (key: string, value: unknown) => {
      filters.push([key, value]);
      return q;
    },
    order: (...args: unknown[]) => {
      order(...args);
      return q;
    },
    limit: vi.fn(async () => ({
      count,
      error,
      data: count ? [{ id: "case-qa", title: "Caso QA", blocker: "Uma decisão humana" }] : [],
    })),
  };
  return { admin: { from: () => q } as never, filters, order, q };
}
it("a lista informa a régua, a pendência e o próximo passo com org explícita", async () => {
  const db = fixture(7);
  const result = await managementPendingCases(db.admin, "org-qa");
  expect(db.filters).toEqual([
    ["organization_id", "org-qa"],
    ["status", "awaiting_human"],
  ]);
  expect(db.q.limit).toHaveBeenCalledWith(5);
  expect(result).toContain("orientação: 7");
  expect(result).toContain("(UTC)");
  expect(result).toContain("Caso: case-qa");
  expect(result).toContain("cinco mais antigos");
});
it("indisponibilidade não aparece como nenhuma pendência", async () => {
  await expect(managementPendingCases(fixture(null).admin, "org-qa")).rejects.toThrow(
    "management_cases_unavailable",
  );
  expect(await managementPendingCases(fixture(0).admin, "org-qa")).toContain("Nenhum caso");
});
