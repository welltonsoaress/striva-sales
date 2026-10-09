import { expect, it } from "vitest";
import { anniversary, currentCycle } from "./cycle";

it("preserva dia 31 após fevereiro e horário UTC", () => {
  const anchor = new Date("2026-01-31T18:30:00Z");
  expect(anniversary(anchor, 1).toISOString()).toBe("2026-02-28T18:30:00.000Z");
  expect(anniversary(anchor, 2).toISOString()).toBe("2026-03-31T18:30:00.000Z");
  expect(currentCycle(anchor, new Date("2026-03-30T18:30:00Z")).start.toISOString()).toBe("2026-02-28T18:30:00.000Z");
});
it("renova exatamente no aniversário e respeita ano bissexto", () => {
  expect(currentCycle(new Date("2026-10-06T12:00:00Z"), new Date("2026-11-06T12:00:00Z")).start.toISOString()).toBe("2026-11-06T12:00:00.000Z");
  expect(anniversary(new Date("2028-01-31T00:00:00Z"), 1).getUTCDate()).toBe(29);
});
