/** Fronteira do transporte: sem recibo, timeout ou interrupção não provam rejeição.
 * A identidade e a reserva ficam disponíveis para reconciliação, sem reenvio. */
export function deliveryMayBeUnknown(error: unknown, depth = 0): boolean {
  if (depth > 8 || !error || typeof error !== "object") return false;
  const e = error as {
    name?: string;
    message?: string;
    code?: string;
    cause?: unknown;
    errors?: unknown[];
  };
  if (["AbortError", "TimeoutError"].includes(e.name ?? "")) return true;
  if (
    [
      "ECONNRESET",
      "ETIMEDOUT",
      "UND_ERR_SOCKET",
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
      "ABORT_ERR",
    ].includes(e.code ?? "")
  )
    return true;
  if (/timeout|timed out|aborted|^waha_5\d\d\b/i.test(e.message ?? "")) return true;
  // fetch sem causa identificável também não oferece prova de rejeição.
  if (e.message === "fetch failed" && !e.cause) return true;
  return (
    deliveryMayBeUnknown(e.cause, depth + 1) ||
    (e.errors?.some((child) => deliveryMayBeUnknown(child, depth + 1)) ?? false)
  );
}
