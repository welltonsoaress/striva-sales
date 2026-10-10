import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw Error("Esta prova exige Supabase local.");
const db = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const suffix = randomUUID().slice(0, 8),
  password = `Teste-${randomUUID()}!`,
  org = randomUUID(),
  plan = randomUUID();
const evidence = ".superpowers/evidence/experiencia-saas";
async function capture(page: Page, name: string, fullPage = true) {
  const path = `${evidence}/${name}.png`;
  await page.screenshot({ path, fullPage });
  await test.info().attach(name, { path, contentType: "image/png" });
}
const users: { id: string; email: string }[] = [];
let settings: Database["public"]["Tables"]["platform_ai_settings"]["Row"];
function checked<T extends { data: unknown; error: { message: string } | null }>(r: T): T["data"] {
  if (r.error) throw Error(r.error.message);
  return r.data;
}
async function login(page: Page, index = 0) {
  await visit(page, "/login");
  await page.locator("#email").fill(users[index]!.email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await page.waitForURL(/\/app(?:\/|$)/, { timeout: 90000 });
}
async function visit(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}
test.describe.configure({ mode: "serial", timeout: 180000 });
test.beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  settings = checked(await db.from("platform_ai_settings").select("*").single())!;
  checked(
    await db
      .from("platform_ai_settings")
      .update({
        enabled: true,
        apply_to_all: true,
        provider: "openai",
        model: "gpt-6.1-sol",
        operator_model: null,
      })
      .eq("id", true),
  );
  for (let i = 0; i < 2; i++) {
    const email = `experiencia-${i}-${suffix}@qa.local`;
    const u = checked(
      await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: i ? "Operador fictício" : "Cliente fictício" },
      }),
    )!.user!;
    users.push({ id: u.id, email });
  }
  checked(
    await db.from("organizations").insert({
      id: org,
      slug: `experiencia-${suffix}`,
      display_name: "Empresa fictícia",
      legal_name: "Empresa fictícia",
      onboarded_at: new Date().toISOString(),
      onboarding_state: {
        welcome: {
          accepted_at: new Date().toISOString(),
          display_name: "Empresa fictícia",
          timezone: "America/Fortaleza",
          business_segment: "outro",
          business_description: "Empresa fictícia para prova visual.",
        },
      },
    }),
  );
  checked(
    await db.from("user_organizations").insert(
      users.map((u) => ({
        organization_id: org,
        user_id: u.id,
        role: "admin",
        accepted_at: new Date().toISOString(),
        interface_settings: { preset: "completa" },
      })),
    ),
  );
  checked(
    await db.from("platform_admins").insert({
      user_id: users[1]!.id,
      granted_by: users[1]!.id,
      scope: "full",
      mfa_required: false,
      reason: "Prova visual local",
    }),
  );
  checked(
    await db.from("commercial_plans").insert({
      id: plan,
      slug: `experiencia-${suffix}`,
      name: "Empresarial de teste",
      description: "Atendimento fictício com IA incluída.",
      publication_state: "published",
      billing_interval: "year",
      price_cents: 120000,
      limits: { users: 10, whatsapp_numbers: 3, ai_credits: 6000, ai_credits_period: "month" },
    }),
  );
  checked(
    await db
      .from("organization_ai_accounts")
      .update({
        mode: "platform",
        state: "active",
        credit_meter: "credit_v3",
        plan_id: plan,
        monthly_allowance: 6000,
        monthly_remaining: 5800,
        user_limit: 10,
        channel_limit: 3,
        access_until: new Date(Date.now() + 365 * 86400000).toISOString(),
        anchor_at: new Date().toISOString(),
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      })
      .eq("organization_id", org),
  );
  // A instalação pode já provisionar o funil padrão ao criar a empresa.
  const seededPipeline = checked(
    await db
      .from("crm_pipelines")
      .select("id")
      .eq("organization_id", org)
      .eq("is_default", true)
      .maybeSingle(),
  );
  const pipeline =
    seededPipeline ??
    checked(
      await db
        .from("crm_pipelines")
        .insert({
          organization_id: org,
          slug: `vendas-${suffix}`,
          name: "Vendas",
          is_default: true,
        })
        .select("id")
        .single(),
    )!;
  const stages = checked(
    await db
      .from("crm_stages")
      .select("id,position")
      .eq("organization_id", org)
      .eq("pipeline_id", pipeline.id)
      .order("position")
      .limit(2),
  )!;
  if (stages.length < 2) {
    const added = checked(
      await db
        .from("crm_stages")
        .insert(
          Array.from({ length: 2 - stages.length }, (_, i) => ({
            organization_id: org,
            pipeline_id: pipeline.id,
            name: `Etapa fictícia ${i}`,
            slug: `qa-${suffix}-${i}`,
            position: stages.length + i,
          })),
        )
        .select("id,position"),
    )!;
    stages.push(...added);
  }
  const contact = checked(
    await db
      .from("contacts")
      .insert({ organization_id: org, display_name: "Contato fictício" })
      .select("id")
      .single(),
  )!;
  checked(
    await db.from("crm_leads").insert(
      ["open", "open", "won", "lost"].map((status, i) => ({
        organization_id: org,
        pipeline_id: pipeline.id,
        stage_id: stages[i % 2]!.id,
        contact_id: contact.id,
        title: `Negócio fictício ${i}`,
        status,
        lost_reason: status === "lost" ? "no_response" : null,
        owner_user_id: users[0]!.id,
        closed_at: status === "open" ? null : new Date().toISOString(),
      })),
    ),
  );
});
test.afterAll(async () => {
  if (settings) checked(await db.from("platform_ai_settings").update(settings).eq("id", true));
  for (const u of users) checked(await db.from("platform_admins").delete().eq("user_id", u.id));
  checked(await db.from("organizations").delete().eq("id", org));
  checked(await db.from("commercial_plans").delete().eq("id", plan));
  for (const u of users) checked(await db.auth.admin.deleteUser(u.id));
});

test("cadastro exige aceite e oferece páginas legais", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: /Criar conta/i })).toBeDisabled();
  await expect(page.getByRole("link", { name: /Termos de Uso/i })).toHaveAttribute(
    "href",
    "/legal/terms",
  );
  await expect(page.getByRole("link", { name: /Política de Privacidade/i })).toHaveAttribute(
    "href",
    "/legal/privacy",
  );
  await capture(page, "signup");
  for (const path of ["terms", "privacy"]) {
    await visit(page, `/legal/${path}`);
    await expect(
      page.getByRole("heading", {
        name: path === "terms" ? "Termos de Uso" : "Política de Privacidade",
        exact: true,
      }),
    ).toBeVisible();
  }
});
test("menu da conta, plano e restrições do cliente", async ({ page }) => {
  await login(page);
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  await page.getByRole("button", { name: "Menu do usuário" }).click();
  await expect(page.getByRole("menuitem", { name: "Meu perfil" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Modo simplificado" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(width);
  await capture(page, "menu", false);
  await page.getByRole("menuitem", { name: "Meu plano" }).click();
  await expect(page.getByText("Empresarial de teste", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Usuários" })).toHaveAttribute(
    "aria-valuemax",
    "10",
  );
  await expect(
    page.getByRole("progressbar", { name: "Créditos da franquia mensal" }),
  ).toHaveAttribute("aria-valuenow", "200");
  await capture(page, "plano");
  await page.goto("/app/connections");
  await expect(page.getByRole("tab", { name: /Oficial|Parceiro|Voz/i })).toHaveCount(0);
  await page.goto("/app/ai");
  await expect(page.getByRole("link", { name: /Credenciais/ })).toHaveCount(0);
  for (const path of ["/api/v1/audit", "/api/v1/ai/runs", "/api/v1/channels/official"])
    expect((await page.request.get(path)).status(), path).toBe(403);
  expect((await page.request.delete("/api/v1/voice/sessions")).status()).toBe(403);
  await page.goto("/app/inbox");
  await expect(page.getByRole("tab", { name: /Todas/ })).toHaveAttribute("data-state", "active");
});
test("criar e editar agente herda a IA da plataforma", async ({ page }) => {
  await login(page);
  await page.goto("/app/ai/agents/new");
  await expect(
    page.getByText(/A conexão de IA é administrada pela equipe da plataforma/),
  ).toBeVisible();
  await expect(page.locator("#provider,#model,#credential_id")).toHaveCount(0);
  await page.locator("#name").fill("Atendimento fictício");
  await page.getByRole("button", { name: "Criar agente", exact: true }).click();
  await page.waitForURL(/\/app\/ai\/agents\/[0-9a-f-]+$/, { timeout: 60000 });
  const id = page.url().split("/").pop()!;
  const version = checked(
    await db
      .from("ai_agent_versions")
      .select("id,provider,model,credential_id")
      .eq("agent_id", id)
      .eq("organization_id", org)
      .single(),
  )!;
  expect(version).toMatchObject({ provider: "openai", model: "gpt-6.1-sol", credential_id: null });
  const forged = await page.request.patch(`/api/v1/ai/agents/${id}/versions/${version.id}`, {
    data: { provider: "anthropic", model: "modelo-escolhido", credential_id: randomUUID() },
  });
  expect(forged.status()).toBe(200);
  expect((await forged.json()).data).toMatchObject({
    provider: "openai",
    model: "gpt-6.1-sol",
    credential_id: null,
  });
  await expect(page.getByRole("tab", { name: "Execuções", exact: true })).toHaveCount(0);
  await page.locator("#name").fill("Atendimento revisado");
  await page.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Atendimento revisado", exact: true }),
  ).toBeVisible();
  await capture(page, "agente");
});
test("desempenho mostra dados reais e gráficos em desktop e celular", async ({ page }) => {
  await login(page);
  await page.goto("/app/metrics");
  await expect(page.getByRole("heading", { name: "Inteligência comercial" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Inteligência comercial" }).getByText("50%", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Gráfico de negócios por etapa")).toBeVisible();
  await expect(page.getByLabel("Gráfico de resultados por atendente")).toBeVisible();
  // Atrito carrega em paralelo: esperar a seção evita cortar a página durante
  // a expansão do conteúdo, especialmente na captura de celular.
  await expect(page.getByRole("heading", { name: "Atrito", exact: true })).toBeVisible();
  const a11y = await new AxeBuilder({ page })
    .include('[aria-label="Inteligência comercial"]')
    .withRules(["definition-list"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await capture(page, "desempenho");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "desempenho-mobile");
  expect(
    await page.evaluate(
      () => document.body.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
});
test("admin oferece convite, edição e exclusão; configuração de IA simples", async ({ page }) => {
  await login(page, 1);
  await page.goto("/admin/users");
  await page.getByPlaceholder("Buscar por email ou nome...").fill(users[0]!.email);
  await expect(page.getByText(users[0]!.email, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Adicionar usuário" }).click();
  await expect(page.getByRole("option", { name: "Empresa fictícia", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Enviar convite" })).toBeVisible();
  await capture(page, "admin-usuarios");
  await page.goto(`/admin/users/${users[0]!.id}`);
  await expect(page.getByRole("button", { name: "Salvar nome" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Excluir usuário" })).toBeVisible();
  await page.goto("/admin/ai");
  await expect(page.getByLabel("Chave de API", { exact: false })).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.getByLabel("Modelo de atendimento")).toContainText("GPT-6.1 Sol");
  await expect(page.getByLabel(/Aplicar o mesmo modelo/)).toBeChecked();
  await capture(page, "admin-ia");
});
