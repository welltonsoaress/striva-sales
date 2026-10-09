import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3001",
    HOTMART_HOTTOK: "fixture-only",
    HOTMART_CHECKOUT_ENABLED: "false",
  },
  role: vi.fn(),
  support: vi.fn(),
  db: vi.fn(),
  platform: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: mocks.support }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.db }));
vi.mock("@/lib/auth/requirePlatformAdmin", () => ({ requirePlatformAdmin: mocks.platform }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/agent-engine/db/request-pool", () => ({ getRequestPool: vi.fn() }));
vi.mock("@/lib/ai/dispatcher/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { POST } from "@/app/api/v1/billing/checkout/route";
import { activateHotmartOffer, publishCommercialPlan } from "@/app/actions/admin/hotmart";
import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.HOTMART_CHECKOUT_ENABLED = "false";
  mocks.support.mockResolvedValue(null);
  vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, count: 1, limit: 10, window_sec: 60 });
  mocks.role.mockResolvedValue({ ok: true, org: { orgId: "trusted-org" }, user: { id: "actor" } });
  mocks.platform.mockResolvedValue({ user: { id: "operator" }, platformAdmin: { scope: "full" } });
});
const request = (origin = "http://localhost:3001") =>
  new Request("http://localhost:3001/api/v1/billing/checkout", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: "{}",
  });

it("a trava padrão recusa checkout antes de acessar o banco", async () => {
  expect((await POST(request())).status).toBe(503);
  expect(mocks.db).not.toHaveBeenCalled();
});
it("origem externa não chega ao checkout nem à autenticação", async () => {
  expect((await POST(request("https://attacker.invalid"))).status).toBe(403);
  expect(mocks.role).not.toHaveBeenCalled();
  expect(mocks.db).not.toHaveBeenCalled();
});
it("acompanhamento de suporte não contrata em nome da empresa", async () => {
  mocks.role.mockResolvedValue({
    ok: true,
    org: { orgId: "trusted-org" },
    user: { id: "actor", support: {} },
  });
  expect((await POST(request())).status).toBe(403);
  expect(mocks.db).not.toHaveBeenCalled();
});
it("usuário sem papel administrativo mantém a recusa do guard", async () => {
  mocks.role.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
  expect((await POST(request())).status).toBe(403);
  expect(mocks.db).not.toHaveBeenCalled();
});
it("operador não publica uma oferta enquanto a instalação aguarda homologação", async () => {
  expect(await activateHotmartOffer("0244aaaa-2222-4000-8000-000000000001")).toMatchObject({
    ok: false,
  });
  expect(mocks.db).not.toHaveBeenCalled();
});

it("publicação comercial recusa acompanhamento e operador somente leitura", async () => {
  mocks.support.mockResolvedValue(new Response(null, { status: 403 }));
  expect(await publishCommercialPlan("0244aaaa-2222-4000-8000-000000000001")).toMatchObject({
    ok: false,
  });
  expect(mocks.db).not.toHaveBeenCalled();
  mocks.support.mockResolvedValue(null);
  mocks.platform.mockResolvedValue({
    user: { id: "operator" },
    platformAdmin: { scope: "support" },
  });
  expect(await publishCommercialPlan("0244aaaa-2222-4000-8000-000000000001")).toMatchObject({
    ok: false,
  });
  expect(mocks.db).not.toHaveBeenCalled();
});

it.each(["month", "semester", "year"])(
  "checkout novo respeita os períodos públicos e registra a régua de créditos: %s",
  async (billing_interval) => {
    mocks.env.HOTMART_CHECKOUT_ENABLED = "true";
    const id = "0244aaaa-2222-4000-8000-000000000001";
    const insert = vi.fn(async () => ({ error: null }));
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({
        error: null,
        data: {
          id, slug: "pro", name: "Pro", description: "Oferta fictícia",
          price_cents: 178200, currency: "BRL", billing_interval,
          recommended: true, position: 1, publication_state: "published",
          limits: { users: 5, whatsapp_numbers: 2, ai_credits: 3000, ai_credits_period: "month" },
          hotmart_offer: {
            product_ucode: id, offer_code: "qa-only",
            checkout_url: "https://pay.hotmart.com/qa-only", enabled: true,
          },
        },
      })),
    };
    mocks.db.mockReturnValue({
      from: (table: string) => table === "commercial_plans" ? query : table === "organization_ai_accounts" ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) } : { insert },
    });
    const result = await POST(new Request("http://localhost:3001/api/v1/billing/checkout", {
      method: "POST", headers: { origin: "http://localhost:3001", "content-type": "application/json" },
      body: JSON.stringify({ plan_id: id }),
    }));
    expect(result.status).toBe(billing_interval === "month" ? 409 : 200);
    if (billing_interval === "month") expect(insert).not.toHaveBeenCalled();
    else expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: "trusted-org", credit_meter: "credit_v3", billing_interval,
    }));
  },
);
