import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Database, Json } from "@/lib/database.types";
import { businessPrompts } from "@/lib/onboarding/business-templates";
import { PACOTES } from "@/lib/onboarding/pacotes-de-funil";
import { extractAuthConfirmLink, waitForEmail } from "./helpers/auth";

// Nenhum fallback de arquivo: esta spec só pode escrever no Supabase local.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("A jornada SaaS exige um banco local descartável.");
const admin = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const password = `Local-${randomUUID()}!`;
const suffix = randomUUID().slice(0, 8);
const evidence = ".superpowers/evidence/saas-ia-incluida";
const users: Array<{ id: string; org: string; email: string }> = [];
let settings: Database["public"]["Tables"]["platform_ai_settings"]["Row"];
let price: Database["public"]["Tables"]["ai_models"]["Row"];
const assertResult = <T extends { data: unknown; error: { message: string } | null }>(
  result: T,
): T["data"] => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};
async function login(page: Page, index: number) {
  await page.goto("/login");
  await page.locator("#email").fill(users[index]!.email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /^Entrar$/i }).click();
  await page.waitForURL(/\/(app|onboarding)(\/|$)/, {
    timeout: Number(process.env.SAAS_E2E_TIMEOUT_MS ?? 90000),
    waitUntil: "domcontentloaded",
  });
}
test.describe.configure({ mode: "serial", timeout: 120000 });
test.beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  settings = assertResult(await admin.from("platform_ai_settings").select("*").single())!;
  price = assertResult(
    await admin
      .from("ai_models")
      .select("*")
      .eq("provider", "openai")
      .eq("model_id", "gpt-5.6-luna")
      .single(),
  )!;
  // Tarifa sintética: não valida preços comerciais nem chama o provedor.
  assertResult(
    await admin
      .from("ai_models")
      .update({
        input_price_per_million_cents: 0,
        output_price_per_million_cents: 0,
        pricing_verified_at: new Date().toISOString(),
        pricing_source: "https://example.invalid/synthetic-e2e-only",
      })
      .eq("id", price.id),
  );
  assertResult(
    await admin
      .from("platform_ai_settings")
      .update({
        enabled: true,
        provider: "openai",
        model: "gpt-5.6-luna",
        operator_model: "gpt-5.6-luna",
      })
      .eq("id", true),
  );
  for (let i = 0; i < 3; i++) {
    const email = `saas-${i}-${suffix}@qa.local`;
    const { user } = assertResult(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { org_name: `Empresa SaaS ${i} ${suffix}` },
      }),
    );
    if (!user) throw new Error("Usuário fictício ausente.");
    const org = assertResult(
      await admin.rpc("fn_provision_self_service", {
        p_user: user.id,
        p_name: `Empresa SaaS ${i} ${suffix}`,
        p_slug: `saas-${i}-${suffix}`,
      }),
    )!;
    users.push({ id: user.id, org, email });
  }
  const first = users[0]!;
  const phone = `5599${Date.now().toString().slice(-9)}`;
  const hash = createHmac("sha256", process.env.INTERNAL_SECRET!)
    .update(`phone:${phone}`)
    .digest("hex");
  assertResult(
    await admin.from("channel_sessions").insert({
      organization_id: first.org,
      display_name: "WhatsApp fictício",
      waha_session_name: `qa-${first.org}`,
      webhook_secret_encrypted: "\\x00",
      status: "WORKING",
      phone_number: phone,
      verified_at: new Date().toISOString(),
      verification_phone_hash: hash,
    }),
  );
  assertResult(
    await admin
      .from("organizations")
      .update({
        onboarding_state: {
          welcome: {
            accepted_at: new Date().toISOString(),
            display_name: `Empresa SaaS 0 ${suffix}`,
            timezone: "America/Fortaleza",
            business_segment: "contabilidade",
            business_description: "Rotina contábil fictícia. Orçamentos dependem da equipe.",
          },
          whatsapp: { status: "WORKING" },
        },
      })
      .eq("id", first.org),
  );
  const prompts = businessPrompts("contabilidade", `Empresa SaaS 0 ${suffix}`);
  assertResult(
    await admin.rpc("fn_prepare_business_agent", {
      p_org: first.org,
      p_user: first.id,
      p_segment: "contabilidade",
      p_template: 1,
      p_prompt: prompts.conversation,
      p_operator_prompt: prompts.organizer,
      p_tools: ["crm_get_org_memory", "crm_search_knowledge"],
      p_operator_tools: ["crm_get_org_memory"],
      p_funnel: PACOTES.find((p) => p.id === "servicos")!.proposta as unknown as Json,
      p_agenda: null,
    }),
  );
  assertResult(
    await admin.from("platform_admins").insert({
      user_id: users[2]!.id,
      granted_by: users[2]!.id,
      scope: "full",
      mfa_required: false,
      reason: "Operador fictício E2E SaaS",
    }),
  );
  assertResult(
    await admin
      .from("organizations")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", users[2]!.org),
  );
});
test.afterAll(async () => {
  if (settings)
    assertResult(await admin.from("platform_ai_settings").update(settings).eq("id", true));
  if (price) assertResult(await admin.from("ai_models").update(price).eq("id", price.id));
  for (const user of users.reverse()) {
    assertResult(await admin.from("platform_admins").delete().eq("user_id", user.id));
    assertResult(await admin.from("organizations").delete().eq("id", user.org));
    assertResult(await admin.auth.admin.deleteUser(user.id));
  }
});

test("agente preparado sem campos técnicos; revisão e prévia visual em desktop e celular", async ({
  page,
}) => {
  await login(page, 0);
  await page.goto("/onboarding/setup-ai");
  await expect(
    page.getByRole("heading", { name: /Um atendimento preparado para contabilidade/i }),
  ).toBeVisible();
  await expect(page.getByText("Conversa com seu cliente", { exact: true })).toBeVisible();
  await expect(page.getByText("Organiza o atendimento", { exact: true })).toBeVisible();
  await expect(
    page.locator('input[name="api_key"], select[name="provider"], select[name="model"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Ativar atendimento", exact: true }),
  ).toBeDisabled();
  // Este dublê prova apenas a apresentação da prévia; não é teste de IA real.
  await page.route("**/api/v1/ai/agents/*/versions/*/test", (route) =>
    route.fulfill({
      json: { data: { final_text: "Prévia fictícia: como podemos ajudar com sua empresa?" } },
    }),
  );
  await page.getByRole("button", { name: "Testar atendimento", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Prévia fictícia:" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${evidence}/agente-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: `${evidence}/agente-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const lightAccess = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(lightAccess.violations).toEqual([]);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: `${evidence}/agente-dark-mobile.png`, fullPage: true });
  const darkAccess = await new AxeBuilder({ page })
    .include("main")
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(darkAccess.violations).toEqual([]);
});

test("empresa self-service aparece no admin automaticamente, com filtro e total real", async ({
  page,
}) => {
  await login(page, 2);
  await page.goto("/admin/tenants");
  await page.getByRole("textbox", { name: "Buscar empresas" }).fill(suffix);
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: `Empresa SaaS 0 ${suffix}` })
      .getByRole("link", { name: "Ver", exact: true }),
  ).toBeVisible();
  const response = await page.request.get(`/api/v1/admin/tenants?q=${suffix}&origin=self_service`);
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.meta.total).toBe(3);
  expect(result.data.map((o: { id: string }) => o.id).sort()).toEqual(
    users.map((u) => u.org).sort(),
  );
  expect(
    result.data.every((o: { signup_origin: string }) => o.signup_origin === "self_service"),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${evidence}/empresas-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${evidence}/empresas-mobile.png`, fullPage: true });
  // Falha sintética somente na consulta de saúde; a recuperação consulta a API real.
  await page.route("**/api/v1/admin/dashboard/kpis", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "internal_error", message: "Falha sintética de consulta." } },
    }),
  );
  await page.goto("/admin/dashboard");
  await expect(
    page.getByRole("heading", { name: "Empresas, atendimento e receita" }),
  ).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "Não foi possível atualizar a saúde da operação." }),
  ).toBeVisible({ timeout: 20000 });
  await page.unroute("**/api/v1/admin/dashboard/kpis");
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByText("Empresas em operação", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector("main")?.scrollTo(0, 0);
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${evidence}/admin-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${evidence}/admin-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: `${evidence}/admin-dark-desktop.png`, fullPage: true });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/app/inicio");
  await expect(
    page.getByRole("region", { name: "Créditos disponíveis", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${evidence}/inicio-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.screenshot({ path: `${evidence}/inicio-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: `${evidence}/inicio-dark-mobile.png`, fullPage: true });
});

test("JWTs de duas empresas isolam saldo, arquivos privados e Realtime com controles positivos", async ({
  page,
}) => {
  const first = users[0]!,
    neighbor = users[1]!;
  const client = createClient<Database>(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  assertResult(await client.auth.signInWithPassword({ email: first.email, password }));
  expect(
    assertResult(
      await client.rpc("fn_support_storage_write_allowed", { p_name: `${first.org}/qa.png` }),
    ),
  ).toBe(true);
  expect(
    assertResult(
      await client.rpc("fn_support_storage_write_allowed", { p_name: `${neighbor.org}/qa.png` }),
    ),
  ).toBe(false);
  expect(
    assertResult(
      await client
        .from("organization_ai_accounts")
        .select("organization_id")
        .in("organization_id", [first.org, neighbor.org]),
    )!.map((a) => a.organization_id),
  ).toEqual([first.org]);
  const forged = await client
    .from("organization_ai_accounts")
    .update({ monthly_remaining: 99999 })
    .eq("organization_id", first.org);
  expect(forged.error).not.toBeNull();
  // ai-policy oferece acesso direto com RLS. A mídia de WhatsApp só é servida
  // pelas rotas autenticadas; não abrimos uma policy para satisfazer o teste.
  const document = Buffer.from("Documento fictício da prova de isolamento.");
  const paths = [first.org, neighbor.org].map((org) => `${org}/qa-${randomUUID()}.md`);
  const avatars = [first.org, neighbor.org].map((org) => `${org}/qa-${randomUUID()}.png`);
  const contacts = [randomUUID(), randomUUID()];
  try {
    // O registro próprio não basta: o cliente pode adulterar seu ponteiro de
    // arquivo pelo banco, mas a rota jamais deve assinar o objeto da vizinha.
    const image = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=",
      "base64",
    );
    for (const [index, org] of [first.org, neighbor.org].entries()) {
      assertResult(
        await admin.storage.from("whatsapp-media").upload(avatars[index]!, image, {
          contentType: "image/png",
        }),
      );
      assertResult(
        await admin.from("contacts").insert({
          id: contacts[index]!,
          organization_id: org,
          name: `Contato fictício ${index}`,
          avatar_storage_path: avatars[index]!,
        }),
      );
    }
    await login(page, 0);
    const ownAvatar = await page.request.get(`/api/v1/contacts/${contacts[0]}/avatar`, {
      maxRedirects: 0,
    });
    expect(ownAvatar.status()).toBe(307);
    expect(ownAvatar.headers().location).toBeTruthy();
    expect((await page.request.get(ownAvatar.headers().location!)).status()).toBe(200);
    const foreignContact = await page.request.get(`/api/v1/contacts/${contacts[1]}/avatar`, {
      maxRedirects: 0,
    });
    expect(foreignContact.status()).toBe(404);
    const changed = assertResult(
      await client
        .from("contacts")
        .update({ avatar_storage_path: avatars[1]! })
        .eq("id", contacts[0]!)
        .eq("organization_id", first.org)
        .select("avatar_storage_path")
        .single(),
    );
    expect(changed?.avatar_storage_path).toBe(avatars[1]);
    const forgedAvatar = await page.request.get(`/api/v1/contacts/${contacts[0]}/avatar`, {
      maxRedirects: 0,
    });
    expect(forgedAvatar.status()).toBe(404);
    expect(forgedAvatar.headers().location).toBeUndefined();
    for (const [index, path] of paths.entries())
      assertResult(
        await (index === 0 ? client : admin).storage
          .from("ai-policy")
          .upload(path, document, { contentType: "text/markdown" }),
      );
    expect((await client.storage.from("ai-policy").download(paths[0]!)).error).toBeNull();
    expect((await client.storage.from("ai-policy").download(paths[1]!)).error).not.toBeNull();
    const foreignPath = `${neighbor.org}/forged-${randomUUID()}.md`;
    const foreignUpload = await client.storage
      .from("ai-policy")
      .upload(foreignPath, document, { contentType: "text/markdown" });
    if (!foreignUpload.error)
      assertResult(await admin.storage.from("ai-policy").remove([foreignPath]));
    expect(foreignUpload.error).not.toBeNull();
    const observations: string[] = [];
    const channel = client.channel(`qa-commercial-${suffix}`).on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "organization_ai_accounts",
      },
      (event) => observations.push((event.new as { organization_id: string }).organization_id),
    );
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Realtime não confirmou a inscrição.")),
          20000,
        );
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            clearTimeout(timer);
            resolve();
          }
          if (status === "CHANNEL_ERROR") {
            clearTimeout(timer);
            reject(new Error("Realtime indisponível."));
          }
        });
      });
      let expectedOwn = 0;
      for (const org of [first.org, neighbor.org, first.org]) {
        assertResult(
          await admin
            .from("organization_ai_accounts")
            .update({ updated_at: new Date().toISOString() })
            .eq("organization_id", org),
        );
        if (org === first.org) {
          expectedOwn += 1;
          await expect
            .poll(() => observations.filter((id) => id === first.org).length, { timeout: 20000 })
            .toBe(expectedOwn);
        }
      }
      await expect.poll(() => observations.length, { timeout: 20000 }).toBe(2);
      expect(observations).toEqual([first.org, first.org]);
    } finally {
      await client.removeChannel(channel);
    }
    assertResult(
      await admin
        .from("organization_ai_accounts")
        .update({
          state: "expired",
          access_until: new Date(Date.now() - 1000).toISOString(),
        })
        .eq("organization_id", first.org),
    );
    expect((await client.storage.from("ai-policy").download(paths[0]!)).error).toBeNull();
    const expiredPath = `${first.org}/expired-${randomUUID()}.md`;
    const expiredUpload = await client.storage
      .from("ai-policy")
      .upload(expiredPath, document, { contentType: "text/markdown" });
    // Remove também um arquivo que tenha entrado por regressão, antes de reprovar.
    if (!expiredUpload.error)
      assertResult(await admin.storage.from("ai-policy").remove([expiredPath]));
    expect(
      expiredUpload.error,
      "Período encerrado deve preservar leitura, sem permitir novos uploads.",
    ).not.toBeNull();
  } finally {
    assertResult(await admin.storage.from("ai-policy").remove(paths));
    assertResult(await admin.storage.from("whatsapp-media").remove(avatars));
    for (const [index, org] of [first.org, neighbor.org].entries())
      assertResult(
        await admin.from("contacts").delete().eq("id", contacts[index]!).eq("organization_id", org),
      );
    await client.auth.signOut();
  }
});

test("cadastro pela clínica sugere segmento editável, confirma e-mail e aparece no admin", async ({
  page,
  browser,
  baseURL,
}) => {
  const email = `site-${suffix}@qa.local`;
  const company = `Empresa criada no site ${suffix}`;
  const instructions =
    "Atendemos pequenas empresas. Orçamentos e prazos são confirmados pela equipe.";
  let createdUser: string | undefined;
  let createdOrg: string | undefined;
  try {
    await page.goto("/clinicas");
    await page.getByRole("link", { name: "Testar 7 dias grátis", exact: true }).first().click();
    await expect(page).toHaveURL(/\/signup\?segment=clinica/);
    await page.getByLabel("Nome da empresa").fill(company);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByLabel("Confirmar senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await expect(page.getByText("Confirme seu e-mail", { exact: true })).toBeVisible();
    const { users: authUsers } = assertResult(await admin.auth.admin.listUsers({ perPage: 1000 }));
    const signedUp = authUsers.find((user) => user.email === email);
    expect(signedUp).toBeDefined();
    createdUser = signedUp!.id;
    expect(signedUp!.email_confirmed_at).toBeFalsy();
    expect(signedUp!.user_metadata.business_segment).toBe("clinica");
    const html = await waitForEmail(email, "Confirme seu e-mail");
    await page.goto(extractAuthConfirmLink(html, baseURL!));
    await expect(page).toHaveURL(/\/onboarding\/welcome/);
    await expect(
      page.getByText("Conte sobre seu negócio. Seu agente já vem preparado, com IA incluída.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Falta a chave da inteligência artificial|Servidor no ar e banco de dados instalado/,
      ),
    ).toHaveCount(0);
    await expect(page.getByLabel("Como se chama o seu negócio?")).toHaveValue(company);
    await expect(page.getByLabel("Tipo de negócio", { exact: true })).toHaveValue("clinica");
    await page.getByLabel("Tipo de negócio", { exact: true }).selectOption("contabilidade");
    await expect(page.getByLabel("Tipo de negócio", { exact: true })).toHaveValue("contabilidade");
    await page.getByLabel("Conte como sua empresa atende", { exact: true }).fill(instructions);
    await page.getByRole("checkbox", { name: /Li e aceito os/ }).check();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: `${evidence}/negocio-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${evidence}/negocio-mobile.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const membership = assertResult(
      await admin
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", createdUser)
        .single(),
    )!;
    createdOrg = membership.organization_id;
    const account = assertResult(
      await admin
        .from("organization_ai_accounts")
        .select("mode,state,monthly_remaining")
        .eq("organization_id", createdOrg)
        .single(),
    )!;
    expect(account).toMatchObject({ mode: "platform", state: "pending", monthly_remaining: 0 });
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding\/connect-whatsapp/);
    const memory = assertResult(
      await admin.from("org_memory_versions").select("content").eq("organization_id", createdOrg),
    )!;
    expect(memory.map((entry) => entry.content)).toContain(instructions);

    // Sessões independentes: abrir o admin não troca os cookies do cliente.
    const operatorContext = await browser.newContext({ baseURL });
    try {
      const operator = await operatorContext.newPage();
      await login(operator, 2);
      await operator.goto("/admin/tenants");
      await operator.getByRole("textbox", { name: "Buscar empresas" }).fill(company);
      await expect(operator.getByRole("row").filter({ hasText: company })).toBeVisible();
      const response = await operator.request.get(
        `/api/v1/admin/tenants?q=${encodeURIComponent(company)}&origin=self_service`,
      );
      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result.meta.total).toBe(1);
      expect(result.data[0]).toMatchObject({ id: createdOrg, signup_origin: "self_service" });
    } finally {
      await operatorContext.close();
    }
  } finally {
    if (createdUser && !createdOrg) {
      const membership = assertResult(
        await admin
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", createdUser)
          .maybeSingle(),
      );
      createdOrg = membership?.organization_id;
    }
    if (createdOrg) assertResult(await admin.from("organizations").delete().eq("id", createdOrg));
    if (createdUser) assertResult(await admin.auth.admin.deleteUser(createdUser));
  }
});

test("campanhas e planos exibem total do período em desktop e celular, com navegação acessível", async ({
  page,
}) => {
  for (const route of ["/", "/clinicas", "/planos"]) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    await expect(page.locator("h1")).toHaveCount(1);
    const pricing = page.locator("#planos");
    await pricing.scrollIntoViewIfNeeded();
    await expect(pricing.getByText(/Total do período:.*1\.782/)).toBeVisible();
    await pricing.getByRole("button", { name: /^1 ano/ }).click();
    await expect(pricing.getByText(/Total do período:.*2\.844/)).toBeVisible();
    await expect(pricing.getByText(/3\.000 créditos por mês/)).toBeVisible();
    const file = route === "/" ? "home" : route.slice(1);
    await page.screenshot({ path: `${evidence}/${file}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `${evidence}/${file}-mobile.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const access = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(access.violations).toEqual([]);
    if (route === "/clinicas") {
      await page.getByText("Como funcionam os créditos?", { exact: true }).click();
      await expect(
        page.getByText(/Cada mensagem completa do agente consome 10 créditos/),
      ).toBeVisible();
      await expect(
        page.getByText(/Demonstração ilustrativa com dados fictícios/).first(),
      ).toBeVisible();
    }
  }
});

test("jornada comercial: Google opcional, plano preservado e paywall sem escape", async ({
  page,
}) => {
  test.setTimeout(Number(process.env.SAAS_E2E_TIMEOUT_MS ?? 120000));
  const plan = assertResult(
    await admin.from("commercial_plans").select("id").eq("slug", "pro").single(),
  )!;
  await page.goto(`/login?next=${encodeURIComponent(`/app/settings/billing?plan=${plan.id}`)}`);
  await page.getByRole("link", { name: /Criar conta/ }).click();
  await expect(page).toHaveURL(/\/signup\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toContain(plan.id);
  await login(page, 0);
  await page.goto("/onboarding/setup-ai");
  await expect(
    page.getByRole("heading", { name: "Google Agenda (opcional)", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Você pode continuar sem conectar/)).toBeVisible();
  await page.screenshot({ path: `${evidence}/google-opcional-desktop.png`, fullPage: true });
  await page.context().clearCookies();
  const org = users[1]!.org;
  assertResult(
    await admin
      .from("organizations")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", org),
  );
  assertResult(
    await admin
      .from("organization_ai_accounts")
      .update({
        mode: "platform",
        state: "trial",
        monthly_remaining: 1000,
        access_until: new Date(Date.now() - 60000).toISOString(),
      })
      .eq("organization_id", org),
  );
  await login(page, 1);
  await page.goto("/app/inicio");
  const wall = page.getByTestId("subscription-paywall");
  await expect(
    wall.getByRole("heading", { name: "Escolha um plano para continuar" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(wall).toBeVisible();
  await expect(wall.getByRole("button", { name: /fechar|cancelar/i })).toHaveCount(0);
  await expect(wall.getByText(/Total do período:/)).toHaveCount(3);
  await page.goto("/app/contacts");
  await expect(wall).toBeVisible();
  for (const [width, height, label] of [
    [1440, 1000, "desktop"],
    [390, 844, "mobile"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.screenshot({ path: `${evidence}/paywall-${label}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const access = await new AxeBuilder({ page })
    .include('[data-testid="subscription-paywall"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(access.violations).toEqual([]);
  const credentials = await page.request.post("/api/v1/ai/credentials", {
    headers: { Origin: new URL(page.url()).origin },
    data: { provider: "openai", api_key: "ficticia" },
  });
  expect(credentials.status()).toBe(403);
  await wall.getByRole("link", { name: "Ver planos anuais e pagamentos" }).click();
  await expect(page.getByRole("heading", { name: "Faturamento", exact: true })).toBeVisible();
  await expect(page.locator("#creditos-extras").getByText(/indisponível no momento/)).toBeVisible();
  await page.goto("/pagamento/retorno");
  await page.waitForURL(/\/app\/settings\/billing\?payment=return/);
  await expect(page.getByText(/Aguardamos a confirmação do pagamento/)).toBeVisible();
  await page.goto("/app/inicio");
  await expect(wall).toBeVisible();
});

test("jornada comercial: troca solicitada no app preserva saldo e cria chamado humano", async ({
  page,
}) => {
  test.setTimeout(Number(process.env.SAAS_E2E_TIMEOUT_MS ?? 120000));
  const org = users[1]!.org,
    now = new Date().toISOString();
  assertResult(
    await admin
      .from("organization_ai_accounts")
      .update({
        mode: "platform",
        state: "active",
        anchor_at: now,
        period_start: now,
        period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        access_until: new Date(Date.now() + 180 * 86400000).toISOString(),
        monthly_allowance: 3000,
        monthly_remaining: 3000,
      })
      .eq("organization_id", org),
  );
  await login(page, 1);
  await page.goto("/app/settings/profile");
  await expect(
    page.getByRole("button", { name: "Mostrar todas as áreas", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mostrar todas as áreas", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Usar navegação simples", exact: true }),
  ).toBeVisible();
  await page.goto("/app/settings/billing");
  await page.getByRole("button", { name: "Solicitar troca de plano", exact: true }).first().click();
  await expect(
    page.getByText(/Solicitação enviada. A equipe da plataforma confirmará/),
  ).toBeVisible();
  const threads = assertResult(
    await admin.from("platform_support_threads").select("id,status").eq("organization_id", org),
  );
  expect(threads).toHaveLength(1);
  expect(threads![0]!.status).toBe("waiting_human");
  const account = assertResult(
    await admin
      .from("organization_ai_accounts")
      .select("monthly_remaining")
      .eq("organization_id", org)
      .single(),
  )!;
  expect(account.monthly_remaining).toBe(3000);
  const credentials = await page.request.post("/api/v1/ai/credentials", {
    headers: { Origin: new URL(page.url()).origin },
    data: { provider: "openai", api_key: "ficticia" },
  });
  expect(credentials.status()).toBe(403);
  expect((await credentials.json()).error.message).toContain("plataforma");
  const pack = await page.request.post("/api/v1/billing/checkout", {
    headers: { Origin: new URL(page.url()).origin },
    data: { credit_pack_id: randomUUID() },
  });
  expect(pack.status()).toBe(503);
  await page.screenshot({ path: `${evidence}/troca-plano-faturamento.png`, fullPage: true });
  await page.goto("/app/ajuda");
  await expect(page.getByText(/Troca de plano:/).first()).toBeVisible();
});

test("pacote preparado fica explicado, saldo esgotado mostra renovação e recuperação resolve aviso", async ({
  page,
}) => {
  await login(page, 2);
  await page.goto("/admin/ai");
  const packs = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Pacotes de créditos extras", exact: true }),
    });
  await packs.getByRole("button", { name: "Editar pacote", exact: true }).first().click();
  await expect(packs.getByLabel("Quantidade de créditos", { exact: true })).toHaveValue("1000");
  await expect(
    packs.getByLabel("Preço em centavos de BRL (opcional)", { exact: true }),
  ).toHaveValue("4999");
  await expect(
    packs.getByRole("button", { name: "Publicar pacote homologado", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: `${evidence}/creditos-admin-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${evidence}/creditos-admin-mobile.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Estado financeiro fictício para conferir apresentação; os pagamentos são
  // exercitados contra Postgres na suíte de invariantes, sem compra externa.
  const org = users[2]!.org,
    now = new Date().toISOString();
  assertResult(
    await admin
      .from("organization_ai_accounts")
      .update({
        state: "active",
        anchor_at: now,
        period_start: now,
        period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        access_until: new Date(Date.now() + 180 * 86400000).toISOString(),
        monthly_allowance: 3000,
        monthly_remaining: 0,
        extra_remaining: 0,
      })
      .eq("organization_id", org),
  );
  await page.goto("/app/settings/billing");
  const balance = page.getByRole("region", { name: "Créditos disponíveis", exact: true });
  await expect(balance.getByText("Seus créditos acabaram", { exact: true })).toBeVisible();
  await expect(balance.getByText(/A franquia renova em/)).toBeVisible();
  await expect(page.locator("#creditos-extras").getByText(/49,99/)).toBeVisible();
  await expect(page.locator("#creditos-extras").getByText(/indisponível no momento/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Comprar créditos", exact: true })).toHaveCount(0);
  for (const [width, height, label] of [
    [1440, 1000, "desktop"],
    [390, 844, "mobile"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: `${evidence}/creditos-faturamento-${label}.png`,
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  assertResult(
    await admin
      .from("organization_ai_accounts")
      .update({ extra_remaining: 10 })
      .eq("organization_id", org),
  );
  await page.reload();
  await expect(balance.getByText("10 créditos disponíveis", { exact: true })).toBeVisible();
  const notices = assertResult(
    await admin
      .from("agent_inbox_items")
      .select("id")
      .eq("organization_id", org)
      .eq("kind", "commercial_ai_paused")
      .eq("status", "open"),
  );
  expect(notices).toEqual([]);
});
