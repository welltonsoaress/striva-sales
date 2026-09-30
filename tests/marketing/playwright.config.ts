import { defineConfig } from "@playwright/test";

// QA isolado da landing: aponta apenas para a cópia sem .env e sem banco real.
export default defineConfig({
  testDir: "../e2e",
  testMatch: "landing-comercial.spec.ts",
  workers: 1,
  // Inclui compilação de desenvolvimento na máquina local; não é teste de latência.
  timeout: 120_000,
  use: { baseURL: "http://localhost:3017", browserName: "chromium" },
  reporter: "list",
  outputDir: "../../.impeccable/review/test-results",
});
