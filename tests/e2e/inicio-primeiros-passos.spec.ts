import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

if (!["127.0.0.1", "localhost"].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname))
  throw new Error("Esta jornada exige um Supabase local descartável.");
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const password = "InicioQa!2026#Striva";
const email = `inicio-${randomUUID().slice(0, 8)}@qa.local`;
const operatorEmail = `suporte-${randomUUID().slice(0, 8)}@qa.local`;
const evidence = ".superpowers/evidence/inicio-primeiros-passos";
let userId = "";
let orgId = "";
let operatorId = "";
let originalPro: Database["public"]["Tables"]["commercial_plans"]["Row"] | null = null;
const hotmartEventId = `hotmart-e2e-${randomUUID()}`;
test.describe.configure({ mode: "serial", timeout: 90000 });
test.beforeAll(async () => {
  mkdirSync(evidence, { recursive: true });
  const previous = await db.from("commercial_plans").select("*").eq("slug", "pro").single();
  if (previous.error || !previous.data) throw previous.error ?? new Error("Plano Pro ausente");
  originalPro = previous.data;
  const { data: user, error: userError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Pessoa QA" },
  });
  if (userError || !user.user) throw userError ?? new Error("Usuário QA ausente");
  userId = user.user.id;
  const { data: org, error } = await db
    .from("organizations")
    .insert({
      slug: `inicio-${randomUUID().slice(0, 8)}`,
      display_name: "Empresa de teste",
      legal_name: "Empresa de teste",
      status: "active",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !org) throw error ?? new Error("Organização QA ausente");
  orgId = org.id;
  const { count: pipelines } = await db
    .from("crm_pipelines")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  expect(pipelines, "o gatilho entrega o funil pronto desta organização").toBeGreaterThan(0);
  const { error: membershipError } = await db.from("user_organizations").insert({
    organization_id: orgId,
    user_id: userId,
    role: "admin",
    accepted_at: new Date().toISOString(),
  });
  if (membershipError) throw membershipError;
  const { data: operator, error: operatorError } = await db.auth.admin.createUser({
    email: operatorEmail,
    password,
    email_confirm: true,
  });
  if (operatorError || !operator.user) throw operatorError ?? new Error("Operador QA ausente");
  operatorId = operator.user.id;
  const { error: grantError } = await db.from("platform_admins").insert({
    user_id: operatorId,
    granted_by: operatorId,
    scope: "full",
    mfa_required: false,
    reason: "E2E suporte local sintético",
  });
  if (grantError) throw grantError;
  const { error: operatorMembershipError } = await db.from("user_organizations").insert({
    organization_id: orgId,
    user_id: operatorId,
    role: "admin",
    accepted_at: new Date().toISOString(),
  });
  if (operatorMembershipError) throw operatorMembershipError;
});
test.afterAll(async () => {
  if (originalPro) {
    const { id, ...values } = originalPro;
    // A disponibilidade é calculada pelo banco e não aceita UPDATE explícito.
    const writable = Object.fromEntries(
      Object.entries(values).filter(([key]) => key !== "checkout_available"),
    );
    const { error } = await db.from("commercial_plans").update(writable).eq("id", id);
    if (error) throw error;
  }
  if (orgId) {
    await db.from("billing_payments").delete().eq("organization_id", orgId);
    await db.from("billing_contracts").delete().eq("organization_id", orgId);
    await db.from("billing_checkouts").delete().eq("organization_id", orgId);
    await db
      .from("billing_webhook_events")
      .delete()
      .in("event_id", [hotmartEventId, `${hotmartEventId}-cancel`]);
    await db.from("platform_support_threads").delete().eq("organization_id", orgId);
    await db.from("user_organizations").delete().eq("organization_id", orgId);
    await db.from("organizations").delete().eq("id", orgId);
  }
  if (userId) {
    const { data: files } = await db.storage.from("profile-avatars").list(userId);
    if (files?.length)
      await db.storage
        .from("profile-avatars")
        .remove(files.map((file) => `${userId}/${file.name}`));
    await db.auth.admin.deleteUser(userId);
  }
  if (operatorId) {
    await db.from("platform_admins").delete().eq("user_id", operatorId);
    await db.auth.admin.deleteUser(operatorId);
  }
});
async function login(page: Page, identity = email) {
  await page.goto("/login");
  await page.locator("#email").fill(identity);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL(/\/(app|onboarding)(\/|$)/, { timeout: 30000 });
}
test("adiar leva à página inicial e permite retomar sem falsa conclusão", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/onboarding\/welcome/, { timeout: 30000 });
  await page.screenshot({ path: `${evidence}/configuracao-inicial.png`, fullPage: true });
  await page.getByRole("button", { name: "Configurar depois" }).click();
  await expect(page).toHaveURL(/\/app\/inicio/, { timeout: 30000 });
  await expect(page.getByRole("progressbar", { name: "Configuração inicial" })).toHaveAttribute(
    "aria-valuenow",
    "20",
    { timeout: 30000 },
  );
  const { data } = await db
    .from("organizations")
    .select("onboarded_at,onboarding_state")
    .eq("id", orgId)
    .single();
  expect(data?.onboarded_at).toBeNull();
  expect(data?.onboarding_state.dismissed_at).toBeTruthy();
  await expect
    .poll(
      async () =>
        page
          .getByAltText("Ilustração de conversas no WhatsApp e Instagram, contatos e agenda")
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      { timeout: 30000 },
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: `${evidence}/inicio-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Primeiros passos" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: `${evidence}/inicio-mobile.png`, fullPage: true });
  await page
    .locator("details")
    .filter({ hasText: "Conte sobre seu negócio" })
    .getByRole("link", { name: /Configurar/ })
    .click();
  await expect(page).toHaveURL(/\/onboarding\/welcome/, { timeout: 30000 });
  await page.locator("#display_name").fill("Empresa de teste");
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: /^continuar$/i }).click();
  // Aguarde o término da action. Navegar antes cancela o envio e mede uma
  // configuração que ainda não foi gravada, em vez da retomada concluída.
  await expect(page).toHaveURL(/\/onboarding\/connect-whatsapp/, { timeout: 30000 });
  await page.goto("/app/inicio");
  await expect(page.getByRole("progressbar", { name: "Configuração inicial" })).toHaveAttribute(
    "aria-valuenow",
    "40",
    { timeout: 30000 },
  );
  await page.screenshot({ path: `${evidence}/progresso-configuracao.png`, fullPage: true });
  await page.goto("/onboarding/setup-ai");
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("heading", { name: "Treine seu funcionário" })).toBeVisible();
  await page.screenshot({ path: `${evidence}/configuracao-agente.png`, fullPage: true });
});
test("manual, catálogo provisório e avatar têm portas funcionais", async ({ page }) => {
  await login(page);
  await page.goto("/app/ajuda");
  await page.getByLabel("Buscar no manual").fill("WhatsApp");
  await expect(page.getByText("Conectar o WhatsApp", { exact: true })).toBeVisible();
  await page.goto("/app/settings/billing");
  await expect(page.getByText("Pro", { exact: true })).toBeVisible();
  await expect(page.getByText(/1\.782,00/)).toBeVisible();
  await expect(page.getByText("Oferta em preparação", { exact: false }).first()).toBeVisible();
  await page.goto("/app/settings/profile");
  await page.getByRole("button", { name: "Avatar Azul" }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect
    .poll(async () => (await db.auth.admin.getUserById(userId)).data.user?.user_metadata.avatar_url)
    .toBe("/avatars/azul.svg");
  await expect(page.getByRole("button", { name: "Salvar", exact: true })).toBeEnabled();
  await page.screenshot({ path: `${evidence}/perfil-avatares.png`, fullPage: true });
  const uploadResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/profile/avatar") && response.request().method() === "POST",
    { timeout: 30000 },
  );
  await page.getByLabel("Escolher foto do computador").setInputFiles({
    name: "avatar-qa.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  expect((await uploadResponse).status(), "a foto foi aceita pelo armazenamento").toBe(200);
  await expect
    .poll(
      async () =>
        (await db.auth.admin.getUserById(userId)).data.user?.user_metadata.avatar_storage_path,
      { timeout: 15000 },
    )
    .toMatch(new RegExp(`^${userId}/`));
  const { data: uploaded } = await db.auth.admin.getUserById(userId);
  expect((await page.request.get(uploaded.user!.user_metadata.avatar_url)).status()).toBe(200);
  await page.getByRole("button", { name: "Usar avatar padrão" }).click();
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await db.auth.admin.getUserById(userId)).data.user?.user_metadata.avatar_storage_path ??
        null,
    )
    .toBeNull();
  expect((await db.auth.admin.getUserById(userId)).data.user?.user_metadata.avatar_url).toBe(
    "/avatars/violeta.svg",
  );
  expect(
    (
      await db.storage
        .from("profile-avatars")
        .download(uploaded.user!.user_metadata.avatar_storage_path)
    ).data,
  ).toBeNull();
});
test("a pergunta fica salva e pode seguir à equipe humana", async ({ page, browser }) => {
  await login(page);
  await page.goto("/app/inicio");
  await page.getByRole("button", { name: "Suporte", exact: true }).click();
  await page.getByLabel("Sua pergunta").fill("asteroide xpto inexplicavel");
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  await expect(page.getByText(/Não encontrei uma orientação segura/)).toBeVisible();
  await expect(page.getByText(/Solicitação enviada à equipe/)).toBeVisible();
  const { data: thread } = await db
    .from("platform_support_threads")
    .select("id,status")
    .eq("organization_id", orgId)
    .eq("created_by", userId)
    .single();
  expect(thread?.status).toBe("waiting_human");
  const operatorContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const operatorPage = await operatorContext.newPage();
    await login(operatorPage, operatorEmail);
    await operatorPage.goto("/admin/support");
    const ticket = operatorPage.locator("section").filter({
      has: operatorPage.getByRole("heading", { name: "Empresa de teste", exact: true }),
    });
    await ticket
      .getByLabel("Resposta ao chamado")
      .fill("Vamos conferir a configuração juntos. Abra o manual de primeiros passos.");
    const replyResponse = operatorPage.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/admin/support") && response.request().method() === "POST",
      { timeout: 30000 },
    );
    await ticket.getByRole("button", { name: "Enviar resposta" }).click();
    expect((await replyResponse).status()).toBe(200);
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(
      page.getByText("Vamos conferir a configuração juntos. Abra o manual de primeiros passos."),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("A equipe assumiu seu chamado.")).toBeVisible();
  } finally {
    await operatorContext.close();
  }
  await page.screenshot({ path: `${evidence}/suporte.png`, fullPage: true });
  await page.getByRole("button", { name: "Encerrar chamado" }).click();
  await expect(page.getByText(/Chamado encerrado/)).toBeVisible();
});

test("landing compara seis ofertas com Pro recomendado e preserva a escolha ao entrar", async ({
  page,
}) => {
  // Esta jornada usa uma organização que já adiou os primeiros passos.
  const deferred = await db
    .from("organizations")
    .update({ onboarding_state: { dismissed_at: new Date().toISOString() } })
    .eq("id", orgId);
  if (deferred.error) throw deferred.error;
  await page.goto("/");
  const pricing = page.locator("#planos");
  await pricing.scrollIntoViewIfNeeded();
  const pro = pricing
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Pro", exact: true }) })
    .first();
  await expect(pro.getByText("Recomendado", { exact: true })).toBeVisible();
  await expect(pro).toContainText("R$ 297");
  await expect(pro).toContainText("Total do período: R$ 1.782");
  await pricing.screenshot({ path: `${evidence}/planos-landing-desktop.png` });
  await pricing.getByRole("button", { name: /^1 ano/ }).click();
  await expect(pro).toContainText("R$ 237");
  await expect(pro).toContainText("Total do período: R$ 2.844");
  await expect(pro).toContainText("Economize R$ 720");
  await expect(pro).toContainText("3.000 créditos por mês");
  await page.setViewportSize({ width: 390, height: 844 });
  await pricing.screenshot({ path: `${evidence}/planos-landing-mobile.png` });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const chosen = await pro.getByRole("link", { name: "Escolher Pro" }).getAttribute("href");
  await pro.getByRole("link", { name: "Escolher Pro" }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(chosen);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(new URL(chosen!, process.env.NEXT_PUBLIC_APP_URL!).toString());
  const selectedOffer = page.locator(`#offer-${chosen!.split("plan=")[1]}`);
  await expect(selectedOffer).toContainText("2.844,00");
  await expect(selectedOffer).toContainText("Contratando 1 ano");
});

test("operador salva o preço provisório sem publicar a oferta", async ({ page }) => {
  const { data: pro, error } = await db
    .from("commercial_plans")
    .select("*")
    .eq("slug", "pro")
    .single();
  if (error || !pro) throw error ?? new Error("Rascunho Pro ausente");
  originalPro = pro;
  await login(page, operatorEmail);
  await page.goto("/admin/plans");
  await expect(page.getByRole("heading", { name: "Planos comerciais" })).toBeVisible();
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Pro", exact: true }) })
    .first();
  await expect(form.getByLabel("Preço em reais")).toHaveValue("1782");
  await page.screenshot({ path: `${evidence}/planos-administrativos.png`, fullPage: true });
  await form.getByLabel("Preço em reais").fill("327.50");
  await form.getByLabel("Descrição").fill("Preço de teste; oferta continua em rascunho.");
  await form.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Plano salvo em rascunho.", { exact: true })).toBeVisible();
  await expect
    .poll(async () => {
      const { data } = await db
        .from("commercial_plans")
        .select("price_cents,description,publication_state,billing_interval")
        .eq("id", pro.id)
        .single();
      return data;
    })
    .toEqual({
      price_cents: 32750,
      description: "Preço de teste; oferta continua em rascunho.",
      publication_state: "draft",
      billing_interval: "semester",
    });
  await expect(form.getByLabel("Preço em reais")).toHaveValue("327.5");
  await form
    .locator("..")
    .getByRole("button", { name: "Publicar condições sem ativar pagamento" })
    .click();
  await expect(
    page.getByText("Condições publicadas. O pagamento continua desligado.", { exact: true }),
  ).toBeVisible();
  const saved = await db
    .from("commercial_plans")
    .select("publication_state,hotmart_offer")
    .eq("id", pro.id)
    .single();
  expect(saved.data?.publication_state).toBe("published");
  expect((saved.data?.hotmart_offer as { enabled: boolean })?.enabled).toBe(false);
});

test("checkout só é ativado após configuração e compra confirmada atualiza o faturamento", async ({
  page,
}) => {
  const product = "0244dddd-2222-4000-8000-000000000001";
  // A jornada financeira também roda isolada: sua empresa já adiou o setup.
  const deferred = await db
    .from("organizations")
    .update({
      onboarding_state: { dismissed_at: new Date().toISOString() },
    })
    .eq("id", orgId);
  if (deferred.error) throw deferred.error;
  await login(page, operatorEmail);
  await page.goto("/admin/plans");
  const form = page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Pro", exact: true }) })
    .first();
  await form.getByLabel("Preço em reais").fill("1782");
  await form.getByLabel("Descrição").fill(originalPro!.description);
  await form.getByLabel("Periodicidade").selectOption("semester");
  await form.getByLabel("Usuários", { exact: true }).fill("5");
  await form.getByLabel("Números de WhatsApp", { exact: true }).fill("1");
  await form.getByLabel("Créditos por mês", { exact: true }).fill("3000");
  await form.getByLabel("Código do produto na Hotmart (ucode)").fill(product);
  await form.getByLabel("Código da oferta na Hotmart").fill("pro-qa");
  await form.getByLabel("Link de pagamento da Hotmart").fill("https://pay.hotmart.com/qa-fixture");
  await form.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Plano salvo em rascunho.", { exact: true })).toBeVisible();
  const activate = form
    .locator("..")
    .getByRole("button", { name: "Homologação concluída: ativar pagamento" });
  await expect(activate).toBeVisible();
  await activate.click();
  await expect(page.getByText("Pagamento disponibilizado.", { exact: true })).toBeVisible();
  await page.goto("/planos");
  await expect(
    page.getByRole("heading", { name: "Cada conversa pode abrir uma nova oportunidade." }),
  ).toBeVisible();
  await page.screenshot({ path: `${evidence}/pagina-de-vendas.png`, fullPage: true });
  // Interceptação no navegador: prova o destino sem visitar a Hotmart nem pagar.
  await page.route("https://pay.hotmart.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<p>Checkout sintético de homologação</p>",
    }),
  );
  await page.goto("/app/settings/billing");
  await page.getByRole("button", { name: "Contratar plano", exact: true }).click();
  await expect(page).toHaveURL(/https:\/\/pay\.hotmart\.com\/qa-fixture/, { timeout: 30000 });
  const reference = new URL(page.url()).searchParams.get("sck");
  expect(reference).toMatch(/^[a-f0-9]{24}$/);
  const payload = {
    id: hotmartEventId,
    event: "PURCHASE_APPROVED",
    version: "2.0.0",
    creation_date: Date.now(),
    data: {
      product: { ucode: product },
      purchase: {
        transaction: `HP-${hotmartEventId}`,
        status: "APPROVED",
        price: { value: 1782, currency_value: "BRL" },
        offer: { code: "pro-qa" },
        origin: { sck: reference },
        date_next_charge: Date.now() + 180 * 86400000,
      },
      subscription: { status: "ACTIVE", subscriber: { code: `sub-${orgId}` } },
    },
  };
  const endpoint = new URL("/api/v1/webhooks/hotmart", process.env.NEXT_PUBLIC_APP_URL!).toString();
  expect(
    (
      await page.request.post(endpoint, {
        data: payload,
        headers: { "x-hotmart-hottok": "invalid" },
      })
    ).status(),
  ).toBe(401);
  const accepted = await page.request.post(endpoint, {
    data: payload,
    headers: { "x-hotmart-hottok": process.env.HOTMART_HOTTOK! },
  });
  expect(accepted.status()).toBe(200);
  expect((await accepted.json()).data.state).toBe("applied");
  const duplicate = await page.request.post(endpoint, {
    data: payload,
    headers: { "x-hotmart-hottok": process.env.HOTMART_HOTTOK! },
  });
  expect((await duplicate.json()).data.state).toBe("duplicate");
  const auditReceipt = await db
    .from("api_audit_log")
    .select("id", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("action", "billing.payment_recorded")
    .contains("metadata", { event_id: hotmartEventId });
  expect(auditReceipt.error).toBeNull();
  expect(auditReceipt.count).toBe(1);
  await page.goto(endpoint.replace("/api/v1/webhooks/hotmart", "/app/settings/billing"));
  await expect(page.getByText("Assinatura ativa", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Histórico de pagamentos" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Pagamento aprovado" })).toBeVisible();
  await page.screenshot({ path: `${evidence}/faturamento-hotmart.png`, fullPage: true });

  const cancellation = {
    id: `${hotmartEventId}-cancel`,
    event: "SUBSCRIPTION_CANCELLATION",
    version: "2.0.0",
    creation_date: Date.now() + 100,
    data: {
      subscriber: { code: `sub-${orgId}` },
      cancellation_date: Date.now(),
      date_next_charge: payload.data.purchase.date_next_charge,
      product: { id: 123, name: "QA" },
      actual_recurrence_value: 1782,
    },
  };
  const cancelled = await page.request.post(endpoint, {
    data: cancellation,
    headers: { "x-hotmart-hottok": process.env.HOTMART_HOTTOK! },
  });
  expect((await cancelled.json()).data.state).toBe("applied");
  const cancellationReplay = await page.request.post(endpoint, {
    data: cancellation,
    headers: { "x-hotmart-hottok": process.env.HOTMART_HOTTOK! },
  });
  expect((await cancellationReplay.json()).data.state).toBe("duplicate");
  const cancellationAudit = await db
    .from("api_audit_log")
    .select("id", { count: "exact" })
    .eq("organization_id", orgId)
    .eq("action", "billing.subscription_updated")
    .contains("metadata", { event_id: `${hotmartEventId}-cancel` });
  expect(cancellationAudit.error).toBeNull();
  expect(cancellationAudit.count).toBe(1);
  await page.reload();
  await expect(page.getByText("Assinatura cancelada", { exact: true })).toBeVisible();
  await expect(page.getByText(/Próxima cobrança informada/)).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "Pagamento aprovado" })).toBeVisible();
  await expect(page.getByTestId("ai-response-total")).toHaveText("0");

  const sessionId = randomUUID(),
    contactId = randomUUID(),
    conversationId = randomUUID(),
    messageId = randomUUID();
  const session = await db.from("channel_sessions").insert({
    id: sessionId,
    organization_id: orgId,
    waha_session_name: `usage-${randomUUID()}`,
    webhook_secret_encrypted: "\\x00",
  });
  expect(session.error).toBeNull();
  expect(
    (
      await db
        .from("contacts")
        .insert({ id: contactId, organization_id: orgId, display_name: "Contato QA consumo" })
    ).error,
  ).toBeNull();
  expect(
    (
      await db.from("conversations").insert({
        id: conversationId,
        organization_id: orgId,
        contact_id: contactId,
        channel_session_id: sessionId,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await db.from("messages").insert({
        id: messageId,
        organization_id: orgId,
        contact_id: contactId,
        conversation_id: conversationId,
        channel_session_id: sessionId,
        direction: "outbound",
        type: "text",
        status: "failed",
        sent_via: "ai",
        ai_credit_eligible: true,
        body: "Resposta sintética de QA",
      })
    ).error,
  ).toBeNull();
  await page.getByRole("button", { name: "Atualizar consumo" }).click();
  await expect(page.getByTestId("ai-response-total")).toHaveText("0");
  expect(
    (
      await db
        .from("messages")
        .update({ status: "sent" })
        .eq("id", messageId)
        .eq("organization_id", orgId)
    ).error,
  ).toBeNull();
  expect(
    (
      await db
        .from("messages")
        .update({ status: "delivered" })
        .eq("id", messageId)
        .eq("organization_id", orgId)
    ).error,
  ).toBeNull();
  await page.getByRole("button", { name: "Atualizar consumo" }).click();
  await expect(page.getByTestId("ai-response-total")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Atualizar consumo" })).toBeEnabled();
  await page.getByText("Ver últimos 20 registros deste mês", { exact: true }).click();
  await expect(page.getByText("1 envio anterior", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${evidence}/faturamento-consumo-cancelamento.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.getByTestId("ai-response-total")).toBeVisible();
  await page.screenshot({ path: `${evidence}/faturamento-consumo-mobile.png`, fullPage: true });
  await page.goto("/admin/plans");
  const receipt = await db
    .from("billing_webhook_events")
    .select("received_at,state")
    .eq("event_id", `${hotmartEventId}-cancel`)
    .single();
  expect(receipt.error).toBeNull();
  expect(receipt.data?.state).toBe("applied");
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: receipt.data!.received_at })
      .getByText("Assinatura atualizada", { exact: true }),
  ).toBeVisible();
});
