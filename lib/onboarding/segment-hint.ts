import { z } from "zod";
import { BUSINESS_SEGMENTS } from "./business-templates";
const hintSchema = z.enum(BUSINESS_SEGMENTS);
/** Sugestão editável de marketing. Nunca é fonte de organização ou permissão. */
export function businessSegmentHint(raw: unknown) {
  const parsed = hintSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}
