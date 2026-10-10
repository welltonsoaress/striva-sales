import type pg from "pg";
import { beforeEach, expect, it, vi } from "vitest";

const { decrypt, read } = vi.hoisted(() => ({ decrypt: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/crypto/aes_gcm", () => ({
  decryptKey: decrypt,
  byteaToBuffer: (value: string) => Buffer.from(value.replace(/^\\x/, ""), "hex"),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: read }) }) }),
  }),
}));

import { platformKeyPg, platformKeyServer } from "./platform-credentials";

const encrypted = {
  ciphertext: Buffer.from("cipher"),
  iv: Buffer.alloc(12),
  tag: Buffer.alloc(16),
};
const cfg = { openaiApiKey: "environment-fixture-key" };
beforeEach(() => {
  vi.clearAllMocks();
  decrypt.mockReturnValue("database-fixture-key");
});

it("a chave salva pela plataforma prevalece no worker e no servidor", async () => {
  const query = vi.fn().mockResolvedValue({ rows: [encrypted] });
  expect(await platformKeyPg({ query } as unknown as pg.Pool, "openai", cfg)).toBe(
    "database-fixture-key",
  );
  read.mockResolvedValue({ data: { ciphertext: "\\x01", iv: "\\x02", tag: "\\x03" }, error: null });
  expect(await platformKeyServer("openai", cfg)).toBe("database-fixture-key");
});

it("sem registro da plataforma, preserva a chave da instalação", async () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  expect(await platformKeyPg({ query } as unknown as pg.Pool, "openai", cfg)).toBe(
    cfg.openaiApiKey,
  );
  read.mockResolvedValue({ data: null, error: null });
  expect(await platformKeyServer("openai", cfg)).toBe(cfg.openaiApiKey);
  expect(decrypt).not.toHaveBeenCalled();
});

it("falha de leitura não usa silenciosamente uma chave diferente", async () => {
  const query = vi.fn().mockRejectedValue(new Error("database-unavailable"));
  await expect(platformKeyPg({ query } as unknown as pg.Pool, "openai", cfg)).rejects.toThrow();
  read.mockResolvedValue({ data: null, error: { code: "XX000" } });
  await expect(platformKeyServer("openai", cfg)).rejects.toMatchObject({
    code: "ai_platform_credential_unavailable",
  });
  expect(decrypt).not.toHaveBeenCalled();
});

it("cifra danificada impede a chamada mesmo quando há chave no ambiente", async () => {
  decrypt.mockImplementation(() => {
    throw new Error("invalid-tag");
  });
  const query = vi.fn().mockResolvedValue({ rows: [encrypted] });
  await expect(platformKeyPg({ query } as unknown as pg.Pool, "openai", cfg)).rejects.toMatchObject(
    { code: "ai_platform_credential_unavailable" },
  );
  read.mockResolvedValue({ data: { ciphertext: "\\x01", iv: "\\x02", tag: "\\x03" }, error: null });
  await expect(platformKeyServer("openai", cfg)).rejects.toMatchObject({
    code: "ai_platform_credential_unavailable",
  });
});
