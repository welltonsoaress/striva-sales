import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

/** A borda deve sobrescrever ambos os headers e impedir acesso direto à origem. */
export function trustedIp(
  headers: Pick<Headers, "get">,
  secret = process.env.TRUSTED_PROXY_SECRET,
): string | null {
  const supplied = headers.get("x-platform-proxy-token");
  if (!secret || !supplied) return null;
  const expected = Buffer.from(secret),
    actual = Buffer.from(supplied);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const ip = headers.get("x-real-ip")?.trim() ?? "";
  return isIP(ip) ? ip : null;
}
