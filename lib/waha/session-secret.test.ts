import { describe, expect, it, vi } from "vitest";
import { loadWahaSessionSecret } from "./session-secret";

describe("segredo da sessão WAHA", () => {
  it("placeholder legado não causa chamadas de decrypt que sempre falham", async () => {
    const rpc = vi.fn();
    const admin = { rpc } as never;
    expect(await loadWahaSessionSecret(admin, "\\x00")).toBeNull();
    expect(await loadWahaSessionSecret(admin, "00")).toBeNull();
    expect(await loadWahaSessionSecret(admin, null)).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("cifra real é decifrada e falha mantém o segredo indisponível", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: "segredo-de-teste", error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "39000" } })
      .mockRejectedValueOnce(new Error("conexão indisponível"));
    const admin = { rpc } as never;
    expect(await loadWahaSessionSecret(admin, "\\xc301")).toBe("segredo-de-teste");
    expect(rpc).toHaveBeenCalledWith("fn_decrypt_oauth", { ciphertext: "\\xc301" });
    expect(await loadWahaSessionSecret(admin, "\\xc301")).toBeNull();
    expect(await loadWahaSessionSecret(admin, "\\xc301")).toBeNull();
  });
});
