import { expect, it } from "vitest";
import { buscarNoManual } from "./manual";
it("encontra orientações com acentos e não inventa resposta para assunto ausente", () => {
  expect(buscarNoManual("Conectar WhatsApp")[0]?.id).toBe("whatsapp");
  expect(buscarNoManual("faturamento")[0]?.id).toBe("faturamento");
  expect(buscarNoManual("asteroide xpto inexplicavel")).toEqual([]);
});
