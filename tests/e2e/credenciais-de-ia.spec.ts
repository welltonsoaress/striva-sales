/**
 * Jornada: somente o dono da plataforma configura IA e entende o resultado.
 * Antes, o card mostrava `auth_failed_401` e a lista de modelos colada por vírgula.
 */
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

import { lerCreds, loginComoAdmin } from "./helpers/login-admin";

let creds = lerCreds();

// O dono dedicado não contamina o admin de tenant compartilhado. Esta
// preparação exige variáveis explícitas e nunca aceita um banco remoto.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!url || !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("A prova de credenciais exige Supabase local no ambiente.");
const servico = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
let donoId: string;
let anterior: Database["public"]["Tables"]["platform_admins"]["Row"] | null = null;
test.beforeAll(async () => {
  const {
    data: { users },
    error: usersError,
  } = await servico.auth.admin.listUsers({ perPage: 200 });
  if (usersError) throw usersError;
  const dono = users.find((u) => u.email === creds.users.dono?.email);
  if (!dono || !creds.dono_totp)
    throw new Error("Rode seed-e2e-credentials para preparar o dono com MFA.");
  donoId = dono.id;
  const { data, error } = await servico
    .from("platform_admins")
    .select("*")
    .eq("user_id", donoId)
    .maybeSingle();
  if (error) throw error;
  anterior = data;
  const { error: writeError } = await servico.from("platform_admins").upsert({
    user_id: donoId,
    granted_by: donoId,
    scope: "full",
    mfa_required: true,
    reason: "Dono fictício para homologação de credenciais",
    revoked_at: null,
    revoked_by: null,
    revoke_reason: null,
  });
  if (writeError) throw writeError;
});
test.afterAll(async () => {
  if (!donoId) return;
  const result = anterior
    ? await servico.from("platform_admins").upsert(anterior)
    : await servico.from("platform_admins").delete().eq("user_id", donoId);
  if (result.error) throw result.error;
});

test.describe("Chaves de acesso à IA", () => {
  test("[P0] chave inválida vira frase legível, e a tela diz onde pegar outra", async ({
    page,
  }) => {
    creds = await loginComoAdmin(page, creds, "dono");
    await page.goto("/app/ai/credentials");

    const rotulo = `E2E ${Date.now()}`;
    await page
      .getByRole("button", { name: /adicionar credencial/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");

    // O diálogo ajuda antes de pedir: diz quando usar e onde pegar a chave.
    await expect(page.getByText(/padrão recomendado para conversar/)).toBeVisible();
    await expect(dialog.getByRole("link", { name: /pegar chave em/i })).toHaveAttribute(
      "href",
      /console\.anthropic\.com/,
    );
    await expect(page.locator("#cred-key")).toHaveAttribute("placeholder", "sk-ant-…");

    await page.locator("#cred-label").fill(rotulo);
    await page.locator("#cred-key").fill("sk-ant-c••••••••••••••••••••••••");
    await page.getByRole("button", { name: /salvar e validar/i }).click();

    const card = page.locator("li", { hasText: rotulo });
    await expect(card).toBeVisible();

    // Resultado da validação em até 15 s (401 com rede; network_error sem). O
    // refetch client-side só acontece UMA vez, 3s depois de fechar o diálogo
    // (setTimeout em AddCredentialDialog.tsx) — se a validação demorar mais
    // que isso, a lista nunca reflete o resultado sozinha. Por isso o polling
    // recarrega a página a cada tentativa, em vez de confiar só naquele refetch.
    await expect(async () => {
      await page.reload();
      await expect(
        page
          .locator("li", { hasText: rotulo })
          .getByText(/recusou a chave|Não foi possível falar com o provedor/),
      ).toBeVisible();
    }).toPass({ timeout: 15_000 });

    // Código cru nunca aparece como texto visível.
    await expect(card.getByText(/^auth_failed_401$|^network_error$/)).toHaveCount(0);

    // Modelos: contagem ou travessão — nunca uma lista colada por vírgula.
    const modelos = await card.locator("dd").first().innerText();
    expect(modelos).toMatch(/^(\d+|—)$/);

    // Limpeza pela própria tela: não está em uso, então o botão está habilitado.
    await card.getByRole("button", { name: /excluir credencial/i }).click();
    await page.getByRole("button", { name: /^remover$/i }).click();
    await expect(card).toHaveCount(0);

    await page.screenshot({ path: ".superpowers/evidence/credenciais-de-ia.png", fullPage: true });
  });
});
