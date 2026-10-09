import { describe, expect, it } from "vitest";
import { tenantOperationAllowed } from "./operation-access";

describe("operações comerciais do tenant", () => {
  const now = Date.parse("2030-01-01T12:00:00Z");
  it("conserva legado e configuração inicial; não depende do saldo de IA", () => {
    expect(
      tenantOperationAllowed({ mode: "legacy", state: "expired", access_until: null }, now),
    ).toBe(true);
    expect(
      tenantOperationAllowed({ mode: "platform", state: "pending", access_until: null }, now),
    ).toBe(true);
    expect(
      tenantOperationAllowed(
        { mode: "platform", state: "active", access_until: "2030-01-02T00:00:00Z" },
        now,
      ),
    ).toBe(true);
  });
  it("nega ausência, suspensão, datas inválidas e o instante exato do fim", () => {
    expect(tenantOperationAllowed(null, now)).toBe(false);
    for (const state of ["expired", "suspended", "unknown"])
      expect(
        tenantOperationAllowed(
          { mode: "platform", state, access_until: "2030-01-02T00:00:00Z" },
          now,
        ),
      ).toBe(false);
    for (const access_until of [null, "inválida", "2030-01-01T12:00:00Z"])
      expect(tenantOperationAllowed({ mode: "platform", state: "trial", access_until }, now)).toBe(
        false,
      );
  });
});
