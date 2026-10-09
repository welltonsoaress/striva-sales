import { z } from "zod";
import { availabilityScheduleSchema } from "@/lib/schemas/routing";
export const simpleAgendaSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    duration_minutes: z.number().int().min(5).max(1440),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .refine((d) => d.start < d.end, { message: "O fim deve ser depois do início." })
  .refine((d) => new Set(d.days).size === d.days.length, {
    message: "Não repita os dias da semana.",
  });
export function onboardingAgenda(raw: unknown, timezone: string) {
  const value = simpleAgendaSchema.parse(raw);
  const schedule = availabilityScheduleSchema.parse({
    timezone,
    windows: value.days.map((dow) => ({ dow, start: value.start, end: value.end })),
  });
  const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  if (value.duration_minutes > minutes(value.end) - minutes(value.start))
    throw new Error("A duração deve caber no horário informado.");
  return { ...value, schedule };
}
