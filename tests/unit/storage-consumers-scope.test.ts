import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  sign: vi.fn(async () => ({ data: { signedUrl: "https://example.invalid/signed" }, error: null })),
  download: vi.fn(async () => ({ data: new Blob(["Documento fictício próprio."]), error: null })),
  message: {
    id: "message",
    media_url: null,
    media_mime: "image/png",
    media_storage_path: "org/image.png",
    channel_session_id: "channel",
  },
}));
vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: async () => ({ id: "user", idioma: "pt-BR" }),
  resolveActiveOrg: async () => ({ orgId: "org" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "user" } }, error: null }) },
    from: () => {
      const query: Record<string, unknown> = {};
      query.select = () => query;
      query.eq = () => query;
      query.maybeSingle = async () => ({ data: storage.message, error: null });
      return query;
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ createSignedUrl: storage.sign, download: storage.download }) },
  }),
}));
vi.mock("@/lib/ai/rag/extractors/pdf", () => ({
  extractPdfText: vi.fn(),
  PdfExtractError: class extends Error {},
}));

import { GET } from "@/app/api/v1/messages/[id]/media/route";
import { extrairTextoDoArquivo } from "@/lib/ai/rag/ingest/documento";
import { ingestPolicyFile } from "@/lib/ai/rag/ingest/policy";

beforeEach(() => {
  vi.clearAllMocks();
  storage.message.media_storage_path = "org/image.png";
});
describe("ponteiros privados com registro próprio", () => {
  it("assina a mídia própria com autorização da mensagem", async () => {
    const response = await GET({} as never, { params: Promise.resolve({ id: "message" }) });
    expect(response.status).toBe(302);
    expect(storage.sign).toHaveBeenCalledWith("org/image.png", expect.any(Number));
  });
  it("não assina mídia da outra empresa mesmo com mensagem própria", async () => {
    storage.message.media_storage_path = "neighbor/private.png";
    const response = await GET({} as never, { params: Promise.resolve({ id: "message" }) });
    expect(response.status).toBe(404);
    expect(response.headers.has("Location")).toBe(false);
    expect(storage.sign).not.toHaveBeenCalled();
  });
  it("extrai conhecimento do arquivo próprio", async () => {
    const result = await extrairTextoDoArquivo("org", "org/document.md", "md");
    expect(result.texto).toContain("Documento fictício próprio");
    expect(storage.download).toHaveBeenCalledWith("org/document.md");
  });
  it("não extrai o arquivo vizinho pelo metadata da fonte", async () => {
    await expect(extrairTextoDoArquivo("org", "neighbor/document.md", "md")).rejects.toThrow(
      "não pertence",
    );
    await expect(
      ingestPolicyFile({
        organizationId: "org",
        agentId: "agent",
        knowledgeSourceId: "source",
        blobPath: "neighbor/document.md",
        ext: "md",
      }),
    ).rejects.toThrow("storage_path_outside_organization");
    expect(storage.download).not.toHaveBeenCalled();
  });
});
