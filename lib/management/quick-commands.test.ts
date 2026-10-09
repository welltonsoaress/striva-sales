import { expect, it } from "vitest";
import { managementCommandHelp, managementQuickCommand } from "./quick-commands";
it("relatórios e ajuda dispensam interpretação por modelo sem confundir pedidos de escrita", () => {
  expect(managementQuickCommand("Me dê um relatório diário! ")).toBe("daily");
  expect(managementQuickCommand("Faça um relatório semanal da empresa.")).toBe("weekly");
  expect(managementQuickCommand("COMANDOS")).toBe("help");
  expect(managementQuickCommand("Me mostre casos pendentes!")).toBe("cases");
  expect(managementQuickCommand("resolva os casos pendentes")).toBeNull();
  expect(managementQuickCommand("mova o negócio e envie o relatório diário")).toBeNull();
});
it("o menu informa ações desativadas e o caminho atual para orientar a IA", () => {
  expect(managementCommandHelp(false)).toContain("estão desativadas");
  expect(managementCommandHelp(true)).toContain("código de confirmação");
  expect(managementCommandHelp(true)).toContain("Sua orientação volta à IA");
});
