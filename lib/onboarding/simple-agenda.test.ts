import { expect, it } from "vitest";
import { onboardingAgenda } from "./simple-agenda";
const a = {
  name: "Atendimento fictício",
  duration_minutes: 30,
  days: [1, 3],
  start: "09:00",
  end: "17:00",
};
it("agenda usa os dias e horários escolhidos, com fuso real e duração que cabe na janela", () => {
  expect(onboardingAgenda(a, "America/Fortaleza").schedule.windows).toEqual([
    { dow: 1, start: "09:00", end: "17:00" },
    { dow: 3, start: "09:00", end: "17:00" },
  ]);
  for (const raw of [
    { ...a, days: [] },
    { ...a, start: "17:00", end: "09:00" },
    { ...a, days: [1, 1] },
    { ...a, duration_minutes: 1000 },
  ])
    expect(() => onboardingAgenda(raw, "America/Fortaleza")).toThrow();
  expect(() => onboardingAgenda(a, "fuso-inexistente")).toThrow();
});
