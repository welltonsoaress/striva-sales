import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Superfície pública: não semeia banco nem envia mensagem ao canal comercial.
test("visitante entende a jornada e encontra uma demonstração", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Seu comercial.");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Com próximo passo.");
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText(/\bIA\b/);
  await expect(page.locator("header img").first()).toBeVisible();
  expect(
    await page
      .locator("header img")
      .first()
      .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
  ).toBe(true);
  const journey = page.getByRole("group", { name: "Etapas da jornada de venda" });
  await journey.getByRole("button", { name: "Follow-up" }).click();
  await expect(page.getByText("Follow-up enviado automaticamente", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Após o intervalo configurado sem resposta", { exact: true }),
  ).toBeVisible();
  await journey.getByRole("button", { name: "Próximo passo" }).click();
  await expect(page.getByText("Avaliação agendada", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("group", { name: "Escolha um exemplo de negócio" })
    .getByRole("button", { name: "Escritórios" })
    .click();
  await expect(page.getByText("Reunião agendada", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("group", { name: "Escolha um exemplo de negócio" })
    .getByRole("button", { name: "Empresas" })
    .click();
  await expect(page.getByText("Proposta em acompanhamento", { exact: true }).first()).toBeVisible();
  const cta = page.getByRole("link", { name: "Agendar demonstração" }).first();
  await expect(cta).toHaveAttribute("href", /^https:\/\/wa\.me\/5583998391039\?text=/);
  await expect(page.getByRole("link", { name: "Entrar", exact: true })).toHaveAttribute(
    "href",
    "/login",
  );
  await expect(page.locator("body")).not.toContainText(
    /self.host|open source|multi.tenant|R\$\s*597/i,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
});

test("painel, segmentos e dúvidas respondem às escolhas", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const platform = page.getByRole("group", { name: "Explore a plataforma comercial" });
  await platform.getByRole("button", { name: "Follow-up", exact: true }).click();
  await expect(page.getByText("Conversa retomada", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Acompanhamento organizado, além da memória da equipe.", { exact: true }),
  ).toBeVisible();
  await platform.getByRole("button", { name: "Radar", exact: true }).click();
  await expect(page.getByText("Proposta sem próximo passo", { exact: true })).toBeVisible();
  await platform.getByRole("button", { name: "Atendimento", exact: true }).click();
  await expect(page.getByText("Contexto para continuar", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Funil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Saiba onde cada negócio está." })).toBeVisible();
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByText("Assessoria · Rafael Lima", { exact: true })).toBeVisible();
  const reports = page.getByRole("group", { name: "Escolha o período do relatório" });
  await reports.getByRole("button", { name: "Semanal" }).click();
  await expect(page.getByRole("heading", { name: "Sua semana, em perspectiva." })).toBeVisible();
  await expect(page.getByText("36 na semana anterior", { exact: true })).toBeVisible();
  await reports.getByRole("button", { name: "Diário" }).click();
  await expect(page.getByText("Demandas sem próximo passo", { exact: true })).toBeVisible();
  await page
    .getByRole("group", { name: "Segmentos atendidos" })
    .getByRole("button", { name: "Escritórios" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cada novo contato com contexto e responsável." }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Segmentos atendidos" })
    .getByRole("button", { name: "Empresas" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Um comercial organizado para vender conversando." }),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "Posso gerenciar a operação pelo WhatsApp?" })
    .click();
  await expect(page.getByText(/As alterações disponíveis exigem sua confirmação/)).toBeVisible();
});

test("situações comerciais demonstram o risco e a continuidade", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const situations = page.getByRole("group", { name: "Situações que podem perder oportunidades" });
  await expect(page.getByText("21h14. Um cliente quer agendar.", { exact: true })).toBeVisible();
  await situations.getByRole("button", { name: "Contato sem resposta" }).click();
  await expect(
    page.getByText("Contato retomado. Nova chance de avançar.", { exact: true }),
  ).toBeVisible();
  await situations.getByRole("button", { name: "Proposta em aberto" }).click();
  await expect(
    page.getByText("Negociação visível. Equipe com direção.", { exact: true }),
  ).toBeVisible();
  await situations.getByRole("button", { name: "Fora do expediente" }).click();
  await expect(situations.getByRole("button", { name: "Fora do expediente" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("celular tem navegação e não transborda", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.getByRole("navigation", { name: "Navegação no celular" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegação no celular" })
    .getByRole("link", { name: "Recursos" })
    .click();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Funil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Saiba onde cada negócio está." })).toBeVisible();
  await page
    .getByRole("group", { name: "Explore a plataforma comercial" })
    .getByRole("button", { name: "Radar", exact: true })
    .click();
  await expect(page.getByText("Proposta sem próximo passo", { exact: true })).toBeVisible();
  await page
    .getByRole("img", { name: /Cena ilustrativa de uma empresária/ })
    .scrollIntoViewIfNeeded();
  await expect(page.getByRole("img", { name: /Cena ilustrativa de uma empresária/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("fotografias carregam e o convite respeita foco e dispensa por sessão", async ({ page }) => {
  await page.clock.install();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Funil", exact: true })).toBeEnabled();
  const photo = page.getByRole("img", { name: /Cena ilustrativa de uma empresária/ });
  await photo.scrollIntoViewIfNeeded();
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  const phone = page.locator('img[src*="gestao-no-celular"]');
  await phone.scrollIntoViewIfNeeded();
  await expect
    .poll(() => phone.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  const focusTarget = page.getByRole("link", { name: "Quero conhecer o assistente", exact: true });
  await focusTarget.focus();
  const invitation = page.getByRole("complementary", { name: "Quer ver isso na sua empresa?" });
  await expect(invitation).toHaveCount(0);
  await page.clock.fastForward(40_001);
  await expect(invitation).toBeVisible();
  await expect(focusTarget).toBeFocused();
  await expect(invitation.getByRole("link", { name: "Quero uma demonstração" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/5583998391039\?text=/,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await invitation.getByRole("button", { name: "Agora não" }).focus();
  await page.keyboard.press("Escape");
  await expect(invitation).toHaveCount(0);
  await expect(focusTarget).toBeFocused();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Funil", exact: true })).toBeEnabled();
  await page.clock.fastForward(60_000);
  await expect(invitation).toHaveCount(0);
});

test("página pública atende às verificações automáticas de acessibilidade", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
